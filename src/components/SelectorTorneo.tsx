import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from './Texto';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import {
  ANCHO_COLUMNA,
  colores,
  espaciado,
  fuentes,
  radio,
  texto as escala,
} from '../tema';

type Props = {
  visible: boolean;
  cerrar: () => void;
  irATorneos: () => void;
  /** En la pantalla de modo el juego libre ya tiene su propio botón. */
  ocultarLibre?: boolean;
  /** Se llama después de elegir, para poder saltar al tablero. */
  alElegir?: () => void;
};

/**
 * Elegir en qué torneo se juega. Cada torneo tiene su propia palabra, así que
 * cambiar de torneo es cambiar de partida, no de pantalla.
 */
export function SelectorTorneo({
  visible,
  cerrar,
  irATorneos,
  ocultarLibre,
  alElegir,
}: Props) {
  const { torneos, activo, elegirTorneo, penalizadoEn } = useApp();

  function elegir(id: string) {
    elegirTorneo(id);
    cerrar();
    alElegir?.();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable style={estilos.fondo} onPress={cerrar}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          <Texto style={estilos.titulo}>¿A qué torneo juegas?</Texto>
          <Texto style={estilos.explicacion}>
            Cada torneo tiene su propia palabra del día, distinta de la de los demás.
          </Texto>

          <ScrollView style={estilos.lista}>
            {torneos.map((torneo) => (
              <Fila
                key={torneo.id}
                nombre={torneo.nombre}
                detalle={`${torneo.miembros.length} ${
                  torneo.miembros.length === 1 ? 'jugador' : 'jugadores'
                }`}
                marcado={activo.id === torneo.id}
                aviso={penalizadoEn(torneo.id) ? 'Hoy con palabra impuesta' : null}
                onPress={() => elegir(torneo.id)}
              />
            ))}

            {!ocultarLibre && (
              <Fila
                nombre={TORNEO_LIBRE.nombre}
                detalle="Sin competir contra nadie"
                marcado={activo.id === TORNEO_LIBRE.id}
                aviso={null}
                onPress={() => elegir(TORNEO_LIBRE.id)}
              />
            )}
          </ScrollView>

          <Pressable
            onPress={() => {
              cerrar();
              irATorneos();
            }}
            style={estilos.enlace}
            accessibilityRole="button"
          >
            <Texto style={estilos.textoEnlace}>Crear un torneo o entrar con un código</Texto>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Fila({
  nombre,
  detalle,
  marcado,
  aviso,
  onPress,
}: {
  nombre: string;
  detalle: string;
  marcado: boolean;
  aviso: string | null;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: marcado }}
      style={({ pressed }) => [
        estilos.fila,
        marcado && estilos.filaMarcada,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Texto style={estilos.nombre}>{nombre}</Texto>
        <Texto style={estilos.detalle}>{detalle}</Texto>
        {aviso && <Texto style={estilos.aviso}>{aviso}</Texto>}
      </View>
      {marcado && <Texto style={estilos.marca}>✓</Texto>}
    </Pressable>
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
    // El diálogo se dibuja en la raíz de la página, fuera de la columna
    // centrada, así que el tope de ancho hay que ponérselo aquí también.
    width: '100%',
    maxWidth: ANCHO_COLUMNA,
    alignSelf: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    gap: espaciado.sm,
    maxHeight: '80%',
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  explicacion: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
    marginBottom: espaciado.sm,
  },
  lista: {
    flexGrow: 0,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: 12,
    paddingHorizontal: espaciado.md,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    marginBottom: espaciado.sm,
  },
  filaMarcada: {
    borderColor: colores.correcta,
    backgroundColor: 'rgba(58, 167, 87, 0.12)',
  },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
  },
  detalle: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: 2,
  },
  aviso: {
    color: colores.presente,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: 4,
  },
  marca: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  enlace: {
    paddingTop: espaciado.sm,
  },
  textoEnlace: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: escala.normal,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
