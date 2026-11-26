import { hash32 } from './semilla';

/**
 * Colores de emblema, los mismos de los avatares.
 *
 * Salen del id del torneo: no hay que guardarlos, y el mismo torneo se ve
 * igual en todos los móviles.
 */
export const COLORES_EMBLEMA = [
  '#a86fd4', // morado
  '#e2724d', // teja
  '#3fb8a4', // turquesa
  '#5aa9e6', // azul
  '#e05252', // rojo
  '#e2a303', // ámbar
  '#3aa757', // verde
  '#c9ced6', // plata
] as const;

/** Un color estable para un torneo, a partir de su id. */
export function colorDeTorneo(id: string): string {
  return COLORES_EMBLEMA[hash32(id) % COLORES_EMBLEMA.length];
}

/**
 * Dos letras para el emblema.
 *
 * "Familia Cruz" → FC, "Los del curro" → LC, "Pádel" → PÁ. La primera palabra
 * y la última: las del medio ("del", "de") no cambian las siglas.
 */
export function inicialesDe(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 0);
  if (partes.length === 0) return '·';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
