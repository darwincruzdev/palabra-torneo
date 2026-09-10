import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { colores, espaciado, radio } from '../tema';

/**
 * La cuadrícula de colores de una partida: una fila por intento.
 *
 * Se guarda con cada resultado como emojis (🟩🟨⬛), que es lo que se comparte
 * por WhatsApp, y sirve igual para ver por dónde fue cada uno sin destripar las
 * palabras que escribió.
 */
export function RejillaPatron({ patron }: { patron: string }) {
  const filas = patron.split('\n').filter((f) => f.trim().length > 0);
  if (filas.length === 0) return null;

  return (
    <View style={estilos.rejilla}>
      {filas.map((fila, i) => (
        <Texto key={i} style={estilos.fila}>
          {fila}
        </Texto>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  rejilla: {
    alignSelf: 'flex-start',
    backgroundColor: colores.fondo,
    borderRadius: radio.sm,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
    marginTop: espaciado.xs,
    marginBottom: espaciado.sm,
  },
  fila: {
    fontSize: 15,
    // Las líneas van pegadas para que se lea como una cuadrícula y no como una
    // lista de renglones sueltos.
    lineHeight: 18,
    letterSpacing: 1,
  },
});
