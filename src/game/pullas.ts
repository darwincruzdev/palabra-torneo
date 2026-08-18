/**
 * Las pullas del duelo.
 *
 * Sólo las puede tirar quien ya ha cerrado su palabra y está esperando, contra
 * quien sigue peleándose con la suya. No cambian nada de la partida: son para
 * meter prisa y reírse un rato, que es medio duelo.
 */
export const PULLAS = ['😂', '🤣', '😜', '😏', '🥱', '😡', '🐌', '💩'] as const;

export type Pulla = (typeof PULLAS)[number];

/** Lo que se queda una pulla en la pantalla de quien la recibe. */
export const PULLA_MS = 2200;

/** Lo justo para que no parezca que se puede ametrallar al rival. */
export const RECARGA_PULLA_MS = 900;

export function esPulla(emoji: string): emoji is Pulla {
  return (PULLAS as readonly string[]).includes(emoji);
}
