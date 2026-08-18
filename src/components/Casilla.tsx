import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import type { Marca } from '../tipos';
import { colores, fuentes, radio } from '../tema';

type Props = {
  letra: string;
  marca: Marca | null;
  /** Posición dentro de la fila: retrasa el giro para que se destapen en cascada. */
  indice: number;
  /** Sólo la fila recién enviada se anima; las anteriores ya salen pintadas. */
  animar: boolean;
  /** Casilla donde caerá la próxima letra. */
  activa?: boolean;
  lado: number;
};

const FONDO: Record<Marca, string> = {
  correcta: colores.correcta,
  presente: colores.presente,
  ausente: colores.ausente,
};

const RETARDO = 240;
const GIRO = 220;

export function Casilla({ letra, marca, indice, animar, activa, lado }: Props) {
  const giro = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  // Durante el giro la casilla no cambia de color hasta estar de canto.
  const [colorVisible, setColorVisible] = useState<Marca | null>(
    animar ? null : marca
  );

  useEffect(() => {
    if (!marca) {
      setColorVisible(null);
      giro.setValue(0);
      return;
    }
    if (!animar) {
      setColorVisible(marca);
      giro.setValue(0);
      return;
    }
    setColorVisible(null);
    giro.setValue(0);
    const animacion = Animated.sequence([
      Animated.delay(indice * RETARDO),
      Animated.timing(giro, { toValue: 1, duration: GIRO, useNativeDriver: true }),
      Animated.timing(giro, { toValue: 2, duration: GIRO, useNativeDriver: true }),
    ]);
    const reloj = setTimeout(() => setColorVisible(marca), indice * RETARDO + GIRO);
    animacion.start();
    return () => {
      clearTimeout(reloj);
      animacion.stop();
    };
  }, [marca, animar, indice, giro]);

  // Pequeño rebote al escribir, para que se note que la letra ha entrado.
  useEffect(() => {
    if (!letra || marca) return;
    pop.setValue(0.85);
    Animated.spring(pop, {
      toValue: 1,
      friction: 4,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }, [letra, marca, pop]);

  const rotateX = giro.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '90deg', '0deg'],
  });

  const pintada = colorVisible !== null;

  return (
    <Animated.View
      style={[
        estilos.casilla,
        {
          width: lado,
          height: lado,
          borderColor: pintada
            ? FONDO[colorVisible]
            : activa
              ? colores.acento
              : letra
                ? colores.textoSuave
                : colores.bordeCasilla,
          backgroundColor: pintada ? FONDO[colorVisible] : 'transparent',
          transform: [{ rotateX }, { scale: pop }],
        },
      ]}
    >
      <Text style={[estilos.letra, { fontSize: lado * 0.5 }]}>
        {letra.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  casilla: {
    borderWidth: 2,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letra: {
    color: colores.texto,
    fontFamily: fuentes.ficha,
    includeFontPadding: false,
    // La condensada sube mucho: sin esto las letras bailan dentro de la casilla.
    textAlignVertical: 'center',
  },
});
