import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from './Texto';
import { MAX_INTENTOS } from '../game/constantes';
import { LONGITUD } from '../game/palabras';
import { descodificarPalabra } from '../game/duelo';
import type { Marca } from '../tipos';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

const FONDO: Record<Marca, string> = {
  correcta: colores.correcta,
  presente: colores.presente,
  ausente: colores.ausente,
};

type Props = {
  /** Marcas codificadas de la palabra que está jugando el rival. */
  codificado: string;
  /** Qué palabra del duelo lleva (0..9). */
  palabra: number;
  total: number;
  puntos: number;
  nombre: string;
  terminado: boolean;
  /** Lado de cada casilla. Grande para la pantalla de espera. */
  lado?: number;
  /** Al esperar no interesa retener nada: se quiere verlo en directo. */
  enDirecto?: boolean;
};

/**
 * Lo que se ve del rival: los colores de sus intentos y por qué palabra va.
 *
 * Nunca las letras. Sólo viajan las marcas, así que ni la pantalla ni la red
 * llevan información de lo que ha escrito.
 */
/**
 * Cuánto se queda a la vista la palabra que el rival acaba de cerrar.
 *
 * Sin esto, en cuanto acierta pasa a la palabra siguiente y su rejilla se vacía
 * al instante: nunca llegas a ver la fila verde, que es justo la parte que pica.
 */
const RETENER_MS = 1400;

export function MiniTablero({
  codificado,
  palabra,
  total,
  puntos,
  nombre,
  terminado,
  lado = 9,
  enDirecto = false,
}: Props) {
  // Lo que se está mostrando, que va un paso por detrás cuando el rival cambia
  // de palabra.
  // El número se sanea: si llega de una versión distinta de la app puede venir
  // sin definir, y entonces se vería "Palabra NaN/10".
  const indice = Number.isFinite(palabra) ? palabra : 0;
  const [visible, setVisible] = useState({ codificado, palabra: indice });
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reloj.current) clearTimeout(reloj.current);

    // Mismo número de palabra, o vista en directo: se actualiza al momento.
    if (enDirecto || indice === visible.palabra) {
      setVisible({ codificado, palabra: indice });
      return;
    }

    // Ha cambiado de palabra: aguantamos la anterior un momento y luego pasamos.
    reloj.current = setTimeout(() => setVisible({ codificado, palabra: indice }), RETENER_MS);
    return () => {
      if (reloj.current) clearTimeout(reloj.current);
    };
  }, [codificado, indice, visible.palabra, enDirecto]);

  const filas = descodificarPalabra(visible.codificado);
  const hueco = Math.max(2, Math.round(lado * 0.18));

  return (
    <View style={estilos.caja}>
      <Texto style={estilos.nombre} numberOfLines={1}>
        {nombre}
      </Texto>

      <View style={[estilos.rejilla, { gap: hueco }]}>
        {Array.from({ length: MAX_INTENTOS }, (_, i) => (
          <View key={i} style={[estilos.fila, { gap: hueco }]}>
            {Array.from({ length: LONGITUD }, (_, j) => {
              const marca = filas[i]?.[j];
              return (
                <View
                  key={j}
                  style={{
                    width: lado,
                    height: lado,
                    borderRadius: Math.max(2, Math.round(lado * 0.2)),
                    backgroundColor: marca ? FONDO[marca] : 'transparent',
                    borderWidth: marca ? 0 : 1,
                    borderColor: colores.bordeCasilla,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>

      <Texto style={estilos.dato}>
        {terminado
          ? 'Ha terminado'
          : `Palabra ${Math.min(visible.palabra + 1, total)}/${total}`}
      </Texto>
      <Texto style={estilos.puntos}>{puntos} pts</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colores.superficie,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    minWidth: 96,
  },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    maxWidth: 84,
  },
  rejilla: {
    alignItems: 'center',
  },
  fila: {
    flexDirection: 'row',
  },
  dato: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
  puntos: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
});
