import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from '../components/Texto';
import { Aviso } from '../components/Aviso';
import { Tablero } from '../components/Tablero';
import { TECLA_BORRAR, TECLA_ENTER, Teclado } from '../components/Teclado';
import { Boton } from '../components/ui';
import {
  ESCALA,
  TOTAL_MAXIMO,
  bonusDeTiempo,
  comentarioDeRonda,
  reloj,
  totalDe,
} from '../game/arcade';
import { useArcade } from '../estado/useArcade';
import { useTecladoFisico } from '../estado/useTecladoFisico';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  volver: () => void;
};

/**
 * El arcade: cinco palabras seguidas, con el reloj corriendo.
 *
 * La cabecera lleva el marcador en vez del nombre de un torneo, porque aquí lo
 * único con lo que se compite es con la marca propia.
 */
export function PantallaArcade({ volver }: Props) {
  const insets = useSafeAreaInsets();
  const arcade = useArcade();
  const [hueco, setHueco] = useState({ ancho: 300, alto: 380 });

  const enfocada = useIsFocused();
  const destello = useTecladoFisico({
    escribir: arcade.escribir,
    borrar: arcade.borrar,
    enviar: arcade.enviar,
    activo: !arcade.terminada && !arcade.revelando && enfocada,
  });

  function pulsar(tecla: string) {
    if (tecla === TECLA_ENTER) arcade.enviar();
    else if (tecla === TECLA_BORRAR) arcade.borrar();
    else arcade.escribir(tecla);
  }

  async function compartir() {
    if (!arcade.marca) return;
    const { acertadas, segundos, intentos } = arcade.marca;
    try {
      await Share.share({
        message:
          `Arcade de Palabra Torneo: ${arcade.total} de ${TOTAL_MAXIMO} puntos\n` +
          `${acertadas}/${arcade.palabras} palabras en ${reloj(segundos)} · ${intentos} intentos`,
      });
    } catch {
      // Diálogo de compartir cancelado.
    }
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <View style={estilos.cabecera}>
        <Pressable
          onPress={volver}
          hitSlop={12}
          accessibilityLabel="Salir del arcade"
          accessibilityRole="button"
        >
          <Texto style={estilos.icono}>←</Texto>
        </Pressable>

        <View style={estilos.centro}>
          <Texto style={estilos.titulo}>Arcade</Texto>
          <Texto style={estilos.subtitulo}>
            Palabra {arcade.numero} de {arcade.palabras}
          </Texto>
        </View>

        <View style={estilos.relojCaja}>
          <Texto style={estilos.reloj}>{reloj(arcade.segundos)}</Texto>
        </View>
      </View>

      {/* Cinco casillas: cuántas van, con cuántos puntos cada una. Es el
          marcador de la ronda y de paso dice lo que queda. */}
      <View style={estilos.tira}>
        {Array.from({ length: arcade.palabras }, (_, i) => {
          const hecha = arcade.resultados[i];
          const enCurso = i === arcade.numero - 1 && !arcade.terminada;
          return (
            <View
              key={i}
              style={[
                estilos.casilla,
                hecha?.acertada && estilos.casillaBuena,
                hecha && !hecha.acertada && estilos.casillaFallada,
                enCurso && estilos.casillaEnCurso,
              ]}
            >
              <Texto style={estilos.textoCasilla}>
                {hecha ? (hecha.acertada ? `${hecha.intentos}` : '—') : i + 1}
              </Texto>
            </View>
          );
        })}
        <View style={estilos.puntosCaja}>
          <Texto style={estilos.puntos}>{arcade.puntos}</Texto>
          <Texto style={estilos.etiquetaPuntos}>pts</Texto>
        </View>
      </View>

      {!arcade.terminada && (
        <>
          <View style={estilos.franjaAviso}>
            <Aviso mensaje={arcade.aviso} />
          </View>

          <View
            style={estilos.zonaTablero}
            onLayout={({ nativeEvent }) =>
              setHueco({
                ancho: Math.min(nativeEvent.layout.width, 340),
                alto: nativeEvent.layout.height,
              })
            }
          >
            <Tablero
              intentos={arcade.intentos}
              borrador={arcade.borrador}
              cursor={arcade.cursor}
              solucion={arcade.palabra}
              filaAnimada={arcade.filaAnimada}
              temblor={arcade.temblor}
              onCasilla={arcade.irACasilla}
              ancho={hueco.ancho}
              alto={hueco.alto}
            />
          </View>

          <Teclado estado={arcade.teclado} onTecla={pulsar} destello={destello} />
          <View style={{ height: insets.bottom }} />
        </>
      )}

      {arcade.terminada && arcade.marca && (
        <ScrollView
          style={estilos.panelFinal}
          contentContainerStyle={[
            estilos.contenidoFinal,
            { paddingBottom: insets.bottom + espaciado.lg },
          ]}
        >
          <Texto style={estilos.tituloFinal}>Ronda terminada</Texto>

          <View style={estilos.marcador}>
            <Dato valor={`${arcade.total}`} etiqueta={`de ${TOTAL_MAXIMO} puntos`} destacado />
            <Dato valor={reloj(arcade.marca.segundos)} etiqueta="tiempo" />
            <Dato
              valor={`${arcade.marca.acertadas}/${arcade.palabras}`}
              etiqueta="acertadas"
            />
          </View>

          {/* De dónde sale el número: las palabras por un lado y el reloj por
              otro. Sin esto, el premio por tiempo sería magia. */}
          <Texto style={estilos.desglose}>
            {arcade.marca.puntos * ESCALA} por las palabras ·{' '}
            <Texto style={estilos.bonus}>
              +{bonusDeTiempo(arcade.marca.segundos)} por el tiempo
            </Texto>
          </Texto>

          <Texto style={estilos.comentario}>
            {comentarioDeRonda(arcade.marca, arcade.aBatir)}
          </Texto>

          {arcade.aBatir && (
            <View style={estilos.previa}>
              <Texto style={estilos.etiquetaPrevia}>Tu mejor ronda</Texto>
              <Texto style={estilos.textoPrevia}>
                {totalDe(arcade.aBatir)} puntos · {reloj(arcade.aBatir.segundos)} ·{' '}
                {arcade.aBatir.acertadas}/{arcade.palabras} acertadas
              </Texto>
            </View>
          )}

          <View style={estilos.botones}>
            <Boton titulo="Otra ronda" onPress={arcade.otraVez} estilo={{ flex: 1 }} />
            <Boton
              titulo="Compartir"
              variante="secundario"
              onPress={compartir}
              estilo={{ flex: 1 }}
            />
          </View>
          <Boton titulo="Salir" variante="secundario" onPress={volver} />
        </ScrollView>
      )}
    </View>
  );
}

