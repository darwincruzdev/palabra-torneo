import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ULTIS_POR_MES,
  impedimentoParaUlti,
  mensajeDeUlti,
  problemaConLaPalabra,
  solucionParaMi,
  ultiDe,
  ultisDe,
  ultisGastadas,
  ultisQueLeQuedan,
} from '../src/game/ulti';
import { esAceptada, esSolucion, solucionDe } from '../src/game/palabras';
import type { DiaTorneo, Ulti } from '../src/tipos';

const CON = { ulti: true };
const SIN = { ulti: false };
const INICIO = '2026-01-01';

/** Dos palabras que seguro están en la lista de soluciones. */
const BUENA = solucionDe('2026-01-10');
const OTRA = solucionDe('2026-02-10');

/** Del diccionario pero fuera de las soluciones: antes se rechazaba. */
const CORRIENTE = 'mecer';

function dia(fecha: string, ultis?: Record<string, Ulti>): DiaTorneo {
  return { fecha, resultados: {}, ...(ultis ? { ultis } : {}) };
}

describe('la ulti de una jornada', () => {
  it('sin ultis no hay ninguna', () => {
    assert.equal(ultiDe(undefined, CON), null);
    assert.equal(ultiDe(dia('2026-01-10'), CON), null);
  });

  it('un torneo que juega sin ultis las ignora', () => {
    const jornada = dia('2026-01-10', { ana: { palabra: BUENA, lanzada: '2026-01-09' } });
    assert.equal(ultiDe(jornada, SIN), null);
    assert.ok(ultiDe(jornada, CON));
  });

  it('si dos se adelantan a la vez, manda la primera', () => {
    // La app no deja gastar la segunda, pero dos móviles pueden pulsar a la
    // par y el servidor no puede impedirlo: cada uno escribe su propia casilla.
    const jornada = dia('2026-01-10', {
      zoe: { palabra: BUENA, lanzada: '2026-01-08' },
      ana: { palabra: OTRA, lanzada: '2026-01-09' },
    });
    assert.equal(ultiDe(jornada, CON)?.autor, 'zoe');
  });

  it('a igualdad de día, desempata el uid y sale igual en todos los móviles', () => {
    const jornada = dia('2026-01-10', {
      zoe: { palabra: BUENA, lanzada: '2026-01-09' },
      ana: { palabra: OTRA, lanzada: '2026-01-09' },
    });
    assert.equal(ultiDe(jornada, CON)?.autor, 'ana');
    assert.deepEqual(
      ultisDe(jornada).map((u) => u.autor),
      ['ana', 'zoe']
    );
  });

  it('una palabra que no está en el diccionario no obliga a nadie', () => {
    // El servidor no tiene el diccionario, así que la comprueba quien la recibe.
    const jornada = dia('2026-01-10', { ana: { palabra: 'zzzzz', lanzada: '2026-01-09' } });
    assert.equal(ultiDe(jornada, CON), null);
  });

  it('una del diccionario que no es solución sí manda', () => {
    // El filtro de quien la recibe tiene que admitir lo mismo que el de quien
    // la pone: si no, la ulti se guarda y luego no la juega nadie.
    assert.equal(esSolucion(CORRIENTE), false);
    const jornada = dia('2026-01-10', { ana: { palabra: CORRIENTE, lanzada: '2026-01-09' } });
    assert.equal(ultiDe(jornada, CON)?.palabra, CORRIENTE);
    assert.equal(solucionParaMi(BUENA, ultiDe(jornada, CON), 'zoe'), CORRIENTE);
  });

  it('y si la mala llegó antes, manda la buena que venga detrás', () => {
    const jornada = dia('2026-01-10', {
      ana: { palabra: 'zzzzz', lanzada: '2026-01-08' },
      zoe: { palabra: BUENA, lanzada: '2026-01-09' },
    });
    assert.equal(ultiDe(jornada, CON)?.autor, 'zoe');
  });
});

describe('a quién le toca qué palabra', () => {
  const lanzada = { palabra: OTRA, lanzada: '2026-01-09', autor: 'ana' };

  it('quien la gasta juega la palabra normal', () => {
    // Elige el problema de los demás, no el suyo: así no juega sabiendo nada
    // que los otros no sepan de su propia palabra.
    assert.equal(solucionParaMi(BUENA, lanzada, 'ana'), BUENA);
  });

  it('el resto del torneo juega la que eligió', () => {
    assert.equal(solucionParaMi(BUENA, lanzada, 'zoe'), OTRA);
    assert.equal(solucionParaMi(BUENA, lanzada, 'dan'), OTRA);
  });

  it('sin ulti, todo el mundo juega la normal', () => {
    assert.equal(solucionParaMi(BUENA, null, 'ana'), BUENA);
    assert.equal(solucionParaMi(BUENA, null, null), BUENA);
  });

  it('quien no ha entrado juega la normal', () => {
    assert.equal(solucionParaMi(BUENA, lanzada, null), OTRA);
  });
});

