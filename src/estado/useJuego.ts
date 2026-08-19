import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LONGITUD, MAX_INTENTOS } from '../game/constantes';
import { cumple, obligacionEn, sinBlueshells } from '../game/reglas';
import { estadoTeclado, patronCompartible, puntosDe } from '../game/evaluar';
import { fechaJuego, msHastaProximaJornada } from '../game/fecha';
import { esAceptada, solucionDe } from '../game/palabras';
import { borrarEn, escribirEn, filaVacia, texto } from '../game/fila';
import { normalizar } from '../game/normalizar';
import { anotarEnHistorial, cargarPartida, guardarPartida } from '../almacen/local';
import type { Obligacion, PartidaLocal } from '../tipos';
import { useApp } from './AppContext';

const AVISO_MS = 1800;

function partidaNueva(
  torneoId: string,
  fecha: string,
  obligaciones: Obligacion[]
): PartidaLocal {
  return {
    torneoId,
    fecha,
    intentos: [],
    estado: 'jugando',
    penalizado: obligaciones.some((o) => o.motivo === 'lider'),
    obligaciones,
    enviado: false,
  };
}

/** El mensaje que se enseña al intentar saltarse una palabra impuesta. */
function avisoDe(obligacion: Obligacion, autor: string): string {
  if (obligacion.motivo === 'lider') {
    return 'Vas primero: empieza con una de las cinco palabras';
  }
  const orden = obligacion.indice + 1;
  return `Blueshell de ${autor}: la palabra ${orden}.ª tiene que ser ${obligacion.palabras[0].toUpperCase()}`;
}


/**
 * La partida del día en el torneo activo.
 *
 * Se juega una partida por torneo y día: cada torneo tiene su propia palabra,
 * así que quien esté en tres torneos tiene tres palabras que adivinar.
 */
