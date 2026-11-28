import {
  AVATARES_ESPECIALES,
  AVATAR_POR_DEFECTO,
  type Avatar,
  type AvatarEspecial,
} from './avatares';

/**
 * Lo que se gana con las copas: avatares y títulos.
 *
 * Nada de esto se guarda como "desbloqueado". Se deriva de cuántas copas
 * lleva, igual que el palmarés se deriva del historial: no hay un campo que
 * alguien pueda poner a mano para concederse un título, y si una jornada vieja
 * se corrige, lo que le corresponde se corrige solo.
 *
 * En Firestore sólo se guarda lo **elegido**: un avatar y un título. Que le
 * corresponda o no se comprueba aquí al pintarlo, porque el servidor no puede:
 * contar copas pide todos los días de todos sus torneos —cientos de
 * documentos— y las reglas de Firestore permiten diez lecturas por evaluación.
 * No es que se haya preferido validarlo en el cliente: es que no cabe en el
 * servidor.
 */

/** Las copas se cuentan sumando todos los torneos, no uno. */
export type Titulo = {
  id: string;
  nombre: string;
  copas: number;
};

/**
 * Los títulos, de menos a más.
 *
 * El de siete no tiene techo a propósito: es el último, y quien llegue ahí
 * sigue sumando copas sin que le cambie nada. Por eso la novena copa no saca
 * ningún aviso — no hay nada nuevo que contar.
 */
export const TITULOS: readonly Titulo[] = [
  { id: 'leyenda', nombre: 'Leyenda del Tablero', copas: 3 },
  { id: 'senor', nombre: 'Señor de las Cinco Letras', copas: 4 },
  { id: 'azote', nombre: 'Azote del Diccionario', copas: 5 },
  { id: 'emperador', nombre: 'Emperador del Torneo', copas: 6 },
  { id: 'indiscutible', nombre: 'Indiscutible Campeón del Mundo', copas: 7 },
] as const;

/** Las copas del título más alto: a partir de ahí ya no se desbloquea nada. */
export const COPAS_MAXIMAS = TITULOS[TITULOS.length - 1].copas;

/** El marco que rodea al avatar junto al nombre, si le toca alguno. */
export type Marco = 'aura' | 'oro' | null;

/**
 * De tres copas sale el aura; de siete, el marco dorado, que no tiene nadie
 * más. Van por copas y no por el avatar elegido: es un rango, no un adorno que
 * se pueda escoger, y por eso se ve aunque lleve puesto el avatar corriente.
 */
export function marcoDe(copas: number): Marco {
  if (copas >= 7) return 'oro';
  if (copas >= 3) return 'aura';
  return null;
}

/**
 * El marco que se le pinta a **otro**, a partir del título que lleva.
 *
 * De las copas de los demás no se sabe nada: salen de torneos en los que uno
 * puede no estar, y las reglas no dejan leer un torneo ajeno. Pero el título y
 * el marco salen de lo mismo, así que el título ya dice por dónde va: con
 * "Leyenda del Tablero" tiene tres copas lo menos, y con el último, siete.
 *
 * Para uno mismo se usa `marcoDe`, que cuenta de verdad.
 */
export function marcoDeTitulo(id: string | undefined | null): Marco {
  const titulo = tituloPorId(id);
  return titulo ? marcoDe(titulo.copas) : null;
}

/** Los avatares especiales que ya ha ganado. */
export function avataresDesbloqueados(copas: number): AvatarEspecial[] {
  return AVATARES_ESPECIALES.filter((a) => copas >= a.copas);
}

/** ¿Le corresponde este avatar especial? */
export function puedeLlevarEspecial(copas: number, indice: number | undefined): boolean {
  if (indice === undefined) return true;
  const especial = AVATARES_ESPECIALES[indice];
  return !!especial && copas >= especial.copas;
}

/** Los títulos que ya ha ganado, de menos a más. */
export function titulosDesbloqueados(copas: number): Titulo[] {
  return TITULOS.filter((t) => copas >= t.copas);
}

/**
 * El título que lleva si no ha elegido otro: siempre el más alto.
 *
 * Cada uno sustituye al anterior por defecto, que es lo que la gente espera al
 * subir de rango. Quedarse con uno de los viejos es una decisión suya, y por
 * eso hay que elegirlo a mano.
 */
