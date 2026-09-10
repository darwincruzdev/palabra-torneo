import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Avatar, Duelo, InvitacionDuelo, JugadorDuelo, ProgresoDuelo } from '../tipos';
import { generarSemilla } from '../game/semilla';
import {
  PALABRAS_POR_DUELO,
  cerradasVacias,
  rejillaVacia,
  rivalesPosibles,
} from '../game/duelo';
import { baseDatos } from './cliente';

// Sin vocales ni caracteres que se confundan al dictarlos.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generarCodigo(): string {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}

function progresoInicial(): ProgresoDuelo {
  return {
    rejilla: rejillaVacia(),
    cerradas: cerradasVacias(),
    letras: rejillaVacia(),
    puntos: 0,
  };
}

/**
 * Crea el duelo y su invitación.
 *
 * La invitación va aparte, igual que en los torneos: para entrar hay que poder
 * resolver el código sin ser todavía participante, y el documento del duelo
 * lleva la semilla.
 */
export async function crearDuelo(
  uid: string,
  nombre: string,
  avatar: Avatar,
  abierto = false
): Promise<Duelo> {
  const referencia = doc(collection(baseDatos(), 'duelos'));
  const retador: JugadorDuelo = { uid, nombre, avatar };

  for (let intento = 0; intento < 6; intento++) {
    const codigo = generarCodigo();
    const refCodigo = doc(baseDatos(), 'codigosDuelo', codigo);

    const duelo: Duelo = {
      id: referencia.id,
      codigo,
      semilla: generarSemilla(),
      creado: Date.now(),
      estado: 'esperando',
      retador,
      rival: null,
      abierto,
      jugadores: [uid],
      progreso: { [uid]: progresoInicial() },
    };

    try {
      await runTransaction(baseDatos(), async (tx) => {
        const existente = await tx.get(refCodigo);
        if (existente.exists()) throw new Error('codigo-ocupado');
        tx.set(refCodigo, {
          codigo,
          dueloId: referencia.id,
          retador: uid,
        } satisfies InvitacionDuelo);
        tx.set(referencia, duelo);
      });
      return duelo;
    } catch (e) {
      if (e instanceof Error && e.message === 'codigo-ocupado') continue;
      throw e;
    }
  }
  throw new Error('No se ha podido generar un código libre. Inténtalo otra vez.');
}

export async function buscarDuelo(codigo: string): Promise<InvitacionDuelo | null> {
  const limpio = codigo.trim().toUpperCase();
  if (limpio.length !== 6) return null;
  const documento = await getDoc(doc(baseDatos(), 'codigosDuelo', limpio));
  if (!documento.exists()) return null;
  return documento.data() as InvitacionDuelo;
}

/**
 * Entrar como rival. Al segundo jugador le toca arrancar el duelo, así que aquí
 * se pasa a 'jugando': a partir de este momento los dos ven las mismas palabras.
 */
export async function unirseADuelo(
  dueloId: string,
  uid: string,
  nombre: string,
  avatar: Avatar
): Promise<void> {
  await runTransaction(baseDatos(), async (tx) => {
    const referencia = doc(baseDatos(), 'duelos', dueloId);
    const actual = await tx.get(referencia);
    if (!actual.exists()) throw new Error('Ese duelo ya no existe');

    const duelo = actual.data() as Duelo;
    if (duelo.jugadores.includes(uid)) return; // ya estaba dentro
    if (duelo.rival) throw new Error('Ese duelo ya tiene dos jugadores');

    tx.update(referencia, {
      rival: { uid, nombre, avatar },
      jugadores: [...duelo.jugadores, uid],
      [`progreso.${uid}`]: progresoInicial(),
      estado: 'jugando',
    });
  });
}

/* -------------------------------------------------------------------- cola */

/**
 * Busca rival en la cola y, si no hay nadie, se queda esperando.
 *
 * No hay colección de espera: la sala es el propio documento del duelo, con
 * `abierto` puesto. Quien llega lista los abiertos sin rival y entra en el más
 * antiguo; el que no encuentra a nadie, crea el suyo y espera a que otro entre.
 *
 * La consulta va sólo con igualdades y sin ordenar a propósito: así le vale a
 * Firestore con sus índices automáticos y no hay que crear ninguno a mano. El
 * orden por antigüedad se hace aquí, sobre un puñado de documentos.
 *
 * @returns el duelo, y si hubo que crearlo o se entró en uno que ya esperaba.
 */
