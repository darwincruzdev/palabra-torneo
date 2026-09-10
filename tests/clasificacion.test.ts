import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clasificacion, colistaDestacado, liderDestacado } from '../src/game/clasificacion';
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
  fechaInicio: '2026-08-01',
  creado: 0,
};

function resultado(uid: string, intentos: number, puntos: number): ResultadoDia {
  return {
    uid,
    nombre: torneo.perfiles[uid].nombre,
    avatar: AVATAR_POR_DEFECTO,
    intentos,
    acertada: puntos > 0,
    puntos,
    patron: '',
  };
}

/**
 * El día en que se hacen las cuentas.
 *
 * Va fijo porque la clasificación necesita saber qué jornadas están cerradas
 * para cobrar las faltas; sin fijarlo, estos tests darían un resultado distinto
 * cada día que pasara.
 */
const HOY = '2026-08-03';

function jornada(fecha: string, filas: ResultadoDia[]): DiaTorneo {
  return {
    fecha,
    resultados: Object.fromEntries(filas.map((r) => [r.uid, r])),
  };
}

describe('clasificación', () => {
  it('suma los puntos de todas las jornadas', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 2, 5), resultado('bea', 4, 3)]),
      jornada('2026-08-02', [resultado('ana', 3, 4), resultado('bea', 1, 7)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: HOY });
    assert.equal(filas.find((f) => f.uid === 'ana')!.puntos, 9);
    assert.equal(filas.find((f) => f.uid === 'bea')!.puntos, 10);
    assert.equal(filas[0].uid, 'bea');
  });

  it('incluye a los miembros que aún no han jugado, con cero', () => {
    const filas = clasificacion(torneo, [], { hoy: HOY });
    assert.equal(filas.length, 3);
    assert.ok(filas.every((f) => f.puntos === 0));
  });

  it('ignora las jornadas anteriores a la fundación del torneo', () => {
    const dias = [jornada('2026-07-20', [resultado('ana', 1, 7)])];
    assert.equal(clasificacion(torneo, dias, { hoy: HOY })[0].puntos, 0);
  });

  it('con "hasta" deja fuera la jornada en curso', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 2, 5)]),
      jornada('2026-08-02', [resultado('bea', 1, 7)]),
    ];
    const cerrada = clasificacion(torneo, dias, { hasta: '2026-08-02', hoy: HOY });
    assert.equal(cerrada.find((f) => f.uid === 'ana')!.puntos, 5);
    assert.equal(cerrada.find((f) => f.uid === 'bea')!.puntos, 0);
  });

  it('desempata por aciertos y después por media de intentos', () => {
    const dias = [
      // Mismos puntos: Ana con 7+0, Bea con 5+2. Juegan las dos jornadas las
      // dos, para que ninguna arrastre falta y el empate sea real.
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
      jornada('2026-08-02', [resultado('ana', 6, 0), resultado('bea', 5, 2)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: HOY });
    assert.equal(filas[0].puntos, filas[1].puntos);
    assert.equal(filas[0].uid, 'bea', 'gana quien acumula más aciertos');
  });

  it('calcula la media de intentos sólo con las palabras acertadas', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 2, 5)]),
      jornada('2026-08-02', [resultado('ana', 4, 3)]),
      jornada('2026-08-03', [resultado('ana', 6, 0)]), // fallo, no cuenta
    ];
    const ana = clasificacion(torneo, dias, { hoy: HOY }).find((f) => f.uid === 'ana')!;
    assert.equal(ana.jugadas, 3);
    assert.equal(ana.aciertos, 2);
    assert.equal(ana.mediaIntentos, 3);
  });
});

describe('líder destacado (regla de la penalización)', () => {
  it('lo hay cuando alguien va primero en solitario', () => {
    const dias = [jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 4, 3)])];
    assert.equal(liderDestacado(clasificacion(torneo, dias, { hoy: HOY })), 'ana');
  });

  it('no lo hay si el primero empata a puntos con el segundo', () => {
    const dias = [jornada('2026-08-01', [resultado('ana', 2, 5), resultado('bea', 2, 5)])];
    assert.equal(liderDestacado(clasificacion(torneo, dias, { hoy: HOY })), null);
  });

  it('no lo hay antes de que nadie puntúe', () => {
    assert.equal(liderDestacado(clasificacion(torneo, [], { hoy: HOY })), null);
  });

  it('no lo hay en un torneo de un solo jugador', () => {
    const soloAna: Torneo = { ...torneo, miembros: ['ana'] };
    const dias = [jornada('2026-08-01', [resultado('ana', 1, 7)])];
    assert.equal(liderDestacado(clasificacion(soloAna, dias, { hoy: HOY })), null);
  });

  it('el desempate por aciertos no crea líder si los puntos están igualados', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
      jornada('2026-08-02', [resultado('ana', 6, 0), resultado('bea', 5, 2)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: HOY });
    assert.equal(filas[0].uid, 'bea');
    assert.equal(liderDestacado(filas), null, 'ir delante por desempate no penaliza');
  });
});

