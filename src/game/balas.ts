import type { DiaTorneo, FilaClasificacion, Torneo } from '../tipos';
import { clasificacion } from './clasificacion';
import { sumarDias } from './fecha';
import { estaProtegido, todasLasBlueshells, type BlueshellLanzada } from './reglas';
import { mesDe } from './temporada';

/**
 * Quién se come las balas de una jornada.
 *
 * La bala no guarda víctima: se dispara "al que termine primero" y quién sea
 * eso no se sabe hasta que la jornada cierra. Antes se apuntaba el líder del
 * momento, y eso daba dos escenas absurdas:
 *
 *  - Vas segundo, disparas, luego juegas y adelantas. La bala se la come el que
 *    ha quedado segundo, que ya no lidera nada.
 *  - Disparas el día 31. La bala cae el día 1, cuando la tabla ya se ha
 *    reiniciado y el que iba primero en aquel mes puede ir último en éste.
 *
 * Aquí no hay nada que "cerrar" ni ningún proceso que pueda no ejecutarse: la
 * víctima se calcula del historial cada vez que hace falta, igual que los
 * trofeos y la clasificación. Si nadie abre la app en tres días, al abrirla
 * sale lo mismo que si la hubieran abierto cada noche.
 */

/**
 * El líder al cierre de una jornada.
 *
 * Cuenta el mes de esa jornada y hasta esa jornada incluida, así que una bala
 * del día 31 se resuelve con la tabla de ese mes y no toca jamás la del
 * siguiente. El día ya está cerrado, de modo que las faltas de ese día cuentan:
 * es la tabla definitiva de esa jornada, no la que se veía por la tarde.
 *
 * Empates: manda el mismo orden que la tabla —puntos, luego aciertos, luego
 * media de intentos—, que es el que la gente ve. Lo que no se usa es el orden
 * alfabético con el que la tabla separa filas idénticas: para pintar un puesto
 * vale, para elegir a quién se castiga sería un sorteo encubierto. Si dos
 * quedan iguales en los tres criterios no hay líder y la bala se pierde, igual
 * que la penalización del líder no se aplica cuando el primer puesto está
 * empatado.
 */
export function liderAlCierre(
  torneo: Torneo,
  dias: DiaTorneo[],
  fecha: string
): string | null {
  // El cierre es el instante siguiente al día: así entra la jornada entera.
  const cierre = sumarDias(fecha, 1);
  const filas = clasificacion(torneo, dias, {
    mes: mesDe(fecha),
    hasta: cierre,
    hoy: cierre,
  });
  return primeroDestacado(filas);
}

/** El primero de la tabla, o null si empata con el segundo hasta en la media. */
function primeroDestacado(filas: FilaClasificacion[]): string | null {
  const [primero, segundo] = filas;
  // Un mes en el que nadie ha sumado no tiene líder, igual que no tiene trofeo.
  if (!primero || primero.puntos <= 0) return null;
  if (!segundo) return primero.uid;
  const empatan =
    primero.puntos === segundo.puntos &&
    primero.aciertos === segundo.aciertos &&
    primero.mediaIntentos === segundo.mediaIntentos;
  return empatan ? null : primero.uid;
}

/** Una bala con su víctima ya resuelta. */
export type BalaResuelta = Omit<BlueshellLanzada, 'objetivo'> & {
  /** Quién se la come, o null si no se la come nadie. */
  objetivo: string | null;
  /** Por qué no se la come nadie, para poder contarlo en pantalla. */
  perdida: 'empate' | 'autor' | null;
};

/**
 * A quién le toca una bala concreta.
 *
 * Las balas viejas traen la víctima escrita de cuando se elegía al disparar.
 * Ésas se respetan tal cual: su jornada ya se jugó con esa víctima, y
 * recalcularla ahora cambiaría partidas terminadas. Las nuevas se resuelven.
 */
export function resolverBala(
  bala: BlueshellLanzada,
  torneo: Torneo,
  dias: DiaTorneo[]
): BalaResuelta {
  if (bala.objetivo) return { ...bala, objetivo: bala.objetivo, perdida: null };

  const lider = liderAlCierre(torneo, dias, bala.lanzada);
  if (!lider) return { ...bala, objetivo: null, perdida: 'empate' };

  /**
   * Nadie se dispara a sí mismo, y la bala se pierde.
   *
   * No se devuelve a propósito. Disparar deja de ser gratis: si vas primero y
   * la jornada está a punto de cerrar, tirar es apostar a que alguien te
   * adelante. Devolverla quitaría esa decisión y dejaría además un recuento
   * que nadie entiende — "tiré la bala y me siguen quedando dos".
   */
  if (lider === bala.autor) return { ...bala, objetivo: null, perdida: 'autor' };

  return { ...bala, objetivo: lider, perdida: null };
}

/** Todas las balas que caen en una jornada, ya resueltas y en orden. */
export function balasDeLaJornada(
  dia: DiaTorneo | undefined,
  torneo: Torneo,
  dias: DiaTorneo[]
): BalaResuelta[] {
  return todasLasBlueshells(dia).map((bala) => resolverBala(bala, torneo, dias));
}

/**
 * Las balas que le caen a alguien en una jornada.
 *
 * Varias en el mismo día se acumulan, como siempre: cada una ocupa un intento.
 */
export function balasContra(
  dia: DiaTorneo | undefined,
  torneo: Torneo,
  dias: DiaTorneo[],
  uid: string
): BalaResuelta[] {
  return balasDeLaJornada(dia, torneo, dias).filter((b) => b.objetivo === uid);
}

/**
 * Las que de verdad obligan. El escudo no para una: las para todas las de esa
 * jornada, por muchas que le hayan tirado.
 */
export function balasEfectivas(
  dia: DiaTorneo | undefined,
  torneo: Torneo,
  dias: DiaTorneo[],
  uid: string
): BalaResuelta[] {
  if (estaProtegido(dia, uid)) return [];
  return balasContra(dia, torneo, dias, uid);
}
