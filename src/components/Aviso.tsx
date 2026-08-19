import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
} from 'react-native';
import { Texto } from './Texto';
import { colores, fuentes, radio, texto } from '../tema';

type Props = {
  mensaje: string | null;
};

/** Mensaje flotante sobre el tablero: "no está en la lista", "¡bien!", etc. */
export function Aviso({ mensaje }: Props) {
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacidad, {
      toValue: mensaje ? 1 : 0,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [mensaje, opacidad]);

  if (!mensaje) return null;

  return (
    <Animated.View style={[estilos.caja, { opacity: opacidad }]} pointerEvents="none">
      <Texto style={estilos.texto}>{mensaje}</Texto>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    alignSelf: 'center',
    backgroundColor: colores.texto,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radio.sm,
  },
  texto: {
    color: colores.fondo,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: texto.normal,
    textAlign: 'center',
  },
});
