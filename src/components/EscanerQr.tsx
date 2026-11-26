import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { codigoDesdeUrl } from '../game/invitacion';
import { ANCHO_COLUMNA, colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  visible: boolean;
  cerrar: () => void;
  alLeer: (codigo: string) => void;
};

/**
 * Lee un QR de invitación con la cámara del navegador.
 *
 * En el móvil nativo no se abre la cámara desde aquí: haría falta un módulo
 * nuevo y un permiso. Quien esté en la app puede escribir las seis letras.
 */
export function EscanerQr({ visible, cerrar, alLeer }: Props) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    let parado = false;
    let stream: MediaStream | null = null;
    const Detector = (globalThis as { BarcodeDetector?: new (opciones: { formats: string[] }) => { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue?: string }[]> } }).BarcodeDetector;

    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setAviso('Este navegador no puede leer un QR. Escribe el código de seis letras.');
      return;
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        const elemento = video.current;
        if (!elemento) return;
        elemento.srcObject = stream;
        await elemento.play();
        const detector = new Detector({ formats: ['qr_code'] });
        const mirar = async () => {
          if (parado || !video.current) return;
          try {
            const codigos = await detector.detect(video.current);
            const bruto = codigos[0]?.rawValue;
            const codigo =
              codigoDesdeUrl(bruto) ??
              (bruto && /^[A-Z0-9]{6}$/i.test(bruto.trim()) ? bruto.trim().toUpperCase() : null);
            if (codigo) {
              parado = true;
              alLeer(codigo);
              return;
            }
          } catch {
            // Un fotograma malo no es un fallo: el siguiente puede leerse.
          }
          if (!parado) requestAnimationFrame(() => void mirar());
        };
        void mirar();
      } catch {
        if (!parado) setAviso('No se ha podido abrir la cámara. Escribe el código.');
      }
    })();

    return () => {
      parado = true;
      stream?.getTracks().forEach((pista) => pista.stop());
    };
  }, [visible, alLeer]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={estilos.fondo}>
        <View style={estilos.panel}>
          <Texto style={estilos.titulo}>Escanear invitación</Texto>
          {Platform.OS === 'web' && !aviso ? (
            <View style={estilos.marco}>
              {React.createElement('video', {
                ref: video,
                style: { width: '100%', height: 240, objectFit: 'cover', backgroundColor: '#000' },
                muted: true,
                playsInline: true,
              })}
            </View>
          ) : (
            <Texto style={estilos.aviso}>
              {aviso ??
                'En la app, escribe el código de seis letras que sale junto al QR.'}
            </Texto>
          )}
          <Pressable onPress={cerrar} accessibilityRole="button" style={estilos.cerrar}>
            <Texto style={estilos.cerrarTexto}>Cerrar</Texto>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  panel: {
    width: '100%',
    maxWidth: ANCHO_COLUMNA - 48,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  marco: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  aviso: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    textAlign: 'center',
  },
  cerrar: { alignItems: 'center', padding: espaciado.sm },
  cerrarTexto: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
});
