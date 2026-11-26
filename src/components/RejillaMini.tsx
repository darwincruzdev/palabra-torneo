import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colores } from '../tema';

const COLOR: Record<string, string> = {
  '🟩': colores.correcta,
  '🟨': colores.presente,
  '⬛': colores.ausente,
  '⬜': colores.ausente,
};

/**
 * La partida de alguien, en fichas pequeñas y sin letras.
 *
 * El patrón llega como emojis porque es lo que se guarda y se comparte.
 */
export function RejillaMini({ patron, lado = 8 }: { patron: string; lado?: number }) {
  const filas = patron
    .split('\n')
    .map((fila) => [...fila].filter((casilla) => COLOR[casilla]))
    .filter((fila) => fila.length > 0);
  if (filas.length === 0) return null;

  return (
    <View style={estilos.rejilla}>
      {filas.map((fila, i) => (
        <View key={i} style={estilos.fila}>
          {fila.map((casilla, j) => (
            <View
              key={j}
              style={{
                width: lado,
                height: lado,
                borderRadius: 2,
                backgroundColor: COLOR[casilla],
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  rejilla: { gap: 2 },
  fila: { flexDirection: 'row', gap: 2 },
});
