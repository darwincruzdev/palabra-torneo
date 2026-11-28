import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TITULOS,
  avataresDesbloqueados,
  avisadasTrasVer,
  desbloqueosEntre,
  eleccionValida,
  marcoDe,
  marcoDeTitulo,
  puedeLlevarEspecial,
  puedeLlevarTitulo,
  tituloPorDefecto,
  titulosDesbloqueados,
} from '../src/game/rangos';
import {
  AVATARES_ESPECIALES,
  AVATAR_POR_DEFECTO,
  normalizarAvatar,
} from '../src/game/avatares';

/** El índice del primer especial de cada nivel, que es lo que se guarda. */
const indiceDe = (copas: number) => AVATARES_ESPECIALES.findIndex((a) => a.copas === copas);
const UNA = indiceDe(1);
const DOS = indiceDe(2);
const TRES = indiceDe(3);

const NORMAL = { color: 2, patron: 1 };

describe('qué se tiene con cada número de copas', () => {
  it('con 0 no hay nada', () => {
    assert.deepEqual(avataresDesbloqueados(0), []);
    assert.deepEqual(titulosDesbloqueados(0), []);
    assert.equal(tituloPorDefecto(0), null);
    assert.equal(marcoDe(0), null);
  });

  it('con 1, los exclusivos estáticos y todavía ningún título', () => {
    const suyos = avataresDesbloqueados(1);
    assert.ok(suyos.length >= 4);
    assert.ok(suyos.every((a) => a.copas === 1));
    assert.ok(suyos.every((a) => a.animacion === 'ninguna'));
    assert.equal(tituloPorDefecto(1), null);
    assert.equal(marcoDe(1), null);
  });

  it('con 2 se suman los animados, sin perder los de 1', () => {
    const suyos = avataresDesbloqueados(2);
    assert.ok(suyos.filter((a) => a.copas === 1).length >= 4);
    assert.ok(suyos.filter((a) => a.copas === 2).length >= 4);
    assert.ok(suyos.filter((a) => a.copas === 2).every((a) => a.animacion !== 'ninguna'));
    assert.equal(tituloPorDefecto(2), null);
  });

  it('con 3 llegan los legendarios, el aura y el primer título', () => {
    const legendarios = avataresDesbloqueados(3).filter((a) => a.copas === 3);
    assert.ok(legendarios.length >= 4);
    assert.ok(legendarios.every((a) => a.aura === true));
    assert.ok(legendarios.every((a) => a.animacion !== 'ninguna'));
    assert.equal(tituloPorDefecto(3)?.nombre, 'Leyenda del Tablero');
    assert.equal(marcoDe(3), 'aura');
  });

  it('del 4 al 6, un título nuevo cada copa', () => {
    assert.equal(tituloPorDefecto(4)?.nombre, 'Señor de las Cinco Letras');
    assert.equal(tituloPorDefecto(5)?.nombre, 'Azote del Diccionario');
    assert.equal(tituloPorDefecto(6)?.nombre, 'Emperador del Torneo');
    // El aura sigue siendo la de 3: el marco de oro todavía no.
    assert.equal(marcoDe(6), 'aura');
  });

  it('con 7, el último título y el marco que no tiene nadie más', () => {
    assert.equal(tituloPorDefecto(7)?.nombre, 'Indiscutible Campeón del Mundo');
    assert.equal(marcoDe(7), 'oro');
    assert.equal(titulosDesbloqueados(7).length, TITULOS.length);
  });

  it('con 10 no hay nada que no hubiera con 7', () => {
    assert.deepEqual(titulosDesbloqueados(10), titulosDesbloqueados(7));
    assert.deepEqual(avataresDesbloqueados(10), avataresDesbloqueados(7));
    assert.equal(marcoDe(10), 'oro');
  });

  it('los títulos viejos no se pierden al subir', () => {
    // Cada uno sustituye al anterior por defecto, pero siguen siendo suyos.
    const suyos = titulosDesbloqueados(5).map((t) => t.id);
    assert.deepEqual(suyos, ['leyenda', 'senor', 'azote']);
    assert.ok(puedeLlevarTitulo(5, 'leyenda'));
  });
});

describe('el marco de los demás, deducido de su título', () => {
  it('de las copas de otro no se sabe nada, pero su título sí dice por dónde va', () => {
    assert.equal(marcoDeTitulo('leyenda'), 'aura');
    assert.equal(marcoDeTitulo('emperador'), 'aura');
    assert.equal(marcoDeTitulo('indiscutible'), 'oro');
  });

  it('sin título o con uno inventado, no hay marco', () => {
    assert.equal(marcoDeTitulo(null), null);
    assert.equal(marcoDeTitulo(undefined), null);
    assert.equal(marcoDeTitulo('rey-del-mambo'), null);
  });

  it('coincide con lo que dan las copas de verdad', () => {
    for (const titulo of TITULOS) {
      assert.equal(marcoDeTitulo(titulo.id), marcoDe(titulo.copas));
    }
  });
});

