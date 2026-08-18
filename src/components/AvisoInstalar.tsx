import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../tema';

/**
 * ¿Estamos en Safari de iPhone, y todavía no como app de pantalla de inicio?
 *
 * Los de iPhone entran por el navegador, con la barra de direcciones comiéndose
 * media pantalla, y nadie descubre solo lo de "Añadir a pantalla de inicio". Se
 * lo decimos nosotros.
 */
function toca(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent ?? '';
  const esApple = /iPhone|iPad|iPod/i.test(ua);
  if (!esApple) return false;

  // En iOS, cuando ya está añadida a la pantalla de inicio, Safari marca esto.
  const yaInstalada = (navigator as any).standalone === true;
  return !yaInstalada;
}

export function AvisoInstalar() {
  const [oculto, setOculto] = useState(false);
  if (oculto || !toca()) return null;

  return (
    <View style={estilos.caja}>
      <View style={{ flex: 1 }}>
        <Text style={estilos.titulo}>Ponlo como app</Text>
        <Text style={estilos.texto}>
          Dale a <Text style={estilos.negrita}>Compartir</Text> abajo y luego a{' '}
          <Text style={estilos.negrita}>Añadir a pantalla de inicio</Text>. Se abre a
          pantalla completa y con su icono, como cualquier otra app.
        </Text>
      </View>
      <Pressable
        onPress={() => setOculto(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
      >
        <Text style={estilos.cerrar}>✕</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    backgroundColor: 'rgba(90, 169, 230, 0.12)',
    borderWidth: 1,
    borderColor: colores.cursor,
    borderRadius: radio.md,
    padding: espaciado.md,
  },
  titulo: {
    color: colores.cursor,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  texto: {
    color: colores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
  },
  negrita: {
    color: colores.texto,
    fontWeight: '700',
  },
  cerrar: {
    color: colores.textoSuave,
    fontSize: 18,
    fontWeight: '700',
  },
});
