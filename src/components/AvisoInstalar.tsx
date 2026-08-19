import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from './Texto';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

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
        <Texto style={estilos.titulo}>Ponlo como app</Texto>
        <Texto style={estilos.texto}>
          Dale a <Texto style={estilos.negrita}>Compartir</Texto> abajo y luego a{' '}
          <Texto style={estilos.negrita}>Añadir a pantalla de inicio</Texto>. Se abre a
          pantalla completa y con su icono, como cualquier otra app.
        </Texto>
      </View>
      <Pressable
        onPress={() => setOculto(true)}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
      >
        <Texto style={estilos.cerrar}>✕</Texto>
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
    borderColor: colores.acento,
    borderRadius: radio.md,
    padding: espaciado.md,
  },
  titulo: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  texto: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
  },
  negrita: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
  },
  cerrar: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
  },
});
