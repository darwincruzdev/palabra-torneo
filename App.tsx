import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './src/components/Texto';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import {
  DarkTheme,
  NavigationContainer,
  NavigatorScreenParams,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProveedorApp, useApp } from './src/estado/AppContext';
import { useTipografia } from './src/tipografia';
import { codigoDesdeUrl } from './src/game/invitacion';
import { cargarCodigoPendiente, guardarCodigoPendiente } from './src/almacen/local';
import { MAQUETA_ACTIVA } from './src/maqueta/datos';
import { BarraPestanas } from './src/components/BarraPestanas';
import { PantallaAcceso } from './src/screens/PantallaAcceso';
import { PantallaBienvenida } from './src/screens/PantallaBienvenida';
import { PantallaInicio } from './src/screens/PantallaInicio';
import { PantallaTabla } from './src/screens/PantallaTabla';
import { PantallaJuego } from './src/screens/PantallaJuego';
import { PantallaHistorial } from './src/screens/PantallaHistorial';
import { PantallaPerfil } from './src/screens/PantallaPerfil';
import { PantallaArcade } from './src/screens/PantallaArcade';
import { PantallaTorneos } from './src/screens/PantallaTorneos';
import { PantallaAjustesTorneo } from './src/screens/PantallaAjustesTorneo';
import { PantallaNormas } from './src/screens/PantallaNormas';
import { PantallaDuelos } from './src/screens/PantallaDuelos';
import { PantallaDuelo } from './src/screens/PantallaDuelo';
import { ANCHO_COLUMNA, colores, espaciado, fuentes, texto } from './src/tema';

export type RutasPestanas = {
  Inicio: undefined;
  Tabla: undefined;
  Jugar: undefined;
  Jornadas: undefined;
  Perfil: undefined;
};

export type RutasApp = {
  Principal: NavigatorScreenParams<RutasPestanas> | undefined;
  Torneos: undefined;
  Ajustes: { torneoId: string };
  Normas: undefined;
  Arcade: undefined;
  Duelos: undefined;
  Duelo: { dueloId: string };
};

const Pila = createNativeStackNavigator<RutasApp>();
const Pestanas = createBottomTabNavigator<RutasPestanas>();
const navegacion = createNavigationContainerRef<RutasApp>();

const temaNavegacion = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colores.fondo,
    card: colores.fondo,
    text: colores.texto,
    border: colores.borde,
    primary: colores.acento,
  },
};

type VistaMaqueta = { ver: string | null; hoja: string | null };

function leerVista(url: string | null): VistaMaqueta {
  if (!url) return { ver: null, hoja: null };
  try {
    const params = new URL(url).searchParams;
    return { ver: params.get('ver'), hoja: params.get('hoja') };
  } catch {
    return { ver: null, hoja: null };
  }
}

/**
 * Decide qué enseñar: la entrada con Google, un rato de carga mientras se
 * recupera la sesión, o la app.
 */
