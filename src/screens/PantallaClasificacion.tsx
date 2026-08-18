import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { Avatar } from '../components/Avatar';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego, fechaLarga } from '../game/fecha';
import {
  contenidoQr,
  enlaceDeInvitacion,
  hayEnlaces,
  mensajeDeInvitacion,
} from '../game/invitacion';
import { JORNADAS_POR_CICLO } from '../game/reglas';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

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
  } = useApp();
  const [copiado, setCopiado] = useState<'codigo' | 'enlace' | null>(null);
  const [qrAbierto, setQrAbierto] = useState(false);
  const [palabraBala, setPalabraBala] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [lanzando, setLanzando] = useState(false);
  const [errorBala, setErrorBala] = useState<string | null>(null);

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
      await lanzarBlueshell(torneo.id, palabraBala);
      setPalabraBala('');
      setConfirmando(false);
    } catch (e) {
      setErrorBala(e instanceof Error ? e.message : 'No se ha podido lanzar la blueshell');
      setConfirmando(false);
    } finally {
      setLanzando(false);
    }
  }

  function alternarRegla(cual: 'penalizacionLider' | 'blueshells', valor: boolean) {
    if (!torneo) return;
    cambiarReglas(torneo.id, { ...reglas, [cual]: valor }).catch(() => {});
  }

  function confirmarSalida() {
    if (!torneo) return;
    Alert.alert(
      'Salir del torneo',
      `¿Seguro que quieres salir de "${torneo.nombre}"? Perderás tu puesto en la clasificación.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await salir(torneo.id);
            volver();
          },
        },
      ]
    );
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
            <Text style={estilos.recibidas}>
              {balas.protegido
                ? `Te lanzaron ${balas.recibidas.length} ${balas.recibidas.length === 1 ? 'bala' : 'balas'}, pero hoy vas protegido.`
                : `Hoy te han caído ${balas.recibidas.length} ${balas.recibidas.length === 1 ? 'blueshell' : 'blueshells'}. La protección se gasta desde el tablero.`}
            </Text>
          )}

          {balas.puedoLanzar ? (
            <>
              <Text style={estilos.explicacion}>
                Tienes una bala por cada {JORNADAS_POR_CICLO} jornadas. Si la disparas,
                mañana <Text style={estilos.destacado}>{nombreLider}</Text> estará obligado a
                usar esta palabra en su segundo intento.
              </Text>
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
              {errorBala && <Text style={estilos.errorBala}>{errorBala}</Text>}
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
            <Text style={estilos.explicacion}>{balas.impedimento}</Text>
          )}

          <Text style={estilos.recarga}>
            Bala y protección se recargan en {balas.paraRecargar}{' '}
            {balas.paraRecargar === 1 ? 'jornada' : 'jornadas'}.
          </Text>
        </Tarjeta>
      )}

      <Tarjeta>
        <Sutil>Invitar a alguien</Sutil>

        <Pressable onPress={() => copiar('codigo')} accessibilityRole="button">
          <Text style={estilos.codigo}>{torneo.codigo}</Text>
        </Pressable>
        <Text style={estilos.pista}>
          {copiado === 'codigo' ? '¡Código copiado!' : 'Toca el código para copiarlo'}
        </Text>

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
            <Text style={estilos.enlace} numberOfLines={1}>
              {copiado === 'enlace' ? '¡Enlace copiado!' : enlaceDeInvitacion(torneo.codigo)}
            </Text>
          </Pressable>
        ) : (
          <Sutil>
            Configura EXPO_PUBLIC_URL_BASE con la dirección de tu web para repartir un
            enlace en vez del código suelto.
          </Sutil>
        )}
      </Tarjeta>

      <Text style={estilos.encabezado}>Clasificación general</Text>
      <Tarjeta estilo={{ padding: 0 }}>
        {filas.map((fila, i) => (
          <View
            key={fila.uid}
            style={[
              estilos.filaTabla,
              i < filas.length - 1 && estilos.conSeparador,
              fila.uid === uid && estilos.filaPropia,
            ]}
          >
            <Text
              style={[estilos.puesto, i < 3 && fila.puntos > 0 && { color: MEDALLAS[i] }]}
            >
              {i + 1}
            </Text>
            <Avatar avatar={fila.avatar} lado={34} />
            <View style={{ flex: 1 }}>
              <Text style={estilos.nombreJugador}>
                {fila.nombre}
                {fila.uid === uid ? ' (tú)' : ''}
                {fila.uid === liderHoy ? ' 🎯' : ''}
              </Text>
              <Text style={estilos.detalleJugador}>
                {fila.jugadas} {fila.jugadas === 1 ? 'jornada' : 'jornadas'} ·{' '}
                {fila.aciertos} {fila.aciertos === 1 ? 'acierto' : 'aciertos'}
                {fila.mediaIntentos !== null &&
                  ` · ${fila.mediaIntentos.toFixed(1)} de media`}
              </Text>
            </View>
            <Text style={estilos.puntosJugador}>{fila.puntos}</Text>
          </View>
        ))}
      </Tarjeta>
      {liderHoy && reglas.penalizacionLider && (
        <Sutil>
          🎯 marca a quien lidera en solitario: hoy está obligado a abrir con una de las
          cinco palabras de penalización.
        </Sutil>
      )}

      <Text style={estilos.encabezado}>Hoy · {fechaLarga(hoy)}</Text>
      <Tarjeta>
        {torneo.miembros.map((miembro) => {
          const resultado = jornadaHoy?.resultados?.[miembro];
          const perfil = torneo.perfiles?.[miembro];
          return (
            <View key={miembro} style={estilos.filaHoy}>
              <Text style={estilos.nombreHoy}>
                {perfil?.nombre ?? 'Jugador'}
                {miembro === uid ? ' (tú)' : ''}
              </Text>
              {resultado ? (
                <Text style={estilos.resultadoHoy}>
                  {resultado.acertada ? `${resultado.intentos}/6` : 'X/6'} ·{' '}
                  <Text style={{ color: colores.oro, fontWeight: '800' }}>
                    {resultado.puntos} pts
                  </Text>
                </Text>
              ) : (
                <Text style={estilos.pendienteHoy}>sin jugar</Text>
              )}
            </View>
          );
        })}
      </Tarjeta>

      <Text style={estilos.encabezado}>Normas de la casa</Text>
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
          titulo="Blueshells"
          descripcion={`Cada ${JORNADAS_POR_CICLO} jornadas, una bala para obligar al líder a usar una palabra concreta, y una protección para anular las que te tiren.`}
          valor={reglas.blueshells}
          editable={esFundador}
          alCambiar={(v) => alternarRegla('blueshells', v)}
        />
        {!esFundador && (
          <Text style={estilos.soloFundador}>
            Sólo quien fundó el torneo puede cambiarlas.
          </Text>
        )}
      </Tarjeta>

      <View style={{ height: espaciado.md }} />
      <Boton
        titulo="Ver jornadas anteriores"
        variante="secundario"
        onPress={irAHistorial}
      />

      <View style={{ height: espaciado.lg }} />
      <Boton titulo="Salir del torneo" variante="peligro" onPress={confirmarSalida} />
    </ScrollView>
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
        <Text style={estilos.tituloRegla}>{titulo}</Text>
        <Text style={estilos.descripcionRegla}>{descripcion}</Text>
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
    fontWeight: '700',
    fontSize: 13,
  },
  explicacion: {
    color: colores.textoSuave,
    fontSize: 13,
    lineHeight: 19,
    marginTop: espaciado.xs,
    marginBottom: espaciado.sm,
  },
  destacado: {
    color: colores.texto,
    fontWeight: '800',
  },
  recibidas: {
    color: colores.acento,
    fontSize: 13,
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
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: espaciado.sm,
  },
  errorBala: {
    color: colores.peligro,
    fontSize: 13,
    marginBottom: espaciado.sm,
  },
  recarga: {
    color: colores.textoTenue,
    fontSize: 11,
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
    fontSize: 15,
    fontWeight: '700',
  },
  descripcionRegla: {
    color: colores.textoSuave,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  soloFundador: {
    color: colores.textoTenue,
    fontSize: 11,
    marginTop: espaciado.sm,
  },
  codigo: {
    color: colores.texto,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    marginVertical: espaciado.sm,
  },
  pista: {
    color: colores.textoSuave,
    fontSize: 12,
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
    fontSize: 12,
    textAlign: 'center',
    marginTop: espaciado.md,
  },
  encabezado: {
    color: colores.texto,
    fontSize: 16,
    fontWeight: '800',
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
    fontSize: 16,
    fontWeight: '800',
    width: 20,
    textAlign: 'center',
  },
  nombreJugador: {
    color: colores.texto,
    fontSize: 15,
    fontWeight: '700',
  },
  detalleJugador: {
    color: colores.textoSuave,
    fontSize: 11,
    marginTop: 2,
  },
  puntosJugador: {
    color: colores.texto,
    fontSize: 20,
    fontWeight: '900',
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
    fontSize: 14,
  },
  resultadoHoy: {
    color: colores.textoSuave,
    fontSize: 14,
  },
  pendienteHoy: {
    color: colores.textoSuave,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
