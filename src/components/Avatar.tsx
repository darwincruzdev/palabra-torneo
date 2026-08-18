import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORES_AVATAR, PATRONES_AVATAR, type Avatar as DatosAvatar } from '../game/avatares';
import { colores, radio } from '../tema';

type Props = {
  avatar: DatosAvatar;
  lado?: number;
  seleccionado?: boolean;
};

/** El avatar de un jugador: las fichas del juego, en pequeño. */
export function Avatar({ avatar, lado = 40, seleccionado }: Props) {
  const color = COLORES_AVATAR[avatar.color] ?? COLORES_AVATAR[0];
  const patron = PATRONES_AVATAR[avatar.patron] ?? PATRONES_AVATAR[0];

  const hueco = Math.max(2, Math.round(lado * 0.06));
  const relleno = Math.max(3, Math.round(lado * 0.14));
  const celda = (lado - relleno * 2 - hueco) / 2;

  return (
    <View
      style={[
        estilos.marco,
        {
          width: lado,
          height: lado,
          borderRadius: Math.round(lado * 0.28),
          padding: relleno,
          gap: hueco,
          borderWidth: seleccionado ? 2 : 1,
          borderColor: seleccionado ? colores.texto : colores.borde,
        },
      ]}
    >
      {[0, 1].map((fila) => (
        <View key={fila} style={[estilos.fila, { gap: hueco }]}>
          {[0, 1].map((columna) => {
            const lleno = patron[fila * 2 + columna];
            return (
              <View
                key={columna}
                style={{
                  width: celda,
                  height: celda,
                  borderRadius: Math.max(2, Math.round(celda * 0.25)),
                  backgroundColor: lleno ? color : 'transparent',
                  borderWidth: lleno ? 0 : 1,
                  borderColor: colores.bordeCasilla,
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  marco: {
    backgroundColor: colores.fondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: {
    flexDirection: 'row',
  },
});
