/**
 * Invitaciones a un torneo.
 *
 * Se reparte siempre un enlace https, no el esquema propio de la app, por dos
 * razones: WhatsApp y compañía sólo enlazan direcciones web de verdad, y quien
 * no tenga la app instalada llega a una página que le explica qué hacer en vez
 * de a un error del navegador.
 */

/**
 * Dominio donde está publicada la web (el mismo despliegue de Cloudflare
 * Pages). Si no se configura, se reparte el código a pelo.
 */
const BASE = (process.env.EXPO_PUBLIC_URL_BASE ?? '').replace(/\/+$/, '');

/** Esquema propio, para que la página de aterrizaje pueda saltar a la app. */
export const ESQUEMA = 'palabratorneo';

export const hayEnlaces = BASE.length > 0;

/** El enlace que se manda por WhatsApp. */
export function enlaceDeInvitacion(codigo: string): string {
  if (!hayEnlaces) return codigo;
  return `${BASE}/unirse.html?t=${encodeURIComponent(codigo)}`;
}

/** Lo que se mete dentro del QR: el mismo enlace, para que valga cualquier lector. */
export function contenidoQr(codigo: string): string {
  return hayEnlaces ? enlaceDeInvitacion(codigo) : `${ESQUEMA}://unirse?t=${codigo}`;
}

/** El mensaje completo que se comparte. */
export function mensajeDeInvitacion(nombreTorneo: string, codigo: string): string {
  const enlace = enlaceDeInvitacion(codigo);
  const cierre = hayEnlaces
    ? `Entra aquí: ${enlace}`
    : `Abre Palabra Torneo y mete este código: ${codigo}`;
  return `Te invito al torneo "${nombreTorneo}" de Palabra Torneo.\n${cierre}`;
}

/**
 * Saca el código de torneo de una URL de invitación, venga como enlace https o
 * como esquema propio. Devuelve null si la URL no es una invitación.
 */
export function codigoDesdeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const coincidencia = url.match(/[?&]t=([^&#]+)/i);
  if (!coincidencia) return null;
  const codigo = decodeURIComponent(coincidencia[1]).trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(codigo) ? codigo : null;
}
