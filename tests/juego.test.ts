import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_INTENTOS, PALABRAS_PENALIZACION } from '../src/game/constantes';
import { estadoTeclado, evaluar, patronCompartible, puntosDe } from '../src/game/evaluar';
import { normalizar } from '../src/game/normalizar';
import { esAceptada, solucionDe, totalSoluciones } from '../src/game/palabras';
import { fechaJuego, indiceDia, sumarDias } from '../src/game/fecha';

describe('normalizar', () => {
  it('quita tildes y respeta la ñ', () => {
    assert.equal(normalizar('ACCIÓN'), 'accion');
    assert.equal(normalizar('Mañana'), 'mañana');
    assert.equal(normalizar('PINGÜE'), 'pingue');
    assert.equal(normalizar('ñoños'), 'ñoños');
  });
});

describe('evaluar', () => {
  it('marca aciertos, presencias y ausencias', () => {
    assert.deepEqual(evaluar('perro', 'perro'), [
      'correcta', 'correcta', 'correcta', 'correcta', 'correcta',
    ]);
    assert.deepEqual(evaluar('salto', 'lazos'), [
      'presente', 'correcta', 'presente', 'ausente', 'presente',
    ]);
  });

  it('no pinta más repeticiones de una letra de las que hay en la solución', () => {
    // "casas" tiene dos "s" pero "salud" sólo una: la primera se pinta en
    // amarillo y la segunda se queda apagada. La "a" de la posición 1 está en
    // su sitio, y la segunda "a" del intento ya no tiene ninguna libre.
    const marcas = evaluar('casas', 'salud');
    assert.deepEqual(marcas, ['ausente', 'correcta', 'presente', 'ausente', 'ausente']);
  });

  it('da prioridad a la letra colocada frente a la repetida fuera de sitio', () => {
    // La "a" de la solución "amiga" está en la posición 0 del intento "aroma";
    // la segunda "a" del intento (posición 4) sí coincide, y la primera queda
    // verde por estar en su sitio.
    const marcas = evaluar('aroma', 'amiga');
    assert.equal(marcas[0], 'correcta');
    assert.equal(marcas[4], 'correcta');
    assert.equal(marcas[1], 'ausente');
  });

  it('deja en ausente la letra sobrante cuando ya se ha colocado la única', () => {
    // "salsa" tiene tres "a"... no: dos. "playa" tiene dos "a" también.
    const marcas = evaluar('aaaaa', 'amada');
    // "amada" tiene 3 aes, en posiciones 0, 2 y 4.
    assert.deepEqual(marcas, [
      'correcta', 'ausente', 'correcta', 'ausente', 'correcta',
    ]);
  });
});

describe('estadoTeclado', () => {
  it('una tecla nunca empeora entre intentos', () => {
    // Primero la "a" sale verde; después se usa fuera de sitio y debe seguir verde.
    const estado = estadoTeclado(['amiga', 'salta'], 'amiga');
    assert.equal(estado['a'], 'correcta');
  });

  it('marca en ausente las letras que no están', () => {
    const estado = estadoTeclado(['perro'], 'canta');
    assert.equal(estado['p'], 'ausente');
    assert.equal(estado['r'], 'ausente');
  });
});

describe('puntuación', () => {
  it('reparte 7-5-4-3-2-1 según el intento', () => {
    assert.deepEqual(
      [1, 2, 3, 4, 5, 6].map((n) => puntosDe(n, true)),
      [7, 5, 4, 3, 2, 1]
    );
  });

  it('da cero al que no acierta', () => {
    for (let n = 1; n <= MAX_INTENTOS; n++) assert.equal(puntosDe(n, false), 0);
  });
});

describe('patrón compartible', () => {
  it('no revela letras, sólo colores', () => {
    const patron = patronCompartible(['aaaaa', 'amada'], 'amada');
    assert.equal(patron, '🟩⬛🟩⬛🟩\n🟩🟩🟩🟩🟩');
    assert.ok(!/[a-z]/i.test(patron));
  });
});

describe('palabra del día', () => {
  it('es la misma para una fecha dada', () => {
    assert.equal(solucionDe('2026-08-14'), solucionDe('2026-08-14'));
  });

  it('cambia al cambiar el día', () => {
    assert.notEqual(solucionDe('2026-08-14'), solucionDe('2026-08-15'));
  });

  it('no repite palabra en todo el ciclo', () => {
    const vistas = new Set<string>();
    let fecha = '2024-01-01';
    for (let i = 0; i < totalSoluciones; i++) {
      vistas.add(solucionDe(fecha));
      fecha = sumarDias(fecha, 1);
    }
    assert.equal(vistas.size, totalSoluciones);
  });

  it('toda solución es también una palabra aceptada como intento', () => {
    let fecha = '2024-01-01';
    for (let i = 0; i < 500; i++) {
      assert.ok(esAceptada(solucionDe(fecha)), `${solucionDe(fecha)} no está aceptada`);
      fecha = sumarDias(fecha, 1);
    }
  });

  it('tiene siempre cinco letras', () => {
    let fecha = '2024-01-01';
    for (let i = 0; i < 500; i++) {
      assert.equal(solucionDe(fecha).length, 5);
      fecha = sumarDias(fecha, 7);
    }
  });
});

describe('palabras de penalización', () => {
  it('las cinco son jugables', () => {
    for (const palabra of PALABRAS_PENALIZACION) {
      assert.ok(esAceptada(palabra), `${palabra} debería ser aceptada`);
      assert.equal(palabra.length, 5);
    }
  });

  it('todas repiten letras, que es lo que las hace un lastre', () => {
    for (const palabra of PALABRAS_PENALIZACION) {
      const distintas = new Set(palabra.split('')).size;
      assert.ok(distintas <= 3, `${palabra} tiene ${distintas} letras distintas`);
    }
  });
});

describe('fechas', () => {
  it('cuenta los días desde la época', () => {
    assert.equal(indiceDia('2024-01-01'), 0);
    assert.equal(indiceDia('2024-01-02'), 1);
    assert.equal(indiceDia('2025-01-01'), 366); // 2024 fue bisiesto
  });

  it('suma y resta días cruzando meses y años', () => {
    assert.equal(sumarDias('2026-08-14', 1), '2026-08-15');
    assert.equal(sumarDias('2026-08-31', 1), '2026-09-01');
    assert.equal(sumarDias('2026-01-01', -1), '2025-12-31');
  });

  it('devuelve la fecha en formato YYYY-MM-DD', () => {
    assert.match(fechaJuego(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa la hora de España, no la del móvil', () => {
    // 23:30 UTC del 14 de agosto ya es día 15 en Madrid (verano, UTC+2).
    assert.equal(fechaJuego(new Date('2026-08-14T23:30:00Z')), '2026-08-15');
    // 21:30 UTC todavía es día 14.
    assert.equal(fechaJuego(new Date('2026-08-14T21:30:00Z')), '2026-08-14');
  });
});
