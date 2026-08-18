import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LONGITUD, MAX_INTENTOS } from '../game/constantes';
import { estadoTeclado } from '../game/evaluar';
import { borrarEn, escribirEn, filaVacia, texto } from '../game/fila';
import { normalizar } from '../game/normalizar';
import { esAceptada } from '../game/palabras';
import {
  PALABRAS_POR_DUELO,
  SEGUNDOS_FINAL,
  codificarIntento,
  debeCerrarPorTiempo,
  descodificarLetras,
  descodificarPalabra,
  normalizarProgreso,
  palabraAcertada,
  palabrasDeDuelo,
  puntosDeDuelo,
  rondaDe,
} from '../game/duelo';
import type { Duelo, ProgresoDuelo } from '../tipos';
import {
  cargarEscritasDuelo,
  guardarDueloActivo,
  guardarEscritasDuelo,
} from '../almacen/local';
import * as datos from '../firebase/duelos';

const AVISO_MS = 2200;

/**
 * Lo que se queda el tablero a la vista tras cerrar una palabra.
 *
 * Dos segundos: la fila tarda 1,2 en destaparse (cinco casillas en cascada) y
 * quedan 0,8 para leer cuál era la palabra antes de pasar a la espera.
 */
const REVELADO_MS = 2000;

/** Lo que se enseña "la palabra era TAL" antes de la cuenta de 3, 2, 1. */
const MOSTRAR_PALABRA_MS = 1500;

/**
 * El duelo, que va palabra a palabra y los dos a la vez.
 *
 * Nadie se adelanta: hasta que los dos no cierran la palabra de la ronda, no
 * empieza la siguiente. Quien la cierra primero se queda esperando y viendo la
 * rejilla del rival en grande, y al rival le entran quince segundos.
 */
