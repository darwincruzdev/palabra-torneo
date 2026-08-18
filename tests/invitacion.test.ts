import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { codigoDesdeUrl } from '../src/game/invitacion';

describe('leer el código de una invitación', () => {
  it('lo saca de un enlace https', () => {
    assert.equal(codigoDesdeUrl('https://ejemplo.com/unirse.html?t=ABC123'), 'ABC123');
  });

  it('lo saca del esquema propio de la app', () => {
    assert.equal(codigoDesdeUrl('palabratorneo://unirse?t=ABC123'), 'ABC123');
  });

  it('lo pasa a mayúsculas', () => {
    assert.equal(codigoDesdeUrl('https://ejemplo.com/unirse.html?t=abc123'), 'ABC123');
  });

  it('lo encuentra aunque venga con más parámetros detrás', () => {
    assert.equal(
      codigoDesdeUrl('https://ejemplo.com/unirse.html?utm=whatsapp&t=ABC123#top'),
      'ABC123'
    );
  });

  it('descarta lo que no es un código de seis caracteres', () => {
    assert.equal(codigoDesdeUrl('https://ejemplo.com/unirse.html?t=ABC'), null);
    assert.equal(codigoDesdeUrl('https://ejemplo.com/unirse.html?t=ABC1234'), null);
    assert.equal(codigoDesdeUrl('https://ejemplo.com/unirse.html?t=ABC-12'), null);
  });

  it('devuelve null cuando la URL no es una invitación', () => {
    assert.equal(codigoDesdeUrl('https://ejemplo.com/'), null);
    assert.equal(codigoDesdeUrl(''), null);
    assert.equal(codigoDesdeUrl(null), null);
    assert.equal(codigoDesdeUrl(undefined), null);
  });
});
