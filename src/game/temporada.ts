import type { DiaTorneo } from '../tipos';
import { fechaJuego } from './fecha';

/**
 * La temporada es el mes natural.
 *
 * La clasificación se pone a cero el día 1, quien va primero al acabar el mes
 * se lleva un trofeo, y a final de año gana quien más trofeos tenga. Todo se
 * deduce del historial de jornadas: no hay nada que un servidor tenga que
 * cerrar a medianoche ni que alguien tenga que escribir a mano, así que no
 * puede quedarse a medias ni manipularse.
 */

/** El mes de una fecha: "2026-08-14" -> "2026-08". */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/** El año de un mes: "2026-08" -> "2026". */
export function anoDe(mes: string): string {
  return mes.slice(0, 4);
}

/** Primer día del mes: "2026-08" -> "2026-08-01". */
export function primerDiaDelMes(mes: string): string {
  return `${mes}-01`;
}

/** Último día del mes, contando bisiestos: "2026-02" -> "2026-02-28". */
export function ultimoDiaDelMes(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  // El día 0 del mes siguiente es el último del actual, y el mes 12 en base
  // cero es enero del año que viene, así que diciembre también sale bien.
  const ultimo = new Date(Date.UTC(ano, numero, 0));
  return ultimo.toISOString().slice(0, 10);
}

/** El mes siguiente: "2026-12" -> "2027-01". */
export function mesSiguiente(mes: string): string {
  const [ano, numero] = mes.split('-').map(Number);
  return numero === 12
    ? `${ano + 1}-01`
    : `${ano}-${String(numero + 1).padStart(2, '0')}`;
}

/**
 * ¿Ese mes ya terminó?
 *
 * El mes en curso no reparte trofeo: quien va primero hoy puede no ir primero
 * el día 31.
 */
export function mesCerrado(mes: string, hoy: string = fechaJuego()): boolean {
  return mes < mesDe(hoy);
}

/**
 * Los meses con jornadas jugadas, del más reciente al más antiguo.
 *
 * Sale del historial y no de contar desde la fundación: un torneo puede llevar
 * meses parado, y esos meses no son temporadas de nadie.
 */
export function mesesConJuego(dias: DiaTorneo[], fechaInicio: string): string[] {
  const meses = new Set<string>();
  for (const dia of dias) {
    if (dia.fecha < fechaInicio) continue;
    if (Object.keys(dia.resultados ?? {}).length === 0) continue;
    meses.add(mesDe(dia.fecha));
  }
  return [...meses].sort((a, b) => b.localeCompare(a));
}

/** Las jornadas de un mes, ya recortadas por la fundación del torneo. */
export function jornadasDelMes(
  dias: DiaTorneo[],
  mes: string,
  fechaInicio: string
): DiaTorneo[] {
  const desde = primerDiaDelMes(mes);
  const hasta = ultimoDiaDelMes(mes);
  return dias.filter(
    (d) => d.fecha >= desde && d.fecha <= hasta && d.fecha >= fechaInicio
  );
}

/** "2026-08" -> "agosto de 2026", para enseñarlo. */
export function mesLargo(mes: string): string {
  const nombres = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [ano, numero] = mes.split('-');
  return `${nombres[Number(numero) - 1]} de ${ano}`;
}
