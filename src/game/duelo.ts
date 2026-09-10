import { LONGITUD, MAX_INTENTOS, PUNTOS_POR_INTENTO } from './constantes';
import { evaluar, type Marca } from './evaluar';
import { recorrido } from './semilla';
import solucionesJson from '../data/solutions.json';

const SOLUCIONES: string[] = solucionesJson as string[];

/**
 * Palabras que hay que adivinar en un duelo.
 *
 * Al mejor de tres: con diez la partida se hacía larguísima, y como el duelo va
 * palabra a palabra hay que esperarse al otro en cada una.
 */
export const PALABRAS_POR_DUELO = 3;

/**
 * Lo que le queda al rival cuando el otro termina la última palabra.
 *
 * Es lo que mete la prisa: puedes ir con calma acertando a la primera, pero si
 * te descuidas el otro acaba y te corta donde estés.
 */
export const SEGUNDOS_FINAL = 30;

/**
 * Cuánto aguanta una sala de la cola antes de darse por abandonada.
 *
 * Quien cierra la pestaña deja su sala colgada, y sin caducidad la cola se
 * llenaría de fantasmas: el que busca rival entraría en una sala donde no hay
 * nadie y se quedaría esperando para siempre.
 */
export const CADUCA_COLA_MS = 5 * 60 * 1000;

/**
 * Margen que se le da al rival por encima de sus treinta segundos.
 *
 * Quien espera da la palabra del otro por perdida pasado este rato. El margen
 * existe para no quitarle la palabra a alguien que la envió en el segundo
 * treinta y cuyo mensaje aún viaja por la red.
 */
export const GRACIA_ABANDONO_MS = 3000;

/**
 * Segundos que quedan, sacados del reloj y no de ir restando de uno en uno.
 *
 * Los navegadores frenan o paran los temporizadores de las pestañas que no se
 * están viendo. Restando un segundo por tic, salir de la pestaña congelaba la
 * cuenta y al volver marcaba más tiempo del que quedaba de verdad. Calculándolo
 * contra un instante final, al volver sale el número correcto aunque el
 * temporizador no haya corrido.
 */
export function segundosRestantes(fin: number, ahora: number): number {
  return Math.max(0, Math.ceil((fin - ahora) / 1000));
}

/**
 * ¿Hay que dar por cerrada la palabra del rival que no aparece?
 *
 * Quien cierra primero no puede depender del móvil del otro para seguir: si el
 * otro cierra el navegador, su cuenta atrás se congela y no llega a escribir
 * nada, y sin esto la partida se quedaba parada para siempre.
 */
export function rivalSeHaIdo(esperandoDesde: number, ahora: number): boolean {
  return ahora - esperandoDesde >= SEGUNDOS_FINAL * 1000 + GRACIA_ABANDONO_MS;
}

/** Lo mínimo que hace falta saber de una sala para elegir en cuál entrar. */
export type SalaEnCola = {
  id: string;
  retador?: { uid: string } | null;
  creado?: number;
};

/**
 * De las salas abiertas, con cuáles se puede emparejar y en qué orden.
 *
 * Se descartan la propia —nadie duela consigo mismo— y las abandonadas, y el
 * resto va de más antigua a más nueva: quien lleva más tiempo esperando entra
 * primero, que es lo justo y además vacía la cola en vez de dejar posos.
 */
export function rivalesPosibles(
  salas: SalaEnCola[],
  uid: string,
  ahora: number
): SalaEnCola[] {
  return salas
    .filter((s) => s.retador?.uid && s.retador.uid !== uid)
    .filter((s) => ahora - (s.creado ?? 0) < CADUCA_COLA_MS)
    .sort((a, b) => (a.creado ?? 0) - (b.creado ?? 0));
}

/**
 * Las diez palabras de un duelo, iguales para los dos jugadores.
 *
 * Salen de la semilla del duelo con el mismo recorrido que usan los torneos, así
 * que dos duelos distintos llevan palabras distintas.
 */
export function palabrasDeDuelo(semilla: string): string[] {
  const n = SOLUCIONES.length;
  const { inicio, paso } = recorrido(semilla, n);
  const palabras: string[] = [];
  for (let i = 0; i < PALABRAS_POR_DUELO; i++) {
    palabras.push(SOLUCIONES[(inicio + i * paso) % n]);
  }
  return palabras;
}

/* ------------------------------------------------ marcas sin letras -------- */

const A_CODIGO: Record<Marca, string> = {
  correcta: 'c',
  presente: 'p',
  ausente: 'a',
};