function Dato({
  valor,
  etiqueta,
  destacado,
}: {
  valor: string;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <View style={estilos.dato}>
      <Texto style={[estilos.valorDato, destacado && { color: colores.oro }]}>{valor}</Texto>
      <Texto style={estilos.etiquetaDato}>{etiqueta}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
  },
  icono: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.grande,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  relojCaja: {
    backgroundColor: colores.elevado,
    borderRadius: radio.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 62,
    alignItems: 'center',
  },
  reloj: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
  tira: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.sm,
  },
  casilla: {
    width: 30,
    height: 30,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaEnCurso: {
    borderColor: colores.acento,
    backgroundColor: colores.elevado,
  },
  casillaBuena: {
    backgroundColor: colores.correcta,
    borderColor: colores.correcta,
  },
  casillaFallada: {
    backgroundColor: colores.ausente,
    borderColor: colores.ausente,
  },
  textoCasilla: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
  },
  puntosCaja: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 4,
  },
  puntos: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
  },
  etiquetaPuntos: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  franjaAviso: {
    minHeight: 34,
    justifyContent: 'center',
  },
  zonaTablero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
  panelFinal: {
    flex: 1,
  },
  contenidoFinal: {
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  tituloFinal: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  marcador: {
    flexDirection: 'row',
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    paddingVertical: espaciado.md,
  },
  dato: {
    flex: 1,
    alignItems: 'center',
  },
  valorDato: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
  },
  etiquetaDato: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
    textAlign: 'center',
  },
  desglose: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
    marginTop: -espaciado.xs,
  },
  bonus: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
  },
  comentario: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    lineHeight: 22,
    textAlign: 'center',
  },
  previa: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espaciado.md,
    alignItems: 'center',
    gap: 2,
  },
  etiquetaPrevia: {
    color: colores.textoTenue,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  textoPrevia: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  botones: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
});
