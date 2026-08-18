import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Avatar, Duelo, InvitacionDuelo, JugadorDuelo, ProgresoDuelo } from '../tipos';
import { generarSemilla } from '../game/semilla';
import { PALABRAS_POR_DUELO, cerradasVacias, rejillaVacia } from '../game/duelo';
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
  avatar: Avatar
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
