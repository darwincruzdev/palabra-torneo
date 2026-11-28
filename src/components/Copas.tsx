import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { IconoTrofeo } from './Iconos';
import { colores, fuentes } from '../tema';

type Props = {
  /** Trofeos ya ganados. Sale de `trofeosPorJugador`, no de un contador aparte. */
  copas: number;
  tamano?: number;
};

/**
 * Las copas de alguien, para ponerlas junto a su nombre.
 *
 * Con cero no se pinta nada, ni un hueco: la tabla de un torneo nuevo no tiene
 * por qu\u00e9 ense\u00f1ar seis ceros.
 *
 * El icono es el mismo trofeo de la pesta\u00f1a Tabla, en peque\u00f1o, en vez del emoji
 * que hab\u00eda antes. Un emoji lo dibuja cada sistema a su manera y en Android se
 * ve\u00eda m\u00e1s p\u00e1lido que el resto de la fila; al lado de otros tres distintivos, el
 * n\u00famero de copas era justo el que menos se distingu\u00eda, que era lo contrario de
 * lo que se buscaba.
 */
export function Copas({ copas, tamano = 15 }: Props) {
  if (copas <= 0) return null;
  return (
    <View
      style={estilos.zona}
      accessibilityLabel={copas === 1 ? '1 copa' : `${copas} copas`}
    >
      <IconoTrofeo color={colores.oro} tamano={tamano} />
      <Texto style={[estilos.numero, { fontSize: tamano - 2 }]}>{copas}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  zona: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  numero: { color: colores.oro, fontFamily: fuentes.titularNegro },
});
