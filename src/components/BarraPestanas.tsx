import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { IconoCalendario, IconoJugar, IconoPersona, IconoTrofeo } from './Iconos';
import { fechaJuego } from '../game/fecha';
import { faltaPorJugar } from '../game/pendientes';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

const ETIQUETA: Record<string, string> = {
  Jugar: 'Jugar',
  Tabla: 'Tabla',
  Jornadas: 'Jornadas',
  Perfil: 'Perfil',
};

/**
 * Barra de la app: Jugar (la lista de torneos), Tabla, Jornadas y Perfil.
 *
 * El punto de Jugar cuenta los torneos en los que hoy todavía no se ha jugado.
 */
export function BarraPestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { torneos, jornadas, uid } = useApp();
  const hoy = fechaJuego();
  const pendientes = uid
    ? torneos.filter((t) => faltaPorJugar(jornadas[t.id] ?? [], uid, hoy)).length
    : 0;

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
    <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, espaciado.sm) }]}>
      {state.routes.map((ruta, indice) => {
        const activa = state.index === indice;
        const color = activa ? colores.acento : colores.textoTenue;
        return (
          <Pressable
            key={ruta.key}
            onPress={() => pulsar(ruta.name, indice)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={
              ruta.name === 'Jugar' && pendientes > 0
                ? `Jugar, ${pendientes} pendientes`
                : ETIQUETA[ruta.name]
            }
            style={estilos.pestana}
          >
            <View>
              {icono(ruta.name, ruta.name === 'Jugar' ? colores.correcta : color)}
              {ruta.name === 'Jugar' && pendientes > 0 && (
                <View style={estilos.badge}>
                  <Texto style={estilos.badgeTexto}>{pendientes > 9 ? '9+' : pendientes}</Texto>
                </View>
              )}
            </View>
            <Texto style={[estilos.etiqueta, { color: ruta.name === 'Jugar' && activa ? colores.correcta : color }]}>
              {ETIQUETA[ruta.name]}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

function icono(nombre: string, color: string) {
  if (nombre === 'Jugar') return <IconoJugar tamano={22} />;
  if (nombre === 'Tabla') return <IconoTrofeo color={color} />;
  if (nombre === 'Jornadas') return <IconoCalendario color={color} />;
  return <IconoPersona color={color} />;
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colores.fondo,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingTop: espaciado.xs,
  },
  pestana: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 6,
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
