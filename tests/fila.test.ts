import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  borrarEn,
  escribirEn,
  filaCompleta,
  filaVacia,
  siguienteHueco,
  texto,
} from '../src/game/fila';

/** "c..sa" -> ['c','','','s','a'] */
const desde = (patron: string) => patron.split('').map((c) => (c === '.' ? '' : c));

describe('escribir en la fila', () => {
  it('empieza vacía y de cinco huecos', () => {
    const fila = filaVacia();
    assert.equal(fila.length, 5);
    assert.ok(fila.every((c) => c === ''));
  });

  it('escribe de izquierda a derecha como siempre', () => {
    let estado = { fila: filaVacia(), cursor: 0 };
    for (const letra of 'salto') {
      estado = escribirEn(estado.fila, estado.cursor, letra);
    }
    assert.equal(texto(estado.fila), 'salto');
  });

  it('escribe en la casilla donde esté el cursor', () => {
    // Coloco una "u" en la segunda casilla, como quien apunta una verde.
    const { fila, cursor } = escribirEn(filaVacia(), 1, 'u');
    assert.deepEqual(fila, desde('.u...'));
    assert.equal(cursor, 2, 'el cursor sigue hacia el hueco siguiente');
  });

  it('salta los huecos ya ocupados al avanzar', () => {
    // Con la "u" en 1 y la "o" en 4, escribir en 0 debe llevar el cursor al 2.
    const partida = desde('.u..o');
    const { fila, cursor } = escribirEn(partida, 0, 'p');
    assert.deepEqual(fila, desde('pu..o'));
    assert.equal(cursor, 2);
  });

  it('da la vuelta al llegar al final si quedan huecos delante', () => {
    // Sólo queda libre la casilla 0, y el cursor está al final.
    const partida = desde('.ulso');
    const { cursor } = escribirEn(partida, 4, 'o');
    assert.equal(cursor, 0);
  });

  it('con la fila llena sólo avanza una casilla, sin dar la vuelta', () => {
    // No queda ningún hueco que buscar, así que el cursor se limita a correrse
    // a la derecha para poder seguir sobrescribiendo en orden.
    const { fila, cursor } = escribirEn(desde('pulso'), 2, 'x');
    assert.deepEqual(fila, desde('puxso'));
    assert.equal(cursor, 3);
  });

  it('con la fila llena y el cursor al final, no se sale del tablero', () => {
    const { cursor } = escribirEn(desde('pulso'), 4, 'x');
    assert.equal(cursor, 4);
  });
});

describe('siguienteHueco', () => {
  it('encuentra el primer libre a la derecha', () => {
    assert.equal(siguienteHueco(desde('p.l.o'), 0), 1);
    assert.equal(siguienteHueco(desde('p.l.o'), 1), 3);
  });

  it('vuelve al principio si no queda nada a la derecha', () => {
    assert.equal(siguienteHueco(desde('.ulso'), 4), 0);
  });
});

describe('borrar', () => {
  it('borra la letra de la casilla actual sin mover el cursor', () => {
    const { fila, cursor } = borrarEn(desde('pulso'), 2);
    assert.deepEqual(fila, desde('pu.so'));
    assert.equal(cursor, 2, 'se queda para poder reescribir ahí mismo');
  });

  it('si la casilla está vacía, borra la llena anterior', () => {
    const { fila, cursor } = borrarEn(desde('pu...'), 2);
    assert.deepEqual(fila, desde('p....'));
    assert.equal(cursor, 1);
  });

  it('salta los huecos vacíos al buscar hacia atrás', () => {
    const { fila, cursor } = borrarEn(desde('p....'), 4);
    assert.deepEqual(fila, desde('.....'));
    assert.equal(cursor, 0);
  });

  it('no rompe nada si no hay nada que borrar', () => {
    const { fila, cursor } = borrarEn(filaVacia(), 0);
    assert.deepEqual(fila, filaVacia());
    assert.equal(cursor, 0);
  });
});

describe('enviar la fila', () => {
  it('una fila con huecos no llega a cinco letras', () => {
    assert.equal(texto(desde('p.l.o')), 'plo');
    assert.ok(!filaCompleta(desde('p.l.o')));
  });

  it('una fila llena sí', () => {
    assert.equal(texto(desde('pulso')), 'pulso');
    assert.ok(filaCompleta(desde('pulso')));
  });
});
