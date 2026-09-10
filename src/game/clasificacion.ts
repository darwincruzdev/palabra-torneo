import type { DiaTorneo, FilaClasificacion, ResumenMes, Torneo } from '../tipos';
import { normalizarAvatar } from './avatares';
import { PUNTOS_POR_FALTA } from './constantes';
import { fechaJuego, sumarDias } from './fecha';
import { normalizarReglas } from './reglas';
import {
  anoDe,
  jornadasDelMes,
  mesCerrado,
  mesDe,
  mesSiguiente,
  mesesConJuego,
  primerDiaDelMes,
} from './temporada';

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

type Opciones = {
  /** Temporada que se cuenta, en formato "2026-08". Por defecto, la de hoy. */
  mes?: string;
  /**
   * Fecha (excluida) hasta la que contar. Sirve para saber quién iba primero
   * *antes* de la jornada de hoy, que es lo que decide la penalización.
   */
  hasta?: string;
  hoy?: string;
};

/**
 * La clasificación de un mes.
 *
 * Cada mes es una temporada: el día 1 la tabla vuelve a cero y quien va primero
 * al cerrarse el mes se lleva el trofeo. No hay ningún proceso que "cierre" el
 * mes ni nada guardado que pueda quedarse a medias: la tabla se calcula del
 * historial, así que el corte ocurre solo al cambiar el calendario.
 */
