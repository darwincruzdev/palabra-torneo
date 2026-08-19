import React from 'react';
import { StyleSheet, Text as TextoNativo, type TextProps } from 'react-native';
import { useFactorTexto } from '../estado/escala';

/**
 * El texto de la app, que obedece al modo de letra grande.
 *
 * Existe porque los estilos se construyen con `StyleSheet.create` al cargar el
 * módulo, una sola vez, así que cambiar la escala no llega hasta ellos. Aquí se
 * multiplica el tamaño ya resuelto, justo antes de dibujar, y con eso vale para
 * toda la app sin tocar ni una hoja de estilos.
 *
 * Un texto sin tamaño propio no se toca: hereda el del texto que lo envuelve,
 * que ya viene multiplicado, y volver a escalarlo lo agrandaría dos veces.
 */
export function Texto({ style, ...resto }: TextProps) {
  const factor = useFactorTexto();
  if (factor === 1) return <TextoNativo style={style} {...resto} />;

  const plano = StyleSheet.flatten(style) ?? {};
  if (typeof plano.fontSize !== 'number') {
    return <TextoNativo style={style} {...resto} />;
  }

  return (
    <TextoNativo
      style={[
        plano,
        {
          fontSize: plano.fontSize * factor,
          ...(typeof plano.lineHeight === 'number'
            ? { lineHeight: plano.lineHeight * factor }
            : null),
        },
      ]}
      {...resto}
    />
  );
}