const DE_CODIGO: Record<string, Marca> = {
  c: 'correcta',
  p: 'presente',
  a: 'ausente',
};

/**
 * Un intento convertido en cinco letras de código.
 *
 * Es lo único que viaja al rival: los colores, nunca las letras. Así puede ver
 * cómo te va sin enterarse de qué has escrito.
 */
export function codificarIntento(intento: string, solucion: string): string {
  return evaluar(intento, solucion)
    .map((marca) => A_CODIGO[marca])
    .join('');
}

/** Devuelve las marcas de cada intento de una palabra, en bloques de cinco. */
export function descodificarPalabra(codificado: string): Marca[][] {
  const filas: Marca[][] = [];
  for (let i = 0; i + 5 <= codificado.length; i += 5) {
    const trozo = codificado.slice(i, i + 5);
    filas.push([...trozo].map((c) => DE_CODIGO[c] ?? 'ausente'));
  }
  return filas;
}

/**
 * Trocea en intentos las letras de una palabra.
 *
 * Van pegadas en una sola cadena porque Firestore no admite listas dentro de
 * listas. Todas las palabras miden cinco letras, así que se corta sin dudas.
 */
export function descodificarLetras(pegadas: string): string[] {
  const intentos: string[] = [];
  for (let i = 0; i + LONGITUD <= (pegadas ?? '').length; i += LONGITUD) {
    intentos.push(pegadas.slice(i, i + LONGITUD));
  }
  return intentos;
}

/** ¿Se acertó esa palabra? El último intento sería todo verde. */
export function palabraAcertada(codificado: string): boolean {
  const filas = descodificarPalabra(codificado);
  const ultima = filas[filas.length - 1];
  return Boolean(ultima) && ultima.every((m) => m === 'correcta');
}

/* -------------------------------------------------------- puntuación ------- */

/** Puntos de una palabra según los intentos gastados. */
export function puntosDePalabra(codificado: string): number {
  const intentos = descodificarPalabra(codificado).length;
  if (!palabraAcertada(codificado)) return 0;
  if (intentos < 1 || intentos > MAX_INTENTOS) return 0;
  return PUNTOS_POR_INTENTO[intentos - 1];
}

/** Puntos de todas las palabras jugadas hasta ahora. */
export function puntosDeDuelo(rejilla: string[]): number {
  return rejilla.reduce((suma, palabra) => suma + puntosDePalabra(palabra), 0);
}

/** Cuántas palabras se han cerrado ya, acertadas o agotadas. */
export function palabrasCerradas(rejilla: string[]): number {
  return rejilla.filter(
    (palabra) =>
      palabraAcertada(palabra) || descodificarPalabra(palabra).length >= MAX_INTENTOS
  ).length;
}

export type ResumenDuelo = {
  puntos: number;
  acertadas: number;
  cerradas: number;
  intentosTotales: number;
};

export function resumir(rejilla: string[]): ResumenDuelo {
  let acertadas = 0;
  let intentosTotales = 0;
  for (const palabra of rejilla) {
    const filas = descodificarPalabra(palabra);
    intentosTotales += filas.length;
    if (palabraAcertada(palabra)) acertadas++;
  }
  return {
    puntos: puntosDeDuelo(rejilla),
    acertadas,
    cerradas: palabrasCerradas(rejilla),
    intentosTotales,
  };
}

/**
 * Quién gana. Manda la puntuación; si empatan, el que haya gastado menos
 * intentos, que es la forma limpia de premiar la precisión.
 */
export function ganador(
  a: { uid: string; rejilla: string[] },
  b: { uid: string; rejilla: string[] }
): { uid: string | null; empate: boolean } {
  const ra = resumir(a.rejilla);
  const rb = resumir(b.rejilla);

  if (ra.puntos !== rb.puntos) {
    return { uid: ra.puntos > rb.puntos ? a.uid : b.uid, empate: false };
  }
  if (ra.intentosTotales !== rb.intentosTotales) {
    return { uid: ra.intentosTotales < rb.intentosTotales ? a.uid : b.uid, empate: false };
  }
  return { uid: null, empate: true };
}

/** Rejilla vacía para empezar un duelo. */
export function rejillaVacia(): string[] {
  return new Array(PALABRAS_POR_DUELO).fill('');
}

/* ------------------------------------------------------- rondas por palabra */

/**
 * El duelo va palabra a palabra, los dos a la vez.
 *
 * Una palabra se "cierra" al acertarla, al agotar los seis intentos o al
 * quedarse sin los treinta segundos. Hace falta guardarlo aparte de la rejilla:
 * si se dedujera de los intentos, una palabra cortada por tiempo sería
 * indistinguible de una a medias.
 */
