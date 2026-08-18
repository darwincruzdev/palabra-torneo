import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { colores, espaciado, radio } from '../tema';

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
        <Text style={estilos.tituloGrande}>Ese duelo no existe</Text>
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
        <Text style={estilos.tituloGrande}>Esperando al rival</Text>
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
    const { palabra, cuenta } = duelo.transicion;
    return (
      <View style={estilos.centrado}>
        <Text style={estilos.laPalabraEra}>La palabra era</Text>
        <Text style={estilos.palabraTransicion}>{palabra.toUpperCase()}</Text>

        {cuenta !== null && (
          <>
            <Text style={estilos.cuentaAtras}>{cuenta}</Text>
            <Sutil>Preparado para la siguiente…</Sutil>
          </>
        )}
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
        <Text style={estilos.tituloGrande}>
          {veredicto.empate
            ? '¡Empate!'
            : veredicto.uid === uid
              ? '¡Has ganado!'
              : 'Has perdido'}
        </Text>

        <Tarjeta>
          <View style={estilos.filaResultado}>
            <Text style={estilos.etiquetaResultado}>Tú</Text>
            <Text style={estilos.puntosResultado}>{mio.puntos}</Text>
          </View>
          <Sutil>
            {mio.acertadas} de {PALABRAS_POR_DUELO} acertadas · {mio.intentosTotales}{' '}
            intentos
          </Sutil>
          <View style={estilos.separador} />
          <View style={estilos.filaResultado}>
            <Text style={estilos.etiquetaResultado}>{duelo.rival?.nombre ?? 'Rival'}</Text>
            <Text style={estilos.puntosResultado}>{suyo.puntos}</Text>
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
   * las arregla mientras se le acaban los quince segundos.
   */
  if (duelo.esperando) {
    return (
      <ScrollView contentContainerStyle={estilos.contenidoEspera}>
        <Text style={estilos.tituloGrande}>
          {duelo.elCerroLaRonda ? 'Palabra cerrada' : 'Le toca correr'}
        </Text>
        <Text style={estilos.laPalabraEra}>
          La palabra era <Text style={estilos.palabraEra}>{duelo.solucion.toUpperCase()}</Text>
        </Text>
        <Sutil>
          Palabra {duelo.indice + 1} de {PALABRAS_POR_DUELO} · llevas {mio.puntos} puntos
        </Sutil>

        {/* Aquí sí se ven sus letras: yo ya cerré esta palabra, así que no me
            destripa nada, y ver cómo se pelea es media gracia del duelo. */}
        <Text style={estilos.nombreRival}>{duelo.rival?.nombre ?? 'Rival'}</Text>
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
        <Text style={estilos.puntosRival}>{duelo.suyo.puntos} pts</Text>

        <Text style={estilos.avisoEspera}>
          {duelo.elCerroLaRonda
            ? 'Los dos habéis cerrado. Empieza la siguiente…'
            : `Tiene ${SEGUNDOS_FINAL} segundos desde que cerraste tú.`}
        </Text>

        <Boton titulo="Salir del duelo" variante="peligro" onPress={volver} />
      </ScrollView>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <View style={estilos.cabecera}>
        <View>
          <Text style={estilos.palabraActual}>
            Palabra {duelo.indice + 1} de {PALABRAS_POR_DUELO}
          </Text>
          <Text style={estilos.misPuntos}>{mio.puntos} puntos</Text>
        </View>

        {duelo.segundos !== null && (
          <View style={estilos.reloj}>
            <Text style={estilos.segundos}>{duelo.segundos}</Text>
            <Text style={estilos.etiquetaReloj}>segundos</Text>
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
    </View>
  );
}

const estilos = StyleSheet.create({
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
    fontSize: 17,
    fontWeight: '800',
    marginTop: espaciado.sm,
  },
  laPalabraEra: {
    color: colores.textoSuave,
    fontSize: 15,
    textAlign: 'center',
  },
  palabraEra: {
    color: colores.correcta,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 3,
  },
  palabraTransicion: {
    color: colores.correcta,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
  },
  cuentaAtras: {
    color: colores.presente,
    fontSize: 76,
    fontWeight: '900',
    lineHeight: 84,
    marginTop: espaciado.lg,
  },
  puntosRival: {
    color: colores.oro,
    fontSize: 18,
    fontWeight: '900',
  },
  avisoEspera: {
    color: colores.presente,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tituloGrande: {
    color: colores.texto,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  puntosGrandes: {
    color: colores.oro,
    fontSize: 52,
    fontWeight: '900',
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
    fontSize: 17,
    fontWeight: '800',
  },
  misPuntos: {
    color: colores.oro,
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 24,
    fontWeight: '900',
  },
  etiquetaReloj: {
    color: colores.peligro,
    fontSize: 10,
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
    fontSize: 17,
    fontWeight: '800',
  },
  puntosResultado: {
    color: colores.oro,
    fontSize: 26,
    fontWeight: '900',
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
  },
});
