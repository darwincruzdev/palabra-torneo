/**
 * Avatares dibujados por la propia app: un color y un patrón de fichas.
 *
 * No se suben fotos a ninguna parte. Así no hace falta almacenamiento, no hay
 * nada que moderar y no hay que declarar tratamiento de imágenes en Play.
 */

export const COLORES_AVATAR = [
  '#3aa757', // verde de acierto
  '#e2a303', // ámbar de letra presente
  '#5aa9e6', // azul del cursor
  '#e05252', // rojo
  '#a86fd4', // morado
  '#e2724d', // teja
  '#3fb8a4', // turquesa
  '#c9ced6', // plata
] as const;

/**
 * Cada patrón es una rejilla de 2x2: qué casillas van llenas. Son las mismas
 * fichas del juego, en pequeño.
 */
export const PATRONES_AVATAR = [
  [true, false, false, true], // diagonal
  [true, true, false, true], // esquina
  [true, false, true, true], // ele
  [true, true, true, true], // lleno
  [false, true, true, false], // diagonal invertida
  [true, true, false, false], // fila
] as const;

export type Avatar = {
  /** Índice dentro de COLORES_AVATAR. */
  color: number;
  /** Índice dentro de PATRONES_AVATAR. */
  patron: number;
};

export const AVATAR_POR_DEFECTO: Avatar = { color: 0, patron: 0 };

export const TOTAL_AVATARES = COLORES_AVATAR.length * PATRONES_AVATAR.length;

/** Deja el avatar dentro de rango, por si llega uno raro desde la base de datos. */
export function normalizarAvatar(avatar: Partial<Avatar> | null | undefined): Avatar {
  const color = Number(avatar?.color);
  const patron = Number(avatar?.patron);
  return {
    color:
      Number.isInteger(color) && color >= 0 && color < COLORES_AVATAR.length
        ? color
        : AVATAR_POR_DEFECTO.color,
    patron:
      Number.isInteger(patron) && patron >= 0 && patron < PATRONES_AVATAR.length
        ? patron
        : AVATAR_POR_DEFECTO.patron,
  };
}

/** Un avatar de arranque distinto para cada persona, a partir de su uid. */
export function avatarInicial(uid: string): Avatar {
  let suma = 0;
  for (let i = 0; i < uid.length; i++) suma = (suma * 31 + uid.charCodeAt(i)) >>> 0;
  return {
    color: suma % COLORES_AVATAR.length,
    patron: Math.floor(suma / COLORES_AVATAR.length) % PATRONES_AVATAR.length,
  };
}

/** Todas las combinaciones, para la cuadrícula de elección del perfil. */
export function todosLosAvatares(): Avatar[] {
  const lista: Avatar[] = [];
  for (let patron = 0; patron < PATRONES_AVATAR.length; patron++) {
    for (let color = 0; color < COLORES_AVATAR.length; color++) {
      lista.push({ color, patron });
    }
  }
  return lista;
}
