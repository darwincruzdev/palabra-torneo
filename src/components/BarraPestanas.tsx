import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { IconoCalendario, IconoCasa, IconoJugar, IconoTrofeo } from './Iconos';
import { fechaJuego } from '../game/fecha';
import { colorDeTorneo } from '../game/emblema';
import { faltaPorJugar } from '../game/pendientes';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, oscurecer, texto as escala } from '../tema';

const ETIQUETA: Record<string, string> = {
  Inicio: 'Inicio',
  Tabla: 'Tabla',
  Jugar: 'Jugar',
  Jornadas: 'Jornadas',
};

/**
 * Barra del torneo en el que ya se ha entrado.
 *
 * El color de arriba es el del torneo. JUGAR abre la palabra de ese torneo,
 * no elige otro. El punto rojo sale sólo si la de hoy, aquí, sigue pendiente.
 */
export function BarraPestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { jornadas, uid, torneoCabecera } = useApp();
  const hoy = fechaJuego();
  const acento = torneoCabecera ? colorDeTorneo(torneoCabecera.id) : colores.acento;
  const pendienteAqui = Boolean(
    torneoCabecera && uid && faltaPorJugar(jornadas[torneoCabecera.id] ?? [], uid, hoy)
  );

  function pulsar(nombre: string, indice: number) {
    const evento = navigation.emit({
      type: 'tabPress',
      target: state.routes[indice].key,
      canPreventDefault: true,
    });
    if (state.index === indice || evento.defaultPrevented) return;
    // El destino tiene que ser este navegador de pestañas. Sin `target`,
    // `navigate` sube al de arriba y «Jugar» no es una pantalla de esa pila.
    navigation.dispatch({
      ...CommonActions.navigate(nombre),
      target: state.key,
    });
  }

  return (
    <View
      style={[
        estilos.barra,
        { paddingBottom: Math.max(insets.bottom, espaciado.sm), borderTopColor: acento },
      ]}
    >
      {state.routes.map((ruta, indice) => {
        const activa = state.index === indice;
        const color = ruta.name === 'Jugar' ? colores.correcta : activa ? acento : colores.textoTenue;
        if (ruta.name === 'Jugar') {
          return (
            <Pressable
              key={ruta.key}
              onPress={() => pulsar(ruta.name, indice)}
              accessibilityRole="button"
              accessibilityLabel={pendienteAqui ? 'Jugar, te falta la de hoy' : 'Jugar'}
              style={estilos.jugar}
            >
              <View style={estilos.ficha}>
                <IconoJugar />
                {pendienteAqui && (
                  <View style={estilos.badge}>
                    <Texto style={estilos.badgeTexto}>1</Texto>
                  </View>
                )}
              </View>
              <Texto style={[estilos.etiqueta, { color }]}>JUGAR</Texto>
            </Pressable>
          );
        }
        return (
          <Pressable
            key={ruta.key}
            onPress={() => pulsar(ruta.name, indice)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            style={estilos.pestana}
          >
            {icono(ruta.name, color)}
            <Texto style={[estilos.etiqueta, { color }]}>{ETIQUETA[ruta.name]}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

function icono(nombre: string, color: string) {
  if (nombre === 'Inicio') return <IconoCasa color={color} />;
  if (nombre === 'Tabla') return <IconoTrofeo color={color} />;
  return <IconoCalendario color={color} />;
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colores.fondo,
    borderTopWidth: 3,
    borderTopColor: colores.acento,
    paddingTop: espaciado.xs,
  },
  pestana: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  jugar: {
    flex: 1,
    alignItems: 'center',
    marginTop: -18,
  },
  ficha: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colores.correcta,
    borderBottomWidth: 5,
    borderBottomColor: oscurecer(colores.correcta),
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colores.peligro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexto: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: 11,
    lineHeight: 14,
  },
  etiqueta: {
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
    marginTop: 2,
  },
});
