import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colores, espaciado, radio } from '../tema';

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'principal' | 'secundario' | 'peligro';
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
};

export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  cargando,
  deshabilitado,
  estilo,
}: BotonProps) {
  const inactivo = deshabilitado || cargando;
  const fondo =
    variante === 'principal'
      ? colores.correcta
      : variante === 'peligro'
        ? 'transparent'
        : colores.superficie;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.boton,
        {
          backgroundColor: fondo,
          borderColor: variante === 'peligro' ? colores.peligro : colores.borde,
          opacity: pressed ? 0.7 : inactivo ? 0.45 : 1,
        },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} />
      ) : (
        <Text
          style={[
            estilos.textoBoton,
            variante === 'peligro' && { color: colores.peligro },
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

export function Tarjeta({
  children,
  estilo,
}: {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
}) {
  return <View style={[estilos.tarjeta, estilo]}>{children}</View>;
}

export function Titulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Sutil({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.sutil}>{children}</Text>;
}

const estilos = StyleSheet.create({
  boton: {
    paddingVertical: 14,
    paddingHorizontal: espaciado.lg,
    borderRadius: radio.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBoton: {
    color: colores.texto,
    fontWeight: '700',
    fontSize: 16,
  },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
  },
  titulo: {
    color: colores.texto,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: espaciado.sm,
  },
  sutil: {
    color: colores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
  },
});
