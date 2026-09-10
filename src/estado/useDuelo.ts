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
  cerradasVacias,
  codificarIntento,
  debeCerrarPorTiempo,
  descodificarLetras,
  descodificarPalabra,
  normalizarProgreso,
  rivalSeHaIdo,
  segundosRestantes,
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
import { PULLAS, PULLA_MS, RECARGA_PULLA_MS } from '../game/pullas';
import * as datos from '../firebase/duelos';

const AVISO_MS = 2200;

/**
 * Lo que se queda el tablero a la vista tras cerrar una palabra.
 *
 * Dos segundos: la fila tarda 1,2 en destaparse (cinco casillas en cascada) y
 * quedan 0,8 para leer cuál era la palabra antes de pasar a la espera.
 */
const REVELADO_MS = 2000;

/**
 * Lo que dura el repaso entre palabra y palabra.
 *
 * Cinco segundos: hay que leer cuál era la palabra y comparar los dos tableros
 * a la vez, que es donde se ve quién ha ido por dónde.
 */
const MOSTRAR_PALABRA_MS = 5000;

/**
 * El duelo, que va palabra a palabra y los dos a la vez.
 *
 * Nadie se adelanta: hasta que los dos no cierran la palabra de la ronda, no
 * empieza la siguiente. Quien la cierra primero se queda esperando y viendo la
 * rejilla del rival en grande, y al rival le entran treinta segundos.
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

  /**
   * Palabras que le doy por perdidas al rival porque se fue y no volvió.
   *
   * No se escriben en la base de datos: su progreso sólo lo puede tocar él, y
   * está bien que sea así. Esto es una decisión de este móvil para poder seguir
   * jugando, y cuadra sola: si vuelve, su propia cuenta atrás ya habrá vencido
   * y cerrará la palabra igual.
   */
  const [abandonadas, setAbandonadas] = useState<boolean[]>(cerradasVacias);

  const susCerradas = useMemo(
    () => suyo.cerradas.map((cerrada, i) => cerrada || abandonadas[i] === true),
    [suyo.cerradas, abandonadas]
  );

  const ronda = rondaDe(mio.cerradas, susCerradas);
  const indice = Math.min(ronda, PALABRAS_POR_DUELO - 1);
  const solucion = palabras[indice] ?? '';

  const yaCerreLaRonda = Boolean(mio.cerradas[indice]);
  const elCerroLaRonda = Boolean(susCerradas[indice]);
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
   * El repaso entre una palabra y la siguiente, que ven los dos a la vez.
   *
   * Se enseña cuál era la palabra —aunque no la haya sacado nadie— con los dos
   * tableros al lado, para comparar por dónde tiró cada uno. Arranca cuando la
   * ronda avanza, y la ronda sólo avanza cuando los dos han cerrado, así que a
   * los dos les salta casi en el mismo instante.
   *
   * Guarda el índice de la palabra que acaba de cerrarse, no la palabra suelta:
   * hace falta para sacar las letras de cada uno en esa ronda.
   */
  const [transicion, setTransicion] = useState<{
    palabra: string;
    indice: number;
  } | null>(null);

  const rondaPrevia = useRef<number | null>(null);
  const [pendiente, setPendiente] = useState<{ palabra: string; indice: number } | null>(
    null
  );

  useEffect(() => {
    const antes = rondaPrevia.current;
    rondaPrevia.current = ronda;
    if (antes === null || ronda <= antes) return;

    const palabra = palabras[antes];
    if (palabra) setPendiente({ palabra, indice: antes });
  }, [ronda, palabras]);

  /**
   * El repaso espera a que termine el revelado propio.
   *
   * Al segundo en cerrar, la ronda avanza en el mismo momento de enviar su
   * palabra: sin esta espera, el repaso le cortaría la animación de su propia
   * fila y no llegaría a ver si la había acertado.
   */
  useEffect(() => {
    if (!pendiente || revelando) return;
    setTransicion(pendiente);
    setPendiente(null);
  }, [pendiente, revelando]);

  useEffect(() => {
    if (!transicion) return;
    const reloj = setTimeout(() => setTransicion(null), MOSTRAR_PALABRA_MS);
    return () => clearTimeout(reloj);
  }, [transicion]);

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
   * Los treinta segundos.
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
    // Contra un instante final, no restando de uno en uno: al volver de otra
    // pestaña la cuenta sale correcta aunque el temporizador se haya parado.
    const fin = Date.now() + SEGUNDOS_FINAL * 1000;
    const refrescar = () =>
      setCuenta({ ronda: indice, quedan: segundosRestantes(fin, Date.now()) });
    refrescar();
    const tic = setInterval(refrescar, 250);
    return () => clearInterval(tic);
  }, [contrarreloj, indice]);

  /**
   * El otro lado del reloj: yo ya cerré y el rival no aparece.
   *
   * Su cuenta atrás vive sólo en su móvil, así que si cierra el navegador se le
   * congela y no llega a escribir nada. Sin esto, el que espera se quedaba
   * mirando la pantalla para siempre. Pasados sus treinta segundos más un
   * margen, esta partida da su palabra por perdida y sigue.
   */
  const esperandoAlOtro =
    yaCerreLaRonda && !elCerroLaRonda && !terminado && duelo?.estado === 'jugando';

  const esperaDesde = useRef<{ ronda: number; desde: number } | null>(null);

  useEffect(() => {
    if (!esperandoAlOtro) {
      esperaDesde.current = null;
      return;
    }
    // El ancla es la hora de este móvil, de principio a fin: comparar con el
    // reloj del otro se comería segundos en cuanto uno fuera descuadrado.
    if (esperaDesde.current?.ronda !== indice) {
      esperaDesde.current = { ronda: indice, desde: Date.now() };
    }
    const tic = setInterval(() => {
      const espera = esperaDesde.current;
      if (!espera || espera.ronda !== indice) return;
      if (!rivalSeHaIdo(espera.desde, Date.now())) return;
      setAbandonadas((previas) => {
        if (previas[indice]) return previas;
        const nuevas = [...previas];
        nuevas[indice] = true;
        return nuevas;
      });
    }, 500);
    return () => clearInterval(tic);
  }, [esperandoAlOtro, indice]);

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

  /* ------------------------------------------------------------- pullas */

  const [pulla, setPulla] = useState<string | null>(null);
  const [recargando, setRecargando] = useState(false);
  const [errorPulla, setErrorPulla] = useState<string | null>(null);
  /** El sello de la última pulla ya enseñada, para no repetirla en cada dibujado. */
  const ultimaPulla = useRef<number | null>(null);
  /**
   * El reloj que quita la carita de la pantalla.
   *
   * Va en una referencia y no en la limpieza del efecto porque el efecto
   * depende del duelo, y el duelo cambia con cada instantánea de la red —que
   * llegan a montones mientras el rival escribe—. Colgado de la limpieza, la
   * primera instantánea cancelaba el reloj y la carita se quedaba pegada.
   */
  const relojPulla = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (relojPulla.current) clearTimeout(relojPulla.current);
    },
    []
  );

  /**
   * Enseña la pulla del rival cuando llega una nueva.
   *
   * Se detecta por cambio de sello, no por lo reciente que sea: comparar la
   * hora del que envía con la del que recibe fallaría en cuanto un móvil
   * llevara el reloj descuadrado. En la primera instantánea sólo se anota el
   * sello, para que al volver a un duelo no salte una carita de hace media hora.
   */
  useEffect(() => {
    if (!duelo || !rival) return;
    const recibida = duelo.pullas?.[rival.uid];
    if (ultimaPulla.current === null) {
      ultimaPulla.current = recibida?.en ?? 0;
      return;
    }
    if (!recibida || recibida.en === ultimaPulla.current) return;
    ultimaPulla.current = recibida.en;
    setPulla(recibida.emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (relojPulla.current) clearTimeout(relojPulla.current);
    relojPulla.current = setTimeout(() => setPulla(null), PULLA_MS);
  }, [duelo, rival]);

  const tirarPulla = useCallback(
    (emoji: string) => {
      if (!uid || recargando) return;
      setRecargando(true);
      setErrorPulla(null);
      setTimeout(() => setRecargando(false), RECARGA_PULLA_MS);
      datos.enviarPulla(dueloId, uid, emoji).catch((e) => {
        // El detalle va a la consola; en pantalla, algo que se pueda leer.
        console.warn('No se ha podido enviar la pulla:', e);
        setErrorPulla('No ha salido. Puede que falten las reglas nuevas del servidor.');
      });
    },
    [dueloId, uid, recargando]
  );

  return {
    duelo,
    cargando,
    /** Las caritas que se le pueden tirar a quien sigue jugando. */
    pullas: PULLAS,
    /** La que acaba de tirarme el rival, mientras dura en pantalla. */
    pulla,
    /** Recién tirada una, se espera un momento antes de dejar tirar otra. */
    recargando,
    /** Por qué no salió la última, si es que no salió. */
    errorPulla,
    tirarPulla,
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
    /**
     * El repaso de la palabra que acaba de cerrarse, con los dos tableros ya
     * resueltos. La pantalla no tiene que descodificar nada.
     */
    transicion: transicion && {
      palabra: transicion.palabra,
      mias: escritas[transicion.indice] ?? [],
      suyas: descodificarLetras(suyo.letras?.[transicion.indice] ?? ''),
    },
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