export function clasificacion(
  torneo: Torneo,
  dias: DiaTorneo[],
  opciones: Opciones = {}
): FilaClasificacion[] {
  const hoy = opciones.hoy ?? fechaJuego();
  const mes = opciones.mes ?? mesDe(hoy);
  const hasta = opciones.hasta;
  // Fuera de la temporada no cuenta nada, ni para puntos ni para faltas.
  const delMes = jornadasDelMes(dias, mes, torneo.fechaInicio);
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

  for (const dia of delMes) {
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

  /**
   * Hasta dónde se cobran faltas, sin salirse de la temporada.
   *
   * Son tres topes a la vez: no más allá de hoy —la jornada de hoy sigue
   * abierta—, no más allá del corte que pidan, y sobre todo no más allá del
   * mes. Sin este último, consultar un mes cerrado le cobraba a la gente todos
   * los días transcurridos desde entonces, y septiembre dejaba a julio en
   * números rojos.
   */
  const desdeElMes = primerDiaDelMes(mes);
  const finDelMes = primerDiaDelMes(mesSiguiente(mes));
  const topes = [hasta && hasta < hoy ? hasta : hoy, finDelMes];
  const limiteFaltas = topes.reduce((a, b) => (a < b ? a : b), finDelMes);

  const orden = [...filas.values()].map((f) => {
    const faltas = reglas.faltaPorNoJugar
      ? faltasDe(delMes, f.uid, limiteFaltas < desdeElMes ? desdeElMes : limiteFaltas)
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
 * uid del último destacado, o null si no lo hay.
 *
 * Mismo criterio que el líder, del revés: sólo cuenta si va último en solitario.
 * Si empata a puntos con el penúltimo, nadie recibe la ayuda — sería regalarle
 * una letra a media tabla.
 */
export function colistaDestacado(filas: FilaClasificacion[]): string | null {
  if (filas.length < 2) return null;
  const ultimo = filas[filas.length - 1];
  const penultimo = filas[filas.length - 2];
  if (ultimo.puntos === penultimo.puntos) return null;
  return ultimo.uid;
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


/* --------------------------------------------------------------- palmarés */

/**
 * Un mes ganado.
 *
 * Va una lista y no un solo uid porque el mes se puede compartir: la tabla
 * desempata por puntos, luego por palabras acertadas y luego por media de
 * intentos, pero si dos personas empatan en las tres el trofeo es de las dos.
 * Lo que no se hace es repartirlo por orden alfabético, que es lo que usa la
 * tabla como último recurso para ordenar filas.
 */
export type Trofeo = {
  mes: string;
  /** Quién lo gana. Más de uno sólo si el torneo comparte los empates. */
  uids: string[];
  /**
   * El mes empató y el torneo lo resuelve a mano, pero nadie ha decidido aún.
   * No cuenta para el campeonato del año hasta que se decida.
   */
  pendiente?: boolean;
};

/**
 * Los trofeos de un torneo: quien acabó primero cada mes ya cerrado.
 *
 * Se calcula del historial cada vez, en vez de guardarse el día 1. Así no hay
 * ningún proceso que pueda no ejecutarse —nadie tiene un servidor encendido a
 * medianoche—, ni un campo que alguien pueda tocar. Si se corrige una jornada
 * vieja, el palmarés se corrige solo.
 *
 * El mes en curso no reparte nada: quien va primero hoy puede no ir primero el
 * día 31.
 */
export function palmares(
  torneo: Torneo,
  dias: DiaTorneo[],
  hoy: string = fechaJuego()
): Trofeo[] {
  const reglas = normalizarReglas(torneo.reglas);
  const trofeos: Trofeo[] = [];
  for (const mes of mesesConJuego(dias, torneo.fechaInicio)) {
    if (!mesCerrado(mes, hoy)) continue;
    const filas = clasificacion(torneo, dias, { mes, hoy });
    const [campeon] = filas;
    // Un mes en el que nadie sumó no tiene ganador.
    if (!campeon || campeon.puntos <= 0) continue;

    /**
     * Qué cuenta como empate depende de la norma del torneo.
     *
     * A mano: basta con empatar **a puntos**. Es lo que la gente llama empate
     * y lo que tiene sentido resolver con un duelo; desempatarlo por decimales
     * de media de intentos deja al grupo sin nada que decidir, que es
     * justamente lo que se quería evitar.
     *
     * En automático: sólo si empatan además en aciertos y en media, porque ahí
     * la tabla ya no tiene con qué separarlos y el mes se comparte.
     */
    const uids = filas
      .filter((f) =>
        reglas.desempateManual
          ? f.puntos === campeon.puntos
          : f.puntos === campeon.puntos &&
            f.aciertos === campeon.aciertos &&
            f.mediaIntentos === campeon.mediaIntentos
      )
      .map((f) => f.uid);

    if (uids.length === 1 || !reglas.desempateManual) {
      trofeos.push({ mes, uids });
      continue;
    }

    /**
     * Empate y el torneo lo resuelve a mano.
     *
     * La decisión del fundador sólo vale si señala a alguien que empató de
     * verdad. Es la diferencia entre elegir entre iguales y repartir trofeos a
     * dedo: aunque alguien escribiera otro uid en la base de datos, aquí no
     * colaría.
     */
    const elegido = torneo.desempates?.[mes];
    if (elegido && uids.includes(elegido)) {
      trofeos.push({ mes, uids: [elegido] });
    } else {
      trofeos.push({ mes, uids, pendiente: true });
    }
  }
  return trofeos.sort((a, b) => b.mes.localeCompare(a.mes));
}

/** Cuántos trofeos lleva cada uno, para pintar la vitrina. */
export function trofeosPorJugador(trofeos: Trofeo[]): Record<string, number> {
  const cuenta: Record<string, number> = {};
  for (const trofeo of trofeos) {
    // Un mes sin resolver no es de nadie todavía.
    if (trofeo.pendiente) continue;
    // Un mes compartido cuenta entero para cada uno: si lo ganaron los dos, los
    // dos llegan a diciembre con ese mes en el bolsillo.
    for (const uid of trofeo.uids) cuenta[uid] = (cuenta[uid] ?? 0) + 1;
  }
  return cuenta;
}

/** Lo que ha hecho cada uno en todo un año, para desempatar el campeonato. */
export function resumenDelAno(
  torneo: Torneo,
  dias: DiaTorneo[],
  ano: string
): Record<string, { aciertos: number; mediaIntentos: number | null }> {
  const cuenta: Record<string, { aciertos: number; intentos: number }> = {};

  for (const dia of dias) {
    if (dia.fecha < torneo.fechaInicio) continue;
    if (anoDe(mesDe(dia.fecha)) !== ano) continue;
    for (const [uid, r] of Object.entries(dia.resultados ?? {})) {
      if (!r.acertada) continue;
      const suyo = (cuenta[uid] ??= { aciertos: 0, intentos: 0 });
      suyo.aciertos += 1;
      suyo.intentos += r.intentos;
    }
  }

  return Object.fromEntries(
    Object.entries(cuenta).map(([uid, { aciertos, intentos }]) => [
      uid,
      { aciertos, mediaIntentos: aciertos > 0 ? intentos / aciertos : null },
    ])
  );
}

/** Cómo se decidió el campeonato, para poder explicarlo en pantalla. */
export type CriterioCampeonato = 'trofeos' | 'aciertos' | 'media' | 'empate';

export type Campeonato = {
  /** Normalmente uno. Más de uno sólo si empatan hasta en el último criterio. */
  uids: string[];
  trofeos: number;
  criterio: CriterioCampeonato;
};

/**
 * Quién gana el año.
 *
 * Manda el número de trofeos. Si hay empate se mira todo el año, no un mes
 * suelto: primero quién acertó más palabras y luego quién las sacó en menos
 * intentos. Es el mismo orden con el que la tabla mensual rompe empates, sólo
 * que sobre los doce meses.
 *
 * Lo que no se hace es desempatar por orden alfabético, que es lo que hace la
 * tabla del día como último recurso: para un puesto del día vale, para el
 * campeonato del año sería una tomadura de pelo. Si empatan hasta en la media,
 * son campeones los dos.
 */
export function campeonDelAno(
  torneo: Torneo,
  dias: DiaTorneo[],
  trofeos: Trofeo[],
  ano: string
): Campeonato {
  const delAno = trofeos.filter((t) => anoDe(t.mes) === ano);
  const cuenta = trofeosPorJugador(delAno);
  const mejor = Math.max(0, ...Object.values(cuenta));
  if (mejor === 0) return { uids: [], trofeos: 0, criterio: 'empate' };

  const empatados = Object.keys(cuenta).filter((uid) => cuenta[uid] === mejor);
  if (empatados.length === 1) {
    return { uids: empatados, trofeos: mejor, criterio: 'trofeos' };
  }

  const resumen = resumenDelAno(torneo, dias, ano);

  const masAciertos = Math.max(...empatados.map((uid) => resumen[uid]?.aciertos ?? 0));
  const porAciertos = empatados.filter(
    (uid) => (resumen[uid]?.aciertos ?? 0) === masAciertos
  );
  if (porAciertos.length === 1) {
    return { uids: porAciertos, trofeos: mejor, criterio: 'aciertos' };
  }

  const medias = porAciertos.map((uid) => resumen[uid]?.mediaIntentos ?? Infinity);
  const mejorMedia = Math.min(...medias);
  const porMedia = porAciertos.filter(
    (uid) => (resumen[uid]?.mediaIntentos ?? Infinity) === mejorMedia
  );
  if (porMedia.length === 1) {
    return { uids: porMedia, trofeos: mejor, criterio: 'media' };
  }

  return { uids: porMedia.sort(), trofeos: mejor, criterio: 'empate' };
}


/**
 * Los meses ya cerrados, reducidos a cómo quedaron.
 *
 * Se calcula una vez, al traerse el historial, y a partir de ahí se tiran los
 * días: con esto se puede enseñar la tabla final de cualquier mes sin volver a
 * pedir nada y sin tener treinta documentos por mes ocupando memoria.
 */
export function resumirMeses(
  torneo: Torneo,
  dias: DiaTorneo[],
  hoy: string = fechaJuego()
): ResumenMes[] {
  const trofeos = palmares(torneo, dias, hoy);
  const porMes = new Map(trofeos.map((t) => [t.mes, t]));

  return mesesConJuego(dias, torneo.fechaInicio)
    .filter((mes) => mesCerrado(mes, hoy))
    .map((mes) => {
      const trofeo = porMes.get(mes);
      return {
        mes,
        filas: clasificacion(torneo, dias, { mes, hoy }),
        ganadores: trofeo?.uids ?? [],
        pendiente: trofeo?.pendiente,
        jornadas: jornadasDelMes(dias, mes, torneo.fechaInicio).length,
      };
    });
}

/** Los trofeos, sacados de los resúmenes en vez de del historial entero. */
export function trofeosDeResumenes(resumenes: ResumenMes[]): Trofeo[] {
  return resumenes
    .filter((r) => r.ganadores.length > 0)
    .map((r) => ({
      mes: r.mes,
      uids: r.ganadores,
      ...(r.pendiente ? { pendiente: true } : {}),
    }));
}
