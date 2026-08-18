import { FECHA_EPOCA, ZONA_HORARIA } from './constantes';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Devuelve la fecha de juego en formato YYYY-MM-DD.
 *
 * Se calcula siempre en la zona horaria del torneo, no en la del móvil, para
 * que la jornada empiece y acabe a la vez para todo el mundo y para que
 * cambiar la hora del teléfono no adelante la palabra de mañana.
 */
export function fechaJuego(momento: Date = new Date()): string {
  try {
    // 'en-CA' produce directamente YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(momento);
  } catch {
    // Si el runtime no trae datos de zonas horarias, tiramos de hora local.
    const y = momento.getFullYear();
    const m = String(momento.getMonth() + 1).padStart(2, '0');
    const d = String(momento.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/** Número de días transcurridos entre FECHA_EPOCA y la fecha dada. */
export function indiceDia(fecha: string): number {
  const inicio = Date.parse(`${FECHA_EPOCA}T00:00:00Z`);
  const actual = Date.parse(`${fecha}T00:00:00Z`);
  return Math.floor((actual - inicio) / MS_POR_DIA);
}

/** Suma (o resta, con días negativos) días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const t = Date.parse(`${fecha}T00:00:00Z`) + dias * MS_POR_DIA;
  return new Date(t).toISOString().slice(0, 10);
}

/** Milisegundos que faltan para que cambie la palabra. */
export function msHastaProximaJornada(momento: Date = new Date()): number {
  const hoy = fechaJuego(momento);
  // Buscamos hacia delante el primer instante cuya fecha de juego ya es otra.
  let bajo = momento.getTime();
  let alto = bajo + 2 * MS_POR_DIA;
  while (alto - bajo > 1000) {
    const medio = Math.floor((bajo + alto) / 2);
    if (fechaJuego(new Date(medio)) === hoy) bajo = medio;
    else alto = medio;
  }
  return alto - momento.getTime();
}

/** "2026-08-14" -> "14 de agosto de 2026" */
export function fechaLarga(fecha: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [y, m, d] = fecha.split('-');
  return `${Number(d)} de ${meses[Number(m) - 1]} de ${y}`;
}
