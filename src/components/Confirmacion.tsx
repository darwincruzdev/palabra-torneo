import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { Boton } from './ui';
import { ANCHO_COLUMNA, colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  visible: boolean;
  titulo: string;
  /** Qué va a pasar exactamente. Aquí no se ahorran palabras. */
  mensaje: string;
  textoConfirmar: string;
  /** Para lo que no tiene vuelta atrás: el botón sale en rojo. */
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/**
 * El "¿seguro?" de la app.
 *
 * Existe porque `Alert.alert` es un diálogo del sistema que react-native-web no
 * implementa: en el navegador no salía nada y el botón de salir del torneo
 * parecía roto. Éste se dibuja con las mismas piezas que el resto y funciona
 * igual en la web que en el móvil.
 */
export function Confirmacion({
  visible,
  titulo,
  mensaje,
  textoConfirmar,
  peligro,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      {/* Tocar fuera cancela, que es lo que espera todo el mundo. */}
      <Pressable style={estilos.fondo} onPress={onCancelar}>
        {/* Y tocar dentro no, de ahí el Pressable vacío que se come el toque. */}
        <Pressable style={estilos.panel} onPress={() => {}}>
          <Texto style={estilos.titulo}>{titulo}</Texto>
          <Texto style={estilos.mensaje}>{mensaje}</Texto>

          <View style={estilos.botones}>
            <Boton
              titulo="Cancelar"
              variante="secundario"
              onPress={onCancelar}
              estilo={{ flex: 1 }}
            />
            <Boton
              titulo={textoConfirmar}
              variante={peligro ? 'peligro' : 'principal'}
              onPress={onConfirmar}
              estilo={{ flex: 1 }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  panel: {
    // Los diálogos se dibujan fuera de la columna centrada, así que el tope de
    // ancho hay que ponérselo aquí.
    width: '100%',
    maxWidth: ANCHO_COLUMNA,
    alignSelf: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    gap: espaciado.sm,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mensaje: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    lineHeight: 22,
    marginBottom: espaciado.sm,
  },
  botones: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
});
