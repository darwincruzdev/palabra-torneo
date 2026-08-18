import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { SelectorAvatar } from '../components/SelectorAvatar';
import { Boton, Sutil } from '../components/ui';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

/**
 * Lo primero que ve alguien nuevo, antes de jugar nada.
 *
 * Se pregunta aquí y no en un ajuste escondido porque el nombre y el avatar son
 * lo que van a ver los demás en la clasificación: si no se elige a propósito,
 * la gente acaba apareciendo como "Jugador" sin saber por qué.
 */
export function PantallaBienvenida() {
  const { nombre, avatar, cambiarPerfil } = useApp();
  const [borradorNombre, setBorradorNombre] = useState(nombre);
  const [borradorAvatar, setBorradorAvatar] = useState(avatar);
  const [guardando, setGuardando] = useState(false);
  const insets = useSafeAreaInsets();

  const nombreValido = borradorNombre.trim().length >= 2;

  async function continuar() {
    if (!nombreValido) return;
    setGuardando(true);
    try {
      await cambiarPerfil(borradorNombre, borradorAvatar);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: insets.top + espaciado.lg, paddingBottom: insets.bottom + espaciado.xl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.cabecera}>
        <Avatar avatar={borradorAvatar} lado={84} />
        <Text style={estilos.titulo}>¿Cómo te llamamos?</Text>
        <Text style={estilos.lema}>
          Es el nombre y la cara con los que aparecerás en la clasificación de tus
          torneos. Puedes cambiarlos cuando quieras.
        </Text>
      </View>

      <TextInput
        value={borradorNombre}
        onChangeText={setBorradorNombre}
        placeholder="Tu nombre"
        placeholderTextColor={colores.textoSuave}
        maxLength={20}
        autoCorrect={false}
        style={estilos.campo}
      />

      <Text style={estilos.etiqueta}>Elige tu avatar</Text>
      <SelectorAvatar elegido={borradorAvatar} onElegir={setBorradorAvatar} />

      <View style={estilos.pie}>
        <Boton
          titulo="Empezar a jugar"
          onPress={continuar}
          cargando={guardando}
          deshabilitado={!nombreValido}
        />
        {!nombreValido && <Sutil>Escribe al menos dos letras.</Sutil>}
      </View>
    </ScrollView>
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
  cabecera: {
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.md,
  },
  titulo: {
    color: colores.texto,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  lema: {
    color: colores.textoSuave,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
  campo: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: 14,
    color: colores.texto,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  etiqueta: {
    color: colores.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  pie: {
    gap: espaciado.sm,
    marginTop: espaciado.lg,
  },
});