describe('una al mes', () => {
  const dias = [
    dia('2026-01-10', { ana: { palabra: BUENA, lanzada: '2026-01-09' } }),
    dia('2026-02-05', { ana: { palabra: OTRA, lanzada: '2026-02-04' } }),
  ];

  it('el tope es una', () => {
    assert.equal(ULTIS_POR_MES, 1);
  });

  it('cuenta la del mes en que se gastó, no la del día al que cae', () => {
    // Gastarla el 31 no puede robarle la del mes siguiente.
    const finDeMes = [dia('2026-02-01', { ana: { palabra: BUENA, lanzada: '2026-01-31' } })];
    assert.equal(ultisGastadas(finDeMes, INICIO, '2026-01', 'ana'), 1);
    assert.equal(ultisGastadas(finDeMes, INICIO, '2026-02', 'ana'), 0);
  });

  it('cada mes trae la suya', () => {
    assert.equal(ultisQueLeQuedan(dias, INICIO, '2026-01', 'ana'), 0);
    assert.equal(ultisQueLeQuedan(dias, INICIO, '2026-02', 'ana'), 0);
    assert.equal(ultisQueLeQuedan(dias, INICIO, '2026-03', 'ana'), 1);
  });

  it('la de otro no me quita la mía', () => {
    assert.equal(ultisQueLeQuedan(dias, INICIO, '2026-01', 'zoe'), 1);
  });

  it('reiniciar la competición la devuelve', () => {
    assert.equal(ultisQueLeQuedan(dias, '2026-01-20', '2026-01', 'ana'), 1);
  });
});

describe('cuándo se puede gastar', () => {
  it('con todo en orden, no hay impedimento', () => {
    assert.equal(impedimentoParaUlti({ activa: true, quedan: 1, ocupada: false }), null);
  });

  it('cada motivo se dice con su nombre', () => {
    assert.match(
      impedimentoParaUlti({ activa: false, quedan: 1, ocupada: false }) ?? '',
      /sin ultis/
    );
    assert.match(
      impedimentoParaUlti({ activa: true, quedan: 0, ocupada: false }) ?? '',
      /este mes/
    );
    assert.match(
      impedimentoParaUlti({ activa: true, quedan: 1, ocupada: true }) ?? '',
      /adelantado/
    );
  });
});

describe('qué palabra vale', () => {
  it('una solución corriente vale', () => {
    assert.equal(problemaConLaPalabra(BUENA), null);
  });

  it('en blanco, no', () => {
    assert.match(problemaConLaPalabra('') ?? '', /Escribe/);
  });

  it('una del diccionario que no es solución, también', () => {
    // El caso de la queja: palabras corrientes que el juego acepta como
    // intento pero que no están entre las 2.500 soluciones.
    assert.equal(esAceptada(CORRIENTE), true);
    assert.equal(esSolucion(CORRIENTE), false);
    assert.equal(problemaConLaPalabra(CORRIENTE), null);
  });

  it('hasta una rareza del diccionario largo', () => {
    assert.equal(problemaConLaPalabra('abaña'), null);
  });

  it('un invento, no', () => {
    assert.equal(esAceptada('zzzzz'), false);
    assert.match(problemaConLaPalabra('zzzzz') ?? '', /diccionario/);
  });
});

describe('el mensaje para el grupo', () => {
  const datos = { torneo: 'Torneazo', autor: 'Darwin' };

  it('dice quién y dónde, y no suelta la palabra', () => {
    const texto = mensajeDeUlti({ ...datos });
    assert.match(texto, /Darwin/);
    assert.match(texto, /Torneazo/);
    assert.ok(!texto.includes(BUENA.toUpperCase()));
  });

  it('mete el enlace sólo si lo hay', () => {
    assert.ok(!mensajeDeUlti(datos).includes('http'));
    assert.match(mensajeDeUlti({ ...datos, enlace: 'https://x.web.app' }), /https:\/\/x/);
  });
});
