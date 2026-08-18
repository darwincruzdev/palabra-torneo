import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LONGITUD, MAX_INTENTOS, PALABRAS_PENALIZACION } from '../game/constantes';
import { estadoTeclado, patronCompartible, puntosDe } from '../game/evaluar';
import { fechaJuego, msHastaProximaJornada } from '../game/fecha';
import { esAceptada, solucionDe } from '../game/palabras';
import { borrarEn, escribirEn, filaVacia, texto } from '../game/fila';
import { normalizar } from '../game/normalizar';
import { anotarEnHistorial, cargarPartida, guardarPartida } from '../almacen/local';
import type { PartidaLocal } from '../tipos';
import { useApp } from './AppContext';

const AVISO_MS = 1800;

function partidaNueva(torneoId: string, fecha: string, penalizado: boolean): PartidaLocal {
  return { torneoId, fecha, intentos: [], estado: 'jugando', penalizado, enviado: false };
}


/**
 * La partida del día en el torneo activo.
 *
 * Se juega una partida por torneo y día: cada torneo tiene su propia palabra,
 * así que quien esté en tres torneos tiene tres palabras que adivinar.
 */
export function useJuego() {
  const { activo, penalizadoEn, publicar } = useApp();

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
  const penalizado = penalizadoEn(torneoId);
  const relojAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setPartida(guardada ?? partidaNueva(torneoId, fecha, penalizado));
    });
    return () => {
      vigente = false;
    };
    // `penalizado` a propósito fuera: puede llegar más tarde y lo ajusta el
    // efecto siguiente, sin reiniciar la partida en curso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneoId, fecha]);

  // La penalización se confirma al cargar los torneos, pero sólo se aplica si
  // todavía no se ha enviado ningún intento.
  useEffect(() => {
    setPartida((previa) =>
      previa && previa.intentos.length === 0 && previa.penalizado !== penalizado
        ? { ...previa, penalizado }
        : previa
    );
  }, [penalizado]);

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
  }, [partida, publicar, solucion]);

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

    // Los huecos sin letra desaparecen al unir, así que una fila incompleta se
    // queda corta y no pasa la comprobación de longitud.
    const intento = normalizar(texto(borrador));

    if (intento.length < LONGITUD) {
      mostrarAviso('Faltan letras');
      setTemblor((n) => n + 1);
      return;
    }

    // Penalización del líder: la primera palabra de la jornada está impuesta.
    const esPrimerIntento = partida.intentos.length === 0;
    if (
      partida.penalizado &&
      esPrimerIntento &&
      !PALABRAS_PENALIZACION.includes(intento as (typeof PALABRAS_PENALIZACION)[number])
    ) {
      mostrarAviso('Vas primero: empieza con una de las cinco palabras');
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
  }, [partida, borrador, solucion, mostrarAviso]);

  const intentos = partida?.intentos ?? [];

  return {
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
