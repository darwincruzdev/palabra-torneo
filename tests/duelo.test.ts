import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PALABRAS_POR_DUELO,
  codificarIntento,
  descodificarPalabra,
  ganador,
  palabraAcertada,
  palabrasCerradas,
  palabrasDeDuelo,
  puntosDePalabra,
  puntosDeDuelo,
  rejillaVacia,
  resumir,
} from '../src/game/duelo';
import { esAceptada } from '../src/game/palabras';

describe('las palabras del duelo', () => {
  it('son diez', () => {
    assert.equal(palabrasDeDuelo('semilla-a').length, PALABRAS_POR_DUELO);
  });

  it('son las mismas para los dos jugadores', () => {
    assert.deepEqual(palabrasDeDuelo('duelo-42'), palabrasDeDuelo('duelo-42'));
  });

  it('no se repite ninguna dentro del mismo duelo', () => {
    for (const semilla of ['a', 'b', 'duelo-largo-de-verdad']) {
      const palabras = palabrasDeDuelo(semilla);
      assert.equal(new Set(palabras).size, PALABRAS_POR_DUELO, `repite con ${semilla}`);
    }
  });

  it('dos duelos distintos no llevan la misma lista', () => {
    assert.notDeepEqual(palabrasDeDuelo('duelo-1'), palabrasDeDuelo('duelo-2'));
  });

  it('todas son jugables y de cinco letras', () => {
    for (let i = 0; i < 50; i++) {
      for (const palabra of palabrasDeDuelo(`semilla-${i}`)) {
        assert.equal(palabra.length, 5);
        assert.ok(esAceptada(palabra), `${palabra} no está aceptada`);
      }
    }
  });
});

describe('las marcas que ve el rival', () => {
  it('no llevan ninguna letra', () => {
    const codigo = codificarIntento('salto', 'crean');
    assert.match(codigo, /^[cpa]{5}$/);
    assert.ok(!/[b-oq-z]/.test(codigo.replace(/[cpa]/g, '')));
  });

  it('van y vuelven sin perder nada', () => {
    const codigo = codificarIntento('casas', 'salud');
    assert.deepEqual(descodificarPalabra(codigo), [
      ['ausente', 'correcta', 'presente', 'ausente', 'ausente'],
    ]);
  });

  it('se apilan por intentos, de cinco en cinco', () => {
    const uno = codificarIntento('salto', 'crean');
    const dos = codificarIntento('crean', 'crean');
    const filas = descodificarPalabra(uno + dos);
    assert.equal(filas.length, 2);
    assert.ok(filas[1].every((m) => m === 'correcta'));
  });

  it('aguanta una cadena vacía', () => {
    assert.deepEqual(descodificarPalabra(''), []);
  });
});

describe('acertar una palabra', () => {
  it('se detecta cuando el último intento es todo verde', () => {
    const codigo = codificarIntento('salto', 'crean') + codificarIntento('crean', 'crean');
    assert.ok(palabraAcertada(codigo));
  });

  it('no se da por acertada si el último intento falla', () => {
    assert.ok(!palabraAcertada(codificarIntento('salto', 'crean')));
  });
});

describe('puntos', () => {
  const acertarEn = (intentos: number) => {
    const fallo = codificarIntento('salto', 'crean');
    return fallo.repeat(intentos - 1) + codificarIntento('crean', 'crean');
  };

  it('reparten 7-5-4-3-2-1 según el intento', () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6].map((n) => puntosDePalabra(acertarEn(n))),
      [7, 5, 4, 3, 2, 1]
    );
  });

  it('una palabra fallada da cero', () => {
    const seisFallos = codificarIntento('salto', 'crean').repeat(6);
    assert.equal(puntosDePalabra(seisFallos), 0);
  });

  it('una palabra sin empezar da cero', () => {
    assert.equal(puntosDePalabra(''), 0);
  });

  it('el duelo suma todas las palabras', () => {
    const rejilla = rejillaVacia();
    rejilla[0] = acertarEn(1); // 7
    rejilla[1] = acertarEn(3); // 4
    rejilla[2] = codificarIntento('salto', 'crean').repeat(6); // 0
    assert.equal(puntosDeDuelo(rejilla), 11);
  });
});

describe('palabras cerradas', () => {
  it('cuenta las acertadas y las agotadas, no las que van a medias', () => {
    const rejilla = rejillaVacia();
    rejilla[0] = codificarIntento('crean', 'crean'); // acertada
    rejilla[1] = codificarIntento('salto', 'crean').repeat(6); // agotada
    rejilla[2] = codificarIntento('salto', 'crean'); // a medias
    assert.equal(palabrasCerradas(rejilla), 2);
  });
});

describe('quién gana', () => {
  const acertarEn = (intentos: number) => {
    const fallo = codificarIntento('salto', 'crean');
    return fallo.repeat(intentos - 1) + codificarIntento('crean', 'crean');
  };

  it('gana quien tiene más puntos', () => {
    const ana = rejillaVacia();
    ana[0] = acertarEn(1); // 7
    const bea = rejillaVacia();
    bea[0] = acertarEn(2); // 5
    assert.deepEqual(ganador({ uid: 'ana', rejilla: ana }, { uid: 'bea', rejilla: bea }), {
      uid: 'ana',
      empate: false,
    });
  });

  it('con los mismos puntos gana quien gastó menos intentos', () => {
    // Los dos suman 7, pero Bea gastó intentos de más en otra palabra.
    const ana = rejillaVacia();
    ana[0] = acertarEn(1);
    const bea = rejillaVacia();
    bea[0] = acertarEn(1);
    bea[1] = codificarIntento('salto', 'crean').repeat(3); // 3 intentos tirados
    assert.deepEqual(ganador({ uid: 'ana', rejilla: ana }, { uid: 'bea', rejilla: bea }), {
      uid: 'ana',
      empate: false,
    });
  });

  it('empate cuando coinciden puntos e intentos', () => {
    const ana = rejillaVacia();
    ana[0] = acertarEn(2);
    const bea = rejillaVacia();
    bea[0] = acertarEn(2);
    const resultado = ganador({ uid: 'ana', rejilla: ana }, { uid: 'bea', rejilla: bea });
    assert.equal(resultado.empate, true);
    assert.equal(resultado.uid, null);
  });

  it('quien se queda a medias por los 15 segundos pierde lo que no jugó', () => {
    // Ana completó dos palabras; a Bea la cortaron con una sola.
    const ana = rejillaVacia();
    ana[0] = acertarEn(2);
    ana[1] = acertarEn(2);
    const bea = rejillaVacia();
    bea[0] = acertarEn(1);
    assert.equal(resumir(ana).puntos, 10);
    assert.equal(resumir(bea).puntos, 7);
    assert.equal(ganador({ uid: 'ana', rejilla: ana }, { uid: 'bea', rejilla: bea }).uid, 'ana');
  });
});
