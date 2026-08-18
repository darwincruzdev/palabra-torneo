import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { LONGITUD, MAX_INTENTOS } from '../game/constantes';
import { evaluar } from '../game/evaluar';
import { espaciado } from '../tema';
import { Casilla } from './Casilla';

type Props = {
  intentos: string[];
  /** La fila en curso, con un hueco por casilla. */
  borrador: string[];
  /** Casilla donde caerá la próxima letra. */
  cursor: number;
  solucion: string;
  /** Fila que acaba de enviarse: es la única que se destapa con animación. */
  filaAnimada: number | null;
  /** Sube de valor para disparar el temblor cuando la palabra no vale. */
  temblor: number;
  /** Tocar una casilla de la fila en curso mueve ahí el cursor. */
  onCasilla: (indice: number) => void;
  /** Espacio libre medido en pantalla; el tablero se ajusta a él. */
  ancho: number;
  alto: number;
};

export function Tablero({
  intentos,
  borrador,
  cursor,
  solucion,
  filaAnimada,
  temblor,
  onCasilla,
  ancho,
  alto,
}: Props) {
  const sacudida = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (temblor === 0) return;
    sacudida.setValue(0);
    Animated.sequence(
      [1, -1, 0.6, -0.6, 0].map((hacia) =>
        Animated.timing(sacudida, {
          toValue: hacia,
          duration: 55,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [temblor, sacudida]);

  // La casilla se ajusta a lo que quede libre: el tablero encoge cuando se
  // abre el panel de resultado en vez de comerse la cabecera.
  const hueco = espaciado.sm;
  const porAncho = (ancho - hueco * (LONGITUD - 1)) / LONGITUD;
  const porAlto = (alto - hueco * (MAX_INTENTOS - 1)) / MAX_INTENTOS;
  const lado = Math.max(28, Math.floor(Math.min(porAncho, porAlto)));

  return (
    <View style={estilos.tablero}>
      {Array.from({ length: MAX_INTENTOS }, (_, fila) => {
        const enviada = fila < intentos.length;
        const esFilaActual = fila === intentos.length;
        const marcas = enviada ? evaluar(intentos[fila], solucion) : null;

        const desplazamiento = esFilaActual
          ? sacudida.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] })
          : 0;

        return (
          <Animated.View
            key={fila}
            style={[
              estilos.fila,
              { gap: hueco, transform: [{ translateX: desplazamiento }] },
            ]}
          >
            {Array.from({ length: LONGITUD }, (_, col) => {
              const letra = enviada
                ? (intentos[fila][col] ?? '')
                : esFilaActual
                  ? (borrador[col] ?? '')
                  : '';

              const casilla = (
                <Casilla
                  lado={lado}
                  letra={letra}
                  marca={marcas ? marcas[col] : null}
                  indice={col}
                  animar={fila === filaAnimada}
                  activa={esFilaActual && col === cursor}
                />
              );

              // Sólo se puede tocar la fila que se está escribiendo: las ya
              // enviadas no se editan.
              if (!esFilaActual) return <View key={col}>{casilla}</View>;

              return (
                <Pressable
                  key={col}
                  onPress={() => onCasilla(col)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: col === cursor }}
                  accessibilityLabel={
                    letra
                      ? `Casilla ${col + 1}, letra ${letra.toUpperCase()}`
                      : `Casilla ${col + 1}, vacía`
                  }
                >
                  {casilla}
                </Pressable>
              );
            })}
          </Animated.View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  tablero: {
    gap: espaciado.sm,
    alignItems: 'center',
  },
  fila: {
    flexDirection: 'row',
  },
});
