import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clasificacion, liderDestacado } from '../src/game/clasificacion';
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
    const filas = clasificacion(torneo, dias);
    assert.equal(filas.find((f) => f.uid === 'ana')!.puntos, 9);
    assert.equal(filas.find((f) => f.uid === 'bea')!.puntos, 10);
    assert.equal(filas[0].uid, 'bea');
  });

  it('incluye a los miembros que aún no han jugado, con cero', () => {
    const filas = clasificacion(torneo, []);
    assert.equal(filas.length, 3);
    assert.ok(filas.every((f) => f.puntos === 0));
  });

  it('ignora las jornadas anteriores a la fundación del torneo', () => {
    const dias = [jornada('2026-07-20', [resultado('ana', 1, 7)])];
    assert.equal(clasificacion(torneo, dias)[0].puntos, 0);
  });

  it('con "hasta" deja fuera la jornada en curso', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 2, 5)]),
      jornada('2026-08-02', [resultado('bea', 1, 7)]),
    ];
    const cerrada = clasificacion(torneo, dias, '2026-08-02');
    assert.equal(cerrada.find((f) => f.uid === 'ana')!.puntos, 5);
    assert.equal(cerrada.find((f) => f.uid === 'bea')!.puntos, 0);
  });

  it('desempata por aciertos y después por media de intentos', () => {
    const dias = [
      // Mismos puntos: Ana con un 7, Bea con 5+2 en dos jornadas.
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
      jornada('2026-08-02', [resultado('bea', 5, 2)]),
    ];
    const filas = clasificacion(torneo, dias);
    assert.equal(filas[0].puntos, filas[1].puntos);
    assert.equal(filas[0].uid, 'bea', 'gana quien acumula más aciertos');
  });

  it('calcula la media de intentos sólo con las palabras acertadas', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 2, 5)]),
      jornada('2026-08-02', [resultado('ana', 4, 3)]),
      jornada('2026-08-03', [resultado('ana', 6, 0)]), // fallo, no cuenta
    ];
    const ana = clasificacion(torneo, dias).find((f) => f.uid === 'ana')!;
    assert.equal(ana.jugadas, 3);
    assert.equal(ana.aciertos, 2);
    assert.equal(ana.mediaIntentos, 3);
  });
});

describe('líder destacado (regla de la penalización)', () => {
  it('lo hay cuando alguien va primero en solitario', () => {
    const dias = [jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 4, 3)])];
    assert.equal(liderDestacado(clasificacion(torneo, dias)), 'ana');
  });

  it('no lo hay si el primero empata a puntos con el segundo', () => {
    const dias = [jornada('2026-08-01', [resultado('ana', 2, 5), resultado('bea', 2, 5)])];
    assert.equal(liderDestacado(clasificacion(torneo, dias)), null);
  });

  it('no lo hay antes de que nadie puntúe', () => {
    assert.equal(liderDestacado(clasificacion(torneo, [])), null);
  });

  it('no lo hay en un torneo de un solo jugador', () => {
    const soloAna: Torneo = { ...torneo, miembros: ['ana'] };
    const dias = [jornada('2026-08-01', [resultado('ana', 1, 7)])];
    assert.equal(liderDestacado(clasificacion(soloAna, dias)), null);
  });

  it('el desempate por aciertos no crea líder si los puntos están igualados', () => {
    const dias = [
      jornada('2026-08-01', [resultado('ana', 1, 7), resultado('bea', 2, 5)]),
      jornada('2026-08-02', [resultado('bea', 5, 2)]),
    ];
    const filas = clasificacion(torneo, dias);
    assert.equal(filas[0].uid, 'bea');
    assert.equal(liderDestacado(filas), null, 'ir delante por desempate no penaliza');
  });
});
