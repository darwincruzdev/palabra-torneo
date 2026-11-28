import type { DiaTorneo, Ulti } from '../tipos';
import { esAceptada } from './palabras';
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
 * Se ignoran las palabras que no estén en el diccionario. Es la misma defensa
 * que con las balas: el servidor no tiene el diccionario, así que la comprueba
 * quien la recibe. Vale cualquier palabra que el juego acepte como intento,
 * que es justo lo que se puede teclear al ponerla.
 */
export function ultiDe(
  dia: DiaTorneo | undefined,
  reglas: { ulti: boolean }
): UltiLanzada | null {
  if (!reglas.ulti) return null;
  return ultisDe(dia).find((u) => esAceptada(u.palabra)) ?? null;
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
 * Vale cualquier palabra del diccionario, la misma lista que se admite como
 * intento. Antes sólo valían las 2.500 soluciones, y eso rechazaba palabras
 * perfectamente corrientes: quien ponía la ulti no tenía forma de saber por
 * qué su palabra no entraba, porque esa lista no se enseña en ninguna parte.
 *
 * El precio es que ahora se puede imponer una rareza del diccionario largo y
 * dejar al torneo a cero. Es un riesgo aceptado: la ulti se gasta una vez al
 * mes y se sabe quién la ha puesto.
 */
export function problemaConLaPalabra(palabra: string): string | null {
  if (palabra.length === 0) return 'Escribe una palabra.';
  if (!esAceptada(palabra)) {
    return 'Esa palabra no está en el diccionario del juego. Revisa cómo se escribe.';
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

/* ------------------------------------------------------- cómo se anuncia */

/**
 * El autor no hay que guardarlo: ya se guarda.
 *
 * En el documento del día, `ultis` es un mapa indexado por uid, así que quien
 * la puso **es la clave**. `ultisDe` la saca de ahí y la deja en `autor`. Las
 * ultis de antes de este parche lo traen igual, porque nunca dejaron de
 * traerlo: lo que faltaba era decirlo en la pantalla de juego, que era la
 * única que anunciaba la ulti sin nombre.
 *
 * Lo que sí puede faltar es el **nombre**: al salir de un torneo se borra el
 * perfil, y la ulti sigue viva en una jornada ya jugada. En ese caso se dice
 * sin nombre, que es más honrado que inventarle un "alguien".
 */
export function etiquetaDeUlti(datos: { esMia: boolean; autor: string | null }): string {
  if (datos.esMia) return 'Tu ulti';
  return datos.autor ? `Ulti de ${datos.autor}` : 'Ulti';
}

/** Lo que se cuenta al tocar la etiqueta de la ulti en el tablero. */
export function avisoDeUlti(datos: {
  esMia: boolean;
  palabra: string;
  autor: string | null;
}): string {
  if (datos.esMia) {
    return `Hoy el torneo juega tu ${datos.palabra.toUpperCase()}. A ti te toca la normal.`;
  }
  const quien = datos.autor
    ? `Palabra elegida por ${datos.autor}`
    : 'Palabra elegida por otro jugador';
  return `${quien}: hoy no juegas la palabra del día, sino la suya.`;
}