function Raiz() {
  const { sesion, hayFirebase, perfilConfigurado, elegirTorneo } = useApp();
  const [codigoEntrante, setCodigoEntrante] = useState<string | null>(null);
  const [sinCuenta, setSinCuenta] = useState(false);
  const [vista, setVista] = useState<VistaMaqueta>({ ver: null, hoja: null });

  useEffect(() => {
    Linking.getInitialURL().then(async (url) => {
      if (MAQUETA_ACTIVA) setVista(leerVista(url));
      const codigo = codigoDesdeUrl(url) ?? (await cargarCodigoPendiente());
      if (codigo) setCodigoEntrante(codigo);
    });
    const suscripcion = Linking.addEventListener('url', ({ url }) => {
      const codigo = codigoDesdeUrl(url);
      if (codigo) {
        setCodigoEntrante(codigo);
        guardarCodigoPendiente(codigo);
      }
    });
    return () => suscripcion.remove();
  }, []);

  const guardarCodigo = useCallback((codigo: string) => {
    setCodigoEntrante(codigo);
    guardarCodigoPendiente(codigo);
  }, []);

  const consumirCodigo = useCallback(() => {
    setCodigoEntrante(null);
    guardarCodigoPendiente(null);
  }, []);

  useEffect(() => {
    if (!codigoEntrante || !sesion.usuario) return;
    if (navegacion.isReady()) navegacion.navigate('Torneos');
  }, [codigoEntrante, sesion.usuario]);

  // La maqueta abre una pantalla concreta para poder fotografiarla.
  useEffect(() => {
    if (!MAQUETA_ACTIVA || !vista.ver || vista.ver === 'acceso') return;
    let vivo = true;
    const ir = () => {
      if (!vivo) return;
      if (!navegacion.isReady()) {
        setTimeout(ir, 40);
        return;
      }
      const ver = vista.ver;
      if (ver === 'torneos') navegacion.navigate('Torneos');
      else if (ver === 'ajustes') navegacion.navigate('Ajustes', { torneoId: 'familia-cruz' });
      else if (ver === 'normas') navegacion.navigate('Normas');
      else if (ver === 'duelos') navegacion.navigate('Duelos');
      else if (ver === 'arcade') navegacion.navigate('Arcade');
      else if (ver === 'tabla') navegacion.navigate('Principal', { screen: 'Tabla' });
      else if (ver === 'jugar') navegacion.navigate('Principal', { screen: 'Jugar' });
      else if (ver === 'jornadas') navegacion.navigate('Principal', { screen: 'Jornadas' });
      else if (ver === 'perfil') navegacion.navigate('Principal', { screen: 'Perfil' });
    };
    ir();
    return () => {
      vivo = false;
    };
  }, [vista.ver, sesion.usuario]);

  if (hayFirebase && sesion.cargando && !sesion.usuario && !sinCuenta) {
    return (
      <View style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: 'center' }}>
        <ActivityIndicator color={colores.correcta} size="large" />
      </View>
    );
  }

  if ((hayFirebase && !sesion.usuario && !sinCuenta) || vista.ver === 'acceso') {
    return <PantallaAcceso onCodigo={guardarCodigo} onSinCuenta={() => setSinCuenta(true)} />;
  }

  if (hayFirebase && perfilConfigurado === false) {
    return <PantallaBienvenida />;
  }

  return (
    <NavigationContainer ref={navegacion} theme={temaNavegacion}>
      <Pila.Navigator
        screenOptions={({ navigation }) => ({
          headerStyle: { backgroundColor: colores.fondo },
          headerTintColor: colores.texto,
          headerTitleAlign: 'center',
          headerTitleStyle: {
            fontFamily: fuentes.titularNegro,
            fontSize: texto.grande,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
          },
          contentStyle: { backgroundColor: colores.fondo },
          headerLeft: ({ canGoBack }) =>
            canGoBack ? (
              <Pressable
                onPress={navigation.goBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Volver"
                style={({ pressed }) => [estilos.volver, pressed && { opacity: 0.6 }]}
              >
                <Texto style={estilos.flechaVolver}>←</Texto>
              </Pressable>
            ) : null,
        })}
      >
        <Pila.Screen name="Principal" options={{ headerShown: false }}>
          {() => (
            <Pestanas.Navigator
              tabBar={(props) => <BarraPestanas {...props} />}
              screenOptions={{ headerShown: false }}
            >
              <Pestanas.Screen name="Inicio">
                {({ navigation }) => (
                  <PantallaInicio
                    irAJugar={() => navigation.navigate('Jugar')}
                    irATabla={() => navigation.navigate('Tabla')}
                    irAJornadas={() => navigation.navigate('Jornadas')}
                    irATorneos={() => navigation.getParent()?.navigate('Torneos')}
                    irADuelos={() => navigation.getParent()?.navigate('Duelos')}
                    irAArcade={() => navigation.getParent()?.navigate('Arcade')}
                    irAAjustes={(torneoId) =>
                      navigation.getParent()?.navigate('Ajustes', { torneoId })
                    }
                    arsenalInicial={vista.hoja === 'arsenal'}
                  />
                )}
              </Pestanas.Screen>
              <Pestanas.Screen name="Tabla">
                {({ navigation }) => (
                  <PantallaTabla
                    irATorneos={() => navigation.getParent()?.navigate('Torneos')}
                    irAAjustes={(torneoId) =>
                      navigation.getParent()?.navigate('Ajustes', { torneoId })
                    }
                    invitarInicial={vista.hoja === 'invitar'}
                  />
                )}
              </Pestanas.Screen>
              <Pestanas.Screen name="Jugar">
                {({ navigation }) => (
                  <PantallaJuego
                    irATorneos={() => navigation.getParent()?.navigate('Torneos')}
                    irATabla={() => navigation.navigate('Tabla')}
                  />
                )}
              </Pestanas.Screen>
              <Pestanas.Screen name="Jornadas">
                {({ navigation }) => (
                  <PantallaHistorial
                    irATorneos={() => navigation.getParent()?.navigate('Torneos')}
                  />
                )}
              </Pestanas.Screen>
              <Pestanas.Screen name="Perfil">
                {({ navigation }) => (
                  <PantallaPerfil
                    irANormas={() => navigation.getParent()?.navigate('Normas')}
                    irATorneo={(torneoId) => {
                      elegirTorneo(torneoId);
                      navigation.navigate('Tabla');
                    }}
                  />
                )}
              </Pestanas.Screen>
            </Pestanas.Navigator>
          )}
        </Pila.Screen>

        <Pila.Screen name="Torneos" options={{ title: 'Mis torneos' }}>
          {({ navigation }) => (
            <PantallaTorneos
              alJugar={(torneoId) => {
                navigation.navigate('Principal', { screen: 'Jugar' });
                void torneoId;
              }}
              alVerTabla={() => navigation.navigate('Principal', { screen: 'Tabla' })}
              codigoEntrante={codigoEntrante}
              codigoConsumido={consumirCodigo}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Ajustes" options={{ title: 'Ajustes del torneo' }}>
          {({ navigation, route }) => (
            <PantallaAjustesTorneo
              torneoId={route.params.torneoId}
              volver={() => navigation.goBack()}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Normas" component={PantallaNormas} options={{ title: 'Cómo se juega' }} />

        <Pila.Screen name="Arcade" options={{ headerShown: false }}>
          {({ navigation }) => (
            <PantallaArcade
              volver={() => navigation.navigate('Principal', { screen: 'Inicio' })}
            />
          )}
        </Pila.Screen>

        <Pila.Screen name="Duelos" options={{ title: 'Duelo' }}>
          {({ navigation }) => (
            <PantallaDuelos irAlDuelo={(dueloId) => navigation.replace('Duelo', { dueloId })} />
          )}
        </Pila.Screen>

        <Pila.Screen name="Duelo" options={{ headerShown: false }}>
          {({ navigation, route }) => (
            <PantallaDuelo
              dueloId={route.params.dueloId}
              volver={() => navigation.navigate('Principal', { screen: 'Inicio' })}
              irAOtroDuelo={(otro) => navigation.replace('Duelo', { dueloId: otro })}
            />
          )}
        </Pila.Screen>
      </Pila.Navigator>
    </NavigationContainer>
  );
}

function Columna({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.fondo}>
      <View style={estilos.columna}>{children}</View>
    </View>
  );
}

export default function App() {
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
  volver: { paddingRight: espaciado.md, paddingVertical: espaciado.xs },
  flechaVolver: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: texto.grande,
    lineHeight: texto.grande + 4,
  },
  fondo: { flex: 1, backgroundColor: colores.fondo, alignItems: 'center' },
  columna: { flex: 1, width: '100%', maxWidth: ANCHO_COLUMNA },
});
