import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { IconoCalendario, IconoCasa, IconoJugar, IconoPersona, IconoTrofeo } from './Iconos';
import { fechaJuego } from '../game/fecha';
import { faltaPorJugar } from '../game/pendientes';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, oscurecer, texto as escala } from '../tema';

const ETIQUETA: Record<string, string> = {
  Inicio: 'Inicio',
  Tabla: 'Tabla',
  Jugar: 'Jugar',
  Jornadas: 'Jornadas',
  Perfil: 'Perfil',
};

/**
 * Barra fija de cinco pestañas.
 *
 * JUGAR va en el centro, en la ficha verde del icono, con la cuenta de torneos
 * que todavía no se han jugado hoy.
 */
export function BarraPestanas({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { torneos, jornadas, uid, torneoCabecera, activo, elegirTorneo } = useApp();
  const hoy = fechaJuego();
  const pendientes = uid
    ? torneos.filter((t) => faltaPorJugar(jornadas[t.id] ?? [], uid, hoy)).length
    : 0;

  function pulsar(nombre: string, indice: number) {
    // JUGAR abre la palabra del torneo de la cabecera, no La diaria.
    if (nombre === 'Jugar' && torneoCabecera && activo.tipo !== 'torneo') {
      elegirTorneo(torneoCabecera.id);
    }
    const evento = navigation.emit({
      type: 'tabPress',
      target: state.routes[indice].key,
      canPreventDefault: true,
    });
    if (!evento.defaultPrevented) navigation.navigate(nombre);
  }

  return (
    <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, espaciado.sm) }]}>
      {state.routes.map((ruta, indice) => {
        const activa = state.index === indice;
        const color = ruta.name === 'Jugar' ? colores.correcta : activa ? colores.acento : colores.textoTenue;
        if (ruta.name === 'Jugar') {
          return (
            <Pressable
              key={ruta.key}
              onPress={() => pulsar(ruta.name, indice)}
              accessibilityRole="button"
              accessibilityLabel={
                pendientes > 0 ? `Jugar, ${pendientes} pendientes` : 'Jugar'
              }
              style={estilos.jugar}
            >
              <View style={estilos.ficha}>
                <IconoJugar />
                {pendientes > 0 && (
                  <View style={estilos.badge}>
                    <Texto style={estilos.badgeTexto}>{pendientes > 9 ? '9+' : pendientes}</Texto>
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
