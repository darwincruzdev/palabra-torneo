import { puntosDe } from '../game/evaluar';
import { sumarDias } from '../game/fecha';
import { mesAnterior, mesDe, primerDiaDelMes } from '../game/temporada';
import type { Avatar, DiaTorneo, RecordArcade, ResumenMes, ResultadoDia, Torneo } from '../tipos';

/** Encendida sólo al hacer capturas. Una build normal no la lleva. */
export const MAQUETA_ACTIVA = process.env.EXPO_PUBLIC_MAQUETA === '1';

export const UID_MAQUETA = 'darwin';

const AV: Record<string, Avatar> = {
  darwin: { color: 2, patron: 3 },
  lucia: { color: 4, patron: 1 },
  mama: { color: 3, patron: 2 },
  papa: { color: 6, patron: 0 },
  carmen: { color: 1, patron: 4 },
  paco: { color: 5, patron: 5 },
};

const NOMBRES: Record<string, string> = {
  darwin: 'Darwin',
  lucia: 'Lucía',
  mama: 'Mamá',
  papa: 'Papá',
  carmen: 'Abuela Carmen',
  paco: 'Tío Paco',
};

function resultado(uid: string, intentos: number, acertada: boolean): ResultadoDia {
  const filas: string[] = [];
  for (let i = 0; i < (acertada ? intentos : 6); i++) {
    filas.push(i === intentos - 1 && acertada ? '🟩🟩🟩🟩🟩' : '⬛🟨⬛🟩⬛');
  }
  return {
    uid,
    nombre: NOMBRES[uid],
    avatar: AV[uid],
    intentos: acertada ? intentos : 6,
    acertada,
    puntos: puntosDe(acertada ? intentos : 6, acertada),
    patron: filas.join('\n'),
  };
}

function perfiles(ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, { nombre: NOMBRES[id], avatar: AV[id] }]));
}

/**
 * Tres torneos y unas jornadas de mentira, con la forma de los documentos reales.
 *
 * Sirve para enseñar las pantallas sin una cuenta. Las palabras del día salen
 * de la lista de siempre, con una semilla fija: no se regenera ni se reordena.
 */
export function construirMaqueta(hoy: string): {
  nombre: string;
  avatar: Avatar;
  torneos: Torneo[];
  jornadas: Record<string, DiaTorneo[]>;
  resumenes: Record<string, ResumenMes[]>;
  activoId: string;
  record: RecordArcade;
} {
  const familia = 'familia-cruz';
  const curro = 'los-del-curro';
  const padel = 'padel-domingos';
  const inicio = sumarDias(hoy, -37);
  const miembros = ['darwin', 'lucia', 'mama', 'papa', 'carmen', 'paco'];

  const base = (id: string, nombre: string, codigo: string, semilla: string): Torneo => ({
    id,
    nombre,
    codigo,
    semilla,
    propietario: UID_MAQUETA,
    miembros: id === familia ? miembros : id === curro ? miembros.slice(0, 5) : miembros.slice(0, 4),
    perfiles: perfiles(id === familia ? miembros : id === curro ? miembros.slice(0, 5) : miembros.slice(0, 4)),
    fechaInicio: inicio,
    creado: 1,
  });

  const diasFamilia: DiaTorneo[] = [];
  for (let atras = 14; atras >= 1; atras--) {
    const fecha = sumarDias(hoy, -atras);
    const resultados: Record<string, ResultadoDia> = {
      darwin: resultado('darwin', atras % 3 === 0 ? 3 : 4, true),
      lucia: resultado('lucia', 4, true),
      mama: resultado('mama', 5, true),
      papa: resultado('papa', 4, atras % 5 !== 0),
      carmen: resultado('carmen', 5, true),
    };
    if (atras % 4 !== 0) resultados.paco = resultado('paco', 6, false);
    const dia: DiaTorneo = { fecha, resultados };
    if (atras === 8) dia.protecciones = { darwin: true };
    diasFamilia.push(dia);
  }

  // Hoy ya han jugado casi todos. Darwin y Tío Paco, no: toca abrir con penalización.
  diasFamilia.push({
    fecha: hoy,
    resultados: {
      lucia: resultado('lucia', 4, true),
      mama: resultado('mama', 4, true),
      papa: resultado('papa', 5, true),
      carmen: resultado('carmen', 2, true),
    },
  });

  diasFamilia.push({
    fecha: sumarDias(hoy, 1),
    resultados: {},
    blueshells: {
      lucia: { objetivo: UID_MAQUETA, palabra: 'mango', lanzada: hoy },
    },
  });

  const diasCurro: DiaTorneo[] = [
    {
      fecha: sumarDias(hoy, -1),
      resultados: {
        darwin: resultado('darwin', 4, true),
        lucia: resultado('lucia', 3, true),
      },
    },
  ];

  const diasPadel: DiaTorneo[] = [
    {
      fecha: hoy,
      resultados: { darwin: resultado('darwin', 3, true), lucia: resultado('lucia', 5, true) },
    },
  ];

  const mesPasado = mesAnterior(mesDe(hoy));
  const resumen: ResumenMes = {
    mes: mesPasado,
    jornadas: 28,
    ganadores: ['lucia'],
    filas: [
      {
        uid: 'lucia',
        nombre: 'Lucía',
        avatar: AV.lucia,
        puntos: 98,
        jugadas: 28,
        faltas: 0,
        aciertos: 26,
        intentosTotales: 100,
        mediaIntentos: 3.8,
      },
      {
        uid: 'darwin',
        nombre: 'Darwin',
        avatar: AV.darwin,
        puntos: 90,
        jugadas: 28,
        faltas: 0,
        aciertos: 25,
        intentosTotales: 100,
        mediaIntentos: 4,
      },
    ],
  };

  return {
    nombre: 'Darwin',
    avatar: AV.darwin,
    activoId: familia,
    torneos: [
      base(familia, 'Familia Cruz', 'K7P20X', 'semilla-familia-cruz'),
      base(curro, 'Los del curro', 'CURR01', 'semilla-los-del-curro'),
      base(padel, 'Pádel domingos', 'PADEL1', 'semilla-padel'),
    ],
    jornadas: { [familia]: diasFamilia, [curro]: diasCurro, [padel]: diasPadel },
    resumenes: { [familia]: [resumen], [curro]: [], [padel]: [] },
    record: {
      puntos: 210,
      segundos: 134,
      acertadas: 5,
      intentos: 18,
      fecha: primerDiaDelMes(mesDe(hoy)),
    },
  };
}
