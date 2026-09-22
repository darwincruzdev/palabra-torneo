import type { DiaTorneo, Ulti } from '../tipos';
import { esSolucion } from './palabras';
import { mesDe } from './temporada';

/** Una al mes. Si fueran más dejaría de ser un acontecimiento. */
export const ULTIS_POR_MES = 1;

/** Una ulti con su autor, que en el documento va como clave del mapa. */
export type UltiLanzada = Ulti & { autor: string };

/**
 * Todas las ultis gastadas contra una jornada, en orden.
 *
 * Por día de lanzamiento y, a igualdad, por uid: el mismo orden arbitrario pero
 * idéntico en todos los móviles que ya usan las blueshells. Aquí importa más
 * que allí, porque de esta lista sale una única palabra para todo el torneo: si
 * cada cliente ordenara a su manera, dos personas jugarían palabras distintas.
 */
export function ultisDe(dia: DiaTorneo | undefined): UltiLanzada[] {
  const lanzadas = Object.entries(dia?.ultis ?? {}).map(([autor, ulti]) => ({
    ...ulti,
    autor,
  }));
  lanzadas.sort((a, b) =>
    a.lanzada !== b.lanzada ? a.lanzada.localeCompare(b.lanzada) : a.autor.localeCompare(b.autor)
  );
  return lanzadas;
}

/**
 * La ulti que manda en una jornada, si es que hay alguna.
 *
 * Sólo una por día: la app no deja gastar otra si ya la hay, pero dos personas
 * pueden pulsar a la vez y el servidor no puede impedirlo — el mapa lleva una
 * casilla por persona y cada cual sólo escribe la suya. Si pasa, vale la
 * primera, y la segunda se queda sin efecto.
 *
 * Se ignoran las palabras que no sean soluciones posibles. Es la misma defensa
 * que con las balas: el servidor no tiene el diccionario, así que la comprueba
 * quien la recibe.
 */
export function ultiDe(
  dia: DiaTorneo | undefined,
  reglas: { ulti: boolean }
): UltiLanzada | null {
  if (!reglas.ulti) return null;
  return ultisDe(dia).find((u) => esSolucion(u.palabra)) ?? null;
}

/**
 * La palabra que le toca a alguien en una jornada.
 *
 * A quien gastó la ulti le toca la normal: elige el problema de los demás, no
 * el suyo, y así no juega sabiendo nada que los otros no sepan de su propia
 * palabra. Al resto del torneo, la que eligió.
 */
export function solucionParaMi(
  solucionNormal: string,
  ulti: UltiLanzada | null,
  uid: string | null
): string {
  if (!ulti || ulti.autor === uid) return solucionNormal;
  return ulti.palabra;
}

/**
 * Ultis gastadas ese mes.
 *
 * Por el día en que se gastó y no por el día al que afecta, igual que las
 * balas: gastarla el 31 no puede robarle la del mes siguiente. Y lo anterior a
 * la fundación no cuenta, que es lo que hace que reiniciar la competición la
 * devuelva.
 */
export function ultisGastadas(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return dias.filter((dia) => {
    const mia = dia.ultis?.[uid];
    return !!mia && mia.lanzada >= fechaInicio && mesDe(mia.lanzada) === mes;
  }).length;
}

/** Las que le quedan este mes. Nunca por debajo de cero. */
export function ultisQueLeQuedan(
  dias: DiaTorneo[],
  fechaInicio: string,
  mes: string,
  uid: string
): number {
  return Math.max(0, ULTIS_POR_MES - ultisGastadas(dias, fechaInicio, mes, uid));
}

/**
 * Por qué no se puede gastar la ulti ahora mismo, o null si sí se puede.
 *
 * Devuelve el motivo en vez de un sí/no para poder decírselo a la persona: un
 * botón apagado sin explicación es lo que hace que la gente pregunte por
 * WhatsApp qué le pasa al juego.
 */
export function impedimentoParaUlti(datos: {
  activa: boolean;
  quedan: number;
  /** ¿Ya hay una gastada para mañana? */
  ocupada: boolean;
}): string | null {
  if (!datos.activa) return 'Este torneo juega sin ultis.';
  if (datos.quedan === 0) return 'Ya has gastado tu ulti este mes.';
  if (datos.ocupada) return 'Alguien se ha adelantado: mañana ya tiene palabra puesta.';
  return null;
}

/**
 * Qué le pasa a una palabra que se quiere poner de ulti, si es que le pasa algo.
 *
 * Se exige que sea una de las soluciones posibles y no cualquier palabra del
 * diccionario. Las soluciones son de uso corriente; el diccionario largo tiene
 * rarezas con las que el torneo entero sacaría cero, y eso no es picante, es
 * reventar la jornada.
 */
export function problemaConLaPalabra(palabra: string): string | null {
  if (palabra.length === 0) return 'Escribe una palabra.';
  if (!esSolucion(palabra)) {
    return 'Tiene que ser una palabra de las que el juego usa como solución. Prueba con una más corriente.';
  }
  return null;
}

/** El mensaje para picar al grupo por WhatsApp. La palabra no va, claro. */
export function mensajeDeUlti(datos: {
  torneo: string;
  autor: string;
  enlace?: string;
}): string {
  const base =
    `${datos.autor} ha gastado su ulti en ${datos.torneo}: mañana toda la jornada ` +
    `juega la palabra que ha elegido. Menos él, que juega la normal.`;
  return datos.enlace ? `${base}\n${datos.enlace}` : base;
}
