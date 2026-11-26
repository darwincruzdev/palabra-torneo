import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { Emblema } from './Emblema';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  nombre: string;
  /** Id para el color del emblema. Sin id, no hay ficha: es La diaria o nadie. */
  torneoId?: string | null;
  detalle?: string;
  onPress?: () => void;
  derecha?: React.ReactNode;
};

/**
 * La cabecera de todas las pantallas del torneo.
 *
 * Tocar el nombre abre Mis torneos, que es la única forma de cambiar de grupo.
 */
export function CabeceraTorneo({ nombre, torneoId, detalle, onPress, derecha }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[estilos.barra, { paddingTop: insets.top + espaciado.xs }]}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`Torneo activo: ${nombre}. Tocar para cambiar`}
        style={estilos.identidad}
      >
        {torneoId ? <Emblema nombre={nombre} id={torneoId} lado={36} /> : null}
        <View style={estilos.textos}>
          <Texto style={estilos.nombre} numberOfLines={1}>
            {nombre} {onPress ? <Texto style={estilos.flecha}>▾</Texto> : ''}
          </Texto>
          {detalle ? (
            <Texto style={estilos.detalle} numberOfLines={1}>
              {detalle}
            </Texto>
          ) : null}
        </View>
      </Pressable>
      {derecha ? <View style={estilos.derecha}>{derecha}</View> : null}
    </View>
  );
}

/** Botón redondo de la cabecera: compartir, trofeo, ajustes. */
export function BotonCabecera({
  onPress,
  etiqueta,
  children,
}: {
  onPress: () => void;
  etiqueta: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [estilos.boton, pressed && { opacity: 0.6 }]}
    >
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    backgroundColor: colores.fondo,
  },
  identidad: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  textos: { flex: 1 },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  flecha: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  detalle: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: 1,
  },
  derecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
  },
  boton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficie,
  },
});
