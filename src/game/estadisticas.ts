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