export async function entrarEnCola(
  uid: string,
  nombre: string,
  avatar: Avatar
): Promise<{ dueloId: string; codigo: string; esperando: boolean }> {
  const instantanea = await getDocs(
    query(
      collection(baseDatos(), 'duelos'),
      where('abierto', '==', true),
      where('rival', '==', null),
      limit(10)
    )
  );

  const candidatos = rivalesPosibles(
    instantanea.docs.map((d) => ({ ...(d.data() as Duelo), id: d.id })),
    uid,
    Date.now()
  ) as Duelo[];

  // Puede haber dos personas entrando a la vez en el mismo: la transacción de
  // unirse lo rechaza, y se prueba con el siguiente de la lista.
  for (const candidato of candidatos) {
    try {
      await unirseADuelo(candidato.id, uid, nombre, avatar);
      return { dueloId: candidato.id, codigo: candidato.codigo, esperando: false };
    } catch {
      continue;
    }
  }

  const propio = await crearDuelo(uid, nombre, avatar, true);
  return { dueloId: propio.id, codigo: propio.codigo, esperando: true };
}

/** Salir de la cola: se lleva por delante el duelo que estaba esperando. */
export async function salirDeLaCola(dueloId: string, codigo: string): Promise<void> {
  await deleteDoc(doc(baseDatos(), 'codigosDuelo', codigo)).catch(() => {});
  await deleteDoc(doc(baseDatos(), 'duelos', dueloId)).catch(() => {});
}

/* ---------------------------------------------------------------- revancha */

/**
 * Apunta en el duelo terminado cuál es el de la revancha.
 *
 * Con esto el otro se entera sin recargar nada: ya está escuchando este
 * documento, así que le aparece el botón de aceptar en cuanto se escribe.
 */
export async function proponerRevancha(dueloId: string, nuevoId: string): Promise<void> {
  await updateDoc(doc(baseDatos(), 'duelos', dueloId), { revancha: nuevoId });
}

/** Cuántos duelos pasados se traen. Más que eso ya nadie los mira. */
const MAXIMO_HISTORIAL = 60;

/**
 * Mis duelos, para el historial.
 *
 * Se filtra sólo por estar entre los jugadores —una consulta de un campo, que
 * Firestore resuelve con sus índices automáticos— y el resto se ordena y se
 * descarta aquí. Añadir el estado o el orden a la consulta obligaría a crear un
 * índice a mano en la consola, y no compensa por sesenta documentos.
 */
export async function misDuelos(uid: string): Promise<Duelo[]> {
  const instantanea = await getDocs(
    query(
      collection(baseDatos(), 'duelos'),
      where('jugadores', 'array-contains', uid),
      limit(MAXIMO_HISTORIAL)
    )
  );
  return instantanea.docs.map((d) => ({ ...(d.data() as Duelo), id: d.id }));
}

/** El duelo en tiempo real: es lo que alimenta la minipantalla del rival. */
export function observarDuelo(
  dueloId: string,
  callback: (duelo: Duelo | null) => void
): Unsubscribe {
  return onSnapshot(
    doc(baseDatos(), 'duelos', dueloId),
    (documento) => callback(documento.exists() ? (documento.data() as Duelo) : null),
    () => callback(null)
  );
}

/**
 * Publica mi progreso. Sólo se escribe mi propia casilla, así que los dos
 * jugadores pueden ir enviando a la vez sin pisarse.
 */
export async function publicarProgreso(
  dueloId: string,
  uid: string,
  progreso: ProgresoDuelo
): Promise<void> {
  await updateDoc(doc(baseDatos(), 'duelos', dueloId), {
    [`progreso.${uid}`]: progreso,
  });
}


/**
 * Tira una pulla al rival.
 *
 * Va con la hora del móvil para que dos caritas iguales seguidas se distingan;
 * quien la recibe sólo mira si el número ha cambiado, nunca cuánto vale.
 */
export async function enviarPulla(
  dueloId: string,
  uid: string,
  emoji: string
): Promise<void> {
  // Sin `catch`: si esto falla hay que enterarse. Se tragó una vez y el
  // síntoma fue que las caritas no llegaban y nadie sabía por qué.
  await updateDoc(doc(baseDatos(), 'duelos', dueloId), {
    [`pullas.${uid}`]: { emoji, en: Date.now() },
  });
}

/** Cierra el duelo cuando los dos han terminado. */
export async function cerrarDuelo(dueloId: string): Promise<void> {
  await updateDoc(doc(baseDatos(), 'duelos', dueloId), { estado: 'terminado' }).catch(
    () => {}
  );
}
