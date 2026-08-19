import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '../components/Aviso';
import { Avatar } from '../components/Avatar';
import { SelectorTorneo } from '../components/SelectorTorneo';
import { Tablero } from '../components/Tablero';
import { TECLA_BORRAR, TECLA_ENTER, Teclado } from '../components/Teclado';
import { Boton } from '../components/ui';
import { PUNTOS_POR_INTENTO } from '../game/constantes';
import { fechaLarga } from '../game/fecha';
import { numeroJornada } from '../game/palabras';
import { patronCompartible } from '../game/evaluar';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import { useJuego } from '../estado/useJuego';
import { useTecladoFisico } from '../estado/useTecladoFisico';
import { useCuentaAtras } from '../estado/useCuentaAtras';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  volver: () => void;
  irATorneos: () => void;
  irAClasificacion: (torneoId: string) => void;
  irAPerfil: () => void;
};

export function PantallaJuego({ volver, irATorneos, irAClasificacion, irAPerfil }: Props) {
  const insets = useSafeAreaInsets();
  const juego = useJuego();
  const { activo, avatar, torneos, jornadas, uid, elegirTorneo } = useApp();
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  // El hueco del tablero se mide en pantalla en vez de calcularse a ojo: así
  // encaja igual con el teclado abierto que con el panel de resultado.
  const [hueco, setHueco] = useState({ ancho: 300, alto: 380 });

  const terminada = juego.estado !== 'jugando';
  /**
   * La jornada ya consta puntuada en el torneo y esta partida no la tiene.
   *
   * Si la partida local sí está terminada se enseña el final de siempre, que
   * además tiene el tablero con las letras de verdad; esto es sólo para cuando
   * se entra desde otro sitio con la jornada ya hecha.
   */
  const yaHecha = juego.publicada && !terminada ? juego.publicada : null;
  const esLibre = activo.id === TORNEO_LIBRE.id;
  const cuentaAtras = useCuentaAtras();

  const resultadosDeHoy =
    activo.tipo === 'torneo'
      ? (jornadas[activo.id] ?? []).find((d) => d.fecha === juego.fecha)?.resultados
      : undefined;

  /** Otro torneo donde todavía no he jugado hoy, para encadenar partidas. */
  const siguientePendiente = torneos.find((t) => {
    if (t.id === activo.id || !uid) return false;
    const dia = (jornadas[t.id] ?? []).find((d) => d.fecha === juego.fecha);
    return !dia?.resultados?.[uid];
  });

  // En el ordenador se juega con el teclado de verdad, no a base de clics.
  //
  // `enfocada` es imprescindible: la navegación deja esta pantalla montada al
  // abrir otra encima, y sin la comprobación seguiría comiéndose las teclas
  // mientras juegas un duelo.
  const enfocada = useIsFocused();
  const destello = useTecladoFisico({
    escribir: juego.escribir,
    borrar: juego.borrar,
    enviar: juego.enviar,
    activo: !terminada && !yaHecha && enfocada,
  });
  const jornada =
    activo.tipo === 'torneo'
      ? numeroJornada(juego.fecha, activo.torneo.fechaInicio)
      : numeroJornada(juego.fecha);

  function pulsar(tecla: string) {
    if (tecla === TECLA_ENTER) juego.enviar();
    else if (tecla === TECLA_BORRAR) juego.borrar();
    else juego.escribir(tecla);
  }

  async function compartir() {
    const patron = patronCompartible(juego.intentos, juego.solucion);
    const cabecera =
      `${activo.nombre} · jornada ${jornada} — ` +
      `${juego.estado === 'ganada' ? `${juego.intentos.length}/6` : 'X/6'} · ${juego.puntos} pts`;
    try {
      await Share.share({ message: `${cabecera}\n\n${patron}` });
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <View style={estilos.cabecera}>
        <Pressable
          onPress={volver}
          hitSlop={12}
          accessibilityLabel="Volver"
          accessibilityRole="button"
        >
          <Texto style={estilos.icono}>←</Texto>
        </Pressable>

        <Pressable
          onPress={() => setSelectorAbierto(true)}
          style={estilos.centro}
          accessibilityRole="button"
          accessibilityLabel={`Torneo activo: ${activo.nombre}. Tocar para cambiar`}
        >
          <Texto style={estilos.nombreTorneo} numberOfLines={1}>
            {activo.nombre} <Texto style={estilos.flecha}>▾</Texto>
          </Texto>
          <Texto style={estilos.subtitulo}>
            Jornada {jornada} · {fechaLarga(juego.fecha)}
          </Texto>
        </Pressable>

        <Pressable
          onPress={irAPerfil}
          hitSlop={12}
          accessibilityLabel="Perfil y reglas"
          accessibilityRole="button"
        >
          <Avatar avatar={avatar} lado={30} />
        </Pressable>
      </View>

      {esLibre && (
        <Pressable onPress={() => setSelectorAbierto(true)} style={estilos.bandaLibre}>
          <Texto style={estilos.textoLibre}>
            Estás en modo libre: esta partida no puntúa. Toca para elegir un torneo.
          </Texto>
        </Pressable>
      )}

      {/* La palabra impuesta del intento en curso, venga de ir primero o de que
          te hayan disparado. El tablero no distingue: sólo obedece. */}
      {juego.obligacion && juego.obligacion.motivo === 'lider' && (
        <View style={estilos.bandaPenalizacion}>
          <Texto style={estilos.textoPenalizacion}>
            Lideras {activo.nombre} en solitario. Abre con una de estas:
          </Texto>
          <Texto style={estilos.palabrasPenalizacion}>
            {juego.obligacion.palabras.map((p) => p.toUpperCase()).join(' · ')}
          </Texto>
        </View>
      )}

      {juego.obligacion && juego.obligacion.motivo === 'blueshell' && (
        <View style={estilos.bandaBlueshell}>
          <Texto style={estilos.textoBlueshell}>
            Blueshell de {juego.autorObligacion}. Tu palabra {juego.obligacion.indice + 1}.ª
            tiene que ser:
          </Texto>
          <Texto style={estilos.palabrasPenalizacion}>
            {juego.obligacion.palabras[0].toUpperCase()}
          </Texto>
        </View>
      )}

      {/* Avisar de las que están por venir, para que nadie se lleve la sorpresa
          al segundo intento con la protección ya sin usar. */}
      {juego.balasPendientes > 0 && juego.obligacion?.motivo !== 'blueshell' && (
        <View style={estilos.bandaBlueshell}>
          <Texto style={estilos.textoBlueshell}>
            {juego.balasPendientes === 1
              ? 'Te han lanzado una blueshell: te impondrá la palabra 2.ª.'
              : `Te han lanzado ${juego.balasPendientes} blueshells: te impondrán las palabras siguientes.`}
          </Texto>
        </View>
      )}

      {juego.puedeProtegerse && (
        <Pressable
          onPress={juego.protegerse}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.escudo, pressed && { opacity: 0.7 }]}
        >
          <Texto style={estilos.textoEscudo}>
            Gastar mi protección y anular{' '}
            {juego.balasPendientes === 1 ? 'la blueshell' : 'las blueshells'} de hoy
          </Texto>
        </Pressable>
      )}

      {/* Jornada ya publicada desde otro navegador. La partida se guarda en cada
          móvil por separado, así que aquí el tablero saldría en blanco y
          tentaría a repetirla; el servidor la rechazaría igual. */}
      {yaHecha && (
        <ScrollView contentContainerStyle={estilos.contenidoHecha}>
          <Texto style={estilos.tituloHecha}>Jornada hecha</Texto>
          <Texto style={estilos.textoHecha}>
            Ya jugaste esta palabra en {activo.nombre}, desde este u otro navegador. Se
            juega una vez y cuenta la primera.
          </Texto>

          <View style={estilos.marcadorHecha}>
            <View style={estilos.datoHecha}>
              <Texto style={estilos.cifraHecha}>
                {yaHecha.acertada ? `${yaHecha.intentos}/6` : 'X/6'}
              </Texto>
              <Texto style={estilos.etiquetaHecha}>intentos</Texto>
            </View>
            <View style={estilos.datoHecha}>
              <Texto style={[estilos.cifraHecha, { color: colores.oro }]}>
                {yaHecha.puntos}
              </Texto>
              <Texto style={estilos.etiquetaHecha}>
                {yaHecha.puntos === 1 ? 'punto' : 'puntos'}
              </Texto>
            </View>
          </View>

          {!!yaHecha.patron && <Texto style={estilos.patronHecha}>{yaHecha.patron}</Texto>}

          <Boton
            titulo="Ver la clasificación"
            onPress={() => irAClasificacion(activo.id)}
          />
          <Boton titulo="Volver" variante="secundario" onPress={volver} />
        </ScrollView>
      )}

      {/* El aviso vive en su propia franja, encima del tablero: antes se
          superponía y tapaba la primera fila al terminar la partida. */}
      {!yaHecha && (
      <View style={estilos.franjaAviso}>
        <Aviso mensaje={juego.aviso} />
      </View>
      )}

      {!yaHecha && (
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
          intentos={juego.intentos}
          borrador={juego.borrador}
          cursor={juego.cursor}
          solucion={juego.solucion}
          filaAnimada={juego.filaAnimada}
          temblor={juego.temblor}
          onCasilla={juego.irACasilla}
          ancho={hueco.ancho}
          alto={hueco.alto}
        />
      </View>
      )}

      {yaHecha ? null : terminada ? (
        <ScrollView
          style={estilos.panelFinal}
          contentContainerStyle={[
            estilos.contenidoFinal,
            { paddingBottom: insets.bottom + espaciado.md },
          ]}
        >
          <Texto style={estilos.tituloFinal}>
            {juego.estado === 'ganada'
              ? `¡Acertada en ${juego.intentos.length}!`
              : 'Hoy no ha podido ser'}
          </Texto>
          <Texto style={estilos.palabraFinal}>{juego.solucion.toUpperCase()}</Texto>

          {!esLibre && (
            <View style={estilos.marcadorFinal}>
              <Texto style={estilos.puntosFinal}>{juego.puntos}</Texto>
              <Texto style={estilos.etiquetaPuntos}>
                {juego.puntos === 1 ? 'punto' : 'puntos'} en {activo.nombre}
              </Texto>
            </View>
          )}

          {esLibre && (
            <Texto style={estilos.avisoLibre}>
              En modo libre no hay puntos. Entra en un torneo para competir.
            </Texto>
          )}

          <Texto style={estilos.cuentaAtras}>Palabra nueva {cuentaAtras}</Texto>

          {/* Quién ha jugado ya hoy en este torneo, para no tener que ir a
              mirarlo a la clasificación. */}
          {activo.tipo === 'torneo' && (
            <View style={estilos.listaHoy}>
              {activo.torneo.miembros.map((miembro) => {
                const jugado = resultadosDeHoy?.[miembro];
                const perfil = activo.torneo.perfiles?.[miembro];
                return (
                  <View key={miembro} style={estilos.filaHoy}>
                    <Texto style={estilos.nombreHoy} numberOfLines={1}>
                      {perfil?.nombre ?? 'Jugador'}
                    </Texto>
                    <Texto style={jugado ? estilos.jugado : estilos.pendiente}>
                      {jugado
                        ? `${jugado.acertada ? `${jugado.intentos}/6` : 'X/6'} · ${jugado.puntos} pts`
                        : 'sin jugar'}
                    </Texto>
                  </View>
                );
              })}
            </View>
          )}

          <View style={estilos.botonesFinal}>
            <Boton titulo="Compartir" onPress={compartir} estilo={{ flex: 1 }} />
            <Boton
              titulo={esLibre ? 'Torneos' : 'Clasificación'}
              variante="secundario"
              onPress={() => (esLibre ? irATorneos() : irAClasificacion(activo.id))}
              estilo={{ flex: 1 }}
            />
          </View>

          {siguientePendiente && (
            <Boton
              titulo={`Jugar en ${siguientePendiente.nombre}`}
              variante="secundario"
              onPress={() => elegirTorneo(siguientePendiente.id)}
            />
          )}

          <Texto style={estilos.leyenda}>
            {PUNTOS_POR_INTENTO.map((p, i) => `${i + 1}º = ${p}`).join('  ·  ')}  ·  fallo = 0
          </Texto>
        </ScrollView>
      ) : (
        <Teclado estado={juego.teclado} onTecla={pulsar} destello={destello} />
      )}

      {!terminada && <View style={{ height: insets.bottom }} />}

      <SelectorTorneo
        visible={selectorAbierto}
        cerrar={() => setSelectorAbierto(false)}
        irATorneos={irATorneos}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenidoHecha: {
    padding: espaciado.lg,
    gap: espaciado.md,
    alignItems: 'center',
  },
  tituloHecha: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textoHecha: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 340,
  },
  marcadorHecha: {
    flexDirection: 'row',
    gap: espaciado.xl,
    marginVertical: espaciado.md,
  },
  datoHecha: {
    alignItems: 'center',
  },
  cifraHecha: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.cifra,
  },
  etiquetaHecha: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  patronHecha: {
    fontSize: escala.medio,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: espaciado.sm,
  },
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    gap: espaciado.sm,
  },
  icono: {
    fontFamily: fuentes.cuerpo,
    fontSize: escala.grande,
    color: colores.texto,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
  },
  nombreTorneo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  flecha: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  subtitulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: 3,
  },
  franjaAviso: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    paddingTop: espaciado.sm,
  },
  bandaLibre: {
    backgroundColor: 'rgba(90, 169, 230, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: colores.acento,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  textoLibre: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    textAlign: 'center',
  },
  bandaPenalizacion: {
    backgroundColor: 'rgba(226, 163, 3, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: colores.presente,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  textoPenalizacion: {
    color: colores.presente,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    textAlign: 'center',
  },
  bandaBlueshell: {
    backgroundColor: 'rgba(40, 200, 224, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: colores.acento,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  textoBlueshell: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  escudo: {
    marginHorizontal: espaciado.md,
    marginTop: espaciado.sm,
    paddingVertical: 10,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.acento,
    alignItems: 'center',
  },
  textoEscudo: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  palabrasPenalizacion: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 5,
  },
  zonaTablero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.md,
    paddingHorizontal: espaciado.lg,
    overflow: 'hidden',
  },
  panelFinal: {
    maxHeight: '52%',
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  contenidoFinal: {
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  tituloFinal: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textAlign: 'center',
  },
  palabraFinal: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 6,
    textAlign: 'center',
  },
  marcadorFinal: {
    alignItems: 'center',
  },
  puntosFinal: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.cifra,
    lineHeight: 48,
  },
  etiquetaPuntos: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  avisoLibre: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    textAlign: 'center',
  },
  cuentaAtras: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  listaHoy: {
    backgroundColor: colores.fondo,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    gap: 6,
  },
  filaHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  nombreHoy: {
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    flex: 1,
  },
  jugado: {
    color: colores.correcta,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  pendiente: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    fontStyle: 'italic',
  },
  botonesFinal: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  leyenda: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
});
