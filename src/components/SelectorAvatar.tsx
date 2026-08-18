import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { todosLosAvatares, type Avatar as DatosAvatar } from '../game/avatares';
import { espaciado } from '../tema';
import { Avatar } from './Avatar';

type Props = {
  elegido: DatosAvatar;
  onElegir: (avatar: DatosAvatar) => void;
  lado?: number;
};

/** La cuadrícula de avatares, compartida por la bienvenida y el perfil. */
export function SelectorAvatar({ elegido, onElegir, lado = 46 }: Props) {
  const opciones = useMemo(() => todosLosAvatares(), []);

  return (
    <View style={estilos.rejilla}>
      {opciones.map((opcion) => {
        const marcado = opcion.color === elegido.color && opcion.patron === elegido.patron;
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
  );
}

const estilos = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
});
