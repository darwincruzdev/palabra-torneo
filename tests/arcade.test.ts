import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BONUS_MAXIMO,
  ESCALA,
  PALABRAS_POR_RONDA,
  PUNTOS_MAXIMOS,
  SEGUNDOS_NULO,
  SEGUNDOS_PLENO,
  TOTAL_MAXIMO,
  acertadasDeRonda,
  bonusDeTiempo,
  totalDe,
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

describe('lo que suma el tiempo', () => {
  it('por debajo del corte, el premio entero', () => {
    assert.equal(bonusDeTiempo(SEGUNDOS_PLENO), BONUS_MAXIMO);
    assert.equal(bonusDeTiempo(30), BONUS_MAXIMO);
    assert.equal(bonusDeTiempo(0), BONUS_MAXIMO);
  });

  it('pasado el tope, nada', () => {
    assert.equal(bonusDeTiempo(SEGUNDOS_NULO), 0);
    assert.equal(bonusDeTiempo(3600), 0);
  });

  it('entre medias baja según se tarda, sin escalones raros', () => {
    let previo = BONUS_MAXIMO + 1;
    for (let s = 0; s <= 700; s += 5) {
      const ahora = bonusDeTiempo(s);
      assert.ok(ahora <= previo, `sube en el segundo ${s}`);
      assert.ok(ahora >= 0 && ahora <= BONUS_MAXIMO);
      previo = ahora;
    }
  });

  it('tardar la mitad se nota de verdad, no es un desempate', () => {
    // Tres minutos frente a ocho: la diferencia tiene que ser varios puntos.
    assert.ok(bonusDeTiempo(180) - bonusDeTiempo(480) >= 3);
  });

  it('nunca llega a pagar una palabra', () => {
    // La palabra más barata vale ESCALA. Este es el tope de toda la norma: si
    // el tiempo lo alcanzara, una ronda rápida y floja ganaría a una lenta con
    // una palabra más.
    assert.ok(BONUS_MAXIMO < ESCALA);
    for (let s = 0; s <= 1200; s += 1) {
      assert.ok(bonusDeTiempo(s) < ESCALA, `se pasa en el segundo ${s}`);
    }
  });
});

describe('la puntuación de arcade', () => {
  it('son las palabras en escala de diez más lo que dé el reloj', () => {
    assert.equal(totalDe(marca(21, 180)), 21 * ESCALA + bonusDeTiempo(180));
  });

  it('el techo es la ronda perfecta y rápida', () => {
    assert.equal(TOTAL_MAXIMO, PUNTOS_MAXIMOS * ESCALA + BONUS_MAXIMO);
    assert.equal(totalDe(marca(PUNTOS_MAXIMOS, 60)), TOTAL_MAXIMO);
  });

  it('acertar más nunca pierde contra ir deprisa', () => {
    // La regla de la casa, comprobada a lo bruto: con más puntos de palabra da
    // igual lo que marque el reloj de cada uno.
    for (let mejores = 1; mejores <= PUNTOS_MAXIMOS; mejores++) {
      for (let peores = 0; peores < mejores; peores++) {
        const lento = totalDe(marca(mejores, 3600));
        const veloz = totalDe(marca(peores, 1));
        assert.ok(lento > veloz, `${mejores} en 1h no gana a ${peores} en 1s`);
      }
    }
  });

  it('cinco en diez minutos ganan a tres en uno', () => {
    // El ejemplo tal cual: cinco acertadas al cuarto intento, sin premio de
    // tiempo, contra tres al primero con el premio entero.
    const cinco = { puntos: 15, segundos: 600, acertadas: 5, intentos: 20, fecha: '' };
    const tres = { puntos: 21, segundos: 60, acertadas: 3, intentos: 15, fecha: '' };
    assert.ok(totalDe(cinco) < totalDe(tres));
    // Aquí manda el acierto fino: tres a la primera es mejor juego que cinco al
    // cuarto. Con la misma calidad de intentos, la que acierta más gana siempre.
    const cincoIguales = { ...cinco, puntos: 5 * 7 };
    assert.ok(totalDe(cincoIguales) > totalDe(tres));
  });
});

describe('cuándo hay récord', () => {
  it('la primera ronda siempre lo es', () => {
    assert.equal(esMejor(marca(10, 300), null), true);
  });

  it('mandan los puntos de palabra', () => {
    assert.equal(esMejor(marca(20, 600), marca(19, 30)), true);
    assert.equal(esMejor(marca(18, 10), marca(19, 600)), false);
  });

  it('con los mismos aciertos, el tiempo decide', () => {
    assert.equal(esMejor(marca(20, 100), marca(20, 400)), true);
    assert.equal(esMejor(marca(20, 400), marca(20, 100)), false);
    // Clavarla igual no es superarla.
    assert.equal(esMejor(marca(20, 100), marca(20, 100)), false);
  });

  it('un punto de palabra más siempre es récord, se tarde lo que se tarde', () => {
    // Es el mismo tope visto desde el récord: si esto fallara, existiría la
    // ronda que acierta mejor y pierde por el reloj.
    for (let puntos = 0; puntos < PUNTOS_MAXIMOS; puntos++) {
      assert.equal(esMejor(marca(puntos + 1, 3600), marca(puntos, 1)), true);
    }
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
    assert.match(comentarioDeRonda(marca(20, 150), marca(20, 400)), /Récord/);
  });

  it('quedarse corto dice cuánto falta, ya en puntos de arcade', () => {
    // Cinco puntos de palabra son cincuenta de arcade.
    assert.match(comentarioDeRonda(marca(15, 80), marca(20, 100)), /50 puntos/);
  });
});
