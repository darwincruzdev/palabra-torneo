import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
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
  const { torneos, jornadas, uid, salir, activo, elegirTorneo } = useApp();
  const [copiado, setCopiado] = useState<'codigo' | 'enlace' | null>(null);
  const [qrAbierto, setQrAbierto] = useState(false);

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
      {liderHoy && (
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
    borderColor: colores.cursor,
    alignItems: 'center',
    marginBottom: espaciado.sm,
  },
  textoCambiar: {
    color: colores.cursor,
    fontWeight: '700',
    fontSize: 13,
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
    color: colores.cursor,
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
