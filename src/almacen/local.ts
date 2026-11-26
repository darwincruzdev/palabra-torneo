import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Avatar, PartidaHecha, PartidaLocal, RecordArcade } from '../tipos';
import { PALABRAS_PENALIZACION } from '../game/constantes';

const CLAVE_PARTIDA = 'pt:partida'; // se le añade :{torneoId}
const CLAVE_PERFIL = 'pt:perfil';
const CLAVE_HISTORIAL = 'pt:historial';
const CLAVE_TORNEO_ACTIVO = 'pt:torneo-activo';

async function leerJson<T>(clave: string): Promise<T | null> {
  try {
    const bruto = await AsyncStorage.getItem(clave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

async function escribirJson(clave: string, valor: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Si el almacenamiento falla no rompemos la partida en curso.
  }
}

/**
 * Partida del día en un torneo. Hay una por torneo, porque cada uno tiene su
 * propia palabra. Se guarda en cada intento para que cerrar la app no cueste
 * la jornada.
 */
export async function cargarPartida(
  torneoId: string,
  fecha: string
): Promise<PartidaLocal | null> {
  const partida = await leerJson<PartidaLocal>(`${CLAVE_PARTIDA}:${torneoId}`);
  if (!partida || partida.fecha !== fecha || partida.torneoId !== torneoId) return null;
  // Partida empezada con una versión anterior, cuando la única palabra impuesta
  // era la del líder y se guardaba como un simple sí/no.
  if (!partida.obligaciones) {
    partida.obligaciones = partida.penalizado
      ? [{ indice: 0, palabras: [...PALABRAS_PENALIZACION], motivo: 'lider' }]
      : [];
  }
  return partida;
}

export function guardarPartida(partida: PartidaLocal): Promise<void> {
  return escribirJson(`${CLAVE_PARTIDA}:${partida.torneoId}`, partida);
}

/* ------------------------------------------------------------------ perfil */

export type PerfilLocal = {
  nombre: string;
  avatar: Avatar;
  /**
   * Si la persona ya pasó por la pantalla de bienvenida y eligió nombre y
   * avatar. Mientras sea false se le pregunta nada más entrar, para que nadie
   * acabe apareciendo en la clasificación con un nombre que no ha elegido.
   */
  configurado?: boolean;
  /** Modo de letra grande, para quien no ve bien los tamaños normales. */
  letraGrande?: boolean;
};

export function cargarPerfilLocal(): Promise<PerfilLocal | null> {
  return leerJson<PerfilLocal>(CLAVE_PERFIL);
}

export function guardarPerfilLocal(perfil: PerfilLocal): Promise<void> {
  return escribirJson(CLAVE_PERFIL, perfil);
}

/**
 * Las palabras que yo he escrito en un duelo, por palabra.
 *
 * Al rival sólo se le mandan los colores, así que mis letras tienen que vivir
 * aquí: si no, al recargar la página me quedaría con el tablero en blanco
 * viendo colores de palabras que no recuerdo.
 */
export function cargarEscritasDuelo(dueloId: string): Promise<string[][] | null> {
  return leerJson<string[][]>(`pt:duelo:${dueloId}`);
}

export function guardarEscritasDuelo(
  dueloId: string,
  escritas: string[][]
): Promise<void> {
  return escribirJson(`pt:duelo:${dueloId}`, escritas);
}

/**
 * El duelo que se está jugando ahora.
 *
 * Sin esto, cerrar la pestaña sin querer dejaba el duelo perdido para siempre:
 * no hay lista de duelos y el código sólo lo tenía quien lo creó.
 */
export async function cargarDueloActivo(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('pt:duelo-activo');
  } catch {
    return null;
  }
}

export async function guardarDueloActivo(dueloId: string | null): Promise<void> {
  try {
    if (dueloId) await AsyncStorage.setItem('pt:duelo-activo', dueloId);
    else await AsyncStorage.removeItem('pt:duelo-activo');
  } catch {
    // ignorado a propósito
  }
}

/** Último torneo elegido, para abrir la app donde se dejó. */
export async function cargarTorneoActivo(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CLAVE_TORNEO_ACTIVO);
  } catch {
    return null;
  }
}

