import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PALABRAS_POR_RONDA,
  PUNTOS_MAXIMOS,
  acertadasDeRonda,
  comentarioDeRonda,
  esMejor,
  intentosDeRonda,
  marcaDeRonda,
  puntosDeRonda,
  reloj,
  semillaDeRonda,
} from '../src/game/arcade';
import { esAceptada, palabrasDeRonda } from '../src/game/palabras';
import type { RecordArcade, ResultadoPalabra } from '../src/tipos';

function palabra(intentos: number, acertada = true): ResultadoPalabra {
  return { intentos, acertada };
}

function marca(puntos: number, segundos: number): RecordArcade {
  return { puntos, segundos, acertadas: 5, intentos: 10, fecha: '2026-09-18' };
}

describe('las palabras de una ronda', () => {
  it('saca las cinco que se piden', () => {
    assert.equal(palabrasDeRonda('lo-que-sea', PALABRAS_POR_RONDA).length, PALABRAS_POR_RONDA);
  });

  it('no repite ninguna dentro de la misma ronda', () => {
    // Si se repitiera, la segunda vez estaría regalada.
    for (let i = 0; i < 300; i++) {
      const palabras = palabrasDeRonda(`ronda-${i}`, PALABRAS_POR_RONDA);
      assert.equal(new Set(palabras).size, PALABRAS_POR_RONDA, palabras.join(','));
    }
  });

  it('todas son palabras que el juego acepta', () => {
    // Si saliera una que el teclado rechaza, la ronda se quedaría atascada.
    for (let i = 0; i < 100; i++) {
      for (const p of palabrasDeRonda(`x${i}`, PALABRAS_POR_RONDA)) {
        assert.equal(esAceptada(p), true, p);
      }
    }
  });

  it('con la misma semilla salen las mismas', () => {
    assert.deepEqual(palabrasDeRonda('igual', 5), palabrasDeRonda('igual', 5));
  });

  it('cada semilla lleva a un sitio distinto de la lista', () => {
    const a = palabrasDeRonda(semillaDeRonda(), 5).join();
    const b = palabrasDeRonda(semillaDeRonda(), 5).join();
    assert.notEqual(a, b);
  });
});

describe('la cuenta de una ronda', () => {
  const ronda = [palabra(1), palabra(3), palabra(6, false), palabra(2), palabra(4)];

  it('suma los puntos de siempre, palabra a palabra', () => {
    // 7 + 4 + 0 + 5 + 3
    assert.equal(puntosDeRonda(ronda), 19);
  });

  it('cuenta los intentos gastados, fallos incluidos', () => {
    assert.equal(intentosDeRonda(ronda), 16);
  });

  it('cuenta las acertadas', () => {
    assert.equal(acertadasDeRonda(ronda), 4);
  });

  it('el techo son las cinco al primer intento', () => {
    assert.equal(PUNTOS_MAXIMOS, 35);
    assert.equal(puntosDeRonda(new Array(5).fill(palabra(1))), PUNTOS_MAXIMOS);
  });

  it('el tiempo se guarda en segundos enteros', () => {
    assert.equal(marcaDeRonda(ronda, 92_400, '2026-09-18').segundos, 92);
  });

  it('una ronda relámpago no se queda en cero segundos', () => {
    // Un cero se leería como que no se jugó, y encima ganaría todos los
    // desempates por tiempo.
    assert.equal(marcaDeRonda(ronda, 200, '2026-09-18').segundos, 1);
  });
});

describe('cuándo hay récord', () => {
  it('la primera ronda siempre lo es', () => {
    assert.equal(esMejor(marca(10, 300), null), true);
  });

  it('mandan los puntos', () => {
    assert.equal(esMejor(marca(20, 600), marca(19, 30)), true);
    assert.equal(esMejor(marca(18, 10), marca(19, 600)), false);
  });

  it('el tiempo sólo desempata', () => {
    assert.equal(esMejor(marca(20, 100), marca(20, 120)), true);
    assert.equal(esMejor(marca(20, 120), marca(20, 100)), false);
    // Clavarla igual no es superarla.
    assert.equal(esMejor(marca(20, 100), marca(20, 100)), false);
  });

  it('rendirse deprisa no cuenta como mejorar', () => {
    // Cinco fallos rápidos: 0 puntos en 30 segundos no puede batir a 25 en 300.
    assert.equal(esMejor(marca(0, 30), marca(25, 300)), false);
  });
});

describe('el reloj', () => {
  it('por debajo del minuto van segundos sueltos', () => {
    assert.equal(reloj(45), '45"');
    assert.equal(reloj(0), '0"');
  });

  it('a partir del minuto, minutos y segundos con dos cifras', () => {
    assert.equal(reloj(60), '1:00');
    assert.equal(reloj(65), '1:05');
    assert.equal(reloj(750), '12:30');
  });
});

describe('lo que se dice al terminar', () => {
  it('la primera vez se nombra como primera marca', () => {
    assert.match(comentarioDeRonda(marca(20, 100), null), /Primera marca/);
  });

  it('más puntos es récord', () => {
    assert.match(comentarioDeRonda(marca(25, 400), marca(20, 100)), /Récord/);
  });

  it('los mismos puntos en menos tiempo también', () => {
    assert.match(comentarioDeRonda(marca(20, 80), marca(20, 100)), /tiempo/);
  });

  it('quedarse corto dice cuánto falta', () => {
    assert.match(comentarioDeRonda(marca(15, 80), marca(20, 100)), /5 puntos/);
  });
});
