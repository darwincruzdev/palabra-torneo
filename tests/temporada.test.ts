import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  anoDe,
  jornadasDelMes,
  mesCerrado,
  mesDe,
  mesLargo,
  mesSiguiente,
  mesesConJuego,
  primerDiaDelMes,
  ultimoDiaDelMes,
} from '../src/game/temporada';
import {
  campeonDelAno,
  clasificacion,
  palmares,
  resumirMeses,
  trofeosDeResumenes,
  trofeosPorJugador,
} from '../src/game/clasificacion';
import {
  BLUESHELLS_POR_MES,
  PROTECCIONES_POR_MES,
  balasQueLeQuedan,
  blueshellsGastadas,
  escudosQueLeQuedan,
  proteccionesGastadas,
} from '../src/game/reglas';
import { AVATAR_POR_DEFECTO } from '../src/game/avatares';
import type { DiaTorneo, ResultadoDia, Torneo } from '../src/tipos';

const torneo: Torneo = {
  id: 't1',
  nombre: 'Familia',
  codigo: 'ABC123',
  semilla: 'semilla-de-prueba',
  propietario: 'ana',
  miembros: ['ana', 'bea', 'caj'],
  perfiles: {
    ana: { nombre: 'Ana', avatar: AVATAR_POR_DEFECTO },
    bea: { nombre: 'Bea', avatar: AVATAR_POR_DEFECTO },
    caj: { nombre: 'Carlos', avatar: AVATAR_POR_DEFECTO },
  },
  reglas: { penalizacionLider: true, blueshells: true, faltaPorNoJugar: false, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
  fechaInicio: '2026-01-01',
  creado: 0,
};

/** Para lo único que se comprueba aquí de faltas: que no crucen de mes. */
const conFaltas: Torneo = {
  ...torneo,
  reglas: { penalizacionLider: true, blueshells: true, faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
};

function resultado(uid: string, puntos: number): ResultadoDia {
  return {
    uid,
    nombre: uid,
    avatar: AVATAR_POR_DEFECTO,
    intentos: puntos > 0 ? 2 : 6,
    acertada: puntos > 0,
    puntos,
    patron: '',
  };
}

function jornada(fecha: string, filas: ResultadoDia[]): DiaTorneo {
  return {
    fecha,
    resultados: Object.fromEntries(filas.map((r) => [r.uid, r])),
  };
}

describe('el calendario de la temporada', () => {
  it('saca el mes y el año de una fecha', () => {
    assert.equal(mesDe('2026-08-14'), '2026-08');
    assert.equal(anoDe('2026-08'), '2026');
  });

  it('conoce el primer y el último día de cada mes', () => {
    assert.equal(primerDiaDelMes('2026-08'), '2026-08-01');
    assert.equal(ultimoDiaDelMes('2026-08'), '2026-08-31');
    assert.equal(ultimoDiaDelMes('2026-04'), '2026-04-30');
  });

  it('cuenta bien los febreros, bisiestos incluidos', () => {
    assert.equal(ultimoDiaDelMes('2026-02'), '2026-02-28');
    assert.equal(ultimoDiaDelMes('2028-02'), '2028-02-29');
  });

  it('diciembre pasa a enero del año siguiente', () => {
    assert.equal(ultimoDiaDelMes('2026-12'), '2026-12-31');
    assert.equal(mesSiguiente('2026-12'), '2027-01');
    assert.equal(mesSiguiente('2026-08'), '2026-09');
  });

  it('el mes en curso no está cerrado', () => {
    assert.equal(mesCerrado('2026-08', '2026-08-31'), false);
    assert.equal(mesCerrado('2026-08', '2026-09-01'), true);
    assert.equal(mesCerrado('2026-09', '2026-08-31'), false);
  });

  it('se lee en cristiano', () => {
    assert.equal(mesLargo('2026-08'), 'agosto de 2026');
  });
});

describe('qué jornadas son de cada mes', () => {
  const dias = [
    jornada('2026-07-31', [resultado('ana', 7)]),
    jornada('2026-08-01', [resultado('ana', 7)]),
    jornada('2026-08-31', [resultado('ana', 7)]),
    jornada('2026-09-01', [resultado('ana', 7)]),
  ];

  it('coge las del mes y ninguna más', () => {
    assert.deepEqual(
      jornadasDelMes(dias, '2026-08', '2026-01-01').map((d) => d.fecha),
      ['2026-08-01', '2026-08-31']
    );
  });

  it('respeta la fundación del torneo', () => {
    assert.deepEqual(
      jornadasDelMes(dias, '2026-08', '2026-08-15').map((d) => d.fecha),
      ['2026-08-31']
    );
  });

  it('lista los meses con juego, del más nuevo al más viejo', () => {
    assert.deepEqual(mesesConJuego(dias, '2026-01-01'), ['2026-09', '2026-08', '2026-07']);
  });

  it('un mes sin resultados no es una temporada', () => {
    const conVacia = [...dias, { fecha: '2026-10-05', resultados: {} }];
    assert.ok(!mesesConJuego(conVacia, '2026-01-01').includes('2026-10'));
  });
});

describe('la clasificación se pone a cero cada mes', () => {
  const dias = [
    jornada('2026-07-20', [resultado('ana', 7), resultado('bea', 7)]),
    jornada('2026-07-21', [resultado('ana', 7)]),
    jornada('2026-08-01', [resultado('bea', 5)]),
  ];

  it('lo del mes pasado no cuenta en el nuevo', () => {
    const agosto = clasificacion(torneo, dias, { hoy: '2026-08-01' });
    assert.equal(agosto.find((f) => f.uid === 'bea')!.puntos, 5);
    assert.equal(agosto.find((f) => f.uid === 'ana')!.puntos, 0);
  });

  it('se puede consultar un mes anterior', () => {
    const julio = clasificacion(torneo, dias, { mes: '2026-07', hoy: '2026-08-01' });
    assert.equal(julio[0].uid, 'ana');
    assert.equal(julio[0].puntos, 14);
  });

  it('las faltas tampoco cruzan de mes', () => {
    // Ana jugó en julio y nada en agosto. En agosto no arrastra ninguna falta:
    // no ha empezado la temporada, y las de julio se quedaron en julio.
    const agosto = clasificacion(conFaltas, dias, { hoy: '2026-08-05' });
    assert.equal(agosto.find((f) => f.uid === 'ana')!.faltas, 0);
    assert.equal(agosto.find((f) => f.uid === 'ana')!.puntos, 0);
  });

  it('consultar un mes cerrado no le cobra los días posteriores', () => {
    // Sin tope, mirar julio desde diciembre le cobraría a todos cinco meses de
    // faltas y la tabla saldría en números rojos.
    const julio = clasificacion(conFaltas, dias, { mes: '2026-07', hoy: '2026-12-01' });
    const ana = julio.find((f) => f.uid === 'ana')!;
    assert.ok(ana.faltas <= 31, 'las faltas no pueden salirse del mes');
    assert.equal(ana.faltas, 10, 'del 22 al 31 de julio, que no se jugaron');
  });
});

describe('trofeos y campeón del año', () => {
  const dias = [
    // Julio lo gana Ana.
    jornada('2026-07-10', [resultado('ana', 7), resultado('bea', 5)]),
    // Agosto lo gana Bea.
    jornada('2026-08-10', [resultado('ana', 3), resultado('bea', 7)]),
    // Septiembre, en curso.
    jornada('2026-09-02', [resultado('ana', 7)]),
  ];

  const trofeos = palmares(torneo, dias, '2026-09-03');

  it('un trofeo por cada mes ya cerrado', () => {
    assert.deepEqual(trofeos, [
      { mes: '2026-08', uids: ['bea'] },
      { mes: '2026-07', uids: ['ana'] },
    ]);
  });

  it('el mes en curso todavía no reparte', () => {
    assert.ok(!trofeos.some((t) => t.mes === '2026-09'));
  });

  it('un mes en el que nadie puntuó no tiene ganador', () => {
    const enBlanco = [jornada('2026-07-10', [resultado('ana', 0), resultado('bea', 0)])];
    assert.deepEqual(palmares(torneo, enBlanco, '2026-08-01'), []);
  });

  it('cuenta los trofeos de cada uno', () => {
    assert.deepEqual(trofeosPorJugador(trofeos), { bea: 1, ana: 1 });
  });

  it('el campeón del año es quien más lleva', () => {
    const conTercero = [...trofeos, { mes: '2026-06', uids: ['ana'] }];
    assert.deepEqual(campeonDelAno(torneo, dias, conTercero, '2026'), {
      uids: ['ana'],
      trofeos: 2,
      criterio: 'trofeos',
    });
  });

  it('un año sin trofeos no tiene campeón', () => {
    assert.deepEqual(campeonDelAno(torneo, dias, trofeos, '2025'), {
      uids: [],
      trofeos: 0,
      criterio: 'empate',
    });
  });
});

describe('munición por mes', () => {
  function conBala(fecha: string, lanzada: string): DiaTorneo {
    return {
      fecha,
      resultados: {},
      blueshells: { ana: { objetivo: 'bea', palabra: 'sosos', lanzada } },
    };
  }

  it('son dos balas y dos escudos al mes', () => {
    assert.equal(BLUESHELLS_POR_MES, 2);
    assert.equal(PROTECCIONES_POR_MES, 2);
    assert.equal(balasQueLeQuedan([], '2026-01-01', '2026-08', 'ana'), 2);
    assert.equal(escudosQueLeQuedan([], '2026-01-01', '2026-08', 'ana'), 2);
  });

  it('cada disparo descuenta una', () => {
    const dias = [conBala('2026-08-06', '2026-08-05')];
    assert.equal(blueshellsGastadas(dias, '2026-01-01', '2026-08', 'ana'), 1);
    assert.equal(balasQueLeQuedan(dias, '2026-01-01', '2026-08', 'ana'), 1);
  });

  it('gastadas las dos, no quedan más', () => {
    const dias = [conBala('2026-08-06', '2026-08-05'), conBala('2026-08-20', '2026-08-19')];
    assert.equal(balasQueLeQuedan(dias, '2026-01-01', '2026-08', 'ana'), 0);
  });

  it('el día 1 se recarga todo', () => {
    const dias = [conBala('2026-08-06', '2026-08-05'), conBala('2026-08-20', '2026-08-19')];
    assert.equal(balasQueLeQuedan(dias, '2026-01-01', '2026-09', 'ana'), 2);
  });

  it('disparar el 31 no le quita bala al mes siguiente', () => {
    // Se lanza el 31 de agosto y golpea el 1 de septiembre: la bala es de agosto.
    const dias = [conBala('2026-09-01', '2026-08-31')];
    assert.equal(balasQueLeQuedan(dias, '2026-01-01', '2026-08', 'ana'), 1);
    assert.equal(balasQueLeQuedan(dias, '2026-01-01', '2026-09', 'ana'), 2);
  });

  it('reiniciar la competición devuelve la munición', () => {
    const dias = [conBala('2026-08-06', '2026-08-05')];
    assert.equal(balasQueLeQuedan(dias, '2026-08-10', '2026-08', 'ana'), 2);
  });

  it('los escudos se cuentan por el día en que se gastan', () => {
    const dias: DiaTorneo[] = [
      { fecha: '2026-08-03', resultados: {}, protecciones: { ana: true } },
      { fecha: '2026-09-03', resultados: {}, protecciones: { ana: true } },
    ];
    assert.equal(proteccionesGastadas(dias, '2026-01-01', '2026-08', 'ana'), 1);
    assert.equal(escudosQueLeQuedan(dias, '2026-01-01', '2026-08', 'ana'), 1);
    assert.equal(escudosQueLeQuedan(dias, '2026-01-01', '2026-10', 'ana'), 2);
  });
});

describe('desempate del campeonato del año', () => {
  // Ana y Bea acaban con un trofeo cada una: el año se decide con lo hecho en
  // los doce meses, no con un mes suelto.
  const empatados = [
    { mes: '2026-07', uids: ['ana'] },
    { mes: '2026-08', uids: ['bea'] },
  ];

  function conAciertos(anaAciertos: number, beaAciertos: number, anaIntentos = 2, beaIntentos = 2) {
    const dias: DiaTorneo[] = [];
    for (let i = 0; i < Math.max(anaAciertos, beaAciertos); i++) {
      const filas: ResultadoDia[] = [];
      if (i < anaAciertos) {
        filas.push({ ...resultado('ana', 5), intentos: anaIntentos, acertada: true });
      }
      if (i < beaAciertos) {
        filas.push({ ...resultado('bea', 5), intentos: beaIntentos, acertada: true });
      }
      dias.push(jornada(`2026-07-${String(i + 1).padStart(2, '0')}`, filas));
    }
    return dias;
  }

  it('gana quien más palabras acertó en el año', () => {
    const veredicto = campeonDelAno(torneo, conAciertos(9, 5), empatados, '2026');
    assert.deepEqual(veredicto.uids, ['ana']);
    assert.equal(veredicto.criterio, 'aciertos');
  });

  it('a igualdad de aciertos, gana quien menos intentos gasta', () => {
    const veredicto = campeonDelAno(torneo, conAciertos(6, 6, 2, 4), empatados, '2026');
    assert.deepEqual(veredicto.uids, ['ana'], 'Ana las saca en 2 intentos, Bea en 4');
    assert.equal(veredicto.criterio, 'media');
  });

  it('sólo si empatan hasta en la media quedan los dos', () => {
    const veredicto = campeonDelAno(torneo, conAciertos(6, 6, 3, 3), empatados, '2026');
    assert.deepEqual(veredicto.uids, ['ana', 'bea']);
    assert.equal(veredicto.criterio, 'empate');
  });
});

describe('quién gana el mes cuando se empata a puntos', () => {
  function mesDe2(anaIntentos: number, beaIntentos: number, anaDias: number, beaDias: number) {
    const dias: DiaTorneo[] = [];
    for (let i = 1; i <= Math.max(anaDias, beaDias); i++) {
      const filas: ResultadoDia[] = [];
      if (i <= anaDias) filas.push({ ...resultado('ana', 5), intentos: anaIntentos });
      if (i <= beaDias) filas.push({ ...resultado('bea', 5), intentos: beaIntentos });
      dias.push(jornada(`2026-07-${String(i).padStart(2, '0')}`, filas));
    }
    return dias;
  }

  it('a igualdad de puntos, gana quien más palabras acertó', () => {
    // Ana: 2 jornadas a 5. Bea: 2 jornadas a 5 pero una fallada que no puntúa.
    const dias = [
      jornada('2026-07-01', [resultado('ana', 5), resultado('bea', 5)]),
      jornada('2026-07-02', [resultado('ana', 5), resultado('bea', 5)]),
      jornada('2026-07-03', [resultado('ana', 4), { ...resultado('bea', 4), acertada: false }]),
    ];
    const julio = clasificacion(torneo, dias, { mes: '2026-07', hoy: '2026-08-01' });
    assert.equal(julio[0].uid, 'ana');
    assert.equal(julio[0].aciertos, 3);
  });

  it('a igualdad de puntos y aciertos, gana quien gasta menos intentos', () => {
    const julio = clasificacion(torneo, mesDe2(2, 5, 3, 3), { mes: '2026-07', hoy: '2026-08-01' });
    assert.equal(julio[0].uid, 'ana', 'Ana en 2 intentos, Bea en 5');
    assert.equal(julio[0].mediaIntentos, 2);
  });

  it('si empatan hasta en la media, el trofeo es de los dos', () => {
    // Aquí la tabla los ordenaría por orden alfabético, que para un trofeo no
    // vale: el mes se comparte.
    const trofeos = palmares(torneo, mesDe2(3, 3, 4, 4), '2026-08-01');
    assert.deepEqual(trofeos, [{ mes: '2026-07', uids: ['ana', 'bea'] }]);
  });

  it('un mes compartido cuenta entero para cada uno', () => {
    const trofeos = palmares(torneo, mesDe2(3, 3, 4, 4), '2026-08-01');
    assert.deepEqual(trofeosPorJugador(trofeos), { ana: 1, bea: 1 });
  });
});

describe('desempate del mes a mano', () => {
  const aMano: Torneo = {
    ...torneo,
    reglas: { ...torneo.reglas!, desempateManual: true, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
  };

  /** Un mes que acaba en empate absoluto: mismos puntos, aciertos y media. */
  const empatado: DiaTorneo[] = [
    jornada('2026-07-01', [resultado('ana', 5), resultado('bea', 5)]),
    jornada('2026-07-02', [resultado('ana', 5), resultado('bea', 5)]),
  ];

  it('en automático, el mes se comparte', () => {
    assert.deepEqual(palmares(torneo, empatado, '2026-08-01'), [
      { mes: '2026-07', uids: ['ana', 'bea'] },
    ]);
  });

  it('a mano y sin decidir, el mes queda pendiente', () => {
    const [trofeo] = palmares(aMano, empatado, '2026-08-01');
    assert.equal(trofeo.pendiente, true);
    assert.deepEqual(trofeo.uids, ['ana', 'bea']);
  });

  it('un mes pendiente no cuenta para el campeonato del año', () => {
    const trofeos = palmares(aMano, empatado, '2026-08-01');
    assert.deepEqual(trofeosPorJugador(trofeos), {});
    assert.deepEqual(campeonDelAno(aMano, empatado, trofeos, '2026').uids, []);
  });

  it('decidido, el trofeo es de quien diga el fundador', () => {
    const decidido: Torneo = { ...aMano, desempates: { '2026-07': 'bea' } };
    assert.deepEqual(palmares(decidido, empatado, '2026-08-01'), [
      { mes: '2026-07', uids: ['bea'] },
    ]);
    assert.deepEqual(trofeosPorJugador(palmares(decidido, empatado, '2026-08-01')), {
      bea: 1,
    });
  });

  it('no se puede dar el trofeo a quien no empató', () => {
    // Carlos no jugó ese mes. Aunque su uid acabe escrito en la base de datos,
    // el mes sigue pendiente: elegir entre iguales no es repartir a dedo.
    const amañado: Torneo = { ...aMano, desempates: { '2026-07': 'caj' } };
    const [trofeo] = palmares(amañado, empatado, '2026-08-01');
    assert.equal(trofeo.pendiente, true);
    assert.deepEqual(trofeo.uids, ['ana', 'bea']);
  });

  it('un mes con ganador claro no espera a nadie', () => {
    const claro = [jornada('2026-07-01', [resultado('ana', 7), resultado('bea', 3)])];
    const [trofeo] = palmares(aMano, claro, '2026-08-01');
    assert.equal(trofeo.pendiente, undefined);
    assert.deepEqual(trofeo.uids, ['ana']);
  });
});

describe('qué cuenta como empate según la norma', () => {
  const aMano: Torneo = {
    ...torneo,
    reglas: { ...torneo.reglas!, desempateManual: true, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
  };

  /**
   * Empate a puntos, pero no en lo demás: Ana acierta las dos, Bea acierta una
   * y falla otra. La tabla sabría separarlos; el grupo quiere decidirlo él.
   */
  const empatadosAPuntos: DiaTorneo[] = [
    jornada('2026-07-01', [resultado('ana', 5), resultado('bea', 7)]),
    jornada('2026-07-02', [
      resultado('ana', 7),
      { ...resultado('bea', 5), acertada: false, intentos: 6 },
    ]),
  ];

  it('en automático lo resuelve la tabla, como hasta ahora', () => {
    const [trofeo] = palmares(torneo, empatadosAPuntos, '2026-08-01');
    assert.equal(trofeo.pendiente, undefined);
    assert.deepEqual(trofeo.uids, ['ana'], 'gana quien más acertó');
  });

  it('a mano, un empate a puntos ya queda pendiente', () => {
    // Es el caso que se nos escapó: empataron a 12 y la app dio el trofeo sola.
    const [trofeo] = palmares(aMano, empatadosAPuntos, '2026-08-01');
    assert.equal(trofeo.pendiente, true);
    assert.deepEqual(trofeo.uids.sort(), ['ana', 'bea']);
  });

  it('a mano, sin empate a puntos no hay nada que decidir', () => {
    const claro = [jornada('2026-07-01', [resultado('ana', 7), resultado('bea', 3)])];
    const [trofeo] = palmares(aMano, claro, '2026-08-01');
    assert.equal(trofeo.pendiente, undefined);
    assert.deepEqual(trofeo.uids, ['ana']);
  });

  it('y el fundador puede dárselo al que perdía por aciertos', () => {
    const decidido: Torneo = { ...aMano, desempates: { '2026-07': 'bea' } };
    assert.deepEqual(palmares(decidido, empatadosAPuntos, '2026-08-01'), [
      { mes: '2026-07', uids: ['bea'] },
    ]);
  });
});

describe('los meses cerrados, en resumen', () => {
  const dias = [
    jornada('2026-07-10', [resultado('ana', 7), resultado('bea', 5)]),
    jornada('2026-07-11', [resultado('ana', 5), resultado('bea', 7)]),
    jornada('2026-08-10', [resultado('bea', 7)]),
    // Septiembre está en curso: no se resume.
    jornada('2026-09-02', [resultado('ana', 7)]),
  ];

  const resumenes = resumirMeses(torneo, dias, '2026-09-03');

  it('sólo resume los meses ya terminados', () => {
    assert.deepEqual(
      resumenes.map((r) => r.mes),
      ['2026-08', '2026-07']
    );
  });

  it('guarda la tabla final de cada mes', () => {
    const julio = resumenes.find((r) => r.mes === '2026-07')!;
    assert.equal(julio.filas.length, torneo.miembros.length);
    assert.equal(julio.filas[0].puntos, 12, 'Ana y Bea empataron a 12');
    assert.equal(julio.jornadas, 2);
  });

  it('guarda quién se llevó el trofeo', () => {
    const agosto = resumenes.find((r) => r.mes === '2026-08')!;
    assert.deepEqual(agosto.ganadores, ['bea']);
    assert.equal(agosto.pendiente, undefined);
  });

  it('los trofeos salen del resumen igual que del historial', () => {
    // Es lo que permite tirar los días: el palmarés no los necesita.
    assert.deepEqual(trofeosDeResumenes(resumenes), palmares(torneo, dias, '2026-09-03'));
  });

  it('un mes pendiente de desempate llega marcado', () => {
    const aMano: Torneo = {
      ...torneo,
      reglas: { ...torneo.reglas!, desempateManual: true },
    };
    const empate = [
      jornada('2026-07-10', [resultado('ana', 5), resultado('bea', 5)]),
    ];
    const [julio] = resumirMeses(aMano, empate, '2026-08-01');
    assert.equal(julio.pendiente, true);
    assert.deepEqual(julio.ganadores.sort(), ['ana', 'bea'], 'los empatados, no adivinados');
  });

  it('sin meses cerrados no hay resúmenes', () => {
    const soloEsteMes = [jornada('2026-09-02', [resultado('ana', 7)])];
    assert.deepEqual(resumirMeses(torneo, soloEsteMes, '2026-09-03'), []);
  });
});
