import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { colores, espaciado, fuentes, rotulo, texto as escala } from '../tema';

type Props = {
  titulo: string;
  /** Enlace de la derecha, en mayúsculas: "VER COMPLETA". */
  accion?: string;
  onAccion?: () => void;
};

/** Rótulo de sección y, si cabe, la acción que abre el resto. */
export function Seccion({ titulo, accion, onAccion }: Props) {
  return (
    <View style={estilos.fila}>
      <Texto style={estilos.titulo}>{titulo}</Texto>
      {accion && onAccion ? (
        <Pressable onPress={onAccion} hitSlop={8} accessibilityRole="button">
          <Texto style={estilos.accion}>{accion}</Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  titulo: {
    ...(rotulo as object),
    flex: 1,
  },
  accion: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
