import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LONGITUD, MAX_INTENTOS } from '../game/constantes';
import {
  ESCALA,
  PALABRAS_POR_RONDA,
  marcaDeRonda,
  puntosDeRonda,
  semillaDeRonda,
  totalDe,
} from '../game/arcade';
import { estadoTeclado, puntosDe } from '../game/evaluar';
import { fechaJuego } from '../game/fecha';
import { borrarEn, escribirEn, filaVacia, texto } from '../game/fila';
import { normalizar } from '../game/normalizar';
import { esAceptada, palabrasDeRonda } from '../game/palabras';
import type { RecordArcade, ResultadoPalabra } from '../tipos';
import { useApp } from './AppContext';

const AVISO_MS = 1800;
/** Lo que se deja ver la palabra antes de pasar a la siguiente. */
const PAUSA_MS = 1400;

type Ronda = {
  semilla: string;
  palabras: string[];
  /** En cuál vamos, de 0 a 4. */
  indice: number;
  /** Lo que dio cada palabra ya cerrada. */
  resultados: ResultadoPalabra[];
  /** Los intentos escritos en la palabra en curso. */
  intentos: string[];
  empezada: number;
  terminada: number | null;
};

function rondaNueva(): Ronda {
  const semilla = semillaDeRonda();
  return {
    semilla,
    palabras: palabrasDeRonda(semilla, PALABRAS_POR_RONDA),
    indice: 0,
    resultados: [],
    intentos: [],
    empezada: Date.now(),
    terminada: null,
  };
}

/**
 * Una ronda de arcade: cinco palabras seguidas contra el reloj.
 *
 * No se guarda a medias a propósito. Es una carrera: si se deja a la mitad se
 * pierde, y esa es justamente la tensión que la diferencia de la palabra del
 * día, que espera ahí todo el día a que vuelvas.
 */
export function useArcade() {
  const { recordArcade, guardarRecordArcade } = useApp();

  const [ronda, setRonda] = useState<Ronda>(rondaNueva);
  const [fila, setFila] = useState<{ letras: string[]; cursor: number }>(() => ({
    letras: filaVacia(),
    cursor: 0,
  }));
  const [aviso, setAviso] = useState<string | null>(null);
  const [temblor, setTemblor] = useState(0);
  const [filaAnimada, setFilaAnimada] = useState<number | null>(null);
  /** Entre palabra y palabra: se ve la que era y no se puede escribir. */
  const [revelando, setRevelando] = useState(false);
  /** Segundos transcurridos, para el reloj de la cabecera. */
  const [segundos, setSegundos] = useState(0);
  /**
   * La marca a batir, congelada al empezar la ronda.
   *
   * Si se leyera la de siempre, al guardar el récord cambiaría bajo los pies y
   * el mensaje final acabaría comparándose consigo mismo.
   */
  const [aBatir] = useState<RecordArcade | null>(recordArcade);

  const relojAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const relojPaso = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Para no guardar dos veces la misma ronda si la pantalla se redibuja. */
  const guardada = useRef(false);

  const palabra = ronda.palabras[ronda.indice];
  const terminada = ronda.terminada !== null;

  const mostrarAviso = useCallback((mensaje: string) => {
    setAviso(mensaje);
    if (relojAviso.current) clearTimeout(relojAviso.current);
    relojAviso.current = setTimeout(() => setAviso(null), AVISO_MS);
  }, []);

  // El reloj de pantalla. Va a segundo por segundo porque es lo que se enseña;
  // el tiempo bueno se mide con las marcas de inicio y fin, no contando ticks.
  useEffect(() => {
    if (terminada) return;
    const id = setInterval(
      () => setSegundos(Math.floor((Date.now() - ronda.empezada) / 1000)),
      500
    );
    return () => clearInterval(id);
  }, [ronda.empezada, terminada]);

  useEffect(
    () => () => {
      if (relojAviso.current) clearTimeout(relojAviso.current);
      if (relojPaso.current) clearTimeout(relojPaso.current);
    },
    []
  );

  const marca = terminada
    ? marcaDeRonda(ronda.resultados, (ronda.terminada ?? 0) - ronda.empezada, fechaJuego())
    : null;

  // Guardar el récord, una sola vez y sólo si mejora.
  useEffect(() => {
    if (!marca || guardada.current) return;
    guardada.current = true;
    guardarRecordArcade(marca);
  }, [marca, guardarRecordArcade]);

  const jugando = !terminada && !revelando;

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
    (indice: number) => {
      if (!jugando || indice < 0 || indice >= LONGITUD) return;
      setFila((actual) => ({ ...actual, cursor: indice }));
    },
    [jugando]
  );

  const enviar = useCallback(() => {
    if (!jugando) return;
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

    const intentos = [...ronda.intentos, intento];
    const acertada = intento === palabra;
    const agotados = intentos.length >= MAX_INTENTOS;

    setRonda((previa) => ({ ...previa, intentos }));
    setFila({ letras: filaVacia(), cursor: 0 });
    setFilaAnimada(intentos.length - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (!acertada && !agotados) return;

    // Palabra cerrada: se enseña un momento y se pasa a la siguiente.
    setRevelando(true);
    mostrarAviso(
      acertada
        ? `+${puntosDe(intentos.length, true)} puntos`
        : `Era ${palabra.toUpperCase()}`
    );

    relojPaso.current = setTimeout(() => {
      setRevelando(false);
      setFilaAnimada(null);
      setRonda((previa) => {
        const resultados = [...previa.resultados, { intentos: intentos.length, acertada }];
        const ultima = previa.indice + 1 >= PALABRAS_POR_RONDA;
        return {
          ...previa,
          resultados,
          intentos: [],
          indice: ultima ? previa.indice : previa.indice + 1,
          terminada: ultima ? Date.now() : null,
        };
      });
    }, PAUSA_MS);
  }, [jugando, fila.letras, ronda.intentos, palabra, mostrarAviso]);

  /** Otra ronda, de cero y con palabras nuevas. */
  const otraVez = useCallback(() => {
    if (relojPaso.current) clearTimeout(relojPaso.current);
    guardada.current = false;
    setRonda(rondaNueva());
    setFila({ letras: filaVacia(), cursor: 0 });
    setFilaAnimada(null);
    setRevelando(false);
    setSegundos(0);
    setAviso(null);
  }, []);

  return {
    /** De 1 a 5, para la cabecera. */
    numero: ronda.indice + 1,
    /** Cuántas palabras tiene la ronda. */
    palabras: PALABRAS_POR_RONDA,
    palabra,
    intentos: ronda.intentos,
    resultados: ronda.resultados,
    /**
     * Lo llevado hasta ahora, ya en puntos de arcade.
     *
     * Durante la ronda son sólo las palabras: lo que suma el reloj no se sabe
     * hasta que se para, y enseñarlo bajando en directo sería mentir a medias.
     */
    puntos: puntosDeRonda(ronda.resultados) * ESCALA,
    /** El total de verdad, con el tiempo dentro. Sólo al terminar. */
    total: marca ? totalDe(marca) : null,
    segundos: terminada && marca ? marca.segundos : segundos,
    terminada,
    revelando,
    marca,
    /** La marca que había antes de esta ronda, para poder decir si se ha batido. */
    aBatir,
    borrador: fila.letras,
    cursor: fila.cursor,
    teclado: estadoTeclado(ronda.intentos, palabra),
    filaAnimada,
    temblor,
    aviso,
    escribir,
    borrar,
    enviar,
    irACasilla,
    otraVez,
  };
}
