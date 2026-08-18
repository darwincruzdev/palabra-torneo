import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  Avatar,
  Blueshell,
  DiaTorneo,
  Invitacion,
  Perfil,
  ReglasTorneo,
  ResultadoDia,
  Torneo,
} from '../tipos';
import { fechaJuego } from '../game/fecha';
import { generarSemilla } from '../game/semilla';
import { normalizarAvatar } from '../game/avatares';
import { REGLAS_POR_DEFECTO } from '../game/reglas';
import { baseDatos, hayFirebase } from './cliente';

export { hayFirebase };

/* ----------------------------------------------------------------- perfiles */

export async function guardarPerfil(uid: string, nombre: string, avatar: Avatar) {
  await setDoc(
    doc(baseDatos(), 'usuarios', uid),
    { nombre, avatar, configurado: true, actualizado: serverTimestamp() },
    { merge: true }
  );
}

export async function leerPerfil(
  uid: string
): Promise<(Omit<Perfil, 'uid'> & { configurado: boolean }) | null> {
  const documento = await getDoc(doc(baseDatos(), 'usuarios', uid));
  if (!documento.exists()) return null;
  const datos = documento.data();
  return {
    nombre: String(datos.nombre ?? ''),
    avatar: normalizarAvatar(datos.avatar),
    configurado: datos.configurado === true,
  };
}

/**
 * Propaga el nombre y el avatar a todos los torneos de la persona, para que la
 * clasificación no se quede con el nombre viejo.
 */
export async function propagarPerfil(
  uid: string,
  torneoIds: string[],
  nombre: string,
  avatar: Avatar
) {
  await Promise.all(
    torneoIds.map((id) =>
      updateDoc(doc(baseDatos(), 'torneos', id), {
        [`perfiles.${uid}`]: { nombre, avatar },
      }).catch(() => {})
    )
  );
}

/* ----------------------------------------------------------------- torneos */

// Sin vocales ni caracteres que se confundan al dictarlos (0/O, 1/I/L).
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

/**
 * Crea el torneo y su invitación.
 *
 * La invitación va en una colección aparte, `codigos`, porque para unirse hay
 * que poder leerla sin ser miembro todavía. En el documento del torneo está la
 * semilla, y ese sólo lo pueden leer los miembros: si cualquiera pudiera leerlo,
 * podría calcular la palabra de todos los días.
 */
export async function crearTorneo(
  nombreTorneo: string,
  uid: string,
  nombre: string,
  avatar: Avatar
): Promise<Torneo> {
  const referencia = doc(collection(baseDatos(), 'torneos'));

  const torneo: Torneo = {
    id: referencia.id,
    nombre: nombreTorneo.trim(),
    codigo: '',
    semilla: generarSemilla(),
    propietario: uid,
    miembros: [uid],
    perfiles: { [uid]: { nombre, avatar } },
    reglas: { ...REGLAS_POR_DEFECTO },
    fechaInicio: fechaJuego(),
    creado: Date.now(),
  };

  // El código se reserva en una transacción: si dos personas crean un torneo a
  // la vez y sale el mismo código, una de las dos lo reintenta.
  for (let intento = 0; intento < 6; intento++) {
    const codigo = generarCodigo();
    const refCodigo = doc(baseDatos(), 'codigos', codigo);
    try {
      await runTransaction(baseDatos(), async (tx) => {
        const existente = await tx.get(refCodigo);
        if (existente.exists()) throw new Error('codigo-ocupado');
        tx.set(refCodigo, {
          codigo,
          torneoId: referencia.id,
          nombre: torneo.nombre,
        } satisfies Invitacion);
        tx.set(referencia, { ...torneo, codigo });
      });
      return { ...torneo, codigo };
    } catch (e) {
      if (e instanceof Error && e.message === 'codigo-ocupado') continue;
      throw e;
    }
  }
  throw new Error('No se ha podido generar un código libre. Inténtalo otra vez.');
}

/** Resuelve un código de invitación sin necesidad de ser miembro. */
export async function buscarInvitacion(codigo: string): Promise<Invitacion | null> {
  const limpio = codigo.trim().toUpperCase();
  if (limpio.length !== 6) return null;
  const documento = await getDoc(doc(baseDatos(), 'codigos', limpio));
  if (!documento.exists()) return null;
  return documento.data() as Invitacion;
}

