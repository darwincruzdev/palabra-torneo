import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '../components/Aviso';
import { MiniTablero } from '../components/MiniTablero';
import { Tablero } from '../components/Tablero';
import { TECLA_BORRAR, TECLA_ENTER, Teclado } from '../components/Teclado';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { PALABRAS_POR_DUELO, SEGUNDOS_FINAL, ganador, resumir } from '../game/duelo';
import { useApp } from '../estado/AppContext';
import { useDuelo } from '../estado/useDuelo';
import { useTecladoFisico } from '../estado/useTecladoFisico';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  dueloId: string;
  volver: () => void;
};

export function PantallaDuelo({ dueloId, volver }: Props) {
  const { uid } = useApp();
  const insets = useSafeAreaInsets();
  const duelo = useDuelo(dueloId, uid);
  const [hueco, setHueco] = useState({ ancho: 300, alto: 340 });
  const [espera, setEspera] = useState({ ancho: 260, alto: 320 });
  const [repaso, setRepaso] = useState({ ancho: 140, alto: 300 });

  const enfocada = useIsFocused();
  const destello = useTecladoFisico({
    escribir: duelo.escribir,
    borrar: duelo.borrar,
    enviar: duelo.enviar,
    activo: duelo.jugando && enfocada,
  });

  function pulsar(tecla: string) {
    if (tecla === TECLA_ENTER) duelo.enviar();
    else if (tecla === TECLA_BORRAR) duelo.borrar();
    else duelo.escribir(tecla);
  }

  if (duelo.cargando) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.correcta} size="large" />
      </View>
    );
  }

  if (!duelo.duelo) {
    return (
      <View style={estilos.centrado}>
        <Texto style={estilos.tituloGrande}>Ese duelo no existe</Texto>
        <Sutil>Puede que lo haya borrado quien lo creó.</Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  // Esperando a que el rival entre con el código.
  if (duelo.duelo.estado === 'esperando') {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.presente} />
        <Texto style={estilos.tituloGrande}>Esperando al rival</Texto>
        <Sutil>
          En cuanto entre con el código {duelo.duelo.codigo} empezáis los dos a la vez.
        </Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  const mio = resumir(duelo.mio.rejilla);

  /**
   * Paso de una palabra a la siguiente. La ven los dos casi a la vez, porque la
   * ronda sólo avanza cuando los dos han cerrado.
   */
  if (duelo.transicion) {
    const { palabra, mias, suyas } = duelo.transicion;
    return (
      <View style={estilos.repaso}>
        <Texto style={estilos.laPalabraEra}>La palabra era</Texto>
        <Texto style={estilos.palabraTransicion}>{palabra.toUpperCase()}</Texto>

        {/* Los dos tableros al lado, con las letras de cada uno: aquí es donde
            se ve quién tiró por dónde, que es media conversación después. */}
        <View
          style={estilos.dosTableros}
          onLayout={({ nativeEvent }) =>
            setRepaso({
              ancho: Math.max(60, (nativeEvent.layout.width - espaciado.md) / 2),
              alto: Math.max(80, nativeEvent.layout.height - 26),
            })
          }
        >
          <View style={estilos.columnaTablero}>
            <Texto style={estilos.nombreTablero}>Tú</Texto>
            <Tablero
              intentos={mias}
              borrador={[]}
              cursor={-1}
              solucion={palabra}
              filaAnimada={null}
              temblor={0}
              onCasilla={() => {}}
              ancho={repaso.ancho}
              alto={repaso.alto}
            />
          </View>

          <View style={estilos.columnaTablero}>
            <Texto style={estilos.nombreTablero} numberOfLines={1}>
              {duelo.rival?.nombre ?? 'Rival'}
            </Texto>
            <Tablero
              intentos={suyas}
              borrador={[]}
              cursor={-1}
              solucion={palabra}
              filaAnimada={null}
              temblor={0}
              onCasilla={() => {}}
              ancho={repaso.ancho}
              alto={repaso.alto}
            />
          </View>
        </View>
      </View>
    );
  }

  // Resultado final: los dos han cerrado todas. Se espera a que termine de
  // destaparse la última fila antes de enseñarlo.
  if (duelo.terminado && !duelo.revelando && uid) {
    const uidRival = duelo.duelo.jugadores.find((j) => j !== uid) ?? 'rival';
    const veredicto = ganador(
      { uid, rejilla: duelo.mio.rejilla },
      { uid: uidRival, rejilla: duelo.suyo.rejilla }
    );
    const suyo = resumir(duelo.suyo.rejilla);

    return (
      <ScrollView contentContainerStyle={estilos.contenidoFinal}>
        <Texto style={estilos.tituloGrande}>
          {veredicto.empate
            ? '¡Empate!'
            : veredicto.uid === uid
              ? '¡Has ganado!'
              : 'Has perdido'}
        </Texto>

        <Tarjeta>
          <View style={estilos.filaResultado}>
            <Texto style={estilos.etiquetaResultado}>Tú</Texto>
            <Texto style={estilos.puntosResultado}>{mio.puntos}</Texto>
          </View>
          <Sutil>
            {mio.acertadas} de {PALABRAS_POR_DUELO} acertadas · {mio.intentosTotales}{' '}
            intentos
          </Sutil>
          <View style={estilos.separador} />
          <View style={estilos.filaResultado}>
            <Texto style={estilos.etiquetaResultado}>{duelo.rival?.nombre ?? 'Rival'}</Texto>
            <Texto style={estilos.puntosResultado}>{suyo.puntos}</Texto>
          </View>
          <Sutil>
            {suyo.acertadas} de {PALABRAS_POR_DUELO} acertadas · {suyo.intentosTotales}{' '}
            intentos
          </Sutil>
        </Tarjeta>

        <Sutil>
          Con la misma puntuación gana quien haya gastado menos intentos.
        </Sutil>

        <Boton titulo="Volver" onPress={volver} />
      </ScrollView>
    );
  }

  /**
   * He cerrado mi palabra y espero al rival.
   *
   * Aquí se ve su rejilla en grande y en directo: es el momento de mirar cómo se
   * las arregla mientras se le acaban los treinta segundos.
   */
  if (duelo.esperando) {
    return (
      <ScrollView contentContainerStyle={estilos.contenidoEspera}>
        <Texto style={estilos.tituloGrande}>
          {duelo.elCerroLaRonda ? 'Palabra cerrada' : 'Le toca correr'}
        </Texto>
        <Texto style={estilos.laPalabraEra}>
          La palabra era <Texto style={estilos.palabraEra}>{duelo.solucion.toUpperCase()}</Texto>
        </Texto>
        <Sutil>
          Palabra {duelo.indice + 1} de {PALABRAS_POR_DUELO} · llevas {mio.puntos} puntos
        </Sutil>

        {/* Aquí sí se ven sus letras: yo ya cerré esta palabra, así que no me
            destripa nada, y ver cómo se pelea es media gracia del duelo. */}
        <Texto style={estilos.nombreRival}>{duelo.rival?.nombre ?? 'Rival'}</Texto>
        <View
          style={estilos.grandeRival}
          onLayout={({ nativeEvent }) =>
            setEspera({
              ancho: Math.min(nativeEvent.layout.width, 280),
              alto: nativeEvent.layout.height,
            })
          }
        >
          <Tablero
            intentos={duelo.susLetras}
            borrador={[]}
            cursor={-1}
            solucion={duelo.solucion}
            filaAnimada={null}
            temblor={0}
            onCasilla={() => {}}
            ancho={espera.ancho}
            alto={espera.alto}
          />
        </View>
        <Texto style={estilos.puntosRival}>{duelo.suyo.puntos} pts</Texto>

        <Texto style={estilos.avisoEspera}>
          {duelo.elCerroLaRonda
            ? 'Los dos habéis cerrado. Empieza la siguiente…'
            : `Tiene ${SEGUNDOS_FINAL} segundos desde que cerraste tú.`}
        </Texto>

        {/* Mientras el otro sufre, aquí no hay nada que hacer. Ahora sí: se le
            puede picar. No cambia el resultado, sólo los nervios. */}
        {!duelo.elCerroLaRonda && (
          <View style={estilos.zonaPullas}>
            <Texto style={estilos.tituloPullas}>Pícale</Texto>
            <View style={estilos.rejillaPullas}>
              {duelo.pullas.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => duelo.tirarPulla(emoji)}
                  disabled={duelo.recargando}
                  accessibilityRole="button"
                  accessibilityLabel={`Tirarle ${emoji}`}
                  style={({ pressed }) => [
                    estilos.botonPulla,
                    (pressed || duelo.recargando) && { opacity: 0.45 },
                  ]}
                >
                  <Texto style={estilos.emojiPulla}>{emoji}</Texto>
                </Pressable>
              ))}
            </View>
            {duelo.errorPulla && (
              <Texto style={estilos.errorPulla}>{duelo.errorPulla}</Texto>
            )}
          </View>
        )}

        <Boton titulo="Salir del duelo" variante="peligro" onPress={volver} />
      </ScrollView>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <View style={estilos.cabecera}>
        <View>
          <Texto style={estilos.palabraActual}>
            Palabra {duelo.indice + 1} de {PALABRAS_POR_DUELO}
          </Texto>
          <Texto style={estilos.misPuntos}>{mio.puntos} puntos</Texto>
        </View>

        {duelo.segundos !== null && (
          <View style={estilos.reloj}>
            <Texto style={estilos.segundos}>{duelo.segundos}</Texto>
            <Texto style={estilos.etiquetaReloj}>segundos</Texto>
          </View>
        )}
      </View>

      <View style={estilos.zonaJuego}>
        <View
          style={estilos.zonaTablero}
          onLayout={({ nativeEvent }) =>
            setHueco({
              ancho: Math.min(nativeEvent.layout.width, 300),
              alto: nativeEvent.layout.height,
            })
          }
        >
          <Tablero
            intentos={duelo.intentos}
            borrador={duelo.borrador}
            cursor={duelo.cursor}
            solucion={duelo.solucion}
            filaAnimada={duelo.filaAnimada}
            temblor={duelo.temblor}
            onCasilla={duelo.irACasilla}
            ancho={hueco.ancho}
            alto={hueco.alto}
          />
        </View>

        {duelo.rival && (
          <MiniTablero
            codificado={duelo.suRejilla}
            palabra={duelo.indice}
            total={PALABRAS_POR_DUELO}
            puntos={duelo.suyo.puntos}
            nombre={duelo.rival.nombre}
            terminado={duelo.elCerroLaRonda}
          />
        )}
      </View>

      <View style={estilos.franjaAviso}>
        <Aviso mensaje={duelo.aviso} />
      </View>

      <Teclado estado={duelo.teclado} onTecla={pulsar} destello={destello} />
      <View style={{ height: insets.bottom }} />

      <PullaRecibida emoji={duelo.pulla} nombre={duelo.rival?.nombre} />
    </View>
  );
}

