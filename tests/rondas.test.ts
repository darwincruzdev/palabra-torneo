import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  codificarIntento,
  debeCerrarPorTiempo,
  descodificarLetras,
  normalizarProgreso,
  PALABRAS_POR_DUELO,
  cerradasVacias,
  dueloTerminado,
  primeraSinCerrar,
  rondaDe,
} from '../src/game/duelo';

/** "ccx.." -> [true, true, false, false, false, ...] con x como no cerrada */
const desde = (patron: string) => {
  const lista = cerradasVacias();
  [...patron].slice(0, PALABRAS_POR_DUELO).forEach((c, i) => {
    lista[i] = c === 'c';
  });
  return lista;
};

describe('cerradas', () => {
  it('empieza con las diez sin cerrar', () => {
    const lista = cerradasVacias();
    assert.equal(lista.length, PALABRAS_POR_DUELO);
    assert.ok(lista.every((c) => c === false));
  });

  it('la primera sin cerrar es la que toca jugar', () => {
    assert.equal(primeraSinCerrar(cerradasVacias()), 0);
    assert.equal(primeraSinCerrar(desde('c')), 1);
    assert.equal(primeraSinCerrar(desde('c'.repeat(PALABRAS_POR_DUELO))), 3);
  });

  it('devuelve diez cuando ya están todas', () => {
    assert.equal(primeraSinCerrar(desde('c'.repeat(PALABRAS_POR_DUELO))), PALABRAS_POR_DUELO);
  });
});

describe('la ronda del duelo', () => {
  it('al empezar es la primera para los dos', () => {
    assert.equal(rondaDe(cerradasVacias(), cerradasVacias()), 0);
  });

  it('no avanza mientras uno de los dos no cierre', () => {
    // Yo he cerrado la primera, mi rival no: seguimos en la primera.
    assert.equal(rondaDe(desde('c'), cerradasVacias()), 0);
    assert.equal(rondaDe(cerradasVacias(), desde('c')), 0);
  });

  it('avanza en cuanto la cierran los dos', () => {
    assert.equal(rondaDe(desde('c'), desde('c')), 1);
    assert.equal(rondaDe(desde('c'.repeat(PALABRAS_POR_DUELO)), desde('c'.repeat(PALABRAS_POR_DUELO))), 3);
  });

  it('va por el que menos lleva, nadie se escapa', () => {
    assert.equal(rondaDe(desde('c'.repeat(PALABRAS_POR_DUELO)), desde('cc')), 2);
  });

  it('el duelo acaba cuando los dos cierran las diez', () => {
    assert.ok(!dueloTerminado(desde('c'.repeat(PALABRAS_POR_DUELO)), desde('c'.repeat(PALABRAS_POR_DUELO - 1))));
    assert.ok(dueloTerminado(desde('c'.repeat(PALABRAS_POR_DUELO)), desde('c'.repeat(PALABRAS_POR_DUELO))));
  });
});

describe('quién espera a quién', () => {
  const esperando = (mias: boolean[], suyas: boolean[]) => {
    const ronda = rondaDe(mias, suyas);
    return { ronda, yoEspero: Boolean(mias[ronda]), elEspera: Boolean(suyas[ronda]) };
  };

  it('el que cierra primero espera al otro', () => {
    const estado = esperando(desde('c'), cerradasVacias());
    assert.equal(estado.ronda, 0);
    assert.equal(estado.yoEspero, true);
    assert.equal(estado.elEspera, false);
  });

  it('nadie espera si los dos van por la misma palabra sin cerrar', () => {
    const estado = esperando(desde('c'), desde('c'));
    assert.equal(estado.ronda, 1);
    assert.equal(estado.yoEspero, false);
    assert.equal(estado.elEspera, false);
  });
});

