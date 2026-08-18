/** Longitud de la palabra secreta. Siempre 5. */
export const LONGITUD = 5;

/** Intentos disponibles por jornada. */
export const MAX_INTENTOS = 6;

/**
 * Puntos según en qué intento se acierta.
 * Índice 0 = acertar al primer intento. No acertar = 0 puntos.
 */
export const PUNTOS_POR_INTENTO = [7, 5, 4, 3, 2, 1] as const;

/**
 * Zona horaria que decide cuándo cambia la palabra del día.
 * Fija para todos los jugadores: así nadie ve la palabra antes que los demás.
 */
export const ZONA_HORARIA = 'Europe/Madrid';

/** Primer día del juego. El índice de la palabra se cuenta desde aquí. */
export const FECHA_EPOCA = '2024-01-01';

/**
 * Las cinco palabras con las que está obligado a empezar el líder destacado
 * de un torneo en la jornada siguiente. Todas repiten letras, así que
 * gastan un intento dando poca información: es la penalización por ir primero.
 */
export const PALABRAS_PENALIZACION = [
  'vivir',
  'pelee',
  'amada',
  'cocos',
  'tutus',
] as const;
