import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { colores, fuentes, oscurecer } from '../tema';

type Props = {
  /** Lo que se lee dentro. Vacío: una ficha lisa. */
  letra?: string;
  color?: string;
  lado?: number;
  /** Color del texto. Por defecto, el del tablero. */
  tinta?: string;
};

/**
 * Una ficha con canto, como las del icono.
 *
 * El canto es un borde inferior más oscuro: en todas las plataformas se ve
 * igual, sin depender de sombras que la web y el móvil pintan distinto.
 */
export function Ficha({
  letra,
  color = colores.correcta,
  lado = 36,
  tinta = colores.texto,
}: Props) {
  const radioFicha = Math.max(4, Math.round(lado * 0.18));
  return (
    <View
      style={[
        estilos.ficha,
        {
          width: lado,
          height: lado,
          borderRadius: radioFicha,
          backgroundColor: color,
          borderBottomColor: oscurecer(color),
          borderBottomWidth: Math.max(3, Math.round(lado * 0.1)),
        },
      ]}
    >
      {letra ? (
        <Texto
          style={{
            color: tinta,
            fontFamily: fuentes.ficha,
            fontSize: lado * 0.46,
            lineHeight: lado * 0.52,
          }}
        >
          {letra}
        </Texto>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  ficha: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
