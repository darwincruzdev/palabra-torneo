import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { AvisoInstalar } from '../components/AvisoInstalar';
import { SelectorTorneo } from '../components/SelectorTorneo';
import { PALABRAS_POR_DUELO } from '../game/duelo';
import { fechaJuego } from '../game/fecha';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

type Props = {
  irAJugar: () => void;
  irATorneos: () => void;
  irADuelos: () => void;
  irAPerfil: () => void;
};

/**
 * La primera pantalla después de entrar.
 *
 * Existe porque sin ella la gente aterrizaba directamente en el tablero, en
 * modo libre, y no entendía por qué su partida no puntuaba ni cómo llegar al
 * torneo de la familia. Aquí la elección es explícita.
 */
export function PantallaModo({ irAJugar, irATorneos, irADuelos, irAPerfil }: Props) {
  const { nombre, avatar, torneos, jornadas, uid, elegirTorneo } = useApp();
  const [eligiendoTorneo, setEligiendoTorneo] = useState(false);
  const insets = useSafeAreaInsets();

  const hoy = fechaJuego();

  /** Torneos en los que todavía no he jugado hoy. */
  const pendientes = torneos.filter(
    (t) => !(jornadas[t.id] ?? []).find((d) => d.fecha === hoy)?.resultados?.[uid ?? '']
  ).length;

  function jugarLibre() {
    elegirTorneo(TORNEO_LIBRE.id);
    irAJugar();
  }

  function jugarTorneo() {
    if (torneos.length === 0) {
      irATorneos();
      return;
    }
    if (torneos.length === 1) {
      elegirTorneo(torneos[0].id);
      irAJugar();
      return;
    }
    setEligiendoTorneo(true);
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: insets.top + espaciado.lg, paddingBottom: insets.bottom + espaciado.xl },
      ]}
    >
      <Pressable onPress={irAPerfil} style={estilos.saludo} accessibilityRole="button">
        <Avatar avatar={avatar} lado={52} />
        <View style={{ flex: 1 }}>
          <Text style={estilos.hola}>Hola, {nombre || 'jugador'}</Text>
          <Text style={estilos.editar}>Cambiar nombre o avatar</Text>
        </View>
      </Pressable>

      <AvisoInstalar />

      <Text style={estilos.pregunta}>¿A qué juegas hoy?</Text>

      <Tarjeta
        emoji="🏆"
        titulo="Modo torneo"
        descripcion={
          torneos.length === 0
            ? 'Compite con tu familia o tus amigos. Crea un torneo y reparte la invitación.'
            : pendientes > 0
              ? `Te queda por jugar en ${pendientes} ${pendientes === 1 ? 'torneo' : 'torneos'}.`
              : 'Ya has jugado hoy en todos tus torneos. Mira cómo va la clasificación.'
        }
        destacada
        onPress={jugarTorneo}
        etiqueta={
          torneos.length === 0 ? 'Empezar' : pendientes > 0 ? `${pendientes} por jugar` : 'Al día'
        }
      />

      <Tarjeta
        emoji="⚔️"
        titulo="Duelo"
        descripcion={`Uno contra uno, al mejor de ${PALABRAS_POR_DUELO} palabras y en directo. Ves el tablero del rival mientras juega.`}
        onPress={irADuelos}
      />

      <Tarjeta
        emoji="🎯"
        titulo="Modo libre"
        descripcion="Una palabra al día para practicar tú solo. No cuenta para ninguna clasificación."
        onPress={jugarLibre}
      />

      {torneos.length > 0 && (
        <Pressable onPress={irATorneos} style={estilos.enlace} accessibilityRole="button">
          <Text style={estilos.textoEnlace}>Ver mis torneos y clasificaciones</Text>
        </Pressable>
      )}

      <SelectorTorneo
        visible={eligiendoTorneo}
        cerrar={() => setEligiendoTorneo(false)}
        irATorneos={irATorneos}
        ocultarLibre
        alElegir={irAJugar}
      />
    </ScrollView>
  );
}

function Tarjeta({
  emoji,
  titulo,
  descripcion,
  etiqueta,
  destacada,
  onPress,
}: {
  emoji: string;
  titulo: string;
  descripcion: string;
  etiqueta?: string;
  destacada?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${descripcion}`}
      style={({ pressed }) => [
        estilos.tarjeta,
        destacada && estilos.tarjetaDestacada,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={estilos.emoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={estilos.filaTitulo}>
          <Text style={estilos.tituloTarjeta}>{titulo}</Text>
          {etiqueta && (
            <View style={estilos.chip}>
              <Text style={estilos.textoChip}>{etiqueta}</Text>
            </View>
          )}
        </View>
        <Text style={estilos.descripcion}>{descripcion}</Text>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    paddingHorizontal: espaciado.lg,
    gap: espaciado.md,
  },
  saludo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.sm,
  },
  hola: {
    color: colores.texto,
    fontSize: 20,
    fontWeight: '800',
  },
  editar: {
    color: colores.textoSuave,
    fontSize: 12,
    marginTop: 2,
  },
  pregunta: {
    color: colores.texto,
    fontSize: 15,
    fontWeight: '700',
    marginTop: espaciado.sm,
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
  },
  tarjetaDestacada: {
    borderColor: colores.correcta,
    backgroundColor: 'rgba(58, 167, 87, 0.10)',
  },
  emoji: {
    fontSize: 34,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    flexWrap: 'wrap',
  },
  tituloTarjeta: {
    color: colores.texto,
    fontSize: 19,
    fontWeight: '800',
  },
  chip: {
    backgroundColor: colores.fondo,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  textoChip: {
    color: colores.presente,
    fontSize: 11,
    fontWeight: '800',
  },
  descripcion: {
    color: colores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  enlace: {
    paddingVertical: espaciado.sm,
    alignItems: 'center',
  },
  textoEnlace: {
    color: colores.cursor,
    fontSize: 14,
    fontWeight: '600',
  },
});
