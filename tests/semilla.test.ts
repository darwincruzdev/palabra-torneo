import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generarSemilla, hash32, recorrido } from '../src/game/semilla';
import { esAceptada, solucionDe, totalSoluciones } from '../src/game/palabras';
import { sumarDias } from '../src/game/fecha';

describe('hash32', () => {
  it('da siempre el mismo número para el mismo texto', () => {
    assert.equal(hash32('familia'), hash32('familia'));
  });

  it('reparte: textos parecidos dan números muy distintos', () => {
    assert.notEqual(hash32('torneo-a'), hash32('torneo-b'));
    assert.notEqual(hash32('a'), hash32('b'));
  });

  it('se queda en 32 bits sin signo', () => {
    for (const texto of ['', 'a', 'palabra torneo', '𝔘𝔫𝔦𝔠𝔬𝔡𝔢']) {
      const h = hash32(texto);
      assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `${texto} -> ${h}`);
    }
  });
});

describe('recorrido', () => {
  it('elige un salto primo con el total, que es lo que evita repeticiones', () => {
    const total = totalSoluciones;
    for (let i = 0; i < 200; i++) {
      const { paso, inicio } = recorrido(`semilla-${i}`, total);
      let a = paso;
      let b = total;
      while (b !== 0) [a, b] = [b, a % b];
      assert.equal(a, 1, `el salto ${paso} no es primo con ${total}`);
      assert.ok(inicio >= 0 && inicio < total);
    }
  });
});

describe('semillas generadas', () => {
  it('no se repiten', () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 500; i++) vistas.add(generarSemilla());
    assert.equal(vistas.size, 500);
  });

  it('son largas de sobra para no adivinarlas', () => {
    assert.ok(generarSemilla().length >= 20);
  });
});

describe('palabra del día por torneo', () => {
  const FAMILIA = 'semilla-de-la-familia';
  const CURRO = 'semilla-del-curro';

  it('todos los del mismo torneo ven la misma palabra', () => {
    assert.equal(solucionDe('2026-08-15', FAMILIA), solucionDe('2026-08-15', FAMILIA));
  });

  it('dos torneos casi nunca coinciden, y cuando pasa es por azar', () => {
    // Es la razón de ser de la semilla: que no puedas preguntar la palabra a
    // alguien de otro grupo.
    //
    // Cero coincidencias es imposible sin coordinar los torneos entre sí: son
    // dos sucesiones independientes sobre la misma lista, así que de vez en
    // cuando caen en la misma palabra, igual que dos dados sacan el mismo
    // número. Con 2500 palabras toca una vez cada siete años de media. Lo que
    // hay que garantizar es que sea excepcional, no que no ocurra.
    let fecha = '2026-01-01';
    let coincidencias = 0;
    const dias = totalSoluciones;
    for (let i = 0; i < dias; i++) {
      if (solucionDe(fecha, FAMILIA) === solucionDe(fecha, CURRO)) coincidencias++;
      fecha = sumarDias(fecha, 1);
    }
    assert.ok(
      coincidencias / dias < 0.01,
      `coinciden ${coincidencias} de ${dias} días, demasiados`
    );
  });

  it('un torneo no es el calendario de otro desplazado unos días', () => {
    // Si sólo cambiara el punto de partida, bastaría con saber el desfase para
    // predecir el otro torneo. Al cambiar también el salto, no hay desfase que
    // haga coincidir las dos sucesiones.
    for (let desfase = 1; desfase <= 30; desfase++) {
      let iguales = 0;
      let fecha = '2026-01-01';
      for (let i = 0; i < 120; i++) {
        if (solucionDe(fecha, FAMILIA) === solucionDe(sumarDias(fecha, desfase), CURRO)) {
          iguales++;
        }
        fecha = sumarDias(fecha, 1);
      }
      assert.ok(iguales < 5, `con desfase ${desfase} coinciden ${iguales} de 120`);
    }
  });

  it('cada torneo recorre todas las palabras sin repetir ninguna', () => {
    for (const semilla of [FAMILIA, CURRO, 'otra-mas']) {
      const vistas = new Set<string>();
      let fecha = '2024-01-01';
      for (let i = 0; i < totalSoluciones; i++) {
        vistas.add(solucionDe(fecha, semilla));
        fecha = sumarDias(fecha, 1);
      }
      assert.equal(vistas.size, totalSoluciones, `la semilla ${semilla} repite palabras`);
    }
  });

  it('la palabra cambia de un día para otro', () => {
    assert.notEqual(solucionDe('2026-08-15', FAMILIA), solucionDe('2026-08-16', FAMILIA));
  });

  it('sin semilla usa el recorrido del modo libre, y es estable', () => {
    assert.equal(solucionDe('2026-08-15'), solucionDe('2026-08-15'));
    assert.notEqual(solucionDe('2026-08-15'), solucionDe('2026-08-15', FAMILIA));
  });

  it('toda palabra sorteada es jugable y de cinco letras', () => {
    let fecha = '2026-01-01';
    for (let i = 0; i < 300; i++) {
      for (const semilla of [FAMILIA, CURRO]) {
        const palabra = solucionDe(fecha, semilla);
        assert.equal(palabra.length, 5);
        assert.ok(esAceptada(palabra), `${palabra} no está aceptada`);
      }
      fecha = sumarDias(fecha, 1);
    }
  });
});
