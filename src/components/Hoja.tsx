import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { ANCHO_COLUMNA, colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  visible: boolean;
  cerrar: () => void;
  titulo?: string;
  children: React.ReactNode;
};

/**
 * Hoja que sube desde abajo.
 *
 * Los diálogos se dibujan fuera de la columna de la app, así que la hoja se
 * limita al mismo ancho y se centra: en un monitor no se estira de lado a lado.
 */
export function Hoja({ visible, cerrar, titulo, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={estilos.fondo}>
        <Pressable style={estilos.cerrar} onPress={cerrar} accessibilityLabel="Cerrar" />
        <View style={[estilos.hoja, { paddingBottom: Math.max(insets.bottom, espaciado.md) }]}>
          <View style={estilos.asa} />
          {titulo ? (
            <View style={estilos.cabecera}>
              <Texto style={estilos.titulo}>{titulo}</Texto>
              <Pressable onPress={cerrar} hitSlop={10} accessibilityRole="button">
                <Texto style={estilos.equis}>×</Texto>
              </Pressable>
            </View>
          ) : null}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={estilos.contenido}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cerrar: {
    flex: 1,
    width: '100%',
  },
  hoja: {
    width: '100%',
    maxWidth: ANCHO_COLUMNA,
    maxHeight: '88%',
    backgroundColor: colores.superficie,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingTop: espaciado.sm,
  },
  asa: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.borde,
    marginBottom: espaciado.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    marginBottom: espaciado.sm,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  equis: {
    color: colores.textoSuave,
    fontSize: 28,
    lineHeight: 30,
    paddingHorizontal: espaciado.sm,
  },
  contenido: {
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.lg,
    gap: espaciado.sm,
  },
});
