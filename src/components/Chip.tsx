import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Texto } from './Texto';
import { colores, fuentes, texto as escala } from '../tema';

type Props = {
  etiqueta: string;
  color?: string;
  activo?: boolean;
  onPress?: () => void;
};

/** Aviso de una línea. Al tocarlo se abre el detalle, que vive fuera. */
export function Chip({ etiqueta, color = colores.acento, activo, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        estilos.chip,
        {
          borderColor: color,
          backgroundColor: activo ? `${color}22` : 'transparent',
        },
      ]}
    >
      <Texto style={[estilos.texto, { color }]} numberOfLines={1}>
        {etiqueta}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  texto: {
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
  },
});
