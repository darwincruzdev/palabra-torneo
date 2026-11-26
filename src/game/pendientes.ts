import type { DiaTorneo } from '../tipos';

/** ¿Esta persona todavía no ha publicado la jornada de ese día? */
export function faltaPorJugar(
  dias: DiaTorneo[],
  uid: string | null | undefined,
  fecha: string
): boolean {
  if (!uid) return false;
  const dia = dias.find((d) => d.fecha === fecha);
  return !dia?.resultados?.[uid];
}

/**
 * Si se pueden enseñar las rejillas de los demás en esa jornada.
 *
 * La de hoy, no, hasta haber jugado: los colores dicen por dónde va la
 * palabra. Las jornadas ya cerradas sí, porque la palabra ya está a la vista.
 */
export function rejillasVisibles(fecha: string, hoy: string, jugue: boolean): boolean {
  if (fecha < hoy) return true;
  return jugue;
}
