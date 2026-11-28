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

/**
 * Los avatares que se ganan con copas.
 *
 * Siguen siendo fichas dibujadas por la app, como los normales: no hay arte
 * que empaquetar ni imágenes que subir, que es lo que mantiene la app sin
 * almacenamiento y sin nada que declarar en Play.
 *
 * Lo que los hace distintos es que cada ficha lleva su propio color en vez de
 * repetir uno solo. Con cuatro tintas la rejilla deja de ser un cuadrado de
 * color y pasa a ser un dibujo, y se distingue de los 48 corrientes a simple
 * vista y en pequeño, que es donde se ven: 36 píxeles en la tabla.
 *
 * `copas` es lo que cuesta, y de ahí sale el nivel: 1 estáticos, 2 animados,
 * 3 legendarios. El orden de esta lista es el índice que se guarda, así que
 * los nuevos van al final y ninguno se borra: quitar uno le cambiaría el
 * avatar a quien lo llevara puesto.
 */
export type AvatarEspecial = {
  id: string;
  nombre: string;
  /** Copas que hacen falta para llevarlo. */
  copas: number;
  /** Una tinta por ficha, en orden de lectura. */
  tintas: readonly [string, string, string, string];
  /** Qué patrón de PATRONES_AVATAR rellena. */
  patron: number;
  /** Cómo se mueve. Los de una copa, nada. */
  animacion: 'ninguna' | 'latido' | 'cascada' | 'giro';
  /** Halo alrededor, sólo los legendarios. */
  aura?: boolean;
};

export const AVATARES_ESPECIALES: readonly AvatarEspecial[] = [
  // Una copa: estáticos, pero con cuatro tintas y el patrón lleno.
  {
    id: 'brasa',
    nombre: 'Brasa',
    copas: 1,
    tintas: ['#f0a202', '#e2724d', '#e05252', '#b8324f'],
    patron: 3,
    animacion: 'ninguna',
  },
  {
    id: 'marea',
    nombre: 'Marea',
    copas: 1,
    tintas: ['#3fb8a4', '#2f8fbf', '#5aa9e6', '#2f5fbf'],
    patron: 3,
    animacion: 'ninguna',
  },
  {
    id: 'musgo',
    nombre: 'Musgo',
    copas: 1,
    tintas: ['#8ec63f', '#3aa757', '#2f8f6b', '#1f6b4f'],
    patron: 3,
    animacion: 'ninguna',
  },
  {
    id: 'ciruela',
    nombre: 'Ciruela',
    copas: 1,
    tintas: ['#d479c6', '#a86fd4', '#7a4fc0', '#4f2f9c'],
    patron: 3,
    animacion: 'ninguna',
  },

  // Dos copas: los mismos materiales, ya en movimiento.
  {
    id: 'pulso',
    nombre: 'Pulso',
    copas: 2,
    tintas: ['#e05252', '#f0a202', '#e05252', '#f0a202'],
    patron: 3,
    animacion: 'latido',
  },
  {
    id: 'cascada',
    nombre: 'Cascada',
    copas: 2,
    tintas: ['#5aa9e6', '#3fb8a4', '#2f8fbf', '#8ec63f'],
    patron: 3,
    animacion: 'cascada',
  },
  {
    id: 'tramontana',
    nombre: 'Tramontana',
    copas: 2,
    tintas: ['#c9ced6', '#8fa0b8', '#5aa9e6', '#c9ced6'],
    patron: 3,
    animacion: 'giro',
  },
  {
    id: 'rescoldo',
    nombre: 'Rescoldo',
    copas: 2,
    tintas: ['#b8324f', '#e2724d', '#f0a202', '#7a1f33'],
    patron: 3,
    animacion: 'cascada',
  },

  // Tres copas: animados y con aura. Es el nivel que se ve desde la tabla.
  {
    id: 'eclipse',
    nombre: 'Eclipse',
    copas: 3,
    tintas: ['#1f1b2e', '#f3c64b', '#1f1b2e', '#f3c64b'],
    patron: 3,
    animacion: 'giro',
    aura: true,
  },
  {
    id: 'aurora',
    nombre: 'Aurora',
    copas: 3,
    tintas: ['#3fb8a4', '#8ec63f', '#5aa9e6', '#a86fd4'],
    patron: 3,
    animacion: 'cascada',
    aura: true,
  },
  {
    id: 'volcan',
    nombre: 'Volcán',
    copas: 3,
    tintas: ['#f3c64b', '#e05252', '#b8324f', '#f0a202'],
    patron: 3,
    animacion: 'latido',
    aura: true,
  },
  {
    id: 'abismo',
    nombre: 'Abismo',
    copas: 3,
    tintas: ['#2f5fbf', '#4f2f9c', '#2f8fbf', '#1a1033'],
    patron: 3,
    animacion: 'giro',
    aura: true,
  },
] as const;

export type Avatar = {
  /** Índice dentro de COLORES_AVATAR. */
  color: number;
  /** Índice dentro de PATRONES_AVATAR. */
  patron: number;
  /**
   * Índice dentro de AVATARES_ESPECIALES, si lleva uno ganado con copas.
   *
   * Opcional a propósito: los perfiles de antes de este parche no lo traen y
   * siguen valiendo tal cual. Cuando está, manda sobre `color` y `patron`, que
   * se quedan debajo como respaldo para cuando no le corresponde el especial.
   */
  especial?: number;
};

export const AVATAR_POR_DEFECTO: Avatar = { color: 0, patron: 0 };

export const TOTAL_AVATARES = COLORES_AVATAR.length * PATRONES_AVATAR.length;

/**
 * Deja el avatar dentro de rango, por si llega uno raro desde la base de datos.
 *
 * Esto sólo mira que los índices existan, no que le correspondan: si le toca o
 * no el especial depende de sus copas, y eso se decide en `rangos.ts`, que es
 * quien las sabe. Aquí se cae al avatar por defecto; allí, al normal suyo.
 *
 * Un `especial` que no existe se quita en vez de corregirse a cero: cero es un
 * avatar concreto, y ponerle a alguien uno que no eligió es peor que dejarle el
 * normal que ya tenía debajo.
 */
export function normalizarAvatar(avatar: Partial<Avatar> | null | undefined): Avatar {
  const color = Number(avatar?.color);
  const patron = Number(avatar?.patron);
  const especial = Number(avatar?.especial);
  const normal: Avatar = {
    color:
      Number.isInteger(color) && color >= 0 && color < COLORES_AVATAR.length
        ? color
        : AVATAR_POR_DEFECTO.color,
    patron:
      Number.isInteger(patron) && patron >= 0 && patron < PATRONES_AVATAR.length
        ? patron
        : AVATAR_POR_DEFECTO.patron,
  };
  if (
    avatar?.especial !== undefined &&
    Number.isInteger(especial) &&
    especial >= 0 &&
    especial < AVATARES_ESPECIALES.length
  ) {
    normal.especial = especial;
  }
  return normal;
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
