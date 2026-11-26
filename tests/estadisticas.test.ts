import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fusionarHistorial, misPartidas, rachas, resumenPersonal } from '../src/game/estadisticas';
import { AVATAR_POR_DEFECTO } from '../src/game/avatares';
import type { DiaTorneo, PartidaHecha, ResultadoDia } from '../src/tipos';

function resultado(uid: string, intentos: number, acertada: boolean): ResultadoDia {
  return {
    uid,
    nombre: uid,
    avatar: AVATAR_POR_DEFECTO,
    intentos,
    acertada,
    puntos: acertada ? 5 : 0,
    patron: 'XX',
  };
}

function jornada(fecha: string, filas: ResultadoDia[]): DiaTorneo {
  return { fecha, resultados: Object.fromEntries(filas.map((r) => [r.uid, r])) };
}

describe('reconstruir mis partidas del servidor', () => {
  const dias = [
    jornada('2026-09-01', [resultado('yo', 3, true), resultado('otro', 2, true)]),
    jornada('2026-09-02', [resultado('otro', 4, true)]),
    jornada('2026-09-03', [resultado('yo', 6, false)]),
  ];

  it('coge sólo las mías', () => {
    assert.deepEqual(
      misPartidas('t1', dias, 'yo').map((p) => p.fecha),
      ['2026-09-01', '2026-09-03']
    );
  });

  it('conserva lo que hace falta para las estadísticas', () => {
    const [primera] = misPartidas('t1', dias, 'yo');
    assert.equal(primera.torneoId, 't1');
    assert.equal(primera.intentos, 3);
    assert.equal(primera.acertada, true);
    assert.equal(primera.puntos, 5);
    assert.equal(primera.patron, 'XX');
  });

  it('quien no jugó nada no tiene partidas', () => {
    assert.deepEqual(misPartidas('t1', dias, 'nadie'), []);
  });
});

describe('fusionar lo del móvil con lo del servidor', () => {
  const local: PartidaHecha[] = [
    { torneoId: 'libre', fecha: '2026-09-01', intentos: 2, acertada: true, puntos: 5, patron: '' },
    { torneoId: 't1', fecha: '2026-09-02', intentos: 6, acertada: false, puntos: 0, patron: '' },
  ];
  const servidor: PartidaHecha[] = [
    // La misma jornada que el móvil tiene mal apuntada, y una que no tiene.
    { torneoId: 't1', fecha: '2026-09-02', intentos: 3, acertada: true, puntos: 4, patron: '' },
    { torneoId: 't1', fecha: '2026-09-03', intentos: 1, acertada: true, puntos: 7, patron: '' },
  ];

  const juntas = fusionarHistorial(local, servidor);

  it('no repite una jornada que está en los dos sitios', () => {
    assert.equal(juntas.filter((p) => p.torneoId === 't1' && p.fecha === '2026-09-02').length, 1);
  });

  it('manda el servidor sobre lo guardado en el móvil', () => {
    const dudosa = juntas.find((p) => p.fecha === '2026-09-02')!;
    assert.equal(dudosa.acertada, true, 'el servidor dice que se acertó');
    assert.equal(dudosa.puntos, 4);
  });

  it('el modo libre sobrevive: sólo existe en el móvil', () => {
    assert.ok(juntas.some((p) => p.torneoId === 'libre'));
  });

  it('recupera las que este móvil no llegó a ver', () => {
    assert.ok(juntas.some((p) => p.fecha === '2026-09-03'));
  });

  it('salen ordenadas por fecha, que la racha lo necesita', () => {
    assert.deepEqual(
      juntas.map((p) => p.fecha),
      ['2026-09-01', '2026-09-02', '2026-09-03']
    );
  });

  it('sin nada que fusionar, lista vacía', () => {
    assert.deepEqual(fusionarHistorial([], []), []);
  });
});

describe('rachas de días con acierto', () => {
  const gano = (fecha: string) => ({ fecha, acertada: true });
  const fallo = (fecha: string) => ({ fecha, acertada: false });

  it('sin partidas no hay racha', () => {
    assert.deepEqual(rachas([], '2026-11-26'), { actual: 0, mejor: 0 });
  });

  it('varios aciertos el mismo día cuentan como un solo día', () => {
    const r = rachas([gano('2026-11-26'), gano('2026-11-26'), gano('2026-11-25')], '2026-11-26');
    assert.equal(r.actual, 2);
    assert.equal(r.mejor, 2);
  });

  it('hoy sin jugar no rompe la racha de ayer', () => {
    const r = rachas([gano('2026-11-24'), gano('2026-11-25')], '2026-11-26');
    assert.equal(r.actual, 2);
  });

  it('un día de por medio sí la rompe', () => {
    const r = rachas([gano('2026-11-23'), gano('2026-11-25')], '2026-11-26');
    assert.equal(r.actual, 1);
    assert.equal(r.mejor, 1);
  });

  it('fallar hoy pone la racha actual a cero y conserva la mejor', () => {
    const r = rachas(
      [gano('2026-11-23'), gano('2026-11-24'), gano('2026-11-25'), fallo('2026-11-26')],
      '2026-11-26'
    );
    assert.equal(r.actual, 0);
    assert.equal(r.mejor, 3);
  });

  it('un día jugado sin acertar corta, y luego se puede empezar otra', () => {
    const r = rachas(
      [gano('2026-11-20'), fallo('2026-11-21'), gano('2026-11-22'), gano('2026-11-23')],
      '2026-11-26'
    );
    assert.equal(r.actual, 0, 'el último acierto no llega a ayer');
    assert.equal(r.mejor, 2);
  });

  it('el orden de entrada no importa', () => {
    const desorden = [gano('2026-11-26'), gano('2026-11-24'), gano('2026-11-25')];
    assert.equal(rachas(desorden, '2026-11-26').actual, 3);
  });
});

describe('resumen personal', () => {
  it('cuenta jugadas, porcentaje, reparto y racha', () => {
    const resumen = resumenPersonal(
      [
        { fecha: '2026-11-25', acertada: true, puntos: 7, intentos: 1 },
        { fecha: '2026-11-26', acertada: true, puntos: 4, intentos: 3 },
        { fecha: '2026-11-26', acertada: false, puntos: 0, intentos: 6 },
      ],
      '2026-11-26'
    );
    assert.equal(resumen.jugadas, 3);
    assert.equal(resumen.aciertos, 2);
    assert.equal(resumen.puntos, 11);
    assert.equal(resumen.porcentaje, 67);
    assert.equal(resumen.reparto[0], 1);
    assert.equal(resumen.reparto[2], 1);
    assert.equal(resumen.racha, 2);
    assert.equal(resumen.mejorRacha, 2);
  });
});