export function tituloPorDefecto(copas: number): Titulo | null {
  const suyos = titulosDesbloqueados(copas);
  return suyos.length > 0 ? suyos[suyos.length - 1] : null;
}

/** ¿Le corresponde este título? */
export function puedeLlevarTitulo(copas: number, id: string | undefined): boolean {
  if (!id) return true;
  return titulosDesbloqueados(copas).some((t) => t.id === id);
}

/** Busca un título por su id, mire quien lo mire. */
export function tituloPorId(id: string | undefined | null): Titulo | null {
  if (!id) return null;
  return TITULOS.find((t) => t.id === id) ?? null;
}

/* ------------------------------------------------------------ al pintarlo */

export type Eleccion = {
  avatar: Avatar;
  /** El id del título elegido. Sin él se usa el que toque por defecto. */
  titulo?: string | null;
};

export type EleccionValida = {
  avatar: Avatar;
  titulo: Titulo | null;
};

/**
 * Lo que de verdad se le pinta a alguien, con sus copas en la mano.
 *
 * Es la defensa de la que hablaba arriba, y la única que hay: lo que llegue de
 * Firestore puede ser cualquier cosa, porque cada cual escribe su propio
 * documento. Si lleva puesto un avatar o un título que no le corresponde, se
 * cae a lo normal — el avatar corriente que lleva debajo, y sin título.
 *
 * Se cae sólo lo que sobra, no las dos cosas: a quien le corresponde el título
 * pero se ha puesto un avatar que no, se le respeta el título. Son dos premios
 * distintos y no hay razón para quitarle el que sí ganó.
 */
export function eleccionValida(copas: number, elegido: Eleccion): EleccionValida {
  const avatar: Avatar = puedeLlevarEspecial(copas, elegido.avatar.especial)
    ? elegido.avatar
    : { color: elegido.avatar.color, patron: elegido.avatar.patron };

  const pedido = tituloPorId(elegido.titulo);
  const titulo =
    pedido && puedeLlevarTitulo(copas, pedido.id) ? pedido : tituloPorDefecto(copas);

  return { avatar, titulo };
}

/** Lo mismo, para cuando ni siquiera hay perfil que mirar. */
export const ELECCION_POR_DEFECTO: EleccionValida = {
  avatar: AVATAR_POR_DEFECTO,
  titulo: null,
};

/* --------------------------------------------------------------- avisos */

export type Desbloqueo = {
  copas: number;
  /** Qué se gana al llegar ahí, ya escrito para enseñarlo. */
  avatares: AvatarEspecial[];
  titulo: Titulo | null;
  marco: Marco;
};

/**
 * Qué se ha desbloqueado al pasar de unas copas a otras.
 *
 * `antes` es hasta dónde se le avisó ya, no las copas que tenía: así el aviso
 * del lanzamiento —cuando no se le ha avisado de nada— le cuenta de una vez
 * todo lo que lleva ganado, y a partir de ahí sólo lo nuevo.
 *
 * Vacío significa que no hay nada que contar y no sale ningún aviso. Es lo que
 * pasa al ganar la octava copa: ya lo tenía todo.
 */
export function desbloqueosEntre(antes: number, ahora: number): Desbloqueo[] {
  const desbloqueos: Desbloqueo[] = [];
  for (let copas = antes + 1; copas <= ahora; copas++) {
    const avatares = AVATARES_ESPECIALES.filter((a) => a.copas === copas);
    const titulo = TITULOS.find((t) => t.copas === copas) ?? null;
    const marco = marcoDe(copas) !== marcoDe(copas - 1) ? marcoDe(copas) : null;
    if (avatares.length === 0 && !titulo && !marco) continue;
    desbloqueos.push({ copas, avatares, titulo, marco });
  }
  return desbloqueos;
}

/**
 * Hasta dónde hay que dar por avisado a alguien.
 *
 * Nunca baja. Las copas pueden bajar —un mes empatado que se decide al revés,
 * una jornada corregida—, y si esto bajara con ellas volvería a avisar de lo
 * mismo al recuperarlas.
 */
export function avisadasTrasVer(antes: number, copas: number): number {
  return Math.max(antes, copas);
}
