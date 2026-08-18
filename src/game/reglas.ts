import type { Blueshell, DiaTorneo, Obligacion, ReglasTorneo } from '../tipos';
import { PALABRAS_PENALIZACION } from './constantes';
import { indiceDia } from './fecha';

/**
 * Cada cuántas jornadas se recargan la blueshell y la protección.
 *
 * Se cuenta desde la fundación del torneo, no desde que cada uno la gasta: así
 * todo el mundo recarga el mismo día y se puede decir en pantalla cuánto falta.
 */
export const JORNADAS_POR_CICLO = 15;

/** Las normas de la casa vienen puestas; quien no las quiera, las quita. */
export const REGLAS_POR_DEFECTO: ReglasTorneo = {
  penalizacionLider: true,
  blueshells: true,
};

/**
 * Los torneos creados antes de que existieran estas normas no tienen el campo.
 * Se les aplican las de siempre, que es lo que sus jugadores ya esperaban.
 */
export function normalizarReglas(reglas: Partial<ReglasTorneo> | undefined | null): ReglasTorneo {
  return {
    penalizacionLider: reglas?.penalizacionLider ?? REGLAS_POR_DEFECTO.penalizacionLider,
    blueshells: reglas?.blueshells ?? REGLAS_POR_DEFECTO.blueshells,
  };
}

/* ------------------------------------------------------------------ ciclos */

/** En qué ciclo de quince jornadas cae una fecha. El primero es el 0. */
export function ciclo(fechaInicio: string, fecha: string): number {
  return Math.floor((indiceDia(fecha) - indiceDia(fechaInicio)) / JORNADAS_POR_CICLO);
}

/** Jornadas que quedan para recargar, contando la de hoy. */
export function jornadasParaRecargar(fechaInicio: string, fecha: string): number {
  const transcurridas = indiceDia(fecha) - indiceDia(fechaInicio);
  const dentroDelCiclo = ((transcurridas % JORNADAS_POR_CICLO) + JORNADAS_POR_CICLO) % JORNADAS_POR_CICLO;
  return JORNADAS_POR_CICLO - dentroDelCiclo;
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
 * ¿Ya ha gastado su blueshell en el ciclo al que pertenece esta fecha?
 *
 * Se mira por el día en que se lanzó, no por el día al que golpea: si no,
 * disparar la víspera del reset descontaría del ciclo siguiente.
 */
export function blueshellGastada(
  dias: DiaTorneo[],
  fechaInicio: string,
  fecha: string,
  uid: string
): boolean {
  const cicloActual = ciclo(fechaInicio, fecha);
  return dias.some((dia) => {
    const mia = dia.blueshells?.[uid];
    return !!mia && ciclo(fechaInicio, mia.lanzada) === cicloActual;
  });
}

/** ¿Ya ha gastado su protección en el ciclo al que pertenece esta fecha? */
export function proteccionGastada(
  dias: DiaTorneo[],
  fechaInicio: string,
  fecha: string,
  uid: string
): boolean {
  const cicloActual = ciclo(fechaInicio, fecha);
  return dias.some(
    (dia) => dia.protecciones?.[uid] === true && ciclo(fechaInicio, dia.fecha) === cicloActual
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

/** Sin las blueshells: lo que queda tras usar la protección a media partida. */
export function sinBlueshells(obligaciones: Obligacion[]): Obligacion[] {
  return obligaciones.filter((o) => o.motivo !== 'blueshell');
}