/**
 * La carita que te tira el rival, encima de todo y sin tocar nada.
 *
 * Entra dando un bote y se va sola. Va con `pointerEvents="none"` para que no
 * robe ni una pulsación del teclado: bastante fastidia ya.
 */
function PullaRecibida({ emoji, nombre }: { emoji: string | null; nombre?: string }) {
  const animacion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animacion, {
      toValue: emoji ? 1 : 0,
      useNativeDriver: true,
      friction: 5,
      tension: 120,
    }).start();
  }, [emoji, animacion]);

  if (!emoji) return null;

  return (
    <Animated.View
      style={[
        estilos.pullaRecibida,
        {
          opacity: animacion,
          transform: [
            { scale: animacion.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Texto style={estilos.emojiRecibido}>{emoji}</Texto>
      <Texto style={estilos.deQuien}>de {nombre ?? 'tu rival'}</Texto>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  repaso: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    // Márgenes cortos a los lados a propósito: con dos tableros repartiéndose
    // el ancho, cada píxel que se le quite al borde se le da a las letras.
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.lg,
  },
  dosTableros: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: espaciado.md,
    width: '100%',
    marginTop: espaciado.md,
  },
  columnaTablero: {
    flex: 1,
    alignItems: 'center',
    gap: espaciado.xs,
  },
  nombreTablero: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  errorPulla: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
    maxWidth: 260,
  },
  zonaPullas: {
    alignItems: 'center',
    gap: espaciado.sm,
    marginVertical: espaciado.md,
  },
  tituloPullas: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  rejillaPullas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  botonPulla: {
    width: 54,
    height: 54,
    borderRadius: radio.md,
    backgroundColor: colores.elevado,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPulla: {
    fontFamily: fuentes.cuerpo,
    fontSize: escala.titulo,
    lineHeight: 34,
  },
  pullaRecibida: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emojiRecibido: {
    fontFamily: fuentes.cuerpo,
    fontSize: escala.cifraGrande,
    lineHeight: 112,
  },
  deQuien: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: espaciado.xs,
  },
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.xl,
    backgroundColor: colores.fondo,
  },
  contenidoFinal: {
    padding: espaciado.lg,
    gap: espaciado.md,
    justifyContent: 'center',
    flexGrow: 1,
  },
  contenidoEspera: {
    padding: espaciado.lg,
    gap: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  grandeRival: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: espaciado.sm,
  },
  nombreRival: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: espaciado.sm,
  },
  laPalabraEra: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    textAlign: 'center',
  },
  palabraEra: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 3,
  },
  palabraTransicion: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.cifra,
    letterSpacing: 8,
    textAlign: 'center',
  },
  puntosRival: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
  avisoEspera: {
    color: colores.presente,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
    lineHeight: 20,
  },
  tituloGrande: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  puntosGrandes: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.cifra,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  palabraActual: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  misPuntos: {
    color: colores.oro,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
    marginTop: 2,
  },
  reloj: {
    alignItems: 'center',
    backgroundColor: 'rgba(224, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: colores.peligro,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: 4,
  },
  segundos: {
    color: colores.peligro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  etiquetaReloj: {
    color: colores.peligro,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  zonaJuego: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
  },
  zonaTablero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaciado.sm,
    overflow: 'hidden',
  },
  franjaAviso: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
  filaResultado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etiquetaResultado: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  puntosResultado: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
  },
});
