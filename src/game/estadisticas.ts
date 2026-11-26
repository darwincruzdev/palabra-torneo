import { MAX_INTENTOS } from './constantes';
import { sumarDias } from './fecha';
import type { DiaTorneo, PartidaHecha } from '../tipos';

/**
 * Mis partidas de un torneo, sacadas de las jornadas guardadas.
 *
 * Las estadísticas personales vivían sólo en la memoria del móvil, así que
 * cambiar de aparato —o instalarse el APK— las dejaba a cero aunque las
 * partidas estuvieran jugadas y guardadas en el servidor. Aquí se reconstruyen
 * de lo que ya hay: cada jornada lleva los intentos, si se acertó, los puntos y
 * la cuadrícula de quien la jugó.
 */
export function misPartidas(
  torneoId: string,
  dias: DiaTorneo[],
  uid: string
): PartidaHecha[] {
  const mias: PartidaHecha[] = [];
  for (const dia of dias) {
    const resultado = dia.resultados?.[uid];
    if (!resultado) continue;
    mias.push({
      torneoId,
      fecha: dia.fecha,
      intentos: resultado.intentos,
      acertada: resultado.acertada,
      puntos: resultado.puntos,
      patron: resultado.patron,
    });
  }
  return mias;
}

/**
 * Junta varias listas de partidas en una sola, sin repetir.
 *
 * Una misma jornada puede llegar por dos caminos: lo que guardó este móvil al
 * jugarla y lo que consta en el servidor. Manda la última que se pase, que es
 * la del servidor: si alguien jugó desde otro aparato, aquí no habría nada que
 * guardar y aun así tiene que contar.
 *
 * El modo libre sólo existe en el móvil —no se publica en ningún sitio—, así
 * que la lista local es la única forma de que esas partidas cuenten.
 */
export function fusionarHistorial(...listas: PartidaHecha[][]): PartidaHecha[] {
  const porJornada = new Map<string, PartidaHecha>();
  for (const lista of listas) {
    for (const partida of lista) {
      porJornada.set(`${partida.torneoId}:${partida.fecha}`, partida);
    }
  }
  return [...porJornada.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Lo mínimo de una partida para poder contar rachas y el reparto. */
export type PartidaContable = {
  fecha: string;
  acertada: boolean;
  puntos: number;
  intentos: number;
};

export type ResumenPersonal = {
  jugadas: number;
  aciertos: number;
  puntos: number;
  porcentaje: number;
  /** Puntos por jornada, o null si todavía no hay ninguna. */
  media: number | null;
  /** Cuántas veces se acertó en el intento 1, 2, … 6. Los fallos no entran. */
  reparto: number[];
  /** Días seguidos con acierto, contando hasta hoy. */
  racha: number;
  mejorRacha: number;
};

/**
 * Racha de días con al menos un acierto.
 *
 * Varias partidas el mismo día —un torneo y La diaria, por ejemplo— cuentan
 * como un solo día. Un día en el que se jugó y no se acertó nada, o un hueco
 * en el calendario, corta la racha.
 *
 * La actual llega hasta hoy. Si hoy todavía no se ha jugado, se mira desde
 * ayer: el día no se pierde hasta que cierra sin un acierto.
 */
export function rachas(
  partidas: Pick<PartidaContable, 'fecha' | 'acertada'>[],
  hoy: string
): { actual: number; mejor: number } {
  const porDia = new Map<string, boolean>();
  for (const partida of partidas) {
    porDia.set(partida.fecha, (porDia.get(partida.fecha) ?? false) || partida.acertada);
  }

  const dias = [...porDia.keys()].sort();
  let mejor = 0;
  let seguidas = 0;
  let previa: string | null = null;
  for (const dia of dias) {
    const acierto = porDia.get(dia) === true;
    const consecutivo = previa !== null && sumarDias(previa, 1) === dia;
    if (acierto && (previa === null || consecutivo)) seguidas += 1;
    else seguidas = acierto ? 1 : 0;
    mejor = Math.max(mejor, seguidas);
    previa = dia;
  }

  const tieneHoy = porDia.has(hoy);
  const ancla = tieneHoy ? hoy : sumarDias(hoy, -1);
  // Hoy jugado y fallado: la racha de ahora es cero, aunque ayer siguiera.
  if (tieneHoy && porDia.get(hoy) !== true) return { actual: 0, mejor };

  let actual = 0;
  for (let dia = ancla; porDia.get(dia) === true; dia = sumarDias(dia, -1)) {
    actual += 1;
  }
  return { actual, mejor: Math.max(mejor, actual) };
}

/** Jugadas, aciertos, reparto y rachas de un historial ya fusionado. */
export function resumenPersonal(partidas: PartidaContable[], hoy: string): ResumenPersonal {
  const jugadas = partidas.length;
  const aciertos = partidas.filter((p) => p.acertada).length;
  const puntos = partidas.reduce((suma, p) => suma + p.puntos, 0);
  const reparto = new Array(MAX_INTENTOS).fill(0) as number[];
  for (const partida of partidas) {
    if (partida.acertada && partida.intentos >= 1 && partida.intentos <= MAX_INTENTOS) {
      reparto[partida.intentos - 1] += 1;
    }
  }
  const { actual, mejor } = rachas(partidas, hoy);
  return {
    jugadas,
    aciertos,
    puntos,
    porcentaje: jugadas === 0 ? 0 : Math.round((aciertos / jugadas) * 100),
    media: jugadas === 0 ? null : puntos / jugadas,
    reparto,
    racha: actual,
    mejorRacha: mejor,
  };
}
