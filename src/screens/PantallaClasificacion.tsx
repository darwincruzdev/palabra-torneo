import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { Avatar } from '../components/Avatar';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { Confirmacion } from '../components/Confirmacion';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego, fechaLarga, sumarDias } from '../game/fecha';
import {
  contenidoQr,
  enlaceDeInvitacion,
  enlaceDeLaApp,
  enlaceWhatsapp,
  hayEnlaces,
  mensajeDeInvitacion,
} from '../game/invitacion';
import { PUNTOS_POR_FALTA } from '../game/constantes';
import {
  JORNADAS_POR_CICLO,
  blueshellsContra,
  estaProtegido,
  mensajeDeBlueshell,
} from '../game/reglas';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  torneoId: string;
  volver: () => void;
  irAJugar: () => void;
  irAHistorial: () => void;
};

const MEDALLAS = [colores.oro, colores.plata, colores.bronce];

export function PantallaClasificacion({
  torneoId,
  volver,
  irAJugar,
  irAHistorial,
}: Props) {
  const {
    torneos,
    jornadas,
    uid,
    salir,
    activo,
    elegirTorneo,
    reglasDe,
    blueshellsDe,
    lanzarBlueshell,
    cambiarReglas,
    reiniciarTorneo,
  } = useApp();
  const [copiado, setCopiado] = useState<'codigo' | 'enlace' | null>(null);
  const [qrAbierto, setQrAbierto] = useState(false);
  /** Qué se está preguntando ahora mismo, si es que se pregunta algo. */
  const [preguntando, setPreguntando] = useState<'salir' | 'reiniciar' | null>(null);
  const [palabraBala, setPalabraBala] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [lanzando, setLanzando] = useState(false);
  const [errorBala, setErrorBala] = useState<string | null>(null);
  const [lanzada, setLanzada] = useState<{ objetivo: string; palabra: string } | null>(
    null
  );

  const torneo = torneos.find((t) => t.id === torneoId);
  const dias = jornadas[torneoId] ?? [];
  const hoy = fechaJuego();

  const filas = useMemo(() => (torneo ? clasificacion(torneo, dias) : []), [torneo, dias]);
  const liderHoy = useMemo(
    () => (torneo ? liderDestacado(clasificacion(torneo, dias, hoy)) : null),
    [torneo, dias, hoy]
  );

  const jornadaHoy = dias.find((d) => d.fecha === hoy);
  const yaJugueHoy = Boolean(uid && jornadaHoy?.resultados?.[uid]);

  const nombreDe = (miembro: string) =>
    torneo?.perfiles?.[miembro]?.nombre ?? 'Jugador';

  const jornadaManana = dias.find((d) => d.fecha === sumarDias(hoy, 1));

  /**
   * Lo que le está cayendo encima a alguien, que no es lo mismo que la munición
   * que le queda.
   *
   * La fila sólo habla cuando hay algo que contar: llevar la bala sin gastar no
   * es noticia, y un símbolo permanente en cada jugador era sólo ruido.
   */
  const balasSobre = (miembro: string) => {
    const recibidas = blueshellsContra(jornadaHoy, miembro).length;
    const protegido = estaProtegido(jornadaHoy, miembro);
    return {
      /** Las que le han caído, las pare o no. Se enseñan siempre. */
      recibidas,
      /** Las que le obligan hoy de verdad. */
      activas: protegido ? 0 : recibidas,
      /** Las que se comió el escudo. Es el número que da gusto enseñar. */
      bloqueadas: protegido ? recibidas : 0,
      protegido,
      /** Ya disparadas, le caen mañana. */
      enCamino: blueshellsContra(jornadaManana, miembro).length,
    };
  };

  const reglas = reglasDe(torneoId);
  const balas = blueshellsDe(torneoId);
  const esFundador = Boolean(torneo && uid === torneo.propietario);
  const nombreLider = balas.lider
    ? (torneo?.perfiles?.[balas.lider]?.nombre ?? 'quien va primero')
    : null;

  if (!torneo) {
    return (
      <View style={estilos.vacio}>
        <Sutil>Este torneo ya no está disponible.</Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  async function copiar(que: 'codigo' | 'enlace') {
    if (!torneo) return;
    await Clipboard.setStringAsync(
      que === 'codigo' ? torneo.codigo : enlaceDeInvitacion(torneo.codigo)
    );
    setCopiado(que);
    setTimeout(() => setCopiado(null), 1600);
  }

  async function invitar() {
    if (!torneo) return;
    try {
      await Share.share({ message: mensajeDeInvitacion(torneo.nombre, torneo.codigo) });
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }

  /**
   * Dispara la bala. Se pide confirmación tocando dos veces en vez de con un
   * diálogo del sistema porque en la web esos diálogos no salen, y la bala es
   * de un solo uso cada quince jornadas: no vale gastarla por un roce.
   */
  async function dispararBala() {
    if (!torneo) return;
    if (!confirmando) {
      setConfirmando(true);
      return;
    }
    setErrorBala(null);
    setLanzando(true);
    try {
      setLanzada(await lanzarBlueshell(torneo.id, palabraBala));
      setPalabraBala('');
      setConfirmando(false);
    } catch (e) {
      setErrorBala(e instanceof Error ? e.message : 'No se ha podido lanzar la blueshell');
      setConfirmando(false);
    } finally {
      setLanzando(false);
    }
  }

  /** Abre WhatsApp con la pulla escrita, para calentar al grupo. */
  function contarlo() {
    if (!torneo || !lanzada) return;
    const texto = mensajeDeBlueshell({
      torneo: torneo.nombre,
      autor: nombreDe(uid ?? ''),
      objetivo: nombreDe(lanzada.objetivo),
      palabra: lanzada.palabra,
      enlace: enlaceDeLaApp() || undefined,
    });
    Linking.openURL(enlaceWhatsapp(texto)).catch(() => {});
  }

  function alternarRegla(
    cual: 'penalizacionLider' | 'blueshells' | 'faltaPorNoJugar',
    valor: boolean
  ) {
    if (!torneo) return;
    cambiarReglas(torneo.id, { ...reglas, [cual]: valor }).catch(() => {});
  }

  async function salirDeVerdad() {
    if (!torneo) return;
    setPreguntando(null);
    await salir(torneo.id);
    volver();
  }

  async function reiniciarDeVerdad() {
    if (!torneo) return;
    setPreguntando(null);
    await reiniciarTorneo(torneo.id).catch(() => {});
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <Titulo>{torneo.nombre}</Titulo>

      {/* Lo primero de la pantalla: poder ir a jugar. Antes entrabas a mirar la
          clasificación y te quedabas ahí sin manera de llegar al tablero. */}
      <Boton
        titulo={yaJugueHoy ? 'Ver mi palabra de hoy' : 'Jugar la palabra de hoy'}
        onPress={() => {
          elegirTorneo(torneo.id);
          irAJugar();
        }}
      />

      {reglas.blueshells && (
        <Tarjeta acento={colores.acento}>
          <Sutil>Tu blueshell</Sutil>

          {balas.recibidas.length > 0 && (
            <Texto style={estilos.recibidas}>
              {balas.protegido
                ? `Te lanzaron ${balas.recibidas.length} ${balas.recibidas.length === 1 ? 'bala' : 'balas'}, pero hoy vas protegido.`
                : `Hoy te han caído ${balas.recibidas.length} ${balas.recibidas.length === 1 ? 'blueshell' : 'blueshells'}. La protección se gasta desde el tablero.`}
            </Texto>
          )}

          {lanzada && (
            <View style={estilos.lanzada}>
              <Texto style={estilos.lanzadaTitulo}>Bala lanzada</Texto>
              <Texto style={estilos.explicacion}>
                Mañana <Texto style={estilos.destacado}>{nombreDe(lanzada.objetivo)}</Texto>{' '}
                tendrá que usar{' '}
                <Texto style={estilos.destacado}>{lanzada.palabra.toUpperCase()}</Texto> como
                segunda palabra. Que se entere el grupo.
              </Texto>
              <Boton titulo="Contarlo por WhatsApp" onPress={contarlo} />
            </View>
          )}

          {balas.puedoLanzar ? (
            <>
              <Texto style={estilos.explicacion}>
                Tienes una bala por cada {JORNADAS_POR_CICLO} jornadas. Si la disparas,
                mañana <Texto style={estilos.destacado}>{nombreLider}</Texto> estará obligado a
                usar esta palabra en su segundo intento.
              </Texto>
              <TextInput
                value={palabraBala}
                onChangeText={(texto) => {
                  setPalabraBala(texto.toUpperCase().replace(/[^A-ZÑÁÉÍÓÚÜ]/g, ''));
                  setConfirmando(false);
                  setErrorBala(null);
                }}
                placeholder="SOSOS"
                placeholderTextColor={colores.textoSuave}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={5}
                style={estilos.campoBala}
              />
              {errorBala && <Texto style={estilos.errorBala}>{errorBala}</Texto>}
              <Boton
                titulo={
                  confirmando ? `¿Seguro? Toca otra vez` : `Lanzar a ${nombreLider}`
                }
                variante={confirmando ? 'peligro' : 'secundario'}
                cargando={lanzando}
                deshabilitado={palabraBala.length < 5}
                onPress={dispararBala}
              />
            </>
          ) : (
            <Texto style={estilos.explicacion}>{balas.impedimento}</Texto>
          )}

          <Texto style={estilos.recarga}>
            Bala y protección se recargan en {balas.paraRecargar}{' '}
            {balas.paraRecargar === 1 ? 'jornada' : 'jornadas'}.
          </Texto>
        </Tarjeta>
      )}

      <Texto style={estilos.encabezado}>Clasificación general</Texto>
      <Tarjeta estilo={{ padding: 0 }}>
        {filas.map((fila, i) => {
          const balas = balasSobre(fila.uid);
          return (
          <Escudable key={fila.uid} activo={balas.protegido}>
          <View
            style={[
              estilos.filaTabla,
              i < filas.length - 1 && !balas.protegido && estilos.conSeparador,
              fila.uid === uid && estilos.filaPropia,
            ]}
          >
            <Texto
              style={[estilos.puesto, i < 3 && fila.puntos > 0 && { color: MEDALLAS[i] }]}
            >
              {i + 1}
            </Texto>
            <Avatar avatar={fila.avatar} lado={34} />
            <View style={{ flex: 1 }}>
              <View style={estilos.lineaNombre}>
                <Texto style={estilos.nombreJugador} numberOfLines={1}>
                  {fila.nombre}
                  {fila.uid === uid ? ' (tú)' : ''}
                  {fila.uid === liderHoy ? ' 🎯' : ''}
                </Texto>

                {/* Las balas se enseñan aunque estén paradas: tachadas al lado
                    del escudo se ve de un vistazo lo que se ha quitado de
                    encima, que con un 🛡️ ×2 a secas había que deducirlo. */}
                {reglas.blueshells && balas.recibidas > 0 && (
                  <View
                    style={[
                      estilos.chapa,
                      balas.protegido ? estilos.chapaAnulada : estilos.chapaBala,
                    ]}
                  >
                    <Texto style={[estilos.simbolo, balas.protegido && estilos.tachado]}>
                      🔵
                    </Texto>
                    <Texto
                      style={[
                        balas.protegido ? estilos.cuentaAnulada : estilos.cuentaBala,
                        balas.protegido && estilos.tachado,
                      ]}
                    >
                      ×{balas.recibidas}
                    </Texto>
                  </View>
                )}

                {reglas.blueshells && balas.protegido && (
                  <View style={[estilos.chapa, estilos.chapaEscudo]}>
                    <Texto style={estilos.simbolo}>🛡️</Texto>
                  </View>
                )}

                {reglas.blueshells && balas.enCamino > 0 && (
                  <View style={[estilos.chapa, estilos.chapaCamino]}>
                    <Texto style={estilos.simbolo}>🔵</Texto>
                    <Texto style={estilos.cuentaCamino}>×{balas.enCamino} mañana</Texto>
                  </View>
                )}
              </View>
              <Texto style={estilos.detalleJugador}>
                {fila.jugadas} {fila.jugadas === 1 ? 'jornada' : 'jornadas'} ·{' '}
                {fila.aciertos} {fila.aciertos === 1 ? 'acierto' : 'aciertos'}
                {fila.mediaIntentos !== null &&
                  ` · ${fila.mediaIntentos.toFixed(1)} de media`}
                {fila.faltas > 0 && (
                  <Texto style={estilos.falta}>
                    {' '}
                    · {fila.faltas} {fila.faltas === 1 ? 'falta' : 'faltas'} (
                    {fila.faltas * PUNTOS_POR_FALTA})
                  </Texto>
                )}
                {balas.bloqueadas > 0 && (
                  <Texto style={estilos.escudoHoy}>
                    {' '}
                    · escudo usado, {balas.bloqueadas}{' '}
                    {balas.bloqueadas === 1 ? 'bala anulada' : 'balas anuladas'}
                  </Texto>
                )}
                {balas.protegido && balas.bloqueadas === 0 && (
                  <Texto style={estilos.escudoHoy}> · escudo usado hoy</Texto>
                )}
              </Texto>
            </View>
            <Texto style={estilos.puntosJugador}>{fila.puntos}</Texto>
          </View>
          </Escudable>
          );
        })}
      </Tarjeta>
      {reglas.blueshells && (
        <Sutil>
          🔵 son las balas que le caen encima a alguien. Tachadas y con 🛡️ al lado,
          que las ha parado todas con su escudo; el recuadro le late para que se vea.
          Cada uno tiene una bala y un escudo por cada {JORNADAS_POR_CICLO} jornadas.
        </Sutil>
      )}

      {liderHoy && reglas.penalizacionLider && (
        <Sutil>
          🎯 marca a quien lidera en solitario: hoy está obligado a abrir con una de las
          cinco palabras de penalización.
        </Sutil>
      )}

      <Texto style={estilos.encabezado}>Hoy · {fechaLarga(hoy)}</Texto>
      <Tarjeta>
        {torneo.miembros.map((miembro) => {
          const resultado = jornadaHoy?.resultados?.[miembro];
          const perfil = torneo.perfiles?.[miembro];
          return (
            <View key={miembro} style={estilos.filaHoy}>
              <Texto style={estilos.nombreHoy}>
                {perfil?.nombre ?? 'Jugador'}
                {miembro === uid ? ' (tú)' : ''}
              </Texto>
              {resultado ? (
                <Texto style={estilos.resultadoHoy}>
                  {resultado.acertada ? `${resultado.intentos}/6` : 'X/6'} ·{' '}
                  <Texto style={estilos.puntosHoy}>
                    {resultado.puntos} pts
                  </Texto>
                </Texto>
              ) : (
                <Texto style={estilos.pendienteHoy}>sin jugar</Texto>
              )}
            </View>
          );
        })}
      </Tarjeta>

      {reglas.blueshells && (balas.enJuego.manana.length > 0 || balas.enJuego.hoy.length > 0) && (
        <>
          <Texto style={estilos.encabezado}>Blueshells</Texto>
          <Tarjeta acento={colores.acento}>
            {balas.enJuego.manana.length > 0 && (
              <>
                <Sutil>En el aire, caen mañana</Sutil>
                {balas.enJuego.manana.map((b) => (
                  <Texto key={`m-${b.autor}`} style={estilos.bala}>
                    <Texto style={estilos.destacado}>{nombreDe(b.autor)}</Texto> →{' '}
                    <Texto style={estilos.destacado}>{nombreDe(b.objetivo)}</Texto> ·{' '}
                    {b.palabra.toUpperCase()}
                  </Texto>
                ))}
              </>
            )}

            {balas.enJuego.hoy.length > 0 && (
              <>
                <View style={{ height: espaciado.sm }} />
                <Sutil>Caídas hoy</Sutil>
                {balas.enJuego.hoy.map((b) => (
                  <Texto key={`h-${b.autor}`} style={estilos.bala}>
                    <Texto style={estilos.destacado}>{nombreDe(b.autor)}</Texto> →{' '}
                    <Texto style={estilos.destacado}>{nombreDe(b.objetivo)}</Texto> ·{' '}
                    {b.palabra.toUpperCase()}
                    {jornadaHoy?.protecciones?.[b.objetivo] ? ' · anulada por el escudo' : ''}
                  </Texto>
                ))}
              </>
            )}
          </Tarjeta>
        </>
      )}

      <Tarjeta>
        <Sutil>Invitar a alguien</Sutil>

        <Pressable onPress={() => copiar('codigo')} accessibilityRole="button">
          <Texto style={estilos.codigo}>{torneo.codigo}</Texto>
        </Pressable>
        <Texto style={estilos.pista}>
          {copiado === 'codigo' ? '¡Código copiado!' : 'Toca el código para copiarlo'}
        </Texto>

        <View style={estilos.botonesInvitar}>
          <Boton titulo="Compartir enlace" onPress={invitar} estilo={{ flex: 1 }} />
          <Boton
            titulo={qrAbierto ? 'Ocultar QR' : 'Ver QR'}
            variante="secundario"
            onPress={() => setQrAbierto((v) => !v)}
            estilo={{ flex: 1 }}
          />
        </View>

        {qrAbierto && (
          <View style={estilos.zonaQr}>
            {/* Fondo blanco a propósito: los lectores de QR fallan con poco contraste. */}
            <View style={estilos.marcoQr}>
              <QRCode
                value={contenidoQr(torneo.codigo)}
                size={190}
                backgroundColor="#ffffff"
                color="#000000"
              />
            </View>
            <Sutil>Que lo enfoquen con la cámara del móvil.</Sutil>
          </View>
        )}

        {hayEnlaces ? (
          <Pressable onPress={() => copiar('enlace')} accessibilityRole="button">
            <Texto style={estilos.enlace} numberOfLines={1}>
              {copiado === 'enlace' ? '¡Enlace copiado!' : enlaceDeInvitacion(torneo.codigo)}
            </Texto>
          </Pressable>
        ) : (
          <Sutil>
            Configura EXPO_PUBLIC_URL_BASE con la dirección de tu web para repartir un
            enlace en vez del código suelto.
          </Sutil>
        )}
      </Tarjeta>

      <Texto style={estilos.encabezado}>Normas de la casa</Texto>
      <Tarjeta>
        <Regla
          titulo="Penalización al líder"
          descripcion="Quien termina una jornada primero en solitario abre la siguiente con una de las cinco palabras repetidas."
          valor={reglas.penalizacionLider}
          editable={esFundador}
          alCambiar={(v) => alternarRegla('penalizacionLider', v)}
        />
        <View style={estilos.separadorRegla} />
        <Regla
          titulo="Falta por no jugar"
          descripcion="Saltarse una jornada ya cerrada resta un punto. La de hoy no cuenta hasta medianoche, y no se cobran las anteriores a tu primera partida."
          valor={reglas.faltaPorNoJugar}
          editable={esFundador}
          alCambiar={(v) => alternarRegla('faltaPorNoJugar', v)}
        />
        <View style={estilos.separadorRegla} />
        <Regla
          titulo="Blueshells"
          descripcion={`Cada ${JORNADAS_POR_CICLO} jornadas, una bala para obligar al líder a usar una palabra concreta, y una protección para anular las que te tiren.`}
          valor={reglas.blueshells}
          editable={esFundador}
          alCambiar={(v) => alternarRegla('blueshells', v)}
        />
        {!esFundador && (
          <Texto style={estilos.soloFundador}>
            Sólo quien fundó el torneo puede cambiarlas.
          </Texto>
        )}
      </Tarjeta>

      <View style={{ height: espaciado.md }} />
      <Boton
        titulo="Ver jornadas anteriores"
        variante="secundario"
        onPress={irAHistorial}
      />

      <View style={{ height: espaciado.lg }} />

      {esFundador && (
        <Boton
          titulo="Reiniciar la competición"
          variante="secundario"
          onPress={() => setPreguntando('reiniciar')}
        />
      )}

      <Boton
        titulo="Salir del torneo"
        variante="peligro"
        onPress={() => setPreguntando('salir')}
      />

      <Confirmacion
        visible={preguntando === 'salir'}
        titulo="Salir del torneo"
        mensaje={`Vas a salir de "${torneo.nombre}". Pierdes tu puesto en la clasificación, y para volver a entrar necesitarás el código de invitación.`}
        textoConfirmar="Salir"
        peligro
        onConfirmar={salirDeVerdad}
        onCancelar={() => setPreguntando(null)}
      />

      <Confirmacion
        visible={preguntando === 'reiniciar'}
        titulo="Reiniciar la competición"
        mensaje={`La clasificación de "${torneo.nombre}" pasa a contar sólo desde hoy: todo lo anterior deja de puntuar, y también se reinician las blueshells, los escudos y las faltas. Las partidas viejas no se borran, siguen en las jornadas anteriores. Afecta a los ${torneo.miembros.length} jugadores.`}
        textoConfirmar="Reiniciar"
        onConfirmar={reiniciarDeVerdad}
        onCancelar={() => setPreguntando(null)}
      />
    </ScrollView>
  );
}

/**
 * Rodea una fila con un halo que late cuando esa persona ha usado el escudo.
 *
 * El color del borde no se puede animar con el motor nativo, de ahí el
 * `useNativeDriver: false`. Es un borde de dos píxeles latiendo una vez cada
 * segundo y pico: se ve desde lejos y no marea al mirar la tabla entera.
 */
function Escudable({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!activo) return;
    const bucle = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 1100, useNativeDriver: false }),
        Animated.timing(pulso, { toValue: 0, duration: 1100, useNativeDriver: false }),
      ])
    );
    bucle.start();
    return () => bucle.stop();
  }, [activo, pulso]);

  if (!activo) return <>{children}</>;

  return (
    <Animated.View
      style={[
        estilos.aureola,
        {
          borderColor: pulso.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(40, 200, 224, 0.28)', 'rgba(40, 200, 224, 1)'],
          }),
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Una norma de la casa con su interruptor. Sin fundador, sólo se lee. */
function Regla({
  titulo,
  descripcion,
  valor,
  editable,
  alCambiar,
}: {
  titulo: string;
  descripcion: string;
  valor: boolean;
  editable: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <View style={estilos.regla}>
      <View style={{ flex: 1 }}>
        <Texto style={estilos.tituloRegla}>{titulo}</Texto>
        <Texto style={estilos.descripcionRegla}>{descripcion}</Texto>
      </View>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        disabled={!editable}
        trackColor={{ true: colores.correcta, false: colores.borde }}
        thumbColor={colores.texto}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.lg,
  },
  cambiar: {
    paddingVertical: 10,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.acento,
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  textoCambiar: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  lanzada: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    marginTop: espaciado.sm,
    paddingTop: espaciado.sm,
    gap: espaciado.xs,
  },
  lanzadaTitulo: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  bala: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    lineHeight: 22,
    marginTop: 2,
  },
  explicacion: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
    marginTop: espaciado.xs,
    marginBottom: espaciado.sm,
  },
  destacado: {
    fontFamily: fuentes.titularNegro,
    color: colores.texto,
  },
  recibidas: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
    marginTop: espaciado.xs,
  },
  campoBala: {
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: 12,
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: espaciado.sm,
  },
  errorBala: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginBottom: espaciado.sm,
  },
  recarga: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: espaciado.sm,
  },
  regla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.xs,
  },
  separadorRegla: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.sm,
  },
  tituloRegla: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  descripcionRegla: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    lineHeight: 17,
    marginTop: 2,
  },
  soloFundador: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: espaciado.sm,
  },
  codigo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 8,
    textAlign: 'center',
    marginVertical: espaciado.sm,
  },
  pista: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
    marginBottom: espaciado.md,
  },
  botonesInvitar: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  zonaQr: {
    alignItems: 'center',
    gap: espaciado.sm,
    marginTop: espaciado.md,
  },
  marcoQr: {
    backgroundColor: '#ffffff',
    padding: espaciado.md,
    borderRadius: radio.md,
  },
  enlace: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
    marginTop: espaciado.md,
  },
  encabezado: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: espaciado.lg,
    marginBottom: espaciado.xs,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingVertical: 12,
  },
  conSeparador: {
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  filaPropia: {
    backgroundColor: 'rgba(58, 167, 87, 0.10)',
  },
  puesto: {
    color: colores.textoSuave,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    width: 20,
    textAlign: 'center',
  },
  lineaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
  },
  aureola: {
    borderWidth: 2,
    borderRadius: radio.md,
    margin: 2,
    overflow: 'hidden',
  },
  chapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radio.pastilla,
    borderWidth: 1,
  },
  chapaEscudo: {
    borderColor: colores.acento,
    backgroundColor: 'rgba(40, 200, 224, 0.14)',
  },
  /**
   * En rojo de peligro, no en ámbar: el ámbar y el verde son el idioma del
   * juego —la letra está, la letra va aquí— y no pueden significar otra cosa
   * en la misma pantalla.
   */
  chapaBala: {
    borderColor: colores.peligro,
    backgroundColor: 'rgba(228, 82, 63, 0.14)',
  },
  /** En camino: apagada, porque todavía no obliga a nada. */
  chapaCamino: {
    borderColor: colores.borde,
  },
  /** Paradas por el escudo: siguen viéndose, pero ya no pintan nada. */
  chapaAnulada: {
    borderColor: colores.borde,
    opacity: 0.65,
  },
  tachado: {
    textDecorationLine: 'line-through',
  },
  simbolo: {
    fontSize: 12,
  },
  cuentaEscudo: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.micro,
  },
  cuentaBala: {
    color: colores.peligro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.micro,
  },
  cuentaAnulada: {
    color: colores.textoSuave,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.micro,
  },
  cuentaCamino: {
    color: colores.textoTenue,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 0.5,
  },
  escudoHoy: {
    color: colores.acento,
  },
  nombreJugador: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
    flexShrink: 1,
  },
  detalleJugador: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: 2,
  },
  falta: {
    color: colores.peligro,
  },
  puntosJugador: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    minWidth: 36,
    textAlign: 'right',
  },
  filaHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  nombreHoy: {
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
  },
  puntosHoy: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
  },
  resultadoHoy: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
  },
  pendienteHoy: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    fontStyle: 'italic',
  },
});
