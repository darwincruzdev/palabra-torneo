import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Configuración de Firebase.
 *
 * Los valores salen de variables EXPO_PUBLIC_*, que el bundler de Expo mete en
 * el paquete al compilar. Copia .env.example a .env y rellénalo con los datos
 * de tu proyecto (Consola de Firebase > Configuración > Tus apps > Web).
 *
 * No son secretos: una clave de API de Firebase identifica el proyecto, no
 * autoriza nada. Quien protege los datos son las reglas de firestore.rules.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/** Identificadores de OAuth para entrar con Google. */
export const googleClientIds = {
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
};

/** Sin esto no hay ni torneos ni sesión: la app se queda en modo libre. */
export const hayFirebase = Boolean(config.apiKey && config.projectId && config.appId);

/** El identificador de web hace falta siempre: es el que valida Firebase. */
export const hayGoogle = Boolean(googleClientIds.web);

let app: FirebaseApp | null = null;
let bd: Firestore | null = null;
let autenticacion: fbAuth.Auth | null = null;

function arrancar() {
  if (!hayFirebase || app) return;
  app = getApps().length ? getApp() : initializeApp(config as Required<typeof config>);

  // En React Native la sesión hay que persistirla a mano en AsyncStorage;
  // si no, cada arranque de la app pediría entrar otra vez.
  const persistenciaRN = (fbAuth as any).getReactNativePersistence;
  try {
    autenticacion = persistenciaRN
      ? fbAuth.initializeAuth(app, { persistence: persistenciaRN(AsyncStorage) })
      : fbAuth.getAuth(app);
  } catch {
    // initializeAuth revienta si ya se llamó antes (recarga en caliente).
    autenticacion = fbAuth.getAuth(app);
  }

  // En el navegador, dejar la sesión en el almacenamiento local del sitio para
  // que sobreviva a cerrar la pestaña. Sin esto, volver de Google puede dejarte
  // otra vez en la pantalla de acceso.
  const persistenciaLocal = (fbAuth as any).browserLocalPersistence;
  if (!persistenciaRN && persistenciaLocal && autenticacion) {
    fbAuth.setPersistence(autenticacion, persistenciaLocal).catch(() => {});
  }

  bd = getFirestore(app);
}

arrancar();

export function baseDatos(): Firestore {
  if (!bd) throw new Error('Firebase no está configurado');
  return bd;
}

export function auth(): fbAuth.Auth {
  if (!autenticacion) throw new Error('Firebase no está configurado');
  return autenticacion;
}
