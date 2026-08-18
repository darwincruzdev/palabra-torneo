import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BotonGoogleWeb } from '../components/BotonGoogleWeb';
import { Sutil, Tarjeta } from '../components/ui';
import { esWeb } from '../firebase/sesion';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

/** Las fichas del icono, en grande, como reclamo de la pantalla de entrada. */
function Marca() {
  const columnas = [
    { fichas: 2, color: colores.presente },
    { fichas: 3, color: colores.correcta },
    { fichas: 1, color: colores.tecla },
  ];
  return (
    <View style={estilos.marca}>
      {columnas.map((columna, i) => (
        <View key={i} style={estilos.columna}>
          {Array.from({ length: columna.fichas }, (_, n) => (
            <View key={n} style={[estilos.fichaMarca, { backgroundColor: columna.color }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function PantallaAcceso() {
  const { sesion } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + espaciado.xl }]}>
      <Marca />

      <View style={estilos.textos}>
        <Text style={estilos.titulo}>Palabra Torneo</Text>
        <Text style={estilos.lema}>
          Una palabra de cinco letras al día y a ver quién la saca antes.
        </Text>
      </View>

      {!sesion.disponible ? (
        <Tarjeta>
          <Text style={estilos.tituloTarjeta}>Falta configurar el acceso</Text>
          <Sutil>
            Para entrar con Google hacen falta las credenciales de Firebase y los
            identificadores de OAuth en el fichero .env. Está explicado paso a paso en el
            README.
          </Sutil>
        </Tarjeta>
      ) : (
        <View style={estilos.acciones}>
          {/* En el navegador el botón lo dibuja la propia librería de Google:
              es lo que le permite devolver el identificador sin abrir ventanas. */}
          {esWeb && sesion.clientIdWeb ? (
            sesion.cargando ? (
              <ActivityIndicator color={colores.correcta} />
            ) : (
              <BotonGoogleWeb
                clientId={sesion.clientIdWeb}
                onIdToken={sesion.entrarConIdToken}
              />
            )
          ) : (
            <Pressable
              onPress={sesion.entrar}
              disabled={sesion.cargando}
              accessibilityRole="button"
              style={({ pressed }) => [
                estilos.botonGoogle,
                { opacity: pressed ? 0.75 : sesion.cargando ? 0.6 : 1 },
              ]}
            >
              {sesion.cargando ? (
                <ActivityIndicator color="#1f1f1f" />
              ) : (
                <>
                  <Text style={estilos.logoGoogle}>G</Text>
                  <Text style={estilos.textoGoogle}>Continuar con Google</Text>
                </>
              )}
            </Pressable>
          )}

          {sesion.error && <Text style={estilos.error}>{sesion.error}</Text>}

          <Sutil>
            Sólo se usa para saber quién eres en la clasificación. No se publica nada en
            tu cuenta ni se lee tu correo.
          </Sutil>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
    padding: espaciado.lg,
    gap: espaciado.xl,
    alignItems: 'center',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: espaciado.xl,
  },
  columna: {
    gap: 5,
  },
  fichaMarca: {
    width: 46,
    height: 46,
    borderRadius: 8,
  },
  textos: {
    alignItems: 'center',
    gap: espaciado.sm,
  },
  titulo: {
    color: colores.texto,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lema: {
    color: colores.textoSuave,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  acciones: {
    width: '100%',
    maxWidth: 360,
    gap: espaciado.md,
    alignItems: 'center',
  },
  botonGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    backgroundColor: '#ffffff',
    borderRadius: radio.md,
    paddingVertical: 15,
    paddingHorizontal: espaciado.lg,
    width: '100%',
  },
  logoGoogle: {
    color: '#4285f4',
    fontSize: 20,
    fontWeight: '900',
  },
  textoGoogle: {
    color: '#1f1f1f',
    fontSize: 16,
    fontWeight: '700',
  },
  tituloTarjeta: {
    color: colores.texto,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: espaciado.sm,
  },
  error: {
    color: colores.peligro,
    fontSize: 13,
    textAlign: 'center',
  },
});
