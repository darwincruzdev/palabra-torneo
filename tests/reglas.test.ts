import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BLUESHELLS_POR_MES,
  MAX_VOCALES_AL_ABRIR,
  PROTECCIONES_POR_MES,
  balasQueLeQuedan,
  blueshellsContra,
  blueshellsEfectivas,
  blueshellsGastadas,
  cuentaVocales,
  cumple,
  demasiadasVocales,
  escudosQueLeQuedan,
  estaProtegido,
  mensajeDeBlueshell,
  normalizarReglas,
  obligacionEn,
  obligacionesDe,
  pistaDe,
  proteccionesGastadas,
  sinBlueshells,
  todasLasBlueshells,
} from '../src/game/reglas';
import { PALABRAS_PENALIZACION } from '../src/game/constantes';
import { sumarDias } from '../src/game/fecha';
import type { Blueshell, DiaTorneo, ReglasTorneo } from '../src/tipos';

const INICIO = '2026-01-01';

const TODAS: ReglasTorneo = {
  penalizacionLider: true,
  blueshells: true,
  faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true,
};

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
      faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true,
    });
  });

  it('respeta lo que se haya apagado', () => {
    assert.deepEqual(normalizarReglas({ blueshells: false }), {
      penalizacionLider: true,
      blueshells: false,
      faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true,
    });
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
      reglas: { penalizacionLider: true, blueshells: false, faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
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
        reglas: { penalizacionLider: false, blueshells: false, faltaPorNoJugar: true, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
        liderando: true,
        blueshells: balas,
      }),
      []
    );
  });

  it('una bala con una palabra que no existe no obliga a nada', () => {
    // El servidor no tiene el diccionario, así que alguien podría escribir a
    // mano una bala con una palabra inventada. Si contara, la víctima no podría
    // terminar la jornada: el juego le exigiría esa palabra y luego la
    // rechazaría por no estar en la lista.
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: false,
      blueshells: [{ ...bala('ana', 'zzzzz', '2026-01-09'), autor: 'bea' }],
    });
    assert.deepEqual(obligaciones, []);
  });

  it('las balas buenas siguen cayendo seguidas aunque una sea inventada', () => {
    // Sin cerrar el hueco, la inventada dejaría el segundo intento libre y la
    // buena se iría al tercero.
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: false,
      blueshells: [
        { ...bala('ana', 'zzzzz', '2026-01-09'), autor: 'bea' },
        { ...bala('ana', 'cocos', '2026-01-09'), autor: 'caj' },
      ],
    });
    assert.deepEqual(
      obligaciones.map((o) => [o.indice, o.palabras[0]]),
      [[1, 'cocos']]
    );
  });

  it('con balas normales no cambia nada: la ñ y las de siempre valen', () => {
    const obligaciones = obligacionesDe({
      reglas: TODAS,
      liderando: false,
      blueshells: [{ ...bala('ana', 'aceña', '2026-01-09'), autor: 'bea' }],
    });
    assert.deepEqual(obligaciones.map((o) => o.palabras[0]), ['aceña']);
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

describe('lo que ve el grupo', () => {
  const jornada = dia('2026-01-10', {
    blueshells: {
      caj: bala('ana', 'sosos', '2026-01-09'),
      bea: bala('dan', 'vivir', '2026-01-08'),
    },
  });

  it('devuelve las balas de todos, no sólo las de uno', () => {
    assert.deepEqual(
      todasLasBlueshells(jornada).map((b) => [b.autor, b.objetivo]),
      [
        ['bea', 'dan'],
        ['caj', 'ana'],
      ]
    );
  });

  it('no se cae con una jornada sin balas', () => {
    assert.deepEqual(todasLasBlueshells(undefined), []);
    assert.deepEqual(todasLasBlueshells(dia('2026-01-11')), []);
  });

  it('el mensaje dice quién, a quién y con qué palabra', () => {
    const texto = mensajeDeBlueshell({
      torneo: 'Torneazo',
      autor: 'Bea',
      objetivo: 'Darwin',
      palabra: 'sosos',
    });
    assert.match(texto, /Torneazo/);
    assert.match(texto, /Bea/);
    assert.match(texto, /Darwin/);
    assert.match(texto, /SOSOS/);
  });

  it('mete el enlace de la web sólo si lo hay', () => {
    const datos = { torneo: 'T', autor: 'A', objetivo: 'B', palabra: 'sosos' };
    assert.ok(!mensajeDeBlueshell(datos).includes('http'));
    assert.match(mensajeDeBlueshell({ ...datos, enlace: 'https://x.web.app' }), /https:\/\/x/);
  });
});


describe('abrir sin cuatro vocales', () => {
  it('cuenta las vocales, y la ñ no lo es', () => {
    assert.equal(cuentaVocales('aireo'), 4);
    assert.equal(cuentaVocales('salto'), 2);
    assert.equal(cuentaVocales('ninos'), 2);
    assert.equal(cuentaVocales('nino'.replace('n', 'ñ')), 2);
  });

  it('las que puso el grupo de ejemplo quedan fuera', () => {
    for (const palabra of ['aireo', 'aureo', 'audio']) {
      assert.equal(demasiadasVocales(palabra), true, palabra);
    }
  });

  it('con tres vocales todavía se puede abrir', () => {
    for (const palabra of ['catio', 'bioma', 'pelee', 'amada']) {
      assert.equal(demasiadasVocales(palabra), false, palabra);
    }
  });

  it('ninguna de las cinco de penalización se pasa', () => {
    // Si alguna se pasara, al líder se le exigiría una palabra que el juego
    // rechaza y no podría abrir la jornada.
    for (const palabra of PALABRAS_PENALIZACION) {
      assert.equal(demasiadasVocales(palabra), false, palabra);
    }
  });

  it('el tope es de tres', () => {
    assert.equal(MAX_VOCALES_AL_ABRIR, 3);
  });
});

describe('la letra que se le chiva al último', () => {
  it('siempre sale una letra de la palabra', () => {
    for (const palabra of ['salto', 'cocos', 'aireo', 'bioma']) {
      const letra = pistaDe(palabra, 'lo que sea');
      assert.ok(letra && palabra.includes(letra), `${letra} no está en ${palabra}`);
    }
  });

  it('con la misma semilla sale siempre la misma', () => {
    // Es lo que impide pescar letras recargando la pantalla.
    const semilla = '2026-09-07:torneo1:darwin';
    const primera = pistaDe('salto', semilla);
    for (let i = 0; i < 20; i++) {
      assert.equal(pistaDe('salto', semilla), primera);
    }
  });

  it('a cada persona le toca la suya, y cambia cada día', () => {
    const deDarwin = pistaDe('murcielago'.slice(0, 5), '2026-09-07:t:darwin');
    const deNico = pistaDe('murcielago'.slice(0, 5), '2026-09-07:t:nico');
    const deManana = pistaDe('murcielago'.slice(0, 5), '2026-09-08:t:darwin');
    // No tienen por qué ser distintas siempre, pero sí depender de la semilla.
    assert.ok([deDarwin, deNico, deManana].every((l) => l && 'murci'.includes(l)));
    assert.ok(deDarwin !== deNico || deDarwin !== deManana, 'la semilla debe influir');
  });

  it('no repite letras al sortear: en cocos la O no vale doble', () => {
    // Se elige entre las distintas, así que hay dos resultados posibles y no
    // uno con el triple de probabilidad.
    const salidas = new Set();
    for (let i = 0; i < 200; i++) salidas.add(pistaDe('cocos', `semilla-${i}`));
    assert.deepEqual([...salidas].sort(), ['c', 'o', 's']);
  });
});
