import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CADUCA_COLA_MS,
  GRACIA_ABANDONO_MS,
  PALABRAS_POR_DUELO,
  SEGUNDOS_FINAL,
  balancePorRival,
  codificarIntento,
  descodificarPalabra,
  duelosJugados,
  ganador,
  palabraAcertada,
  palabrasCerradas,
  palabrasDeDuelo,
  puntosDeDuelo,
  puntosDePalabra,
  rejillaVacia,
  resumir,
  rivalSeHaIdo,
  rivalesPosibles,
  segundosRestantes,
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

  it('quien se queda a medias por el corte de tiempo pierde lo que no jugó', () => {
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

describe('emparejar en la cola', () => {
  const AHORA = 1_000_000_000;

  function sala(id: string, uid: string, hace = 0) {
    return { id, retador: { uid }, creado: AHORA - hace };
  }

  it('no te empareja contigo mismo', () => {
    const salas = [sala('a', 'yo'), sala('b', 'otro')];
    assert.deepEqual(
      rivalesPosibles(salas, 'yo', AHORA).map((s) => s.id),
      ['b']
    );
  });

  it('entra primero quien lleva más tiempo esperando', () => {
    const salas = [
      sala('nueva', 'ana', 1000),
      sala('vieja', 'bea', 60_000),
      sala('media', 'caj', 30_000),
    ];
    assert.deepEqual(
      rivalesPosibles(salas, 'yo', AHORA).map((s) => s.id),
      ['vieja', 'media', 'nueva']
    );
  });

  it('descarta las salas abandonadas', () => {
    const salas = [
      sala('fantasma', 'ana', CADUCA_COLA_MS + 1),
      sala('viva', 'bea', CADUCA_COLA_MS - 1),
    ];
    assert.deepEqual(
      rivalesPosibles(salas, 'yo', AHORA).map((s) => s.id),
      ['viva']
    );
  });

  it('descarta lo que no tenga retador, por si llega un documento a medias', () => {
    const salas = [{ id: 'roto', creado: AHORA }, sala('buena', 'ana')];
    assert.deepEqual(
      rivalesPosibles(salas, 'yo', AHORA).map((s) => s.id),
      ['buena']
    );
  });

  it('sin nadie esperando devuelve la lista vacía, no revienta', () => {
    assert.deepEqual(rivalesPosibles([], 'yo', AHORA), []);
    assert.deepEqual(rivalesPosibles([sala('mia', 'yo')], 'yo', AHORA), []);
  });
});

describe('el reloj del duelo', () => {
  const AHORA = 1_700_000_000_000;

  it('cuenta hacia abajo desde los segundos que toquen', () => {
    assert.equal(segundosRestantes(AHORA + SEGUNDOS_FINAL * 1000, AHORA), SEGUNDOS_FINAL);
    assert.equal(segundosRestantes(AHORA + 1000, AHORA), 1);
    assert.equal(segundosRestantes(AHORA, AHORA), 0);
  });

  it('redondea hacia arriba, para que no se vea un cero con tiempo aún', () => {
    assert.equal(segundosRestantes(AHORA + 1, AHORA), 1);
    assert.equal(segundosRestantes(AHORA + 29_500, AHORA), 30);
  });

  it('nunca baja de cero, aunque se vuelva mucho después', () => {
    // Es el caso de salir de la pestaña: al volver, el instante final quedó muy
    // atrás y restando de uno en uno la cuenta habría marcado de más.
    assert.equal(segundosRestantes(AHORA - 500_000, AHORA), 0);
  });
});

describe('el rival que se va y no vuelve', () => {
  const DESDE = 1_700_000_000_000;
  const LIMITE = SEGUNDOS_FINAL * 1000 + GRACIA_ABANDONO_MS;

  it('no se le da por perdido nada más empezar', () => {
    assert.equal(rivalSeHaIdo(DESDE, DESDE), false);
    assert.equal(rivalSeHaIdo(DESDE, DESDE + 1000), false);
  });

  it('se le respeta su cuenta atrás entera', () => {
    // Justo al agotarse sus segundos todavía no: puede haber enviado la palabra
    // y estar el mensaje viajando.
    assert.equal(rivalSeHaIdo(DESDE, DESDE + SEGUNDOS_FINAL * 1000), false);
    assert.equal(rivalSeHaIdo(DESDE, DESDE + LIMITE - 1), false);
  });

  it('pasado el margen, quien espera puede seguir', () => {
    assert.equal(rivalSeHaIdo(DESDE, DESDE + LIMITE), true);
    assert.equal(rivalSeHaIdo(DESDE, DESDE + 600_000), true);
  });

  it('el margen es de verdad, no de cero', () => {
    assert.ok(GRACIA_ABANDONO_MS > 0, 'sin margen se le robaría la palabra al que llega justo');
  });
});

describe('historial de duelos', () => {
  const yo = 'darwin';
  const otro = { uid: 'nico', nombre: 'Nico', avatar: { color: 0, patron: 0 } };

  /** Un duelo terminado con los puntos que se le digan, vía rejilla. */
  function duelo(id: string, creado: number, mias: string[], suyas: string[]) {
    return {
      id,
      codigo: 'AAA111',
      semilla: 's',
      creado,
      estado: 'terminado' as const,
      retador: { uid: yo, nombre: 'Darwin', avatar: { color: 1, patron: 0 } },
      rival: otro,
      jugadores: [yo, otro.uid],
      progreso: {
        [yo]: { rejilla: mias, cerradas: [], letras: [], puntos: 0 },
        [otro.uid]: { rejilla: suyas, cerradas: [], letras: [], puntos: 0 },
      },
    };
  }

  // Acertar al primer intento son 7 puntos; fallar seis veces, 0.
  const gano = ['ccccc', '', ''];
  const perdi = ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '', ''];

  it('sólo cuenta los terminados', () => {
    const aMedias = { ...duelo('x', 1, gano, perdi), estado: 'jugando' as const };
    assert.deepEqual(duelosJugados([aMedias], yo), []);
  });

  it('dice si ganaste o perdiste', () => {
    const [d] = duelosJugados([duelo('a', 1, gano, perdi)], yo);
    assert.equal(d.resultado, 'ganado');
    assert.ok(d.misPuntos > d.susPuntos);

    const [e] = duelosJugados([duelo('b', 1, perdi, gano)], yo);
    assert.equal(e.resultado, 'perdido');
  });

  it('el mismo duelo se ve del revés desde el otro lado', () => {
    const [mio] = duelosJugados([duelo('a', 1, gano, perdi)], yo);
    const [suyo] = duelosJugados([duelo('a', 1, gano, perdi)], otro.uid);
    assert.equal(mio.resultado, 'ganado');
    assert.equal(suyo.resultado, 'perdido');
  });

  it('los más recientes primero', () => {
    const lista = duelosJugados(
      [duelo('viejo', 100, gano, perdi), duelo('nuevo', 900, gano, perdi)],
      yo
    );
    assert.deepEqual(lista.map((d) => d.id), ['nuevo', 'viejo']);
  });

  it('el cara a cara suma ganados y perdidos por rival', () => {
    const lista = duelosJugados(
      [
        duelo('a', 3, gano, perdi),
        duelo('b', 2, gano, perdi),
        duelo('c', 1, perdi, gano),
      ],
      yo
    );
    const [contra] = balancePorRival(lista);
    assert.equal(contra.nombre, 'Nico');
    assert.equal(contra.ganados, 2);
    assert.equal(contra.perdidos, 1);
  });

  it('sin duelos jugados, el balance está vacío', () => {
    assert.deepEqual(balancePorRival([]), []);
  });
});