describe('aguantar progresos de otra versión de la app', () => {
  it('un progreso sin el campo cerradas no rompe nada', () => {
    // Es el formato viejo: sólo rejilla y palabraActual.
    const viejo = { rejilla: cerradasVacias().map(() => ''), palabraActual: 3, puntos: 7 };
    const puesto = normalizarProgreso(viejo);
    assert.equal(puesto.cerradas.length, PALABRAS_POR_DUELO);
    assert.ok(puesto.cerradas.every((c) => c === false));
    assert.equal(puesto.puntos, 7);
  });

  it('deduce las cerradas de la rejilla cuando falta el campo', () => {
    const acertada = codificarIntento('crean', 'crean');
    const agotada = codificarIntento('salto', 'crean').repeat(6);
    const aMedias = codificarIntento('salto', 'crean');

    const rejilla = cerradasVacias().map(() => '');
    rejilla[0] = acertada;
    rejilla[1] = agotada;
    rejilla[2] = aMedias;

    const puesto = normalizarProgreso({ rejilla });
    assert.equal(puesto.cerradas[0], true);
    assert.equal(puesto.cerradas[1], true);
    assert.equal(puesto.cerradas[2], false);
  });

  it('un progreso vacío o nulo da uno en blanco', () => {
    for (const bruto of [undefined, null, {}, 'basura', 42]) {
      const puesto = normalizarProgreso(bruto);
      assert.equal(puesto.rejilla.length, PALABRAS_POR_DUELO);
      assert.equal(puesto.cerradas.length, PALABRAS_POR_DUELO);
      assert.equal(puesto.puntos, 0);
    }
  });

  it('la ronda sale 0 si las cerradas no son una lista', () => {
    assert.equal(primeraSinCerrar(undefined as unknown as boolean[]), 0);
    assert.equal(rondaDe(undefined as unknown as boolean[], cerradasVacias()), 0);
  });

  it('recorta una rejilla más larga de la cuenta', () => {
    const puesto = normalizarProgreso({ rejilla: new Array(30).fill('') });
    assert.equal(puesto.rejilla.length, PALABRAS_POR_DUELO);
  });
});

describe('lo que se guarda en Firestore', () => {
  /**
   * Firestore no admite listas dentro de listas. Con `letras` como lista de
   * intentos por palabra, crear un duelo fallaba entero con
   * "Nested arrays are not supported".
   */
  const sinListasAnidadas = (valor: unknown, ruta = 'raíz'): void => {
    if (Array.isArray(valor)) {
      valor.forEach((hijo, i) => {
        assert.ok(!Array.isArray(hijo), `${ruta}[${i}] es una lista dentro de otra lista`);
        if (hijo && typeof hijo === 'object') sinListasAnidadas(hijo, `${ruta}[${i}]`);
      });
      return;
    }
    if (valor && typeof valor === 'object') {
      for (const [clave, hijo] of Object.entries(valor)) {
        sinListasAnidadas(hijo, `${ruta}.${clave}`);
      }
    }
  };

  it('un progreso normalizado no lleva listas anidadas', () => {
    sinListasAnidadas(normalizarProgreso({}));
  });

  it('tampoco con partidas dentro', () => {
    const progreso = normalizarProgreso({
      rejilla: ['ccccc', '', ''],
      cerradas: [true, false, false],
      letras: ['saltocrean', '', ''],
      puntos: 5,
    });
    sinListasAnidadas(progreso);
    assert.equal(typeof progreso.letras[0], 'string');
  });

  it('las letras se trocean en intentos de cinco', () => {
    assert.deepEqual(descodificarLetras('saltocrean'), ['salto', 'crean']);
    assert.deepEqual(descodificarLetras(''), []);
    assert.deepEqual(descodificarLetras('salto'), ['salto']);
  });

  it('acepta el formato viejo, que era una lista por palabra', () => {
    const progreso = normalizarProgreso({ letras: [['salto', 'crean'], [], []] });
    assert.equal(progreso.letras[0], 'saltocrean');
    sinListasAnidadas(progreso);
  });
});

describe('cerrar la palabra al agotarse el tiempo', () => {
  it('cierra la palabra que estaba contando', () => {
    assert.equal(debeCerrarPorTiempo({ ronda: 0, quedan: 0 }, 0, false), true);
  });

  it('no cierra mientras quede tiempo', () => {
    assert.equal(debeCerrarPorTiempo({ ronda: 0, quedan: 7 }, 0, false), false);
    assert.equal(debeCerrarPorTiempo({ ronda: 0, quedan: 1 }, 0, false), false);
  });

  it('no arrastra el cierre a la palabra siguiente', () => {
    // Al llegar a cero se cierra la palabra 0 y la ronda pasa a la 1, pero el
    // contador sigue en cero un instante. Sin mirar la ronda, se cerraba
    // también la 1 sin haberla jugado.
    assert.equal(debeCerrarPorTiempo({ ronda: 0, quedan: 0 }, 1, false), false);
  });

  it('no vuelve a cerrar una palabra ya cerrada', () => {
    assert.equal(debeCerrarPorTiempo({ ronda: 0, quedan: 0 }, 0, true), false);
  });

  it('sin cuenta atrás no cierra nada', () => {
    assert.equal(debeCerrarPorTiempo(null, 0, false), false);
  });
});
