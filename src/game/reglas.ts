import type { Blueshell, DiaTorneo, Obligacion, ReglasTorneo } from '../tipos';
import { PALABRAS_PENALIZACION } from './constantes';
import { hash32 } from './semilla';
import { mesDe } from './temporada';

/**
 * Balas y escudos que tiene cada uno por mes.
 *
 * Se recargan el día 1, a la vez que se reinicia la clasificación: la munición
 * es de la temporada, igual que los puntos. Son dos y no una porque es el ritmo
 * que ya había —una cada quince jornadas—, sólo que ahora atado al calendario
 * en vez de a un contador propio.
 */
/**
 * Vocales que se toleran en la palabra de apertura.
 *
 * Con cuatro vocales y una consonante se barre medio abecedario de un tirón y
 * la primera tirada deja de ser una apuesta. Sólo hay veinticuatro palabras así
 * en toda la lista, y cuatro de ellas pueden ser la solución del día: por eso
 * la norma sólo cierra el primer intento, no la palabra.
 */
export const MAX_VOCALES_AL_ABRIR = 3;

const VOCALES = 'aeiou';

/** Cuántas vocales tiene una palabra ya normalizada. La ñ no lo es. */
export function cuentaVocales(palabra: string): number {
  return [...palabra].filter((letra) => VOCALES.includes(letra)).length;
}

/** ¿Se pasa de vocales para abrir con ella? */
export function demasiadasVocales(palabra: string): boolean {
  return cuentaVocales(palabra) > MAX_VOCALES_AL_ABRIR;
}

/**
 * Una letra de la palabra, para quien va último.
 *
 * Sale de un hash y no de un sorteo: tiene que salir la misma letra cada vez
 * que se abra la pantalla, o recargando se irían pescando letras hasta tenerlas
 * todas. Con la fecha, el torneo y el uid dentro de la semilla, a cada persona
 * le toca la suya y cambia cada día.
 *
 * Se elige entre las letras distintas: en "cocos" no tiene sentido que la O
 * salga el doble de veces que la C.
 */
export function pistaDe(solucion: string, semilla: string): string | null {
  const letras = [...new Set(solucion)].sort();
  if (letras.length === 0) return null;
  return letras[hash32(semilla) % letras.length];
}

export const BLUESHELLS_POR_MES = 2;
export const PROTECCIONES_POR_MES = 2;

/** Las normas de la casa vienen puestas; quien no las quiera, las quita. */
export const REGLAS_POR_DEFECTO: ReglasTorneo = {
  penalizacionLider: true,
  blueshells: true,
  faltaPorNoJugar: true,
  // Automático por defecto: es lo que ya hacía, y un torneo que no toque nada
  // no puede quedarse con trofeos esperando a que alguien decida.
  desempateManual: false,
  sinVocalesAlAbrir: true,
  ayudaAlUltimo: true,
};

/**
 * Los torneos creados antes de que existieran estas normas no tienen el campo.
 * Se les aplican las de siempre, que es lo que sus jugadores ya esperaban.
 */
export function normalizarReglas(reglas: Partial<ReglasTorneo> | undefined | null): ReglasTorneo {
  return {
    penalizacionLider: reglas?.penalizacionLider ?? REGLAS_POR_DEFECTO.penalizacionLider,
    blueshells: reglas?.blueshells ?? REGLAS_POR_DEFECTO.blueshells,
    faltaPorNoJugar: reglas?.faltaPorNoJugar ?? REGLAS_POR_DEFECTO.faltaPorNoJugar,
    desempateManual: reglas?.desempateManual ?? REGLAS_POR_DEFECTO.desempateManual,
    sinVocalesAlAbrir:
      reglas?.sinVocalesAlAbrir ?? REGLAS_POR_DEFECTO.sinVocalesAlAbrir,
    ayudaAlUltimo: reglas?.ayudaAlUltimo ?? REGLAS_POR_DEFECTO.ayudaAlUltimo,
  };
}

/* -------------------------------------------------------------- blueshells */

/** Una blueshell con su autor, que en el documento va como clave del mapa. */
export type BlueshellLanzada = Blueshell & { autor: string };

/**
 * Las blueshells que caen sobre alguien en una jornada, en el orden en que
 * obligan.
 *
 * Se ordenan por el día en que se lanzaron y, a igualdad, por el uid del autor.
 * Es un orden arbitrario pero idéntico en todos los móviles, que es lo que hace
 * falta: si cada cliente las pusiera en otro orden, dos personas verían
 * palabras obligatorias distintas para el mismo intento.
 */
export function blueshellsContra(dia: DiaTorneo | undefined, uid: string): BlueshellLanzada[] {
  const lanzadas = Object.entries(dia?.blueshells ?? {})
    .map(([autor, blueshell]) => ({ ...blueshell, autor }))
    .filter((b) => b.objetivo === uid);

  lanzadas.sort((a, b) =>
    a.lanzada !== b.lanzada ? a.lanzada.localeCompare(b.lanzada) : a.autor.localeCompare(b.autor)
  );
  return lanzadas;
}