export function cerradasVacias(): boolean[] {
  return new Array(PALABRAS_POR_DUELO).fill(false);
}

/** La primera palabra que este jugador no ha cerrado. 10 si ya cerró todas. */
export function primeraSinCerrar(cerradas: boolean[]): number {
  if (!Array.isArray(cerradas)) return 0;
  const i = cerradas.findIndex((c) => !c);
  return i === -1 ? PALABRAS_POR_DUELO : i;
}

/**
 * Deduce las palabras cerradas mirando sólo la rejilla.
 *
 * Es el respaldo para progresos guardados antes de que existiera el campo: en
 * cuanto se despliega una versión nueva hay clientes de las dos conviviendo, y
 * quedarse sin el campo no puede tumbar la pantalla.
 *
 * No distingue una palabra cortada por tiempo de una a medias, pero para no
 * romper nada es suficiente.
 */
export function deducirCerradas(rejilla: string[]): boolean[] {
  const lista = cerradasVacias();
  for (let i = 0; i < PALABRAS_POR_DUELO; i++) {
    const palabra = rejilla?.[i] ?? '';
    lista[i] = palabraAcertada(palabra) || descodificarPalabra(palabra).length >= MAX_INTENTOS;
  }
  return lista;
}

/**
 * Pone en forma un progreso que llega de la red, venga como venga.
 *
 * Rellena lo que falte y recorta lo que sobre, para que la pantalla no dependa
 * de que el otro jugador tenga exactamente la misma versión de la app.
 */
export function normalizarProgreso(bruto: unknown): {
  rejilla: string[];
  cerradas: boolean[];
  letras: string[];
  puntos: number;
} {
  const dato = (bruto ?? {}) as Record<string, unknown>;

  const rejilla = rejillaVacia();
  if (Array.isArray(dato.rejilla)) {
    for (let i = 0; i < PALABRAS_POR_DUELO; i++) {
      rejilla[i] = typeof dato.rejilla[i] === 'string' ? (dato.rejilla[i] as string) : '';
    }
  }

  let cerradas: boolean[];
  if (Array.isArray(dato.cerradas)) {
    cerradas = cerradasVacias();
    for (let i = 0; i < PALABRAS_POR_DUELO; i++) cerradas[i] = dato.cerradas[i] === true;
  } else {
    cerradas = deducirCerradas(rejilla);
  }

  const letras = rejillaVacia();
  if (Array.isArray(dato.letras)) {
    for (let i = 0; i < PALABRAS_POR_DUELO; i++) {
      const palabra = dato.letras[i];
      // Se tolera el formato viejo, que era una lista de intentos por palabra.
      if (typeof palabra === 'string') letras[i] = palabra;
      else if (Array.isArray(palabra)) {
        letras[i] = palabra.filter((p) => typeof p === 'string').join('');
      }
    }
  }

  const puntos =
    typeof dato.puntos === 'number' && Number.isFinite(dato.puntos)
      ? dato.puntos
      : puntosDeDuelo(rejilla);

  return { rejilla, cerradas, letras, puntos };
}

/**
 * La palabra que se está jugando en el duelo.
 *
 * Nadie se adelanta: hasta que los dos no cierran la palabra, no empieza la
 * siguiente. Así que la ronda es la primera que le falta a alguno de los dos.
 */
export function rondaDe(unas: boolean[], otras: boolean[]): number {
  return Math.min(primeraSinCerrar(unas), primeraSinCerrar(otras));
}

/**
 * ¿Toca cerrar la palabra porque se agotó el tiempo?
 *
 * La comprobación de la ronda es lo importante: al llegar a cero se cierra la
 * palabra y la ronda avanza, pero el contador sigue en cero un instante. Sin
 * mirar a qué palabra pertenecía, se cerraba también la siguiente sin jugarla.
 */
export function debeCerrarPorTiempo(
  cuenta: { ronda: number; quedan: number } | null,
  ronda: number,
  yaCerrada: boolean
): boolean {
  if (!cuenta || cuenta.quedan !== 0) return false;
  if (cuenta.ronda !== ronda) return false;
  return !yaCerrada;
}

/** ¿Se ha terminado el duelo? Cuando los dos han cerrado todas. */
export function dueloTerminado(unas: boolean[], otras: boolean[]): boolean {
  return rondaDe(unas, otras) >= PALABRAS_POR_DUELO;
}
