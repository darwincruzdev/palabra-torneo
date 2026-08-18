/**
 * Entrar con Google en el navegador, con Google Identity Services.
 *
 * Por qué no se usa el login de Firebase (signInWithPopup / signInWithRedirect):
 * los dos dependen de que el navegador conserve datos entre la página y el
 * gestor de Google. Los navegadores de móvil ya no lo garantizan — parten el
 * almacenamiento entre sitios — y el flujo muere con el error "missing initial
 * state", o se queda la emergente en blanco porque en el móvil es una pestaña
 * suelta que no sabe volver.
 *
 * Esta vía no navega a ninguna parte: Google dibuja su botón, y al pulsarlo
 * devuelve el identificador en una llamada de JavaScript. De ahí sale un
 * id_token, que es exactamente lo que Firebase necesita, igual que en Android.
 */

const SRC = 'https://accounts.google.com/gsi/client';

let cargaEnCurso: Promise<void> | null = null;

function gsi(): any {
  return (globalThis as any)?.google?.accounts?.id;
}

function cargarScript(): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('sin-dom'));
  }
  if (gsi()) return Promise.resolve();
  if (cargaEnCurso) return cargaEnCurso;

  cargaEnCurso = new Promise<void>((resolver, rechazar) => {
    const etiqueta = document.createElement('script');
    etiqueta.src = SRC;
    etiqueta.async = true;
    etiqueta.defer = true;
    etiqueta.onload = () => (gsi() ? resolver() : rechazar(new Error('gsi-no-disponible')));
    etiqueta.onerror = () => rechazar(new Error('gsi-no-carga'));
    document.head.appendChild(etiqueta);
  });

  return cargaEnCurso;
}

/**
 * Dibuja el botón oficial de Google dentro del elemento dado.
 *
 * @param contenedor  nodo del DOM donde pintar el botón
 * @param clientId    identificador de cliente web de OAuth
 * @param alEntrar    recibe el id_token cuando el usuario termina
 */
export async function dibujarBotonGoogle(
  contenedor: HTMLElement,
  clientId: string,
  alEntrar: (idToken: string) => void
): Promise<void> {
  await cargarScript();

  gsi().initialize({
    client_id: clientId,
    callback: (respuesta: { credential?: string }) => {
      if (respuesta?.credential) alEntrar(respuesta.credential);
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true,
  });

  // Se limpia por si se vuelve a dibujar tras una recarga en caliente.
  contenedor.innerHTML = '';

  gsi().renderButton(contenedor, {
    type: 'standard',
    theme: 'filled_blue',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    logo_alignment: 'left',
    locale: 'es',
    width: Math.min(320, Math.max(240, contenedor.clientWidth || 280)),
  });
}
