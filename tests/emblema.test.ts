import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { colorDeTorneo, inicialesDe } from '../src/game/emblema';
import { fechaCorta } from '../src/game/fecha';
import { mesAnterior } from '../src/game/temporada';
import { faltaPorJugar, rejillasVisibles } from '../src/game/pendientes';
import type { DiaTorneo } from '../src/tipos';

describe('emblema del torneo', () => {
  it('el mismo id da siempre el mismo color', () => {
    assert.equal(colorDeTorneo('familia-cruz'), colorDeTorneo('familia-cruz'));
  });

  it('dos ids distintos pueden distinguirse', () => {
    // No exigimos que sean distintos siempre: el hash cabe en ocho colores.
    // Sí exigimos que el color salga de la paleta.
    const color = colorDeTorneo('los-del-curro');
    assert.match(color, /^#[0-9a-f]{6}$/);
  });

  it('las siglas cogen la primera y la última palabra', () => {
    assert.equal(inicialesDe('Familia Cruz'), 'FC');
    assert.equal(inicialesDe('Los del curro'), 'LC');
    assert.equal(inicialesDe('Pádel domingos'), 'PD');
  });

  it('un solo nombre usa las dos primeras letras', () => {
    assert.equal(inicialesDe('Darwin'), 'DA');
  });

  it('un nombre vacío no revienta', () => {
    assert.equal(inicialesDe('   '), '·');
  });
});

describe('fechas de cabecera', () => {
  it('resume el día de la semana y el mes', () => {
    assert.equal(fechaCorta('2026-11-26'), 'jueves 26 nov');
  });

  it('el mes anterior cruza el año', () => {
    assert.equal(mesAnterior('2026-01'), '2025-12');
    assert.equal(mesAnterior('2026-11'), '2026-10');
  });
});

describe('lo que se puede enseñar de una jornada', () => {
  const dias: DiaTorneo[] = [
    { fecha: '2026-11-26', resultados: { lucia: {} as never } },
  ];

  it('falta por jugar si no hay resultado propio', () => {
    assert.equal(faltaPorJugar(dias, 'darwin', '2026-11-26'), true);
    assert.equal(faltaPorJugar(dias, 'lucia', '2026-11-26'), false);
    assert.equal(faltaPorJugar(dias, null, '2026-11-26'), false);
  });

  it('las rejillas de hoy esperan a que juegues', () => {
    assert.equal(rejillasVisibles('2026-11-26', '2026-11-26', false), false);
    assert.equal(rejillasVisibles('2026-11-26', '2026-11-26', true), true);
  });

  it('las de un día ya cerrado se ven aunque no jugaras', () => {
    assert.equal(rejillasVisibles('2026-11-25', '2026-11-26', false), true);
  });
});
