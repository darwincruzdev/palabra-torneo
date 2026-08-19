import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from './Texto';
import { dibujarBotonGoogle } from '../firebase/googleWeb';
import { colores, espaciado, fuentes, texto } from '../tema';

type Props = {
  clientId: string;
  onIdToken: (idToken: string) => void;
};

/**
 * El botón oficial de Google, que lo dibuja su propia librería.
 *
 * Tiene que ser el suyo y no uno nuestro: la librería necesita controlar el
 * elemento para poder devolver el identificador sin abrir ninguna ventana.
 */
export function BotonGoogleWeb({ clientId, onIdToken }: Props) {
  const hueco = useRef<View | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // En react-native-web la referencia de un View es el propio nodo del DOM.
    const nodo = hueco.current as unknown as HTMLElement | null;
    if (!nodo) return;

    dibujarBotonGoogle(nodo, clientId, onIdToken).catch(() => {
      setError('No se ha podido cargar el botón de Google. Recarga la página.');
    });
  }, [clientId, onIdToken]);

  return (
    <View style={estilos.zona}>
      <View ref={hueco} style={estilos.hueco} />
      {error && <Texto style={estilos.error}>{error}</Texto>}
    </View>
  );
}

const estilos = StyleSheet.create({
  zona: {
    alignItems: 'center',
    gap: espaciado.sm,
    minHeight: 44,
  },
  hueco: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: texto.pequeno,
    textAlign: 'center',
  },
});