describe('cuándo sale el aviso y cuándo no', () => {
  it('al lanzar, a quien ya tiene copas se le cuenta todo lo suyo', () => {
    // Nunca se le ha avisado de nada: antes = 0.
    const todo = desbloqueosEntre(0, 3);
    assert.deepEqual(
      todo.map((d) => d.copas),
      [1, 2, 3]
    );
    assert.equal(todo[2].titulo?.id, 'leyenda');
    assert.equal(todo[2].marco, 'aura');
  });

  it('a quien no tiene copas no se le avisa de nada', () => {
    assert.deepEqual(desbloqueosEntre(0, 0), []);
  });

  it('una copa nueva que desbloquea algo, avisa', () => {
    const nuevo = desbloqueosEntre(3, 4);
    assert.equal(nuevo.length, 1);
    assert.equal(nuevo[0].titulo?.id, 'senor');
    assert.deepEqual(nuevo[0].avatares, []);
  });

  it('una copa que no desbloquea nada, no avisa', () => {
    // Ya lo tenía todo con 7: la octava y la décima no cuentan nada nuevo.
    assert.deepEqual(desbloqueosEntre(7, 8), []);
    assert.deepEqual(desbloqueosEntre(7, 10), []);
  });

  it('no se repite lo ya avisado', () => {
    assert.deepEqual(desbloqueosEntre(4, 4), []);
    const nuevo = desbloqueosEntre(4, 5);
    assert.deepEqual(
      nuevo.map((d) => d.titulo?.id),
      ['azote']
    );
  });

  it('si las copas bajan, no se vuelve a avisar al recuperarlas', () => {
    // Un mes empatado que se decide al revés puede quitar una copa.
    const avisadas = avisadasTrasVer(5, 5);
    assert.equal(avisadasTrasVer(avisadas, 4), 5);
    assert.deepEqual(desbloqueosEntre(5, 5), []);
  });
});

describe('lo que no le corresponde se cae', () => {
  it('un avatar legendario sin copas cae al normal que lleva debajo', () => {
    const valida = eleccionValida(0, { avatar: { ...NORMAL, especial: TRES } });
    assert.deepEqual(valida.avatar, NORMAL);
    assert.equal(valida.titulo, null);
  });

  it('con las copas justas, se le respeta', () => {
    const avatar = { ...NORMAL, especial: DOS };
    assert.deepEqual(eleccionValida(2, { avatar }).avatar, avatar);
    assert.deepEqual(eleccionValida(1, { avatar }).avatar, NORMAL);
  });

  it('un título que no ha ganado cae al que le toque', () => {
    const valida = eleccionValida(3, {
      avatar: NORMAL,
      titulo: 'indiscutible',
    });
    assert.equal(valida.titulo?.id, 'leyenda');
  });

  it('un título inventado cae al que le toque', () => {
    assert.equal(eleccionValida(4, { avatar: NORMAL, titulo: 'rey-del-mambo' }).titulo?.id, 'senor');
    assert.equal(eleccionValida(0, { avatar: NORMAL, titulo: 'rey-del-mambo' }).titulo, null);
  });

  it('se cae sólo lo que sobra, no las dos cosas', () => {
    // Título ganado, avatar que no: se le quita el avatar y se le deja el título.
    const valida = eleccionValida(3, {
      avatar: { ...NORMAL, especial: TRES },
      titulo: 'leyenda',
    });
    assert.equal(valida.titulo?.id, 'leyenda');
    assert.deepEqual(valida.avatar, { ...NORMAL, especial: TRES });

    const sinAvatar = eleccionValida(3, {
      avatar: { ...NORMAL, especial: AVATARES_ESPECIALES.length - 1 },
      titulo: 'leyenda',
    });
    assert.equal(sinAvatar.titulo?.id, 'leyenda');
  });

  it('elegir uno de los viejos vale', () => {
    const valida = eleccionValida(6, { avatar: NORMAL, titulo: 'leyenda' });
    assert.equal(valida.titulo?.id, 'leyenda');
  });

  it('sin elegir título, el más alto', () => {
    assert.equal(eleccionValida(6, { avatar: NORMAL }).titulo?.id, 'emperador');
    assert.equal(eleccionValida(6, { avatar: NORMAL, titulo: null }).titulo?.id, 'emperador');
  });
});

describe('los perfiles de antes de las copas', () => {
  it('un avatar sin especial sigue valiendo tal cual', () => {
    const viejo = normalizarAvatar({ color: 3, patron: 2 });
    assert.deepEqual(viejo, { color: 3, patron: 2 });
    assert.equal('especial' in viejo, false);
    assert.deepEqual(eleccionValida(0, { avatar: viejo }).avatar, viejo);
  });

  it('un perfil vacío cae al avatar por defecto y sin título', () => {
    const vacio = normalizarAvatar(undefined);
    assert.deepEqual(vacio, AVATAR_POR_DEFECTO);
    assert.equal(eleccionValida(0, { avatar: vacio }).titulo, null);
  });

  it('un especial que no existe se quita, no se corrige a cero', () => {
    // Cero es un avatar concreto: ponérselo a quien no lo eligió sería peor.
    const raro = normalizarAvatar({ color: 1, patron: 1, especial: 999 });
    assert.equal(raro.especial, undefined);
    assert.deepEqual(raro, { color: 1, patron: 1 });
  });

  it('un especial válido se conserva', () => {
    assert.equal(normalizarAvatar({ color: 1, patron: 1, especial: UNA }).especial, UNA);
  });

  it('puedeLlevarEspecial deja pasar al que no lleva ninguno', () => {
    assert.equal(puedeLlevarEspecial(0, undefined), true);
    assert.equal(puedeLlevarEspecial(0, UNA), false);
    assert.equal(puedeLlevarEspecial(1, UNA), true);
  });
});
