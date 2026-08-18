import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  JORNADAS_POR_CICLO,
  blueshellGastada,
  blueshellsContra,
  blueshellsEfectivas,
  ciclo,
  cumple,
  estaProtegido,
  jornadasParaRecargar,
  normalizarReglas,
  obligacionEn,
  obligacionesDe,
  proteccionGastada,
  sinBlueshells,
} from '../src/game/reglas';
import { PALABRAS_PENALIZACION } from '../src/game/constantes';
import { sumarDias } from '../src/game/fecha';
import type { Blueshell, DiaTorneo, ReglasTorneo } from '../src/tipos';

const INICIO = '2026-01-01';

const TODAS: ReglasTorneo = { penalizacionLider: true, blueshells: true };

function dia(fecha: string, extra: Partial<DiaTorneo> = {}): DiaTorneo {
  return { fecha, resultados: {}, ...extra };
}

function bala(objetivo: string, palabra: string, lanzada: string): Blueshell {
  return { objetivo, palabra, lanzada };
}

describe('normalizarReglas', () => {
  it('deja las normas de la casa puestas cuando el torneo no las trae', () => {
    assert.deepEqual(normalizarReglas(undefined), {
      penalizacionLider: true,
      blueshells: true,
    });
  });

  it('respeta lo que se haya apagado', () => {
    assert.deepEqual(normalizarReglas({ blueshells: false }), {
      penalizacionLider: true,
      blueshells: false,
    });
  });
});

describe('ciclos de quince jornadas', () => {
  it('cuenta desde la fundación del torneo', () => {
    assert.equal(ciclo(INICIO, INICIO), 0);
    assert.equal(ciclo(INICIO, sumarDias(INICIO, 14)), 0);
    assert.equal(ciclo(INICIO, sumarDias(INICIO, 15)), 1);
    assert.equal(ciclo(INICIO, sumarDias(INICIO, 29)), 1);
    assert.equal(ciclo(INICIO, sumarDias(INICIO, 30)), 2);
  });

  it('dice cuántas jornadas faltan para recargar', () => {
    assert.equal(jornadasParaRecargar(INICIO, INICIO), JORNADAS_POR_CICLO);
    assert.equal(jornadasParaRecargar(INICIO, sumarDias(INICIO, 14)), 1);
    assert.equal(jornadasParaRecargar(INICIO, sumarDias(INICIO, 15)), JORNADAS_POR_CICLO);
  });
});

describe('blueshells recibidas', () => {
  const jornada = dia('2026-01-10', {
    blueshells: {
      caj: bala('ana', 'sosos', '2026-01-09'),
      bea: bala('ana', 'vivir', '2026-01-08'),
      dan: bala('bea', 'tutus', '2026-01-09'),
    },
  });

  it('sólo devuelve las que van contra esa persona', () => {
    assert.deepEqual(
      blueshellsContra(jornada, 'ana').map((b) => b.autor),
      ['bea', 'caj']
    );
    assert.deepEqual(
      blueshellsContra(jornada, 'bea').map((b) => b.autor),
      ['dan']
    );
  });

  it('las ordena igual en todos los móviles: por día y luego por uid', () => {
    const empatadas = dia('2026-01-10', {
      blueshells: {
        caj: bala('ana', 'cocos', '2026-01-09'),
        bea: bala('ana', 'sosos', '2026-01-09'),
      },
    });
    assert.deepEqual(
      blueshellsContra(empatadas, 'ana').map((b) => b.palabra),
      ['sosos', 'cocos']
    );
  });

  it('no se cae si la jornada no existe todavía', () => {
    assert.deepEqual(blueshellsContra(undefined, 'ana'), []);
  });
});

describe('protección', () => {
  const jornada = dia('2026-01-10', {
    blueshells: {
      bea: bala('ana', 'sosos', '2026-01-09'),
      caj: bala('ana', 'vivir', '2026-01-09'),
    },
    protecciones: { ana: true },
  });

  it('anula todas las balas de esa jornada, no sólo una', () => {
    assert.equal(blueshellsContra(jornada, 'ana').length, 2);
    assert.deepEqual(blueshellsEfectivas(jornada, 'ana'), []);
  });

  it('sólo protege a quien la gastó', () => {
    assert.equal(estaProtegido(jornada, 'ana'), true);
    assert.equal(estaProtegido(jornada, 'bea'), false);
  });
});

