import { MAX_INTENTOS } from './constantes';
import { puntosDe } from './evaluar';
import { generarSemilla } from './semilla';
import type { RecordArcade, ResultadoPalabra } from '../tipos';

/** Cuántas palabras seguidas se juegan de una tirada. */
export const PALABRAS_POR_RONDA = 5;

/** Lo máximo que se puede sacar en una ronda: las cinco al primer intento. */
export const PUNTOS_MAXIMOS = PALABRAS_POR_RONDA * puntosDe(1, true);

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
 * Primero los puntos, que es lo que mide si se acertó y en cuántos intentos.
 * El tiempo sólo desempata: si valiera por sí mismo saldría a cuenta rendirse
 * deprisa en las cinco palabras, y eso no es jugar mejor.
 */
export function esMejor(nueva: RecordArcade, previa: RecordArcade | null): boolean {
  if (!previa) return true;
  if (nueva.puntos !== previa.puntos) return nueva.puntos > previa.puntos;
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
  if (marca.puntos > previa.puntos) return `Récord: ${marca.puntos - previa.puntos} puntos más que tu mejor ronda.`;
  if (marca.puntos === previa.puntos && marca.segundos < previa.segundos) {
    return `Récord por tiempo: ${previa.segundos - marca.segundos} segundos menos.`;
  }
  if (marca.puntos === previa.puntos) return 'Empatas tus puntos, pero has tardado más.';
  return `Te faltan ${previa.puntos - marca.puntos} puntos para tu récord.`;
}

/** El máximo de intentos que puede gastar una ronda entera. */
export const INTENTOS_MAXIMOS = PALABRAS_POR_RONDA * MAX_INTENTOS;
