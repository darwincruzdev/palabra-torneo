import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { Texto } from '../components/Texto';
import { Hoja } from '../components/Hoja';
import { Ficha } from '../components/Ficha';
import { Boton } from '../components/ui';
import {
  contenidoQr,
  enlaceDeInvitacion,
  enlaceWhatsapp,
  hayEnlaces,
  mensajeDeInvitacion,
} from '../game/invitacion';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  torneoId: string | null;
  visible: boolean;
  cerrar: () => void;
};

/** Código, QR y WhatsApp. Se abre desde el icono de compartir. */
export function HojaInvitar({ torneoId, visible, cerrar }: Props) {
  const { torneos } = useApp();
  const torneo = torneos.find((t) => t.id === torneoId);
  const [aviso, setAviso] = useState<string | null>(null);

  async function copiar(que: 'codigo' | 'enlace') {
    if (!torneo) return;
    await Clipboard.setStringAsync(
      que === 'codigo' ? torneo.codigo : enlaceDeInvitacion(torneo.codigo)
    );
    setAviso(que === 'codigo' ? 'Código copiado' : 'Enlace copiado');
    setTimeout(() => setAviso(null), 1600);
  }

  if (!torneo) return null;

  return (
    <Hoja visible={visible} cerrar={cerrar} titulo={`Invita a ${torneo.nombre}`}>
      <Texto style={estilos.explicacion}>
        Código, enlace o QR: los tres llevan al mismo torneo.
      </Texto>

      <Pressable
        onPress={() => copiar('codigo')}
        accessibilityRole="button"
        accessibilityLabel="Copiar el código"
        style={estilos.codigo}
      >
        {torneo.codigo.split('').map((letra, i) => (
          <Ficha key={i} letra={letra} color={colores.correcta} lado={44} />
        ))}
      </Pressable>
      <Texto style={estilos.pista}>{aviso ?? 'Toca el código para copiarlo'}</Texto>

      <View style={estilos.qr}>
        <QRCode value={contenidoQr(torneo.codigo)} size={180} backgroundColor="#ffffff" color="#000000" />
      </View>
      {hayEnlaces ? (
        <Texto style={estilos.enlace} numberOfLines={1}>
          {enlaceDeInvitacion(torneo.codigo).replace(/^https?:\/\//, '')}
        </Texto>
      ) : (
        <Texto style={estilos.pista}>
          Sin dirección web configurada se reparte el código. Sirve igual.
        </Texto>
      )}

      <Boton
        titulo="Mandar por WhatsApp"
        onPress={() =>
          Linking.openURL(
            enlaceWhatsapp(mensajeDeInvitacion(torneo.nombre, torneo.codigo))
          ).catch(() => {})
        }
      />
      <View style={estilos.fila}>
        <Boton
          titulo="Copiar enlace"
          variante="secundario"
          onPress={() => copiar(hayEnlaces ? 'enlace' : 'codigo')}
          estilo={{ flex: 1 }}
        />
        <Boton
          titulo="Más opciones"
          variante="secundario"
          onPress={() =>
            Share.share({ message: mensajeDeInvitacion(torneo.nombre, torneo.codigo) }).catch(
              () => {}
            )
          }
          estilo={{ flex: 1 }}
        />
      </View>
    </Hoja>
  );
}

const estilos = StyleSheet.create({
  explicacion: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
  },
  codigo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: espaciado.sm,
  },
  pista: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  qr: {
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    padding: espaciado.md,
    borderRadius: 12,
    marginVertical: espaciado.sm,
  },
  enlace: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
  fila: { flexDirection: 'row', gap: espaciado.sm },
});
