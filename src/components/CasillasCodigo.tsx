import React, { useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colores, fuentes, oscurecer, texto as escala } from '../tema';

type Props = {
  valor: string;
  onChange: (codigo: string) => void;
  /** Si es true, las casillas no se editan: sólo se enseñan. */
  lectura?: boolean;
  /** Cinco para una palabra, seis para un código de invitación. */
  largo?: number;
  /** El código no lleva eñe; una palabra del juego, sí. */
  alfabeto?: 'codigo' | 'palabra';
};

/** Casillas como las del tablero: un carácter cada una. */
export function CasillasCodigo({ valor, onChange, lectura, largo = 6, alfabeto = 'codigo' }: Props) {
  const refs = useRef<(TextInput | null)[]>([]);
  const letras = Array.from({ length: largo }, (_, i) => valor[i] ?? '');
  const filtro = alfabeto === 'palabra' ? /[^A-ZÑ]/g : /[^A-Z0-9]/g;

  function escribir(indice: number, texto: string) {
    const limpio = texto.toUpperCase().replace(filtro, '');
    if (limpio.length > 1) {
      const siguiente = (valor.slice(0, indice) + limpio).replace(filtro, '').slice(0, largo);
      onChange(siguiente);
      refs.current[Math.min(largo - 1, siguiente.length)]?.focus();
      return;
    }
    const arr = letras.slice();
    arr[indice] = limpio;
    onChange(arr.join('').replace(/\s/g, ''));
    if (limpio && indice < largo - 1) refs.current[indice + 1]?.focus();
  }

  return (
    <View style={estilos.fila}>
      {letras.map((letra, i) => (
        <TextInput
          key={i}
          ref={(r) => {
            refs.current[i] = r;
          }}
          value={letra}
          editable={!lectura}
          onChangeText={(texto) => escribir(i, texto)}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !letras[i] && i > 0) {
              const arr = letras.slice();
              arr[i - 1] = '';
              onChange(arr.join(''));
              refs.current[i - 1]?.focus();
            }
          }}
          maxLength={largo}
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel={`Carácter ${i + 1} del código`}
          style={[estilos.casilla, letra ? estilos.llena : null]}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  casilla: {
    width: 44,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colores.bordeCasilla,
    borderBottomColor: colores.borde,
    backgroundColor: colores.superficie,
    color: colores.texto,
    fontFamily: fuentes.ficha,
    fontSize: escala.grande,
    textAlign: 'center',
  },
  llena: {
    borderColor: colores.textoSuave,
    borderBottomColor: oscurecer(colores.tecla),
    backgroundColor: colores.tecla,
  },
});
