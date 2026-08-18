import type { DiaTorneo, FilaClasificacion, Torneo } from '../tipos';
import { normalizarAvatar } from './avatares';

/**
 * Construye la clasificación de un torneo sumando las jornadas indicadas.
 *
 * @param hasta fecha (excluida) hasta la que contar. Se usa para saber quién
 *              iba primero *antes* de la jornada de hoy, que es lo que decide
 *              la penalización del líder.
 */
export function clasificacion(
  torneo: Torneo,
  dias: DiaTorneo[],
  hasta?: string
): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion>();

  for (const uid of torneo.miembros) {
    const perfil = torneo.perfiles?.[uid];
    filas.set(uid, {
      uid,
      nombre: perfil?.nombre ?? 'Jugador',
      avatar: normalizarAvatar(perfil?.avatar),
      puntos: 0,
      jugadas: 0,
      aciertos: 0,
      intentosTotales: 0,
      mediaIntentos: null,
    });
  }

  for (const dia of dias) {
    if (dia.fecha < torneo.fechaInicio) continue; // antes de fundarse no puntúa
    if (hasta && dia.fecha >= hasta) continue;
    for (const [uid, r] of Object.entries(dia.resultados ?? {})) {
      const fila = filas.get(uid);
      if (!fila) continue; // resultado de alguien que ya no está en el torneo
      fila.puntos += r.puntos;
      fila.jugadas += 1;
      if (r.acertada) {
        fila.aciertos += 1;
        fila.intentosTotales += r.intentos;
      }
      // El resultado lleva el nombre y el avatar del día en que se jugó; el
      // del torneo manda, porque es el que la persona tiene ahora.
      if (!torneo.perfiles?.[uid] && r.nombre) fila.nombre = r.nombre;
    }
  }

  const orden = [...filas.values()].map((f) => ({
    ...f,
    mediaIntentos: f.aciertos > 0 ? f.intentosTotales / f.aciertos : null,
  }));

  orden.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.aciertos !== a.aciertos) return b.aciertos - a.aciertos;
    const ma = a.mediaIntentos ?? Infinity;
    const mb = b.mediaIntentos ?? Infinity;
    if (ma !== mb) return ma - mb;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  return orden;
}

/**
 * uid del líder destacado, o null si no lo hay.
 *
 * Sólo cuenta si va primero en solitario: si empata a puntos con el segundo,
 * nadie arrastra penalización.
 */
export function liderDestacado(filas: FilaClasificacion[]): string | null {
  if (filas.length < 2) return null;
  const [primero, segundo] = filas;
  if (primero.puntos <= 0) return null;
  if (primero.puntos === segundo.puntos) return null;
  return primero.uid;
}
