import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  balasContra,
  balasDeLaJornada,
  balasEfectivas,
  liderAlCierre,
  resolverBala,
} from '../src/game/balas';
import { REGLAS_POR_DEFECTO } from '../src/game/reglas';
import { AVATAR_POR_DEFECTO } from '../src/game/avatares';
import type { Blueshell, DiaTorneo, ResultadoDia, Torneo } from '../src/tipos';

/**
 * Las faltas se apagan en casi todos los casos a propósito.
 *
 * Lo que se prueba aquí es a quién le cae la bala, y con las faltas encendidas
 * cada tabla de ejemplo arrastraría restas por los días que nadie jugó. Hay un
 * caso al final que las enciende, para que no se queden sin cubrir.
 */
function torneoCon(reglas: Partial<typeof REGLAS_POR_DEFECTO> = {}): Torneo {
  return {
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
    fechaInicio: '2026-08-01',
    creado: 0,
    reglas: { ...REGLAS_POR_DEFECTO, faltaPorNoJugar: false, ...reglas },
  };
}

const TORNEO = torneoCon();

function res(uid: string, puntos: number, intentos = 2): ResultadoDia {
  return {
    uid,
    nombre: uid,
    avatar: AVATAR_POR_DEFECTO,
    intentos,
    acertada: true,
    puntos,
    patron: 'XXXXX',
  };
}

function dia(
  fecha: string,
  puntos: Record<string, number>,
  extra: Partial<DiaTorneo> = {}
): DiaTorneo {
  return {
    fecha,
    resultados: Object.fromEntries(
      Object.entries(puntos).map(([uid, p]) => [uid, res(uid, p)])
    ),
    ...extra,
  };
}

/** Una bala nueva: sin víctima, sólo con el día en que se disparó. */
function bala(lanzada: string): Blueshell {
  return { palabra: 'sosos', lanzada, mes: lanzada.slice(0, 7) };
}

describe('el líder al cierre de la jornada', () => {
  it('cuenta la jornada entera, no la foto de media tarde', () => {
    // Bea juega pronto y se pone primera. Ana juega después y la adelanta.
    const aMediaTarde = [dia('2026-08-10', { bea: 4, caj: 1 })];
    assert.equal(liderAlCierre(TORNEO, aMediaTarde, '2026-08-10'), 'bea');

    const alCierre = [dia('2026-08-10', { bea: 4, caj: 1, ana: 7 })];
    assert.equal(liderAlCierre(TORNEO, alCierre, '2026-08-10'), 'ana');
  });

  it('acumula el mes hasta ese día, no sólo ese día', () => {
    const dias = [
      dia('2026-08-08', { bea: 7, ana: 1 }),
      dia('2026-08-10', { ana: 5, bea: 0 }),
    ];
    // Bea: 7. Ana: 6. Gana Bea aunque Ana ganara la jornada del 10.
    assert.equal(liderAlCierre(TORNEO, dias, '2026-08-10'), 'bea');
  });

  it('no mira más allá de esa jornada', () => {
    const dias = [dia('2026-08-10', { bea: 4 }), dia('2026-08-11', { ana: 7 })];
    assert.equal(liderAlCierre(TORNEO, dias, '2026-08-10'), 'bea');
  });

  it('no hay líder si el primer puesto queda empatado', () => {
    const dias = [dia('2026-08-10', { ana: 5, bea: 5 })];
    assert.equal(liderAlCierre(TORNEO, dias, '2026-08-10'), null);
  });

  it('empatados a puntos, desempata lo mismo que la tabla', () => {
    // Mismos puntos, pero Bea acertó una más: es la que la tabla pone primera.
    const dias = [
      dia('2026-08-09', { bea: 3 }),
      dia('2026-08-10', { ana: 5, bea: 2 }),
    ];
    assert.equal(liderAlCierre(TORNEO, dias, '2026-08-10'), 'bea');
  });

  it('un mes en el que nadie ha sumado no tiene líder', () => {
    assert.equal(liderAlCierre(TORNEO, [], '2026-08-10'), null);
    assert.equal(
      liderAlCierre(TORNEO, [dia('2026-08-10', { ana: 0 })], '2026-08-10'),
      null
    );
  });
});

