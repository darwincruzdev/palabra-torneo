import { MAX_INTENTOS } from './constantes';
import { puntosDe } from './evaluar';
import { generarSemilla } from './semilla';
import type { RecordArcade, ResultadoPalabra } from '../tipos';

/** Cuántas palabras seguidas se juegan de una tirada. */
export const PALABRAS_POR_RONDA = 5;

/** Puntos de palabra de una ronda perfecta: las cinco al primer intento. */
export const PUNTOS_MAXIMOS = PALABRAS_POR_RONDA * puntosDe(1, true);

/**
 * Cada punto de palabra vale diez en el arcade.
 *
 * Sólo es un cambio de escala, y existe para hacerle sitio al tiempo. Con la
 * escala de siempre, la palabra más barata —acertar al sexto intento— vale 1
 * punto, y cualquier premio por tiempo que se notara pasaría por encima de ella.
 * Multiplicando por diez, esa palabra pasa a valer 10 y quedan nueve puntos
 * libres por debajo para repartir por rapidez.
 */
export const ESCALA = 10;

/**
 * Lo que puede llegar a valer el tiempo. Ni un punto más.
 *
 * Nueve es el techo matemático de esta norma: la palabra más barata vale 10, y
 * en cuanto el tiempo llegara a 10 una ronda rápida y floja podría ganarle a
 * una lenta con una palabra más. Con 9 eso es imposible por construcción, no
 * por suerte — y a la vez es todo lo que el tiempo puede pesar sin romper la
 * regla. No se puede ser más generoso con el reloj.
 */
export const BONUS_MAXIMO = ESCALA - 1;

/** Hasta aquí, el premio entero. Dos minutos son cinco palabras muy seguidas. */
export const SEGUNDOS_PLENO = 120;

/** Y a partir de aquí, nada. */
export const SEGUNDOS_NULO = 600;

/**
 * Lo que suma la rapidez de una ronda.
 *
 * Baja en línea recta entre los dos extremos, así que cada minuto que se
 * recorta se nota: no es un desempate escondido, es puntuación. Lo que no
 * puede hacer nunca es pagar una palabra, y de eso se encarga el tope.
 */
export function bonusDeTiempo(segundos: number): number {
  if (segundos <= SEGUNDOS_PLENO) return BONUS_MAXIMO;
  if (segundos >= SEGUNDOS_NULO) return 0;
  const queda = (SEGUNDOS_NULO - segundos) / (SEGUNDOS_NULO - SEGUNDOS_PLENO);
  return Math.round(BONUS_MAXIMO * queda);
}

/**
 * La puntuación de arcade de una marca: las palabras y, debajo, el reloj.
 *
 * Se calcula al vuelo en vez de guardarse, para que cambiar la curva del tiempo
 * vuelva a puntuar también las marcas viejas en lugar de dejar dos baremos
 * conviviendo en la misma tabla.
 */
export function totalDe(marca: RecordArcade): number {
  return marca.puntos * ESCALA + bonusDeTiempo(marca.segundos);
}

/** El techo: cinco a la primera y por debajo de dos minutos. */
export const TOTAL_MAXIMO = PUNTOS_MAXIMOS * ESCALA + BONUS_MAXIMO;

/**
 * Una semilla nueva para cada ronda.
 *
 * Sin ella el arcade repetiría siempre las mismas cinco palabras y dejaría de
 * ser un juego al segundo intento: bastaría con aprendérselas.
 */
export function semillaDeRonda(): string {
  return generarSemilla();
}

/** Los puntos de la ronda son los de siempre, palabra a palabra. */
export function puntosDeRonda(resultados: ResultadoPalabra[]): number {
  return resultados.reduce((suma, r) => suma + puntosDe(r.intentos, r.acertada), 0);
}

/** Intentos gastados en total, fallos incluidos. */
export function intentosDeRonda(resultados: ResultadoPalabra[]): number {
  return resultados.reduce((suma, r) => suma + r.intentos, 0);
}

/** Cuántas de las cinco cayeron. */
export function acertadasDeRonda(resultados: ResultadoPalabra[]): number {
  return resultados.filter((r) => r.acertada).length;
}

/**
 * La marca que deja una ronda terminada.
 *
 * El tiempo se guarda en segundos enteros: es lo que se enseña, y así dos
 * marcas idénticas no se desempatan por milésimas que nadie ve.
 */
export function marcaDeRonda(
  resultados: ResultadoPalabra[],
  milisegundos: number,
  fecha: string
): RecordArcade {
  return {
    puntos: puntosDeRonda(resultados),
    segundos: Math.max(1, Math.round(milisegundos / 1000)),
    acertadas: acertadasDeRonda(resultados),
    intentos: intentosDeRonda(resultados),
    fecha,
  };
}

/**
 * ¿La marca nueva vale más que la que había?
 *
 * Manda la puntuación de arcade, que ya lleva el tiempo dentro. Cuando dos
 * rondas empatan a total gana la que acertó más palabras, y si también empatan
 * ahí, la más rápida.
 */
export function esMejor(nueva: RecordArcade, previa: RecordArcade | null): boolean {
  if (!previa) return true;
  const a = totalDe(nueva);
  const b = totalDe(previa);
  if (a !== b) return a > b;
  if (nueva.acertadas !== previa.acertadas) return nueva.acertadas > previa.acertadas;
  return nueva.segundos < previa.segundos;
}

/**
 * Segundos en reloj: 45", 1:05, 12:30.
 *
 * Por debajo del minuto se enseñan los segundos a secas, que es como lo dice
 * todo el mundo — "lo he hecho en cuarenta segundos", no "en cero cero cuarenta".
 */
export function reloj(segundos: number): string {
  const enteros = Math.max(0, Math.floor(segundos));
  if (enteros < 60) return `${enteros}"`;
  const minutos = Math.floor(enteros / 60);
  const resto = enteros % 60;
  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

/**
 * Lo que se le dice a alguien al terminar, según lo que haya hecho.
 *
 * No es adorno: una ronda de arcade no tiene clasificación ni rival, así que
 * el único contrario es la marca propia y hay que nombrarla.
 */
export function comentarioDeRonda(marca: RecordArcade, previa: RecordArcade | null): string {
  if (!previa) return 'Primera marca. A partir de aquí, a superarla.';

  const ahora = totalDe(marca);
  const antes = totalDe(previa);
  if (ahora > antes) {
    const soloTiempo = marca.puntos === previa.puntos;
    return soloTiempo
      ? `Récord, y sin acertar más: ${previa.segundos - marca.segundos} segundos menos.`
      : `Récord: ${ahora - antes} puntos más que tu mejor ronda.`;
  }
  if (ahora === antes) return 'Clavas tu récord, pero no lo superas.';
  // No hace falta el caso de "acertó mejor pero tardó demasiado": no existe.
  // Un punto de palabra son diez y el reloj mueve nueve como mucho.
  return `Te faltan ${antes - ahora} puntos para tu récord.`;
}

/** El máximo de intentos que puede gastar una ronda entera. */
export const INTENTOS_MAXIMOS = PALABRAS_POR_RONDA * MAX_INTENTOS;
