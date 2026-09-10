import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  titulo: string;
  /** Una línea que resuma la norma, para no tener que abrirla para saber cuál es. */
  resumen: string;
  children: React.ReactNode;
};

/**
 * Una norma que se abre al tocarla.
 *
 * Las normas de la casa ya son seis, y explicadas seguidas convertían la
 * pantalla en un muro de texto donde no se encontraba nada. Cerradas, la lista
 * se lee de un vistazo y se abre sólo la que interesa.
 */
export function Desplegable({ titulo, resumen, children }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={[estilos.caja, abierto && estilos.abierta]}>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`${titulo}. ${abierto ? 'Ocultar' : 'Leer'}`}
        style={({ pressed }) => [estilos.cabecera, pressed && { opacity: 0.6 }]}
      >
        <View style={{ flex: 1 }}>
          <Texto style={estilos.titulo}>{titulo}</Texto>
          {!abierto && (
            <Texto style={estilos.resumen} numberOfLines={2}>
              {resumen}
            </Texto>
          )}
        </View>
        <Texto style={estilos.flecha}>{abierto ? '▾' : '▸'}</Texto>
      </Pressable>

      {abierto && <View style={estilos.cuerpo}>{children}</View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    marginBottom: espaciado.sm,
    overflow: 'hidden',
  },
  abierta: {
    borderColor: colores.acentoApagado,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    padding: espaciado.md,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resumen: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 18,
    marginTop: 2,
  },
  flecha: {
    color: colores.textoSuave,
    fontSize: escala.normal,
  },
  cuerpo: {
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
    gap: espaciado.sm,
  },
});
