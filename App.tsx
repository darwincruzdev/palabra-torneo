import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import {
  DarkTheme,
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProveedorApp, useApp } from './src/estado/AppContext';
import { useTipografia } from './src/tipografia';
import { codigoDesdeUrl } from './src/game/invitacion';
import { PantallaAcceso } from './src/screens/PantallaAcceso';
import { PantallaBienvenida } from './src/screens/PantallaBienvenida';
import { PantallaModo } from './src/screens/PantallaModo';
import { PantallaJuego } from './src/screens/PantallaJuego';
import { PantallaTorneos } from './src/screens/PantallaTorneos';
import { PantallaClasificacion } from './src/screens/PantallaClasificacion';
import { PantallaHistorial } from './src/screens/PantallaHistorial';
import { PantallaDuelos } from './src/screens/PantallaDuelos';
import { PantallaDuelo } from './src/screens/PantallaDuelo';
import { PantallaPerfil } from './src/screens/PantallaPerfil';
import { colores } from './src/tema';

export type RutasApp = {
  Modo: undefined;
  Juego: undefined;
  Torneos: undefined;
  Clasificacion: { torneoId: string };
  Historial: { torneoId: string };
  Duelos: undefined;
  Duelo: { dueloId: string };
  Perfil: undefined;
};

const Pila = createNativeStackNavigator<RutasApp>();
const navegacion = createNavigationContainerRef<RutasApp>();

const temaNavegacion = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colores.fondo,
    card: colores.fondo,
    text: colores.texto,
    border: colores.borde,
    primary: colores.correcta,
  },
};

/**
 * Decide qué enseñar: la entrada con Google, un rato de carga mientras se
 * recupera la sesión, o la app.
 */
function Raiz() {
  const { sesion, hayFirebase, perfilConfigurado } = useApp();
  const [codigoEntrante, setCodigoEntrante] = useState<string | null>(null);

  // Invitaciones: tanto si la app estaba cerrada (getInitialURL) como si ya
  // estaba abierta (addEventListener).
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      const codigo = codigoDesdeUrl(url);
      if (codigo) setCodigoEntrante(codigo);
    });
    const suscripcion = Linking.addEventListener('url', ({ url }) => {
      const codigo = codigoDesdeUrl(url);
      if (codigo) setCodigoEntrante(codigo);
    });
    return () => suscripcion.remove();
  }, []);

  const consumirCodigo = useCallback(() => setCodigoEntrante(null), []);

  // Llegar por una invitación abre directamente la pantalla donde se entra.
  useEffect(() => {
    if (!codigoEntrante || !sesion.usuario) return;
    if (navegacion.isReady()) navegacion.navigate('Torneos');
  }, [codigoEntrante, sesion.usuario]);

  if (hayFirebase && sesion.cargando && !sesion.usuario) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}>
        <ActivityIndicator color={colores.correcta} size="large" />
      </View>
    );
  }

  // Sin Firebase configurado se puede jugar igual, en modo libre.
  if (hayFirebase && !sesion.usuario) {
    return <PantallaAcceso />;
  }

  // Nadie entra al juego sin haber elegido nombre y avatar: es lo que verán
  // los demás en la clasificación.
  if (hayFirebase && perfilConfigurado === false) {
    return <PantallaBienvenida />;
  }

  return (
    <NavigationContainer ref={navegacion} theme={temaNavegacion}>
      <Pila.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colores.fondo },
          headerTintColor: colores.texto,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colores.fondo },
        }}
      >
        <Pila.Screen name="Modo" options={{ headerShown: false }}>
          {({ navigation }) => (
            <PantallaModo
              irAJugar={() => navigation.navigate('Juego')}
              irATorneos={() => navigation.navigate('Torneos')}
              irADuelos={() => navigation.navigate('Duelos')}
              irAPerfil={() => navigation.navigate('Perfil')}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Juego" options={{ headerShown: false }}>
          {({ navigation }) => (
            <PantallaJuego
              volver={() =>
                navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Modo')
              }
              irATorneos={() => navigation.navigate('Torneos')}
              irAClasificacion={(torneoId) =>
                navigation.navigate('Clasificacion', { torneoId })
              }
              irAPerfil={() => navigation.navigate('Perfil')}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Torneos" options={{ title: 'Torneos' }}>
          {({ navigation }) => (
            <PantallaTorneos
              verClasificacion={(torneoId) =>
                navigation.navigate('Clasificacion', { torneoId })
              }
              codigoEntrante={codigoEntrante}
              codigoConsumido={consumirCodigo}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Clasificacion" options={{ title: 'Clasificación' }}>
          {({ navigation, route }) => (
            <PantallaClasificacion
              torneoId={route.params.torneoId}
              volver={() => navigation.goBack()}
              irAJugar={() => navigation.navigate('Juego')}
              irAHistorial={() =>
                navigation.navigate('Historial', { torneoId: route.params.torneoId })
              }
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Historial" options={{ title: 'Jornadas anteriores' }}>
          {({ navigation, route }) => (
            <PantallaHistorial
              torneoId={route.params.torneoId}
              volver={() => navigation.goBack()}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Duelos" options={{ title: 'Duelo' }}>
          {({ navigation }) => (
            <PantallaDuelos
              irAlDuelo={(dueloId) => navigation.replace('Duelo', { dueloId })}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Duelo" options={{ headerShown: false }}>
          {({ navigation, route }) => (
            <PantallaDuelo
              dueloId={route.params.dueloId}
              volver={() => navigation.navigate('Modo')}
            />
          )}
        </Pila.Screen>

        <Pila.Screen
          name="Perfil"
          component={PantallaPerfil}
          options={{ title: 'Perfil y reglas' }}
        />
      </Pila.Navigator>
    </NavigationContainer>
  );
}

/**
 * En un monitor la app se queda en una columna centrada del ancho de un móvil.
 * Estirada a 1920 píxeles el tablero queda perdido en el centro y el teclado
 * ocupa toda la pantalla.
 */
function Columna({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.fondo}>
      <View style={estilos.columna}>{children}</View>
    </View>
  );
}

export default function App() {
  // Sin las fuentes cargadas la app se dibujaría un instante con la letra del
  // sistema y saltaría de golpe a la buena, que se ve fatal.
  const tipografiaLista = useTipografia();

  if (!tipografiaLista) {
    return <View style={estilos.fondo} />;
  }

  return (
    <SafeAreaProvider>
      <ProveedorApp>
        <StatusBar style="light" />
        <Columna>
          <Raiz />
        </Columna>
      </ProveedorApp>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: 'center',
  },
  columna: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
  },
});
