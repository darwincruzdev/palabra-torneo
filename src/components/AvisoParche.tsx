import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Texto } from './Texto';
import { NOTAS_DEL_PARCHE, VERSION_PARCHE } from '../game/constantes';
import {
  cargarAvisoParche,
  guardarAvisoParche,
  type AvisoParcheLocal,
} from '../almacen/local';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

/** Lo que dura el aviso desde que cada uno lo ve por primera vez. */
const DURACION_MS = 24 * 60 * 60 * 1000;

/**
 * Avisa una vez de que hay versión nueva, y se quita solo.
 *
 * Dura un día contado desde que **esta persona** lo ve, no desde que se publicó
 * el parche: si contara desde la publicación, quien no abriera la app ese día no
 * se enteraría nunca. Y se guarda por versión, así que el del parche siguiente
 * vuelve a salir aunque este se hubiera cerrado.
 */
export function AvisoParche() {
  /** null mientras se lee del móvil, para no dar un parpadeo al arrancar. */
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let vigente = true;

    cargarAvisoParche().then((guardado) => {
      if (!vigente) return;

      // Primera vez que ve esta versión: se anota el momento y se enseña.
      if (guardado?.version !== VERSION_PARCHE) {
        const nuevo: AvisoParcheLocal = { version: VERSION_PARCHE, desde: Date.now() };
        guardarAvisoParche(nuevo);
        setVisible(true);
        return;
      }

      setVisible(Date.now() - guardado.desde < DURACION_MS);
    });

    return () => {
      vigente = false;
    };
  }, []);

  function cerrar() {
    setVisible(false);
    // Se marca como visto hace un día para que no vuelva a salir.
    guardarAvisoParche({ version: VERSION_PARCHE, desde: Date.now() - DURACION_MS });
  }

  if (visible !== true) return null;

  return (
    <View style={estilos.caja}>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => Linking.openURL(NOTAS_DEL_PARCHE).catch(() => {})}
        accessibilityRole="button"
        accessibilityLabel={`Ver las notas del parche ${VERSION_PARCHE}`}
      >
        <Texto style={estilos.titulo}>Novedades · {VERSION_PARCHE}</Texto>
        <Texto style={estilos.texto}>
          El juego ha cambiado. Toca aquí para ver qué hay de nuevo, o búscalo cuando
          quieras en <Texto style={estilos.negrita}>Perfil → Notas del parche</Texto>.
        </Texto>
      </Pressable>

      <Pressable
        onPress={cerrar}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
      >
        <Texto style={estilos.cerrar}>✕</Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    backgroundColor: 'rgba(243, 198, 75, 0.12)',
    borderWidth: 1,
    borderColor: colores.oro,
    borderRadius: radio.md,
    padding: espaciado.md,
  },
  titulo: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  texto: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
  },
  negrita: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
  },
  cerrar: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
  },
});
