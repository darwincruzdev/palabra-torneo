import { MAX_INTENTOS, PUNTOS_POR_INTENTO } from './constantes';
import { normalizar } from './normalizar';

/** Estado de una letra tras evaluar un intento. */
export type Marca = 'correcta' | 'presente' | 'ausente';

/**
 * Compara un intento con la solución y devuelve una marca por posición.
 *
 * Las letras repetidas se reparten: si la solución tiene una sola "a" y el
 * intento tiene dos, sólo una de ellas se pinta, y tiene prioridad la que esté
 * en su sitio. Por eso hace falta pasar dos veces por la palabra en vez de
 * comparar letra a letra.
 */
export function evaluar(intento: string, solucion: string): Marca[] {
  const g = normalizar(intento).split('');
  const s = normalizar(solucion).split('');
  const marcas: Marca[] = new Array(g.length).fill('ausente');

  // Primera pasada: letras en su sitio. Se apartan del recuento disponible.
  const disponibles = new Map<string, number>();
  for (let i = 0; i < s.length; i++) {
    if (g[i] === s[i]) marcas[i] = 'correcta';
    else disponibles.set(s[i], (disponibles.get(s[i]) ?? 0) + 1);
  }

  // Segunda pasada: letras que están pero fuera de sitio, mientras queden.
  for (let i = 0; i < g.length; i++) {
    if (marcas[i] === 'correcta') continue;
    const quedan = disponibles.get(g[i]) ?? 0;
    if (quedan > 0) {
      marcas[i] = 'presente';
      disponibles.set(g[i], quedan - 1);
    }
  }

  return marcas;
}

const PRIORIDAD: Record<Marca, number> = { ausente: 0, presente: 1, correcta: 2 };

/**
 * Estado de cada tecla a partir de todos los intentos hechos.
 * Una tecla nunca empeora: si una letra ya salió verde, sigue verde aunque
 * después se use en una posición equivocada.
 */
export function estadoTeclado(
  intentos: string[],
  solucion: string
): Record<string, Marca> {
  const estado: Record<string, Marca> = {};
  for (const intento of intentos) {
    const letras = normalizar(intento).split('');
    const marcas = evaluar(intento, solucion);
    letras.forEach((letra, i) => {
      const previo = estado[letra];
      if (!previo || PRIORIDAD[marcas[i]] > PRIORIDAD[previo]) {
        estado[letra] = marcas[i];
      }
    });
  }
  return estado;
}

/**
 * Puntos de la jornada.
 * @param intentos número de intentos usados (1 a 6)
 * @param acertada si llegó a adivinar la palabra
 */
export function puntosDe(intentos: number, acertada: boolean): number {
  if (!acertada) return 0;
  if (intentos < 1 || intentos > MAX_INTENTOS) return 0;
  return PUNTOS_POR_INTENTO[intentos - 1];
}

/** Cuadrícula de emojis para compartir el resultado sin destripar la palabra. */
export function patronCompartible(intentos: string[], solucion: string): string {
  const emoji: Record<Marca, string> = {
    correcta: '🟩',
    presente: '🟨',
    ausente: '⬛',
  };
  return intentos
    .map((intento) => evaluar(intento, solucion).map((m) => emoji[m]).join(''))
    .join('\n');
}
