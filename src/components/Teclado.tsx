import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Marca } from '../tipos';
import { colores, espaciado, radio } from '../tema';

export const TECLA_ENTER = 'ENTER';
export const TECLA_BORRAR = 'BORRAR';

const FILAS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  [TECLA_ENTER, 'z', 'x', 'c', 'v', 'b', 'n', 'm', TECLA_BORRAR],
];

const FONDO: Record<Marca, string> = {
  correcta: colores.correcta,
  presente: colores.presente,
  // Una letra descartada se apaga, pero se puede seguir usando: a veces
  // interesa repetir una letra ya gastada para colocar el resto.
  ausente: colores.teclaUsada,
};

type Props = {
  estado: Record<string, Marca>;
  onTecla: (tecla: string) => void;
  deshabilitado?: boolean;
  /** Tecla que se acaba de pulsar en el teclado físico, para iluminarla. */
  destello?: string | null;
};

export function Teclado({ estado, onTecla, deshabilitado, destello }: Props) {
  // Las teclas se reparten el ancho que haya con flex, sin calcular píxeles.
  // Antes se usaba el ancho de la ventana, y dentro de la columna centrada del
  // escritorio eso estiraba el teclado de lado a lado de la pantalla.
  const hueco = 5;
  const margen = espaciado.sm;
  const altoTecla = 52;

  return (
    <View style={[estilos.teclado, { paddingHorizontal: margen, gap: hueco }]}>
      {FILAS.map((fila, i) => (
        <View key={i} style={[estilos.fila, { gap: hueco }]}>
          {fila.map((tecla) => {
            const especial = tecla === TECLA_ENTER || tecla === TECLA_BORRAR;
            const marca = estado[tecla];
            const iluminada = destello === tecla;
            return (
              <Pressable
                key={tecla}
                accessibilityRole="button"
                accessibilityLabel={etiqueta(tecla)}
                disabled={deshabilitado}
                onPress={() => onTecla(tecla)}
                style={({ pressed }) => [
                  estilos.tecla,
                  {
                    // Las especiales algo más anchas, como en cualquier teclado.
                    flex: especial ? 1.5 : 1,
                    height: altoTecla,
                    backgroundColor: marca ? FONDO[marca] : colores.tecla,
                    opacity: pressed || iluminada ? 0.65 : deshabilitado ? 0.5 : 1,
                  },
                  iluminada && estilos.iluminada,
                ]}
              >
                <Text style={estilos.textoTecla}>{simbolo(tecla)}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function simbolo(tecla: string): string {
  if (tecla === TECLA_ENTER) return '✓';
  if (tecla === TECLA_BORRAR) return '⌫';
  return tecla.toUpperCase();
}

function etiqueta(tecla: string): string {
  if (tecla === TECLA_ENTER) return 'Enviar palabra';
  if (tecla === TECLA_BORRAR) return 'Borrar letra';
  return `Letra ${tecla.toUpperCase()}`;
}

const estilos = StyleSheet.create({
  teclado: {
    paddingBottom: espaciado.sm,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tecla: {
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iluminada: {
    borderWidth: 2,
    borderColor: colores.texto,
  },
  textoTecla: {
    color: colores.teclaTexto,
    fontWeight: '700',
    fontSize: 18,
    includeFontPadding: false,
  },
});
