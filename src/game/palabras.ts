import aceptadasJson from '../data/allowed.json';
import solucionesJson from '../data/solutions.json';
import { LONGITUD } from './constantes';
import { indiceDia } from './fecha';
import { normalizar } from './normalizar';
import { recorrido } from './semilla';

const ACEPTADAS: string[] = aceptadasJson as string[];
const SOLUCIONES: string[] = solucionesJson as string[];

const setAceptadas = new Set(ACEPTADAS);

/**
 * Recorrido de la lista para quien juega sin torneo, en el modo libre. Es
 * público a propósito: ahí no se compite y da igual que sea previsible.
 */
const SEMILLA_LIBRE = 'libre';

/** ¿Es una palabra que el juego acepta como intento? */
export function esAceptada(palabra: string): boolean {
  return setAceptadas.has(normalizar(palabra));
}

/**
 * La palabra secreta de una fecha para un torneo concreto.
 *
 * Cada torneo recorre la lista de soluciones a su manera, según su semilla, de
 * forma que dos torneos nunca comparten la palabra del día. Así nadie puede
 * enterarse de la palabra preguntando a alguien de otro grupo.
 *
 * @param fecha   día de juego en formato YYYY-MM-DD
 * @param semilla semilla del torneo; sin ella se usa la del modo libre
 */
export function solucionDe(fecha: string, semilla: string = SEMILLA_LIBRE): string {
  const n = SOLUCIONES.length;
  const { inicio, paso } = recorrido(semilla, n);
  const dia = indiceDia(fecha);
  // El módulo de JS puede dar negativo con fechas anteriores a la época.
  const i = (((inicio + dia * paso) % n) + n) % n;
  return SOLUCIONES[i];
}

/** Número de jornada del torneo, contando desde el día en que se fundó. */
export function numeroJornada(fecha: string, fechaInicio?: string): number {
  if (!fechaInicio) return indiceDia(fecha) + 1;
  return indiceDia(fecha) - indiceDia(fechaInicio) + 1;
}

export const totalAceptadas = ACEPTADAS.length;
export const totalSoluciones = SOLUCIONES.length;
export { LONGITUD };
