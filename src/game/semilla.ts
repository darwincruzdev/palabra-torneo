/**
 * Semilla de torneo: la cadena que hace que cada torneo tenga su propia
 * sucesión de palabras. Se genera al crear el torneo y no sale nunca de él,
 * porque quien la tenga puede calcular la palabra de cualquier día.
 */

const ALFABETO = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Semilla aleatoria de 24 caracteres. */
export function generarSemilla(): string {
  let semilla = '';
  for (let i = 0; i < 24; i++) {
    semilla += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return semilla;
}

/**
 * Hash FNV-1a de 32 bits. No es criptográfico: sólo hace falta que reparta
 * bien y que dé siempre el mismo número en todos los móviles, cosa que
 * `String.prototype.hashCode` o `Math.random` no garantizan.
 */
export function hash32(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    // Multiplicación por 16777619 en aritmética de 32 bits sin desbordar.
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/**
 * Cómo recorre un torneo la lista de soluciones: dónde empieza y de cuánto es
 * el salto entre un día y el siguiente.
 *
 * El salto se elige primo respecto del tamaño de la lista, que es lo que hace
 * que la sucesión pase por todas las palabras antes de repetir ninguna. El
 * punto de partida y el salto salen de la semilla, así que dos torneos
 * distintos llevan calendarios distintos.
 */
export function recorrido(semilla: string, total: number): { inicio: number; paso: number } {
  const inicio = hash32(`${semilla}:inicio`) % total;

  let paso = (hash32(`${semilla}:paso`) % total) + 1;
  // Buscamos hacia arriba el primer salto que sea primo con el total.
  while (mcd(paso, total) !== 1) {
    paso = (paso % total) + 1;
  }

  return { inicio, paso };
}