describe('a quién le cae la bala', () => {
  it('al que termina primero, no al que iba primero al disparar', () => {
    // Carlos dispara cuando Bea va primera. Luego Ana juega y las adelanta.
    const dias = [
      dia('2026-08-10', { bea: 4, caj: 1, ana: 7 }),
      dia('2026-08-11', {}, { blueshells: { caj: bala('2026-08-10') } }),
    ];
    const resuelta = resolverBala({ ...bala('2026-08-10'), autor: 'caj' }, TORNEO, dias);
    assert.equal(resuelta.objetivo, 'ana');
    assert.equal(resuelta.perdida, null);
  });

  it('si el que dispara acaba primero, la bala se pierde', () => {
    const dias = [dia('2026-08-10', { ana: 7, bea: 4 })];
    const resuelta = resolverBala({ ...bala('2026-08-10'), autor: 'ana' }, TORNEO, dias);
    assert.equal(resuelta.objetivo, null);
    assert.equal(resuelta.perdida, 'autor');
  });

  it('si el primer puesto empata, la bala se pierde', () => {
    const dias = [dia('2026-08-10', { ana: 5, bea: 5 })];
    const resuelta = resolverBala({ ...bala('2026-08-10'), autor: 'caj' }, TORNEO, dias);
    assert.equal(resuelta.objetivo, null);
    assert.equal(resuelta.perdida, 'empate');
  });

  it('una bala del último día del mes se resuelve con ese mes', () => {
    // Bea gana agosto. En septiembre la tabla arranca de cero y manda Carlos.
    // La bala salió el 31 de agosto: es de agosto y de agosto se queda.
    const dias = [
      dia('2026-08-31', { bea: 7, ana: 5, caj: 1 }),
      dia('2026-09-01', { caj: 7 }, { blueshells: { ana: bala('2026-08-31') } }),
    ];
    assert.equal(liderAlCierre(TORNEO, dias, '2026-09-01'), 'caj');

    const resuelta = resolverBala({ ...bala('2026-08-31'), autor: 'ana' }, TORNEO, dias);
    assert.equal(resuelta.objetivo, 'bea');
  });

  it('una bala vieja conserva la víctima que lleva escrita', () => {
    // Las de antes del parche traen objetivo. Su jornada ya se jugó así, y
    // recalcularla ahora cambiaría partidas terminadas.
    const dias = [dia('2026-08-10', { ana: 7, bea: 4 })];
    const vieja = { objetivo: 'caj', palabra: 'sosos', lanzada: '2026-08-10', autor: 'bea' };
    const resuelta = resolverBala(vieja, TORNEO, dias);
    assert.equal(resuelta.objetivo, 'caj');
    assert.equal(resuelta.perdida, null);
  });

  it('cuenta las faltas del día que cierra', () => {
    // Con la norma encendida, no jugar una jornada cerrada resta. La del día
    // que se cierra ya cuenta: es lo que decide quién acabó primero de verdad.
    const conFaltas = torneoCon({ faltaPorNoJugar: true });
    const dias = [dia('2026-08-01', { ana: 1, bea: 1 }), dia('2026-08-02', { ana: 1 })];
    // Ana: 2. Bea: 1 y una falta el día 2 = 0.
    assert.equal(liderAlCierre(conFaltas, dias, '2026-08-02'), 'ana');
  });
});

describe('las balas de una jornada', () => {
  const dias = [
    dia('2026-08-10', { bea: 7, ana: 4, caj: 1 }),
    dia(
      '2026-08-11',
      {},
      { blueshells: { ana: bala('2026-08-10'), caj: bala('2026-08-10') } }
    ),
  ];
  const jornada = dias[1];

  it('varias en el mismo día se acumulan sobre el mismo', () => {
    const contra = balasContra(jornada, TORNEO, dias, 'bea');
    assert.equal(contra.length, 2);
    // Mismo día de lanzamiento: ordenan por uid, igual en todos los móviles.
    assert.deepEqual(
      contra.map((b) => b.autor),
      ['ana', 'caj']
    );
  });

  it('al resto no le cae ninguna', () => {
    assert.deepEqual(balasContra(jornada, TORNEO, dias, 'ana'), []);
    assert.deepEqual(balasContra(jornada, TORNEO, dias, 'caj'), []);
  });

  it('el escudo las para todas, no sólo una', () => {
    const protegida: DiaTorneo = { ...jornada, protecciones: { bea: true } };
    const conEscudo = [dias[0], protegida];
    assert.equal(balasContra(protegida, TORNEO, conEscudo, 'bea').length, 2);
    assert.deepEqual(balasEfectivas(protegida, TORNEO, conEscudo, 'bea'), []);
  });

  it('las perdidas siguen viéndose, con el motivo', () => {
    // El rastro no se borra: el grupo tiene que poder ver que se disparó.
    const empatado = [
      dia('2026-08-10', { ana: 5, bea: 5 }),
      dia('2026-08-11', {}, { blueshells: { caj: bala('2026-08-10') } }),
    ];
    const todas = balasDeLaJornada(empatado[1], TORNEO, empatado);
    assert.equal(todas.length, 1);
    assert.equal(todas[0].objetivo, null);
    assert.equal(todas[0].perdida, 'empate');
  });

  it('no se cae con una jornada que todavía no existe', () => {
    assert.deepEqual(balasDeLaJornada(undefined, TORNEO, dias), []);
    assert.deepEqual(balasContra(undefined, TORNEO, dias, 'ana'), []);
  });
});
