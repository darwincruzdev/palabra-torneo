import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colores, espaciado, fuentes, radio, rotulo, texto } from '../tema';

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'principal' | 'secundario' | 'peligro';
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
};

/**
 * Botón de marcador: mayúsculas condensadas y espaciadas, esquinas poco
 * redondeadas y una línea inferior más marcada que le da cuerpo.
 */
export function Boton({
  titulo,
  onPress,
  variante = 'principal',
  cargando,
  deshabilitado,
  estilo,
}: BotonProps) {
  const inactivo = deshabilitado || cargando;

  const fondo =
    variante === 'principal'
      ? colores.correcta
      : variante === 'peligro'
        ? 'transparent'
        : colores.elevado;

  const borde =
    variante === 'principal'
      ? '#2E7A46'
      : variante === 'peligro'
        ? colores.peligro
        : colores.borde;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      style={({ pressed }) => [
        estilos.boton,
        {
          backgroundColor: fondo,
          borderColor: borde,
          // El grosor de abajo se come al pulsar: hunde el botón sin moverlo.
          borderBottomWidth: pressed ? 1 : 3,
          marginTop: pressed ? 2 : 0,
          opacity: inactivo ? 0.45 : 1,
        },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colores.texto} />
      ) : (
        <Text
          style={[
            estilos.textoBoton,
            variante === 'peligro' && { color: colores.peligro },
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * Tarjeta con una regla superior de acento.
 *
 * La línea es lo que la separa de la caja redondeada con sombra de siempre, y
 * marca dónde empieza cada bloque sin necesidad de sombras.
 */
export function Tarjeta({
  children,
  estilo,
  acento,
}: {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
  /** Color de la regla superior. Sin ella, la tarjeta va lisa. */
  acento?: string;
}) {
  return (
    <View style={[estilos.tarjeta, estilo]}>
      {acento && <View style={[estilos.regla, { backgroundColor: acento }]} />}
      {children}
    </View>
  );
}

/** Titular de sección: condensado, en mayúsculas y con una línea al lado. */
export function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <View style={estilos.filaTitulo}>
      <Text style={estilos.titulo}>{children}</Text>
      <View style={estilos.lineaTitulo} />
    </View>
  );
}

/** Rótulo pequeño, del tipo que etiqueta una cifra en un marcador. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.rotulo}>{children}</Text>;
}

export function Sutil({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.sutil}>{children}</Text>;
}

/**
 * Una cifra grande con su etiqueta debajo, como en un marcador.
 * Es el gesto que se repite en puntuaciones, puestos y cuentas atrás.
 */
export function Cifra({
  valor,
  etiqueta,
  color = colores.oro,
  tamano = texto.cifra,
}: {
  valor: string | number;
  etiqueta?: string;
  color?: string;
  tamano?: number;
}) {
  return (
    <View style={estilos.cifra}>
      <Text style={[estilos.cifraValor, { color, fontSize: tamano, lineHeight: tamano * 1.05 }]}>
        {valor}
      </Text>
      {etiqueta && <Text style={estilos.cifraEtiqueta}>{etiqueta}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    paddingVertical: 13,
    paddingHorizontal: espaciado.lg,
    borderRadius: radio.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBoton: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.medio,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    overflow: 'hidden',
  },
  regla: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.sm,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  lineaTitulo: {
    flex: 1,
    height: 1,
    backgroundColor: colores.borde,
  },
  rotulo: {
    ...(rotulo as TextStyle),
  },
  sutil: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: texto.pequeno,
    lineHeight: 20,
  },
  cifra: {
    alignItems: 'center',
  },
  cifraValor: {
    fontFamily: fuentes.titularNegro,
  },
  cifraEtiqueta: {
    ...(rotulo as TextStyle),
    fontSize: texto.micro,
    marginTop: 2,
  },
});
