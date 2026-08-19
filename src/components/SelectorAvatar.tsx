import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from './Texto';
import { todosLosAvatares, type Avatar as DatosAvatar } from '../game/avatares';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';
import { Avatar } from './Avatar';

type Props = {
  elegido: DatosAvatar;
  onElegir: (avatar: DatosAvatar) => void;
  lado?: number;
  /**
   * Empieza recogido, enseñando sólo el avatar puesto y un botón para abrir.
   *
   * En el perfil interesa: son cuarenta y ocho, y quien entra a cambiarse el
   * nombre no quiere siete filas de cuadraditos por delante. En la bienvenida
   * no, porque ahí hay que elegir uno sí o sí.
   */
  plegable?: boolean;
};

/** La cuadrícula de avatares, compartida por la bienvenida y el perfil. */
export function SelectorAvatar({ elegido, onElegir, lado = 46, plegable }: Props) {
  const opciones = useMemo(() => todosLosAvatares(), []);
  const [abierto, setAbierto] = useState(!plegable);

  if (plegable && !abierto) {
    return (
      <View style={estilos.recogido}>
        <Avatar avatar={elegido} lado={lado} />
        <Pressable
          onPress={() => setAbierto(true)}
          accessibilityRole="button"
          accessibilityLabel="Cambiar avatar"
          style={({ pressed }) => [estilos.boton, pressed && { opacity: 0.6 }]}
        >
          <Texto style={estilos.textoBoton}>Cambiar avatar</Texto>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.zona}>
      <View style={estilos.rejilla}>
        {opciones.map((opcion) => {
          const marcado =
            opcion.color === elegido.color && opcion.patron === elegido.patron;
          return (
            <Pressable
              key={`${opcion.color}-${opcion.patron}`}
              onPress={() => onElegir(opcion)}
              accessibilityRole="button"
              accessibilityState={{ selected: marcado }}
              accessibilityLabel={`Avatar ${opcion.patron + 1}, color ${opcion.color + 1}`}
            >
              <Avatar avatar={opcion} lado={lado} seleccionado={marcado} />
            </Pressable>
          );
        })}
      </View>

      {plegable && (
        <Pressable
          onPress={() => setAbierto(false)}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.cerrar, pressed && { opacity: 0.6 }]}
        >
          <Texto style={estilos.textoCerrar}>Listo</Texto>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  /**
   * `width: '100%'` no es decorativo.
   *
   * Metida dentro de otra fila, la rejilla se dimensionaba a su contenido —los
   * cuarenta y ocho avatares seguidos— y por eso nunca llegaba a envolver: se
   * salía por el lado derecho y el resto no había manera de verlos. Ocupando
   * todo el ancho disponible, envuelve donde toca.
   */
  zona: {
    width: '100%',
    gap: espaciado.sm,
  },
  rejilla: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  recogido: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  boton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.acento,
    alignItems: 'center',
  },
  textoBoton: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: escala.normal,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cerrar: {
    alignSelf: 'center',
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.lg,
  },
  textoCerrar: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.pequeno,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
