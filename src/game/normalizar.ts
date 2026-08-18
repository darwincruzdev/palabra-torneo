const ENE = 'ñ';
const MARCA = ''; // marcador temporal para que NFD no descomponga la ñ
const DIACRITICOS = /[̀-ͯ]/g;

/**
 * Pasa a minúsculas y quita tildes y diéresis, conservando la Ñ.
 * "ACCIÓN" -> "accion", "MAÑANA" -> "mañana"
 */
export function normalizar(palabra: string): string {
  return palabra
    .toLowerCase()
    .split(ENE)
    .join(MARCA)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .split(MARCA)
    .join(ENE);
}
