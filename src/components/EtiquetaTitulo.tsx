import React from 'react';
import { StyleSheet } from 'react-native';
import { Texto } from './Texto';
import type { Titulo } from '../game/rangos';
import { colores, fuentes, texto as escala } from '../tema';

type Props = {
  titulo: Titulo | null;
  /** En la tabla cabe poco: se corta a una línea. */
  compacta?: boolean;
};

/**
 * El título que alguien lleva puesto, junto a su nombre.
 *
 * Con null no se pinta nada. Es lo normal hasta la tercera copa, y la tabla de
 * un grupo que acaba de empezar no tiene por qué llevar huecos vacíos debajo de
 * cada nombre.
 *
 * El último se pinta en oro y los demás en plata. Son cinco rangos y en una
 * tabla se leen de refilón: si todos fueran del mismo color habría que pararse
 * a leerlos para saber quién va por delante.
 */
export function EtiquetaTitulo({ titulo, compacta }: Props) {
  if (!titulo) return null;
  const esElUltimo = titulo.id === 'indiscutible';
  return (
    <Texto
      numberOfLines={1}
      style={[
        estilos.titulo,
        compacta && estilos.compacta,
        { color: esElUltimo ? colores.oro : colores.plata },
      ]}
    >
      {titulo.nombre}
    </Texto>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  compacta: { flexShrink: 1 },
});