describe('gasto por ciclo', () => {
  it('la bala se descuenta del ciclo en que se disparó, no del que golpea', () => {
    // Disparada la víspera del reset: cae en la primera jornada del ciclo
    // siguiente, pero la bala gastada es la del ciclo viejo.
    const vispera = sumarDias(INICIO, 14); // último día del ciclo 0
    const golpea = sumarDias(INICIO, 15); // primer día del ciclo 1
    const dias = [dia(golpea, { blueshells: { ana: bala('bea', 'sosos', vispera) } })];

    assert.equal(blueshellGastada(dias, INICIO, vispera, 'ana'), true);
    assert.equal(blueshellGastada(dias, INICIO, golpea, 'ana'), false);
  });

  it('no confunde la bala de una persona con la de otra', () => {
    const dias = [dia(INICIO, { blueshells: { bea: bala('ana', 'sosos', INICIO) } })];
    assert.equal(blueshellGastada(dias, INICIO, INICIO, 'bea'), true);
    assert.equal(blueshellGastada(dias, INICIO, INICIO, 'ana'), false);
  });

  it('la protección se recarga al cambiar de ciclo', () => {
    const dias = [dia(INICIO, { protecciones: { ana: true } })];
    assert.equal(proteccionGastada(dias, INICIO, sumarDias(INICIO, 14), 'ana'), true);
    assert.equal(proteccionGastada(dias, INICIO, sumarDias(INICIO, 15), 'ana'), false);
  });
});

describe('obligaciones de la jornada', () => {
  const balas = [
    { ...bala('ana', 'sosos', '2026-01-09'), autor: 'bea' },
    { ...bala('ana', 'cocos', '2026-01-09'), autor: 'caj' },
  ];

  it('el líder abre con una de las cinco palabras', () => {
    const [primera] = obligacionesDe({ reglas: TODAS, liderando: true, blueshells: [] });
    assert.equal(primera.indice, 0);
    assert.equal(primera.motivo, 'lider');
    assert.deepEqual(primera.palabras, [...PALABRAS_PENALIZACION]);
  });

  it('cada blueshell ocupa un intento a partir del segundo', () => {
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: true,
      blueshells: balas,
    });
    assert.deepEqual(
      obligaciones.map((o) => [o.indice, o.motivo, o.palabras.length]),
      [
        [0, 'lider', 5],
        [1, 'blueshell', 1],
        [2, 'blueshell', 1],
      ]
    );
  });

  it('la blueshell sigue cayendo en el segundo intento sin penalización de líder', () => {
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: false,
      blueshells: balas,
    });
    assert.deepEqual(
      obligaciones.map((o) => o.indice),
      [1, 2]
    );
  });

  it('un torneo sin blueshells ignora las que le hayan tirado', () => {
    const obligaciones = obligacionesDe({
      reglas: { penalizacionLider: true, blueshells: false },
      liderando: true,
      blueshells: balas,
    });
    assert.deepEqual(
      obligaciones.map((o) => o.motivo),
      ['lider']
    );
  });

  it('un torneo sin ninguna de las dos normas no impone nada', () => {
    assert.deepEqual(
      obligacionesDe({
        reglas: { penalizacionLider: false, blueshells: false },
        liderando: true,
        blueshells: balas,
      }),
      []
    );
  });

  it('guarda de quién es cada bala, para poder decirlo', () => {
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: false,
      blueshells: balas,
    });
    assert.deepEqual(
      obligaciones.map((o) => o.autor),
      ['bea', 'caj']
    );
  });
});

describe('comprobar el intento', () => {
  const obligaciones = obligacionesDe({
    reglas: TODAS,
    liderando: true,
    blueshells: [{ ...bala('ana', 'sosos', '2026-01-09'), autor: 'bea' }],
  });

  it('el primer intento admite cualquiera de las cinco', () => {
    const primera = obligacionEn(obligaciones, 0);
    assert.ok(primera);
    assert.equal(cumple(primera, 'vivir'), true);
    assert.equal(cumple(primera, 'tutus'), true);
    assert.equal(cumple(primera, 'salto'), false);
  });

  it('el segundo admite sólo la palabra de la bala', () => {
    const segunda = obligacionEn(obligaciones, 1);
    assert.ok(segunda);
    assert.equal(cumple(segunda, 'sosos'), true);
    assert.equal(cumple(segunda, 'vivir'), false);
  });

  it('a partir de ahí se juega libre', () => {
    assert.equal(obligacionEn(obligaciones, 2), null);
    assert.equal(obligacionEn(obligaciones, 5), null);
  });

  it('la protección a media partida quita las balas y deja la penalización', () => {
    assert.deepEqual(
      sinBlueshells(obligaciones).map((o) => o.motivo),
      ['lider']
    );
  });
});