export async function unirseATorneo(
  torneoId: string,
  uid: string,
  nombre: string,
  avatar: Avatar
): Promise<void> {
  await updateDoc(doc(baseDatos(), 'torneos', torneoId), {
    miembros: arrayUnion(uid),
    [`perfiles.${uid}`]: { nombre, avatar },
  });
}

export async function salirDeTorneo(torneoId: string, uid: string): Promise<void> {
  await updateDoc(doc(baseDatos(), 'torneos', torneoId), {
    miembros: arrayRemove(uid),
  });
}

/** Sólo el fundador, y se lleva por delante el código de invitación. */
export async function borrarTorneo(torneo: Torneo): Promise<void> {
  await deleteDoc(doc(baseDatos(), 'codigos', torneo.codigo)).catch(() => {});
  await deleteDoc(doc(baseDatos(), 'torneos', torneo.id));
}

/** Mis torneos, en tiempo real. */
export function observarMisTorneos(
  uid: string,
  callback: (torneos: Torneo[]) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(baseDatos(), 'torneos'), where('miembros', 'array-contains', uid)),
    (instantanea) => {
      const torneos = instantanea.docs.map((d) => ({ ...(d.data() as Torneo), id: d.id }));
      torneos.sort((a, b) => b.creado - a.creado);
      callback(torneos);
    },
    () => callback([])
  );
}

/** Cambiar las normas de la casa. Sólo lo deja hacer el fundador. */
export async function guardarReglas(torneoId: string, reglas: ReglasTorneo): Promise<void> {
  await updateDoc(doc(baseDatos(), 'torneos', torneoId), { reglas });
}

/* ------------------------------------------------------------ blueshells */

/**
 * Dispara una blueshell contra el líder.
 *
 * Se escribe en el documento de la jornada a la que golpea, que normalmente
 * todavía no existe: por eso va con merge, que lo crea si hace falta y si no
 * añade sólo esta casilla sin tocar los resultados de nadie.
 */
export async function lanzarBlueshell(
  torneoId: string,
  fechaObjetivo: string,
  autor: string,
  blueshell: Blueshell
): Promise<void> {
  await setDoc(
    doc(baseDatos(), 'torneos', torneoId, 'dias', fechaObjetivo),
    { fecha: fechaObjetivo, blueshells: { [autor]: blueshell } },
    { merge: true }
  );
}

/** Gasta la protección de la jornada, que anula todas las balas recibidas. */
export async function activarProteccion(
  torneoId: string,
  fecha: string,
  uid: string
): Promise<void> {
  await setDoc(
    doc(baseDatos(), 'torneos', torneoId, 'dias', fecha),
    { fecha, protecciones: { [uid]: true } },
    { merge: true }
  );
}

/* -------------------------------------------------------------- resultados */

/**
 * Las jornadas de un torneo, en tiempo real. Cada jornada es un documento con
 * los resultados de todo el mundo dentro, así que un año son ~365 documentos.
 */
export function observarJornadas(
  torneoId: string,
  callback: (dias: DiaTorneo[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(baseDatos(), 'torneos', torneoId, 'dias'),
    (instantanea) => {
      const dias = instantanea.docs.map((d) => d.data() as DiaTorneo);
      dias.sort((a, b) => a.fecha.localeCompare(b.fecha));
      callback(dias);
    },
    () => callback([])
  );
}

export async function obtenerJornadas(torneoId: string): Promise<DiaTorneo[]> {
  const instantanea = await getDocs(collection(baseDatos(), 'torneos', torneoId, 'dias'));
  const dias = instantanea.docs.map((d) => d.data() as DiaTorneo);
  dias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return dias;
}

/**
 * Publica el resultado del día en un torneo.
 *
 * Se escribe sólo el campo del jugador dentro del mapa de resultados, así que
 * dos personas terminando a la vez no se pisan la una a la otra.
 */
export async function publicarResultado(
  torneoId: string,
  fecha: string,
  resultado: ResultadoDia
): Promise<void> {
  await setDoc(
    doc(baseDatos(), 'torneos', torneoId, 'dias', fecha),
    { fecha, resultados: { [resultado.uid]: resultado } },
    { merge: true }
  );
}
