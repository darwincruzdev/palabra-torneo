import React, { useEffect } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import {
  AVATARES_ESPECIALES,
  COLORES_AVATAR,
  PATRONES_AVATAR,
  type Avatar as DatosAvatar,
} from '../game/avatares';
import type { Marco } from '../game/rangos';
import { colores, radio } from '../tema';

type Props = {
  avatar: DatosAvatar;
  lado?: number;
  seleccionado?: boolean;
  /**
   * El marco que da el rango, si lleva alguno.
   *
   * Va aparte del avatar a propósito: sale de las copas, no de lo que haya
   * elegido, así que se ve también sobre un avatar corriente.
   */
  marco?: Marco;
};

/**
 * Un solo reloj para todos los avatares animados de la pantalla.
 *
 * Con un `Animated.Value` por avatar, una tabla de veinte jugadores llevaría
 * veinte animaciones corriendo a la vez. Con este, lleva una: cada ficha
 * interpola del mismo reloj con su propio desfase, así que da igual cuántos
 * avatares haya en pantalla. Y como van sincronizados, además queda mejor.
 *
 * Arranca la primera vez que alguien lo pide y ya no se para: pararlo exigiría
 * contar cuántos avatares siguen vivos, y un `timing` en bucle con el driver
 * nativo no cuesta nada aunque no se vea.
 */
const reloj = new Animated.Value(0);
let relojEnMarcha = false;

function arrancarReloj() {
  if (relojEnMarcha) return;
  relojEnMarcha = true;
  Animated.loop(
    Animated.timing(reloj, {
      toValue: 1,
      duration: 2600,
      easing: Easing.linear,
      /**
       * En el móvil el driver nativo saca la animación del hilo de JavaScript,
       * que es lo que hace que una tabla llena de avatares no vaya a tirones
       * mientras se desplaza. En web no lo gasta: ahí las interpolaciones
       * nativas no llegan a tocar el DOM y los avatares se quedan quietos.
       */
      useNativeDriver: Platform.OS !== 'web',
    })
  ).start();
}

/** Las cuatro fichas, en el orden en que se recorren para el efecto de giro. */
const VUELTA = [0, 1, 3, 2];

/**
 * Cómo se mueve cada ficha, según el efecto y su sitio en la rejilla.
 *
 * Todo sale de un reloj que va de 0 a 1 sin parar. El desfase es lo único que
 * cambia de una ficha a otra: con él, el mismo reloj pinta un latido a la vez o
 * una ola que recorre el cuadrado.
 */
function movimientoDe(animacion: string, indice: number) {
  if (animacion === 'latido') {
    return {
      transform: [
        {
          scale: reloj.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1.14, 1],
          }),
        },
      ],
    };
  }

  if (animacion === 'cascada') {
    const desfase = indice / 4;
    const puntos = [0, 0.25, 0.5, 0.75, 1].map((p) => (p + desfase) % 1);
    return {
      opacity: reloj.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: puntos.map((p) => 0.45 + 0.55 * Math.abs(Math.sin(p * Math.PI))),
      }),
    };
  }

  if (animacion === 'giro') {
    // La ficha crece cuando el reloj pasa por su cuarto de vuelta.
    const turno = VUELTA.indexOf(indice);
    const centro = turno / 4;
    const escalaEn = (p: number) => {
      const distancia = Math.min(Math.abs(p - centro), 1 - Math.abs(p - centro));
      return 1 + 0.22 * Math.max(0, 1 - distancia * 4);
    };
    const muestras = [0, 0.25, 0.5, 0.75, 1];
    return {
      transform: [
        {
          scale: reloj.interpolate({
            inputRange: muestras,
            outputRange: muestras.map(escalaEn),
          }),
        },
      ],
    };
  }

  return {};
}

/** El avatar de un jugador: las fichas del juego, en pequeño. */
export function Avatar({ avatar, lado = 40, seleccionado, marco = null }: Props) {
  const especial =
    avatar.especial !== undefined ? AVATARES_ESPECIALES[avatar.especial] : undefined;
  const animacion = especial?.animacion ?? 'ninguna';

  useEffect(() => {
    if (animacion !== 'ninguna') arrancarReloj();
  }, [animacion]);

  const patron = PATRONES_AVATAR[especial ? especial.patron : avatar.patron] ?? PATRONES_AVATAR[0];
  const colorNormal = COLORES_AVATAR[avatar.color] ?? COLORES_AVATAR[0];

  const hueco = Math.max(2, Math.round(lado * 0.06));
  const relleno = Math.max(3, Math.round(lado * 0.14));
  const celda = (lado - relleno * 2 - hueco) / 2;

  const conAura = marco === 'aura' || (marco === null && especial?.aura === true);
  const bordeDelMarco =
    marco === 'oro' ? colores.oro : conAura ? colores.acento : null;

  const cuerpo = (
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
          borderColor: seleccionado
            ? colores.texto
            : bordeDelMarco ?? colores.borde,
        },
      ]}
    >
      {[0, 1].map((fila) => (
        <View key={fila} style={[estilos.fila, { gap: hueco }]}>
          {[0, 1].map((columna) => {
            const indice = fila * 2 + columna;
            const lleno = patron[indice];
            const color = especial ? especial.tintas[indice] : colorNormal;
            const forma = {
              width: celda,
              height: celda,
              borderRadius: Math.max(2, Math.round(celda * 0.25)),
              backgroundColor: lleno ? color : 'transparent',
              borderWidth: lleno ? 0 : 1,
              borderColor: colores.bordeCasilla,
            };
            if (!lleno || animacion === 'ninguna') {
              return <View key={columna} style={forma} />;
            }
            return (
              <Animated.View
                key={columna}
                style={[forma, movimientoDe(animacion, indice)]}
              />
            );
          })}
        </View>
      ))}
    </View>
  );

  if (!bordeDelMarco) return cuerpo;

  /**
   * El halo del rango, detrás del avatar.
   *
   * Es un cuadrado algo mayor con el color del marco a media opacidad. No lleva
   * sombra ni desenfoque porque en Android las sombras de verdad cuestan, y en
   * una tabla de veinte jugadores se nota.
   */
  return (
    <View style={estilos.conMarco}>
      <View
        style={[
          estilos.halo,
          {
            width: lado + 8,
            height: lado + 8,
            borderRadius: Math.round((lado + 8) * 0.3),
            borderColor: bordeDelMarco,
            opacity: marco === 'oro' ? 0.9 : 0.5,
          },
        ]}
      />
      {cuerpo}
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
  conMarco: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    borderWidth: 2,
  },
});
