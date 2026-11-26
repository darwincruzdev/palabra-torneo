import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from '../components/Texto';
import { Ficha } from '../components/Ficha';
import { CasillasCodigo } from '../components/CasillasCodigo';
import { BotonGoogleWeb } from '../components/BotonGoogleWeb';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { esWeb } from '../firebase/sesion';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  /** Guarda el código para usarlo en cuanto haya sesión. */
  onCodigo: (codigo: string) => void;
  /** Entra a La diaria sin cuenta. */
  onSinCuenta: () => void;
};

/** La entrada: qué es el juego, Google, y un código si ya te han invitado. */
export function PantallaAcceso({ onCodigo, onSinCuenta }: Props) {
  const { sesion } = useApp();
  const insets = useSafeAreaInsets();
  const [conCodigo, setConCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  function guardarCodigo() {
    if (codigo.length !== 6) {
      setAviso('El código tiene 6 caracteres');
      return;
    }
    onCodigo(codigo);
    setAviso('Guardado. Entra con Google y te unimos.');
    setConCodigo(false);
  }

  return (
    <ScrollView
      contentContainerStyle={[
        estilos.pantalla,
        { paddingTop: insets.top + espaciado.lg, paddingBottom: insets.bottom + espaciado.xl },
      ]}
    >
      <Marca />

      <View style={estilos.textos}>
        <Texto style={estilos.titulo}>Palabra Torneo</Texto>
        <Texto style={estilos.lema}>La palabra del día, contra los tuyos.</Texto>
      </View>

      <Tarjeta>
        <Texto style={estilos.punto}>Una palabra al día en cada torneo</Texto>
        <Sutil>La misma para todo tu grupo.</Sutil>
      </Tarjeta>
      <Tarjeta>
        <Texto style={estilos.punto}>Puntúa por intentos</Texto>
        <Sutil>7 · 5 · 4 · 3 · 2 · 1. Tabla mensual y trofeo.</Sutil>
      </Tarjeta>
      <Tarjeta>
        <Texto style={estilos.punto}>Entra con un código o un enlace</Texto>
        <Sutil>Tu familia, el curro, los del pádel…</Sutil>
      </Tarjeta>

      {!sesion.disponible ? (
        <Tarjeta>
          <Texto style={estilos.punto}>Falta configurar el acceso</Texto>
          <Sutil>
            Para entrar con Google hacen falta las credenciales de Firebase y los identificadores
            de OAuth en el fichero .env. Está explicado en el README.
          </Sutil>
        </Tarjeta>
      ) : (
        <View style={estilos.acciones}>
          {esWeb && sesion.clientIdWeb ? (
            sesion.cargando ? (
              <ActivityIndicator color={colores.correcta} />
            ) : (
              <BotonGoogleWeb clientId={sesion.clientIdWeb} onIdToken={sesion.entrarConIdToken} />
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
                  <Texto style={estilos.logoGoogle}>G</Texto>
                  <Texto style={estilos.textoGoogle}>Continuar con Google</Texto>
                </>
              )}
            </Pressable>
          )}

          {sesion.error && <Texto style={estilos.error}>{sesion.error}</Texto>}

          {conCodigo ? (
            <View style={estilos.codigo}>
              <CasillasCodigo valor={codigo} onChange={setCodigo} />
              <Boton titulo="Guardar código" variante="secundario" onPress={guardarCodigo} />
            </View>
          ) : (
            <Pressable
              onPress={() => setConCodigo(true)}
              accessibilityRole="button"
              style={estilos.codigoBoton}
            >
              <Texto style={estilos.codigoTexto}>Tengo un código de invitación</Texto>
            </Pressable>
          )}
          {aviso && <Texto style={estilos.aviso}>{aviso}</Texto>}
        </View>
      )}

      <Pressable onPress={onSinCuenta} accessibilityRole="button">
        <Texto style={estilos.sinCuenta}>Sin cuenta puedes jugar La diaria, que no puntúa.</Texto>
      </Pressable>
    </ScrollView>
  );
}

/** El podio del icono: 1 en verde, 2 en ámbar, 3 en gris. */
function Marca() {
  return (
    <View style={estilos.marca}>
      <View style={estilos.columna}>
        <Ficha letra="2" color={colores.presente} lado={52} tinta={colores.fondo} />
        <Ficha color={colores.presente} lado={52} />
      </View>
      <View style={estilos.columna}>
        <Ficha letra="1" color={colores.correcta} lado={52} />
        <Ficha color={colores.correcta} lado={52} />
        <Ficha color={colores.correcta} lado={52} />
      </View>
      <View style={estilos.columna}>
        <Ficha letra="3" color={colores.tecla} lado={52} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flexGrow: 1,
    backgroundColor: colores.fondo,
    padding: espaciado.lg,
    gap: espaciado.md,
    alignItems: 'center',
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: espaciado.lg,
  },
  columna: { gap: 6 },
  textos: { alignItems: 'center', gap: 4 },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: 40,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lema: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    textAlign: 'center',
  },
  punto: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  acciones: { width: '100%', maxWidth: 380, gap: espaciado.md, alignItems: 'center' },
  botonGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderBottomWidth: 3,
    borderBottomColor: '#d0d0d0',
    paddingVertical: 14,
    width: '100%',
  },
  logoGoogle: { color: '#4285f4', fontSize: 20, fontWeight: '900' },
  textoGoogle: { color: '#1f1f1f', fontSize: 16, fontWeight: '700' },
  error: { color: colores.peligro, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno, textAlign: 'center' },
  aviso: { color: colores.acento, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno, textAlign: 'center' },
  codigo: { width: '100%', gap: espaciado.sm },
  codigoBoton: {
    width: '100%',
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  codigoTexto: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sinCuenta: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
    marginTop: espaciado.md,
  },
});