export function useDuelo(dueloId: string, uid: string | null) {
  const [duelo, setDuelo] = useState<Duelo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fila, setFila] = useState(() => ({ letras: filaVacia(), cursor: 0 }));
  const [aviso, setAviso] = useState<string | null>(null);
  const [temblor, setTemblor] = useState(0);
  const [filaAnimada, setFilaAnimada] = useState<number | null>(null);
  /**
   * La cuenta atrás, con la palabra a la que pertenece.
   *
   * Lleva la ronda dentro a propósito: sin ella, al llegar a cero se cerraba la
   * palabra, la ronda avanzaba, y como el contador seguía en cero el mismo
   * efecto cerraba también la palabra siguiente sin haberla jugado.
   */
  const [cuenta, setCuenta] = useState<{ ronda: number; quedan: number } | null>(null);
  const segundos = cuenta?.quedan ?? null;

  /** Mis letras: al rival sólo se le mandan colores, así que viven aquí. */
  const [escritas, setEscritas] = useState<string[][]>(() =>
    Array.from({ length: PALABRAS_POR_DUELO }, () => [])
  );

  const relojAviso = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarAviso = useCallback((mensaje: string) => {
    setAviso(mensaje);
    if (relojAviso.current) clearTimeout(relojAviso.current);
    relojAviso.current = setTimeout(() => setAviso(null), AVISO_MS);
  }, []);

  useEffect(() => {
    return datos.observarDuelo(dueloId, (d) => {
      setDuelo(d);
      setCargando(false);
    });
  }, [dueloId]);

  useEffect(() => {
    cargarEscritasDuelo(dueloId).then((guardadas) => {
      if (guardadas?.length === PALABRAS_POR_DUELO) setEscritas(guardadas);
    });
    // Se recuerda cuál es el duelo en curso para poder volver si se cierra la
    // pestaña sin querer.
    guardarDueloActivo(dueloId);
  }, [dueloId]);

  const palabras = useMemo(
    () => (duelo?.semilla ? palabrasDeDuelo(duelo.semilla) : []),
    [duelo?.semilla]
  );

  // Se normaliza lo que llega de la red: durante un despliegue conviven
  // clientes de versiones distintas, y un campo que falte no puede tumbar la
  // pantalla del otro.
  const mio = useMemo(
    () => normalizarProgreso(duelo?.progreso?.[uid ?? '']),
    [duelo?.progreso, uid]
  );
  const uidRival = duelo?.jugadores?.find((j) => j !== uid) ?? null;
  const suyo = useMemo(
    () => normalizarProgreso(uidRival ? duelo?.progreso?.[uidRival] : undefined),
    [duelo?.progreso, uidRival]
  );
  const rival = duelo?.retador?.uid === uidRival ? duelo?.retador : duelo?.rival;

  const ronda = rondaDe(mio.cerradas, suyo.cerradas);
  const indice = Math.min(ronda, PALABRAS_POR_DUELO - 1);
  const solucion = palabras[indice] ?? '';

  const yaCerreLaRonda = Boolean(mio.cerradas[indice]);
  const elCerroLaRonda = Boolean(suyo.cerradas[indice]);
  const terminado = ronda >= PALABRAS_POR_DUELO;

  /**
   * Rato de gracia justo después de cerrar una palabra.
   *
   * Sin esto, al acertar se saltaba a la pantalla de espera al instante: no
   * daba tiempo a ver la fila ponerse verde ni a leer cuál era la palabra.
   */
  const [revelando, setRevelando] = useState(false);
  const relojRevelado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (relojRevelado.current) clearTimeout(relojRevelado.current);
    },
    []
  );

  /**
   * El paso de una palabra a la siguiente, que ven los dos a la vez.
   *
   * Primero se enseña cuál era la palabra —aunque nadie la haya sacado— y luego
   * una cuenta de 3, 2, 1 para empezar la siguiente sincronizados. Arranca
   * cuando la ronda avanza, y la ronda sólo avanza cuando los dos han cerrado,
   * así que a los dos les salta casi en el mismo instante.
   */
  const [transicion, setTransicion] = useState<{
    palabra: string;
    cuenta: number | null;
  } | null>(null);

  const rondaPrevia = useRef<number | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null);

  useEffect(() => {
    const antes = rondaPrevia.current;
    rondaPrevia.current = ronda;
    if (antes === null || ronda <= antes) return;

    const palabra = palabras[antes];
    if (palabra) setPendiente(palabra);
  }, [ronda, palabras]);

  /**
   * La transición espera a que termine el revelado propio.
   *
   * Al segundo en cerrar, la ronda avanza en el mismo momento de enviar su
   * palabra: sin esta espera, la transición le cortaría la animación de su
   * propia fila y no llegaría a ver si la había acertado.
   */
  useEffect(() => {
    if (!pendiente || revelando) return;
    setTransicion({ palabra: pendiente, cuenta: null });
    setPendiente(null);
  }, [pendiente, revelando]);

  useEffect(() => {
    if (!transicion) return;

    // Fase 1: se lee cuál era la palabra.
    if (transicion.cuenta === null) {
      const reloj = setTimeout(() => {
        // Al acabar el duelo no hay siguiente ronda que contar.
        if (terminado) setTransicion(null);
        else setTransicion((actual) => (actual ? { ...actual, cuenta: 3 } : null));
      }, MOSTRAR_PALABRA_MS);
      return () => clearTimeout(reloj);
    }

    // Fase 2: 3, 2, 1 y a la siguiente.
    const reloj = setTimeout(() => {
      setTransicion((actual) => {
        if (!actual || actual.cuenta === null) return null;
        return actual.cuenta > 1 ? { ...actual, cuenta: actual.cuenta - 1 } : null;
      });
    }, 1000);
    return () => clearTimeout(reloj);
  }, [transicion, terminado]);

  /** Estoy esperando a que el rival cierre esta palabra. */
  const esperando =
    yaCerreLaRonda && !terminado && !revelando && !transicion && !pendiente;

  // Al acabar deja de haber duelo en curso al que volver.
  useEffect(() => {
    if (terminado) guardarDueloActivo(null);
  }, [terminado]);

  const enviarProgreso = useCallback(
    async (progreso: ProgresoDuelo) => {
      if (!uid) return;
      await datos.publicarProgreso(dueloId, uid, progreso).catch(() => {});
    },
    [dueloId, uid]
  );

  /**
   * Los quince segundos.
   *
   * Se deducen de que el rival haya cerrado esta palabra y yo no. Antes hacía
   * falta un campo extra en la base de datos que alguien tenía que escribir, y
   * si esa escritura fallaba el reloj no arrancaba nunca y el rezagado jugaba
   * sin límite. Así no hay nada que escribir ni que pueda fallar.
   *
   * El reloj arranca cuando este móvil ve el cierre del otro, no comparando con
   * la hora del servidor: el desfase entre relojes se comería segundos.
   */
  const contrarreloj =
    elCerroLaRonda && !yaCerreLaRonda && !terminado && duelo?.estado === 'jugando';

  useEffect(() => {
    if (!contrarreloj) {
      setCuenta(null);
      return;
    }
    setCuenta({ ronda: indice, quedan: SEGUNDOS_FINAL });
    const tic = setInterval(() => {
      setCuenta((actual) =>
        actual ? { ...actual, quedan: Math.max(0, actual.quedan - 1) } : null
      );
    }, 1000);
    return () => clearInterval(tic);
  }, [contrarreloj, indice]);

  // Se acabó el tiempo: la palabra se cierra con lo que hubiera.
  useEffect(() => {
    if (!uid || !debeCerrarPorTiempo(cuenta, indice, yaCerreLaRonda)) return;

    setCuenta(null);

    const cerradas = [...mio.cerradas];
    cerradas[indice] = true;
    enviarProgreso({ ...mio, cerradas });

    // Misma pausa que al cerrar a mano, para poder leer cuál era la palabra.
    setRevelando(true);
    if (relojRevelado.current) clearTimeout(relojRevelado.current);
    relojRevelado.current = setTimeout(() => setRevelando(false), REVELADO_MS);
    mostrarAviso(`Se acabó el tiempo · era ${solucion.toUpperCase()}`);
  }, [cuenta, indice, uid, yaCerreLaRonda, mio, solucion, enviarProgreso, mostrarAviso]);

  const jugando =
    duelo?.estado === 'jugando' &&
    !terminado &&
    !yaCerreLaRonda &&
    !revelando &&
    !transicion &&
    Boolean(uid) &&
    palabras.length > 0;

  const escribir = useCallback(
    (letra: string) => {
      if (!jugando) return;
      setFila((actual) => {
        const r = escribirEn(actual.letras, actual.cursor, letra);
        return { letras: r.fila, cursor: r.cursor };
      });
    },
    [jugando]
  );

  const borrar = useCallback(() => {
    if (!jugando) return;
    setFila((actual) => {
      const r = borrarEn(actual.letras, actual.cursor);
      return { letras: r.fila, cursor: r.cursor };
    });
  }, [jugando]);

  const irACasilla = useCallback(
    (i: number) => {
      if (!jugando || i < 0 || i >= LONGITUD) return;
      setFila((actual) => ({ ...actual, cursor: i }));
    },
    [jugando]
  );

  // Al cambiar de ronda se limpia la fila en curso y la animación.
  useEffect(() => {
    setFila({ letras: filaVacia(), cursor: 0 });
    setFilaAnimada(null);
  }, [indice]);

  const enviar = useCallback(async () => {
    if (!jugando || !uid) return;

    const intento = normalizar(texto(fila.letras));
    if (intento.length < LONGITUD) {
      mostrarAviso('Faltan letras');
      setTemblor((n) => n + 1);
      return;
    }
    if (!esAceptada(intento)) {
      mostrarAviso('No está en la lista de palabras');
      setTemblor((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    const rejilla = [...mio.rejilla];
    rejilla[indice] = (rejilla[indice] ?? '') + codificarIntento(intento, solucion);

    const nuevasEscritas = escritas.map((palabra, i) =>
      i === indice ? [...palabra, intento] : palabra
    );
    setEscritas(nuevasEscritas);
    guardarEscritasDuelo(dueloId, nuevasEscritas);
    setFilaAnimada(nuevasEscritas[indice].length - 1);

    const acertada = palabraAcertada(rejilla[indice]);
    const agotada = descodificarPalabra(rejilla[indice]).length >= MAX_INTENTOS;
    const cerrada = acertada || agotada;

    const cerradas = [...mio.cerradas];
    if (cerrada) cerradas[indice] = true;

    setFila({ letras: filaVacia(), cursor: 0 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (cerrada) {
      // Se aguanta en el tablero mientras se destapa la fila y se lee el aviso;
      // sólo después se pasa a la pantalla de espera.
      setRevelando(true);
      if (relojRevelado.current) clearTimeout(relojRevelado.current);
      relojRevelado.current = setTimeout(() => setRevelando(false), REVELADO_MS);

      // El aviso, cuando la fila ya ha terminado de girar.
      setTimeout(
        () =>
          mostrarAviso(
            acertada ? '¡Acertada!' : `La palabra era ${solucion.toUpperCase()}`
          ),
        LONGITUD * 240
      );
    }

    // Las letras van con el progreso: quien ya haya cerrado esta palabra podrá
    // verlas en la pantalla de espera. Pegadas en una cadena, que Firestore no
    // admite listas dentro de listas.
    const letras = mio.letras.map((palabra, i) =>
      i === indice ? (palabra ?? '') + intento : (palabra ?? '')
    );

    await enviarProgreso({ rejilla, cerradas, letras, puntos: puntosDeDuelo(rejilla) });
  }, [
    jugando,
    uid,
    fila,
    mio,
    indice,
    solucion,
    escritas,
    dueloId,
    elCerroLaRonda,
    mostrarAviso,
    enviarProgreso,
  ]);

  return {
    duelo,
    cargando,
    palabras,
    mio,
    suyo,
    rival,
    ronda,
    indice,
    solucion,
    terminado,
    esperando,
    revelando,
    transicion,
    yaCerreLaRonda,
    elCerroLaRonda,
    /** Mis intentos de la palabra en curso, con letras. */
    intentos: escritas[indice] ?? [],
    /** Los del rival, sólo colores. */
    suRejilla: suyo.rejilla[indice] ?? '',
    /** Sus letras. Sólo se enseñan cuando yo ya cerré esta palabra. */
    susLetras: descodificarLetras(suyo.letras?.[indice] ?? ''),
    borrador: fila.letras,
    cursor: fila.cursor,
    teclado: estadoTeclado(escritas[indice] ?? [], solucion),
    aviso,
    temblor,
    filaAnimada,
    segundos,
    jugando,
    escribir,
    borrar,
    irACasilla,
    enviar,
  };
}