describe('falta por no jugar', () => {
  const sinFaltas: Torneo = {
    ...torneo,
    reglas: { penalizacionLider: true, blueshells: true, faltaPorNoJugar: false, desempateManual: false, sinVocalesAlAbrir: true, ayudaAlUltimo: true },
  };

  function puntosDe(filas: ReturnType<typeof clasificacion>, uid: string) {
    return filas.find((f) => f.uid === uid)!;
  }

  it('saltarse una jornada cerrada cuesta un punto', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 1, 7)]),
      jornada('2026-08-02', [resultado('bea', 3, 4)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-03' });
    assert.equal(puntosDe(filas, 'ana').faltas, 1);
    assert.equal(puntosDe(filas, 'ana').puntos, 6, '7 menos la falta');
    assert.equal(puntosDe(filas, 'bea').faltas, 0);
    assert.equal(puntosDe(filas, 'bea').puntos, 11);
  });

  it('la jornada de hoy no penaliza a nadie: sigue abierta', () => {
    const dias = [jornada('2026-08-01', [resultado('ana', 1, 7)])];
    // Estamos en el día 2 y nadie lo ha jugado todavía. Nada que cobrar.
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-02' });
    assert.equal(puntosDe(filas, 'ana').faltas, 0);
    assert.equal(puntosDe(filas, 'ana').puntos, 7);
  });

  it('no se cobran las jornadas anteriores a la primera que jugó', () => {
    // Bea aparece el día 3: no puede deberle nada a los días 1 y 2.
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7)]),
      jornada('2026-08-02', [resultado('ana', 1, 7)]),
      jornada('2026-08-03', [resultado('ana', 1, 7), resultado('bea', 1, 7)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-04' });
    assert.equal(puntosDe(filas, 'bea').faltas, 0);
    assert.equal(puntosDe(filas, 'bea').puntos, 7);
  });

  it('quien no ha jugado nunca no acumula faltas', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7)]),
      jornada('2026-08-02', [resultado('ana', 1, 7)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-03' });
    assert.equal(puntosDe(filas, 'caj').faltas, 0);
    assert.equal(puntosDe(filas, 'caj').puntos, 0);
  });

  it('una jornada que no jugó nadie también se cobra', () => {
    // El día 2 no deja documento porque no lo jugó ninguno, y aun así cuenta.
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 1, 7)]),
      jornada('2026-08-03', [resultado('ana', 1, 7), resultado('bea', 1, 7)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-04' });
    assert.equal(puntosDe(filas, 'ana').faltas, 1);
    assert.equal(puntosDe(filas, 'bea').faltas, 1);
  });

  it('el torneo que apaga la norma no descuenta nada', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 1, 7)]),
      jornada('2026-08-02', [resultado('bea', 3, 4)]),
    ];
    const filas = clasificacion(sinFaltas, dias, { hoy: '2026-08-03' });
    assert.equal(puntosDe(filas, 'ana').faltas, 0);
    assert.equal(puntosDe(filas, 'ana').puntos, 7);
  });

  it('varias faltas seguidas se acumulan', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7)]),
      jornada('2026-08-05', [resultado('ana', 1, 7)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-06' });
    assert.equal(puntosDe(filas, 'ana').faltas, 3, 'los días 2, 3 y 4');
    assert.equal(puntosDe(filas, 'ana').puntos, 11);
  });
});

describe('reiniciar la competición', () => {
  // Reiniciar mueve la fundación a la jornada siguiente. Es lo que deja la
  // tabla a cero para todos a la vez: si se pusiera en hoy, quien ya hubiera
  // jugado esta mañana conservaría sus puntos y parecería que a él no le
  // afectó el reinicio.
  const reiniciado: Torneo = { ...torneo, fechaInicio: '2026-08-04' };

  const dias = [
    jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
    jornada('2026-08-02', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
    jornada('2026-08-03', [resultado('ana', 1, 7)]),
  ];

  it('deja a todo el mundo a cero, incluido quien jugó hoy', () => {
    const filas = clasificacion(reiniciado, dias, { hoy: '2026-08-03' });
    for (const fila of filas) {
      assert.equal(fila.puntos, 0, `${fila.nombre} debería estar a cero`);
      assert.equal(fila.jugadas, 0);
      assert.equal(fila.faltas, 0, 'tampoco se arrastran faltas viejas');
    }
  });

  it('sin reiniciar, quien jugó hoy conserva sus puntos', () => {
    const filas = clasificacion(torneo, dias, { hoy: '2026-08-03' });
    assert.equal(filas.find((f) => f.uid === 'ana')!.puntos, 21);
  });
});

describe('quién va último (la ayuda del colista)', () => {
  const HOY = '2026-08-04';

  it('lo hay cuando alguien va último en solitario', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5), resultado('caj', 4, 3)]),
    ];
    assert.equal(colistaDestacado(clasificacion(torneo, dias, { hoy: HOY })), 'caj');
  });

  it('no lo hay si el último empata con el penúltimo', () => {
    // Regalarle la letra a media tabla no es una ayuda, es una fiesta.
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 4, 3), resultado('caj', 4, 3)]),
    ];
    assert.equal(colistaDestacado(clasificacion(torneo, dias, { hoy: HOY })), null);
  });

  it('no lo hay al empezar el mes, con todos a cero', () => {
    assert.equal(colistaDestacado(clasificacion(torneo, [], { hoy: HOY })), null);
  });

  it('quien no ha jugado va último si los demás puntuaron', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
    ];
    // Carlos, que no aparece, es el único a cero.
    assert.equal(colistaDestacado(clasificacion(torneo, dias, { hoy: HOY })), 'caj');
  });

  it('el líder y el último no pueden ser el mismo', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5), resultado('caj', 4, 3)]),
    ];
    const filas = clasificacion(torneo, dias, { hoy: HOY });
    assert.notEqual(colistaDestacado(filas), liderDestacado(filas));
  });
});