export function useJuego() {
  const { activo, obligacionesHoy, blueshellsDe, usarProteccion, publicar, miResultado } =
    useApp();

  const torneoId = activo.id;
  const [fecha, setFecha] = useState(fechaJuego);
  const [partida, setPartida] = useState<PartidaLocal | null>(null);
  /**
   * Las letras y el cursor van en un mismo estado a propósito.
   *
   * Escribiendo deprisa con un teclado físico llegan varias pulsaciones antes
   * de que React vuelva a dibujar. Si fueran dos estados separados, cada
   * pulsación leería la fila del render anterior y se perderían letras. Con uno
   * solo, cada actualización parte del valor real y se encadenan bien.
   */
  const [fila, setFila] = useState<{ letras: string[]; cursor: number }>(() => ({
    letras: filaVacia(),
    cursor: 0,
  }));
  const borrador = fila.letras;
  const cursor = fila.cursor;

  const [aviso, setAviso] = useState<string | null>(null);
  const [temblor, setTemblor] = useState(0);
  const [filaAnimada, setFilaAnimada] = useState<number | null>(null);

  const solucion = solucionDe(fecha, activo.semilla);
  const impuestas = obligacionesHoy(torneoId);

  /**
   * Lo que ya consta publicado de esta jornada, que manda sobre el móvil.
   *
   * La partida se guarda en cada navegador por separado, así que entrando con
   * la misma cuenta desde otro sitio el tablero salía en blanco y se podía
   * repetir la jornada y pisar la puntuación. El servidor es el único que sabe
   * si está hecha, y si lo está no hay nada que jugar.
   */
  const publicada = miResultado(torneoId, fecha);
  const relojAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** El nombre con el que se conoce a alguien dentro de este torneo. */
  const nombreDe = useCallback(
    (uid: string | undefined) =>
      (uid && activo.tipo === 'torneo' && activo.torneo.perfiles?.[uid]?.nombre) || 'alguien',
    [activo]
  );

  const mostrarAviso = useCallback((mensaje: string) => {
    setAviso(mensaje);
    if (relojAviso.current) clearTimeout(relojAviso.current);
    relojAviso.current = setTimeout(() => setAviso(null), AVISO_MS);
  }, []);

  // Recuperar la partida al abrir la app o al cambiar de torneo.
  useEffect(() => {
    let vigente = true;
    setPartida(null);
    setFila({ letras: filaVacia(), cursor: 0 });
    setFilaAnimada(null);
    cargarPartida(torneoId, fecha).then((guardada) => {
      if (!vigente) return;
      setPartida(guardada ?? partidaNueva(torneoId, fecha, impuestas));
    });
    return () => {
      vigente = false;
    };
    // `impuestas` a propósito fuera: llega más tarde, cuando cargan los torneos
    // y sus jornadas, y lo ajusta el efecto siguiente sin reiniciar la partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId, fecha]);

  /**
   * Las palabras impuestas se confirman al cargar los torneos, que tarda un
   * momento más que abrir la pantalla. Se comparan en texto porque el cálculo
   * devuelve una lista nueva en cada dibujado aunque el contenido sea el mismo.
   */
  const claveImpuestas = JSON.stringify(impuestas);
  useEffect(() => {
    setPartida((previa) => {
      // Sólo antes del primer intento: una obligación no puede aparecer con la
      // partida ya empezada, ni desaparecer a mitad de camino.
      if (!previa || previa.intentos.length > 0) return previa;
      if (JSON.stringify(previa.obligaciones ?? []) === claveImpuestas) return previa;
      const obligaciones: Obligacion[] = JSON.parse(claveImpuestas);
      return {
        ...previa,
        obligaciones,
        penalizado: obligaciones.some((o) => o.motivo === 'lider'),
      };
    });
  }, [claveImpuestas]);

  // Cambio de jornada con la app abierta: a medianoche entra palabra nueva.
  useEffect(() => {
    const espera = Math.min(msHastaProximaJornada() + 1000, 2 ** 31 - 1);
    const reloj = setTimeout(() => setFecha(fechaJuego()), espera);
    return () => clearTimeout(reloj);
  }, [fecha]);

  // Publicar el resultado en el torneo. Se reintenta si vuelve la conexión.
  useEffect(() => {
    if (!partida || partida.estado === 'jugando' || partida.enviado) return;
    if (partida.torneoId === 'libre') return;
    // Ya hay resultado publicado: el servidor lo rechazaría, y con razón.
    if (publicada) return;

    const acertada = partida.estado === 'ganada';
    const intentos = partida.intentos.length;
    publicar(partida.torneoId, partida.fecha, {
      intentos,
      acertada,
      puntos: puntosDe(intentos, acertada),
      patron: patronCompartible(partida.intentos, solucion),
    })
      .then(() => {
        setPartida((previa) => {
          if (!previa || previa.fecha !== partida.fecha) return previa;
          if (previa.torneoId !== partida.torneoId) return previa;
          const actualizada = { ...previa, enviado: true };
          guardarPartida(actualizada);
          return actualizada;
        });
      })
      .catch(() => {});
  }, [partida, publicar, solucion, publicada]);

  const jugando = partida?.estado === 'jugando';

  /** Mover el cursor a una casilla concreta de la fila en curso. */
  const irACasilla = useCallback(
    (indice: number) => {
      if (!jugando || indice < 0 || indice >= LONGITUD) return;
      setFila((actual) => ({ ...actual, cursor: indice }));
    },
    [jugando]
  );

  const escribir = useCallback(
    (letra: string) => {
      if (!jugando) return;
      setFila((actual) => {
        const resultado = escribirEn(actual.letras, actual.cursor, letra);
        return { letras: resultado.fila, cursor: resultado.cursor };
      });
    },
    [jugando]
  );

  const borrar = useCallback(() => {
    if (!jugando) return;
    setFila((actual) => {
      const resultado = borrarEn(actual.letras, actual.cursor);
      return { letras: resultado.fila, cursor: resultado.cursor };
    });
  }, [jugando]);

  const enviar = useCallback(async () => {
    if (!partida || partida.estado !== 'jugando') return;
    if (publicada) {
      mostrarAviso('Esta jornada ya la tienes jugada');
      return;
    }

    // Los huecos sin letra desaparecen al unir, así que una fila incompleta se
    // queda corta y no pasa la comprobación de longitud.
    const intento = normalizar(texto(borrador));

    if (intento.length < LONGITUD) {
      mostrarAviso('Faltan letras');
      setTemblor((n) => n + 1);
      return;
    }

    // Palabras impuestas: la penalización del líder ocupa el primer intento y
    // cada blueshell recibida ocupa uno de los siguientes.
    const obligacion = obligacionEn(partida.obligaciones ?? [], partida.intentos.length);
    if (obligacion && !cumple(obligacion, intento)) {
      mostrarAviso(avisoDe(obligacion, nombreDe(obligacion.autor)));
      setTemblor((n) => n + 1);
      return;
    }

    if (!esAceptada(intento)) {
      mostrarAviso('No está en la lista de palabras');
      setTemblor((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    const intentos = [...partida.intentos, intento];
    const acertada = intento === solucion;
    const agotados = intentos.length >= MAX_INTENTOS;
    const estado: PartidaLocal['estado'] = acertada
      ? 'ganada'
      : agotados
        ? 'perdida'
        : 'jugando';

    const actualizada: PartidaLocal = { ...partida, intentos, estado };
    setPartida(actualizada);
    setFila({ letras: filaVacia(), cursor: 0 });
    setFilaAnimada(intentos.length - 1);
    guardarPartida(actualizada);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (estado !== 'jugando') {
      const puntos = puntosDe(intentos.length, acertada);
      anotarEnHistorial({
        torneoId: partida.torneoId,
        fecha: partida.fecha,
        intentos: intentos.length,
        acertada,
        puntos,
        patron: patronCompartible(intentos, solucion),
      });
      // Damos tiempo a que termine de destaparse la fila antes del mensaje.
      setTimeout(
        () =>
          mostrarAviso(
            acertada ? `¡${puntos} puntos!` : `La palabra era ${solucion.toUpperCase()}`
          ),
        LONGITUD * 240
      );
    }
  }, [partida, borrador, solucion, mostrarAviso, nombreDe, publicada]);

  const intentos = partida?.intentos ?? [];
  const obligaciones = partida?.obligaciones ?? [];
  const obligacion = obligacionEn(obligaciones, intentos.length);

  // Sólo tiene sentido protegerse si queda alguna bala por delante: gastar la
  // protección después de haber escrito la palabra impuesta no sirve de nada.
  const balasPendientes = obligaciones.filter(
    (o) => o.motivo === 'blueshell' && o.indice >= intentos.length
  ).length;

  /**
   * Gasta la protección con la partida en marcha.
   *
   * Además de avisar al servidor, quita las obligaciones de blueshell de la
   * partida guardada: si sólo se avisara, el tablero seguiría exigiendo la
   * palabra hasta que llegara la actualización de la jornada.
   */
  const protegerse = useCallback(async () => {
    await usarProteccion(torneoId);
    setPartida((previa) => {
      if (!previa) return previa;
      const actualizada = { ...previa, obligaciones: sinBlueshells(previa.obligaciones ?? []) };
      guardarPartida(actualizada);
      return actualizada;
    });
    mostrarAviso('Protección gastada: hoy no te obliga ninguna blueshell');
  }, [torneoId, usarProteccion, mostrarAviso]);

  return {
    /**
     * El resultado que ya consta en el torneo, si la jornada está hecha. La
     * pantalla enseña el resumen en vez del tablero.
     */
    publicada,
    obligaciones,
    /** La que toca en el intento en curso, para poder anunciarla. */
    obligacion,
    autorObligacion: nombreDe(obligacion?.autor),
    /** Balas que todavía me van a obligar en esta partida. */
    balasPendientes,
    puedeProtegerse:
      balasPendientes > 0 &&
      partida?.estado === 'jugando' &&
      blueshellsDe(torneoId).puedoProteger,
    protegerse,
    fecha,
    solucion,
    partida,
    intentos,
    borrador,
    cursor,
    irACasilla,
    estado: partida?.estado ?? 'jugando',
    penalizado: partida?.penalizado ?? false,
    teclado: estadoTeclado(intentos, solucion),
    filaAnimada,
    temblor,
    aviso,
    puntos: partida ? puntosDe(partida.intentos.length, partida.estado === 'ganada') : 0,
    escribir,
    borrar,
    enviar,
    mostrarAviso,
  };
}
