import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleClientIds, hayFirebase, hayGoogle } from './cliente';

/**
 * Entrar con Google, por dos caminos según dónde corra la app. Los dos acaban
 * igual: consiguen un id_token de Google y lo canjean por la sesión de Firebase.
 *
 * En Android, con Google Play Services. No es capricho: Google desactivó los
 * esquemas propios de URI para los clientes OAuth de Android nuevos, así que
 * abrir el navegador da "Custom URI scheme is not enabled for your Android
 * client".
 *
 * En el navegador, con Google Identity Services, que dibuja su propio botón y
 * devuelve el token en una llamada de JavaScript. Ni emergentes ni
 * redirecciones: las dos fallan en los navegadores de móvil porque dependen de
 * que se conserven datos entre sitios, y eso ya no está garantizado.
 */

export const esWeb = Platform.OS === 'web';

let configurado = false;

function configurar() {
  if (configurado || esWeb || !hayFirebase || !hayGoogle) return;
  GoogleSignin.configure({
    // El identificador de web es el que hace que Google devuelva un id_token
    // válido para Firebase. El de Android no se pasa: se empareja solo por el
    // nombre del paquete y la huella SHA-1.
    webClientId: googleClientIds.web,
    iosClientId: googleClientIds.ios || undefined,
    offlineAccess: false,
  });
  configurado = true;
}

configurar();

export type EstadoSesion = {
  cargando: boolean;
  usuario: User | null;
  error: string | null;
  disponible: boolean;
  /** Identificador de cliente web, para el botón de Google del navegador. */
  clientIdWeb: string | undefined;
  /** Camino del móvil: lo dispara nuestro propio botón. */
  entrar: () => void;
  /** Camino del navegador: lo llama el botón que dibuja Google. */
  entrarConIdToken: (idToken: string) => void;
  salir: () => Promise<void>;
};

export function useSesionGoogle(): EstadoSesion {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const disponible = hayFirebase && hayGoogle;

  useEffect(() => {
    if (!hayFirebase) {
      setCargando(false);
      return;
    }
    return onAuthStateChanged(auth(), (u) => {
      setUsuario(u);
      setCargando(false);
    });
  }, []);

  /** Canjea el token de Google por la sesión de Firebase. */
  const conIdToken = useCallback(async (idToken: string) => {
    setError(null);
    setCargando(true);
    try {
      await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken));
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, []);

  const entrar = useCallback(async () => {
    if (!disponible || esWeb) return;
    setError(null);
    setCargando(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const respuesta = await GoogleSignin.signIn();
      if (respuesta.type === 'cancelled') return;

      const idToken = respuesta.data?.idToken;
      if (!idToken) {
        setError('Google no ha devuelto la identificación. Inténtalo otra vez.');
        return;
      }
      await signInWithCredential(auth(), GoogleAuthProvider.credential(idToken));
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setCargando(false);
    }
  }, [disponible]);

  const salir = useCallback(async () => {
    try {
      if (!esWeb) await GoogleSignin.signOut();
    } catch {
      // Si falla el cierre en Google, cerramos igual el de Firebase.
    }
    if (hayFirebase) await signOut(auth());
  }, []);

  return useMemo(
    () => ({
      cargando,
      usuario,
      error,
      disponible,
      clientIdWeb: googleClientIds.web,
      entrar,
      entrarConIdToken: conIdToken,
      salir,
    }),
    [cargando, usuario, error, disponible, entrar, conIdToken, salir]
  );
}

function mensajeDeError(e: unknown): string {
  if (isErrorWithCode(e)) {
    switch (e.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return '';
      case statusCodes.IN_PROGRESS:
        return 'Ya hay un intento de acceso en marcha.';
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return 'Este móvil no tiene los servicios de Google Play actualizados.';
      // El clásico: la huella SHA-1 o el nombre del paquete no coinciden con
      // los de la credencial de Android en Google Cloud.
      case 'DEVELOPER_ERROR':
        return 'La app no está bien dada de alta en Google. Revisa que la huella SHA-1 y el nombre del paquete coincidan con la credencial de Android.';
    }
  }

  const codigo = (e as { code?: string })?.code ?? '';
  if (codigo.includes('unauthorized-domain')) {
    return 'Esta dirección no está autorizada en Firebase. Añádela en Authentication > Configuración > Dominios autorizados.';
  }
  if (codigo.includes('invalid-credential')) {
    return 'Google ha devuelto una credencial que Firebase no acepta. Revisa el identificador de cliente web.';
  }

  return 'No se ha podido abrir la sesión. Inténtalo otra vez.';
}