/**
 * Todas las balas de una jornada, tirara quien las tirara.
 *
 * Es lo que hace falta para que el grupo se entere: una blueshell lanzada a
 * escondidas no tiene ninguna gracia, y hasta ahora sólo la descubría quien la
 * recibía, y encima al llegar al segundo intento.
 */
export function todasLasBlueshells(dia: DiaTorneo | undefined): BlueshellLanzada[] {
  const lanzadas = Object.entries(dia?.blueshells ?? {}).map(([autor, b]) => ({
    ...b,
    autor,
  }));
  lanzadas.sort((a, b) =>
    a.lanzada !== b.lanzada ? a.lanzada.localeCompare(b.lanzada) : a.autor.localeCompare(b.autor)
  );
  return lanzadas;
}

/** ¿Gastó su protección en esta jornada? */
export function estaProtegido(dia: DiaTorneo | undefined, uid: string): boolean {
  return dia?.protecciones?.[uid] === true;
}

/**
 * Las blueshells que de verdad obligan. La protección no para una: las para
 * todas las de esa jornada, por muchas que le hayan tirado.
 */
export function blueshellsEfectivas(
  dia: DiaTorneo | undefined,
  uid: string
): BlueshellLanzada[] {
  if (estaProtegido(dia, uid)) return [];
  return blueshellsContra(dia, uid);
}

/**
 * Balas que ha gastado ese mes.
 *
 * Se cuenta por el día en que se disparó, no por el día al que golpea: si no,
 * disparar el 31 le quitaría una bala al mes siguiente. Y lo anterior a la
 * fundación no cuenta, que es lo que hace que reiniciar la competición devuelva
 * la munición.
 */
export function blueshellsGastadas(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return dias.filter((dia) => {
    const mia = dia.blueshells?.[uid];
    return !!mia && mia.lanzada >= fechaInicio && mesDe(mia.lanzada) === mes;
  }).length;
}

/** Escudos que ha gastado ese mes. */
export function proteccionesGastadas(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return dias.filter(
    (dia) =>
      dia.protecciones?.[uid] === true &&
      dia.fecha >= fechaInicio &&
      mesDe(dia.fecha) === mes
  ).length;
}

/** Las que le quedan por gastar este mes. Nunca por debajo de cero. */
export function balasQueLeQuedan(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return Math.max(0, BLUESHELLS_POR_MES - blueshellsGastadas(dias, fechaInicio, mes, uid));
}

export function escudosQueLeQuedan(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return Math.max(
    0,
    PROTECCIONES_POR_MES - proteccionesGastadas(dias, fechaInicio, mes, uid)
  );
}

/* ---------------------------------------------------------- obligaciones */

/**
 * Qué está obligado a escribir alguien en cada intento de una jornada.
 *
 * La penalización del líder ocupa el primer intento y cada blueshell ocupa el
 * siguiente hueco: con dos blueshells, el segundo y el tercero. Así el juego no
 * sabe nada de líderes ni de balas, sólo pregunta "¿qué me obligan a poner en
 * este intento?".
 */
export function obligacionesDe(opciones: {
  reglas: ReglasTorneo;
  /** ¿Lidera en solitario y por tanto arrastra la penalización? */
  liderando: boolean;
  blueshells: BlueshellLanzada[];
}): Obligacion[] {
  const { reglas, liderando, blueshells } = opciones;
  const obligaciones: Obligacion[] = [];

  if (reglas.penalizacionLider && liderando) {
    obligaciones.push({
      indice: 0,
      palabras: [...PALABRAS_PENALIZACION],
      motivo: 'lider',
    });
  }

  if (reglas.blueshells) {
    // Siempre a partir del segundo intento, lleve o no penalización el primero:
    // la norma dice "de segunda opción".
    blueshells.forEach((b, i) => {
      obligaciones.push({
        indice: 1 + i,
        palabras: [b.palabra],
        motivo: 'blueshell',
        autor: b.autor,
      });
    });
  }

  return obligaciones;
}

/** La obligación que toca en un intento, si la hay. */
export function obligacionEn(
  obligaciones: Obligacion[],
  indice: number
): Obligacion | null {
  return obligaciones.find((o) => o.indice === indice) ?? null;
}

/** ¿Vale esta palabra para la obligación? */
export function cumple(obligacion: Obligacion, intento: string): boolean {
  return obligacion.palabras.includes(intento);
}

/** El texto con el que se le cuenta al grupo que ha volado una bala. */
export function mensajeDeBlueshell(datos: {
  torneo: string;
  autor: string;
  objetivo: string;
  palabra: string;
  enlace?: string;
}): string {
  const cuerpo =
    `🔵 BLUESHELL en "${datos.torneo}"

` +
    `${datos.autor} le ha tirado una bala a ${datos.objetivo}.
` +
    `Mañana está obligado a usar ${datos.palabra.toUpperCase()} como segunda palabra.

` +
    'Le queda el escudo, si se atreve a gastarlo.';
  return datos.enlace ? `${cuerpo}

${datos.enlace}` : cuerpo;
}

/** Sin las blueshells: lo que queda tras usar la protección a media partida. */
export function sinBlueshells(obligaciones: Obligacion[]): Obligacion[] {
  return obligaciones.filter((o) => o.motivo !== 'blueshell');
}
