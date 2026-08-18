import { LONGITUD } from './constantes';

/**
 * La fila que se está escribiendo: cinco huecos independientes, cada uno con
 * una letra o vacío.
 *
 * Se guarda así, y no como un texto que sólo crece por la derecha, para poder
 * tocar una casilla concreta y escribir ahí. Sirve para ir colocando las letras
 * que ya sabes —las verdes de intentos anteriores— y pensar la palabra alrededor.
 */
export type Fila = string[];

export function filaVacia(): Fila {
  return new Array(LONGITUD).fill('');
}

export function filaCompleta(fila: Fila): boolean {
  return fila.every((letra) => letra !== '');
}

/** Une la fila en una palabra. Los huecos vacíos desaparecen. */
export function texto(fila: Fila): string {
  return fila.join('');
}

/**
 * Dónde poner el cursor después de escribir una letra.
 *
 * Busca el siguiente hueco libre hacia la derecha y, si no queda ninguno, da la
 * vuelta y sigue por el principio. Así se rellena la palabra a saltos sin tener
 * que ir tocando casilla por casilla.
 */
export function siguienteHueco(fila: Fila, desde: number): number {
  for (let i = desde + 1; i < fila.length; i++) if (!fila[i]) return i;
  for (let i = 0; i <= desde; i++) if (!fila[i]) return i;
  return Math.min(desde + 1, fila.length - 1);
}

/** Escribe una letra en la posición del cursor y devuelve dónde queda éste. */
export function escribirEn(
  fila: Fila,
  cursor: number,
  letra: string
): { fila: Fila; cursor: number } {
  const nueva = [...fila];
  nueva[cursor] = letra;
  return { fila: nueva, cursor: siguienteHueco(nueva, cursor) };
}

/**
 * Retroceso.
 *
 * Si hay letra donde está el cursor, borra ésa y no se mueve: así se corrige
 * una casilla suelta sin perder el resto. Si el hueco ya estaba vacío, borra la
 * letra llena más cercana por la izquierda, que es lo que uno espera.
 */
export function borrarEn(fila: Fila, cursor: number): { fila: Fila; cursor: number } {
  const nueva = [...fila];

  if (nueva[cursor]) {
    nueva[cursor] = '';
    return { fila: nueva, cursor };
  }

  for (let i = cursor - 1; i >= 0; i--) {
    if (nueva[i]) {
      nueva[i] = '';
      return { fila: nueva, cursor: i };
    }
  }

  return { fila: nueva, cursor };
}
