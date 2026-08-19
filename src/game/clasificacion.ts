import type { DiaTorneo, FilaClasificacion, Torneo } from '../tipos';
import { normalizarAvatar } from './avatares';
import { PUNTOS_POR_FALTA } from './constantes';
import { fechaJuego, sumarDias } from './fecha';
import { normalizarReglas } from './reglas';

/**
 * Jornadas cerradas que alguien se saltó.
 *
 * Se cuentan desde la primera que jugó, no desde que se fundó el torneo. No
 * guardamos cuándo entró cada uno, y cobrarle a alguien las cincuenta jornadas
 * anteriores a que llegara sería absurdo; su primera partida es lo más cercano
 * que tenemos a su fecha de alta. Y se recorren fechas, no documentos: un día
 * que no jugó nadie no deja documento y es justo el que hay que cobrar.
 */
function faltasDe(dias: DiaTorneo[], uid: string, limite: string): number {
  const jugadas = new Set(
    dias.filter((d) => d.resultados?.[uid]).map((d) => d.fecha)
  );
  if (jugadas.size === 0) return 0;

  const primera = [...jugadas].sort()[0];
  let faltas = 0;
  for (let fecha = primera; fecha < limite; fecha = sumarDias(fecha, 1)) {
    if (!jugadas.has(fecha)) faltas += 1;
  }
  return faltas;
}

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
  hasta?: string,
  hoy: string = fechaJuego()
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
      faltas: 0,
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

  /**
   * Las faltas sólo cuentan sobre jornadas cerradas.
   *
   * La de hoy sigue abierta hasta medianoche, así que no penaliza a nadie: si
   * contara, todo el mundo amanecería con un menos uno hasta ponerse a jugar.
   */
  const reglas = normalizarReglas(torneo.reglas);
  const limiteFaltas = hasta && hasta < hoy ? hasta : hoy;
  const contables = dias.filter((d) => d.fecha >= torneo.fechaInicio);

  const orden = [...filas.values()].map((f) => {
    const faltas = reglas.faltaPorNoJugar
      ? faltasDe(contables, f.uid, limiteFaltas)
      : 0;
    return {
      ...f,
      faltas,
      puntos: f.puntos + faltas * PUNTOS_POR_FALTA,
      mediaIntentos: f.aciertos > 0 ? f.intentosTotales / f.aciertos : null,
    };
  });

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