export async function guardarTorneoActivo(torneoId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_TORNEO_ACTIVO, torneoId);
  } catch {
    // ignorado a propósito
  }
}

/* ------------------------------------------------------------ aviso de parche */

const CLAVE_AVISO_PARCHE = 'pt:aviso-parche';

/**
 * Cuándo vio esta persona por primera vez el aviso de una versión.
 *
 * Se guarda por versión y no una simple bandera de "visto" porque el aviso dura
 * un día desde que cada uno lo ve, no desde que se publicó: quien no abre la app
 * ese día se quedaría sin enterarse.
 */
export type AvisoParcheLocal = { version: string; desde: number };

export function cargarAvisoParche(): Promise<AvisoParcheLocal | null> {
  return leerJson<AvisoParcheLocal>(CLAVE_AVISO_PARCHE);
}

export function guardarAvisoParche(aviso: AvisoParcheLocal): Promise<void> {
  return escribirJson(CLAVE_AVISO_PARCHE, aviso);
}

/* --------------------------------------------------------------- historial */

export type EntradaHistorial = PartidaHecha;

export async function cargarHistorial(): Promise<EntradaHistorial[]> {
  return (await leerJson<EntradaHistorial[]>(CLAVE_HISTORIAL)) ?? [];
}

export async function anotarEnHistorial(entrada: EntradaHistorial): Promise<void> {
  const historial = await cargarHistorial();
  // Una entrada por torneo y día.
  const resto = historial.filter(
    (e) => !(e.fecha === entrada.fecha && e.torneoId === entrada.torneoId)
  );
  resto.push(entrada);
  resto.sort((a, b) => a.fecha.localeCompare(b.fecha));
  await escribirJson(CLAVE_HISTORIAL, resto.slice(-800));
}

/* --------------------------------------------------------------- arcade */

const CLAVE_ARCADE = 'pt:arcade';

/**
 * La mejor ronda de arcade guardada en este aparato.
 *
 * Con cuenta, la buena es la del servidor; esto es lo que hace que el arcade
 * también funcione sin Firebase configurado y sin haber entrado.
 */
export function cargarRecordArcade(): Promise<RecordArcade | null> {
  return leerJson<RecordArcade>(CLAVE_ARCADE);
}

export function guardarRecordArcadeLocal(record: RecordArcade): Promise<void> {
  return escribirJson(CLAVE_ARCADE, record);
}

/* ------------------------------------------------- código antes de entrar */

const CLAVE_CODIGO = 'pt:codigo-pendiente';

/**
 * Código escrito en la pantalla de acceso, antes de tener cuenta.
 *
 * El de un enlace ya se resuelve al abrir la app. Éste es el que se teclea a
 * mano: hay que guardarlo porque el login de Google puede recargar la página.
 */
export function cargarCodigoPendiente(): Promise<string | null> {
  return leerJson<string>(CLAVE_CODIGO);
}

export function guardarCodigoPendiente(codigo: string | null): Promise<void> {
  if (!codigo) return AsyncStorage.removeItem(CLAVE_CODIGO).catch(() => {});
  return escribirJson(CLAVE_CODIGO, codigo);
}

/* ------------------------------------------------------------ borrar todo */

/** Prefijo de todo lo que guarda la app en este aparato. */
const PREFIJO = 'pt:';

/**
 * Deja este móvil como recién instalado.
 *
 * Se usa al borrar la cuenta: da igual lo que se limpie en el servidor si en el
 * aparato se quedan el historial, el perfil y las partidas a medias. Va por
 * prefijo en vez de clave por clave porque las hay con el id dentro
 * —`pt:partida:{torneo}`, `pt:duelo:{duelo}`— y esas no se pueden enumerar.
 */
export async function borrarTodoLoLocal(): Promise<void> {
  try {
    const claves = await AsyncStorage.getAllKeys();
    const mias = claves.filter((c) => c.startsWith(PREFIJO));
    if (mias.length > 0) await AsyncStorage.multiRemove(mias);
  } catch {
    // Si el almacenamiento falla, el borrado del servidor ya se ha hecho.
  }
}
