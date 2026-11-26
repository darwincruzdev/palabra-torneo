import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Texto } from '../components/Texto';
import { Hoja } from '../components/Hoja';
import { CasillasCodigo } from '../components/CasillasCodigo';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { enlaceDeLaApp, enlaceWhatsapp } from '../game/invitacion';
import { BLUESHELLS_POR_MES, mensajeDeBlueshell } from '../game/reglas';
import { ULTIS_POR_MES, mensajeDeUlti } from '../game/ulti';
import { fechaJuego, fechaLarga } from '../game/fecha';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  torneoId: string | null;
  visible: boolean;
  cerrar: () => void;
};

/**
 * Blueshells, escudos y ulti, fuera de la tabla.
 *
 * El escudo no se gasta aquí: se gasta en el tablero, el día que cae la bala.
 */
export function HojaArsenal({ torneoId, visible, cerrar }: Props) {
  const { torneos, uid, blueshellsDe, ultisDe, lanzarBlueshell, lanzarUlti } = useApp();
  const torneo = torneos.find((t) => t.id === torneoId) ?? null;
  const balas = torneo ? blueshellsDe(torneo.id) : null;
  const ulti = torneo ? ultisDe(torneo.id) : null;
  const [palabraBala, setPalabraBala] = useState('');
  const [palabraUlti, setPalabraUlti] = useState('');
  const [confirmando, setConfirmando] = useState<'bala' | 'ulti' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecha, setHecha] = useState<string | null>(null);

  if (!torneo || !balas || !ulti) return null;
  const grupo = torneo;

  const nombreDe = (id: string) => grupo.perfiles?.[id]?.nombre ?? 'alguien';
  const nombreLider = balas.lider ? nombreDe(balas.lider) : null;
  const manana = balas.enJuego.manana.find((b) => b.objetivo === uid);

  async function disparar() {
    if (confirmando !== 'bala') {
      setConfirmando('bala');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      const lanzada = await lanzarBlueshell(grupo.id, palabraBala);
      setPalabraBala('');
      setConfirmando(null);
      setHecha(`Mañana ${nombreDe(lanzada.objetivo)} abre con tu palabra.`);
      Linking.openURL(
        enlaceWhatsapp(
          mensajeDeBlueshell({
            torneo: grupo.nombre,
            autor: nombreDe(uid ?? ''),
            objetivo: nombreDe(lanzada.objetivo),
            palabra: lanzada.palabra,
            enlace: enlaceDeLaApp() || undefined,
          })
        )
      ).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido lanzar la blueshell');
      setConfirmando(null);
    } finally {
      setOcupado(false);
    }
  }

  async function gastar() {
    if (confirmando !== 'ulti') {
      setConfirmando('ulti');
      return;
    }
    setOcupado(true);
    setError(null);
    try {
      await lanzarUlti(grupo.id, palabraUlti);
      setPalabraUlti('');
      setConfirmando(null);
      setHecha('Mañana el torneo juega tu ulti. Tú, la palabra normal.');
      Linking.openURL(
        enlaceWhatsapp(
          mensajeDeUlti({
            torneo: grupo.nombre,
            autor: nombreDe(uid ?? ''),
            enlace: enlaceDeLaApp() || undefined,
          })
        )
      ).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido gastar la ulti');
      setConfirmando(null);
    } finally {
      setOcupado(false);
    }
  }

  const historial = [
    ...balas.enJuego.hoy.map((b) => `${nombreDe(b.autor)} → ${nombreDe(b.objetivo)} (hoy)`),
    ...balas.enJuego.manana.map((b) => `${nombreDe(b.autor)} → ${nombreDe(b.objetivo)} (mañana)`),
  ];

  return (
    <Hoja visible={visible} cerrar={cerrar} titulo={`Tu arsenal · ${mesActual()}`}>
      <Texto style={estilos.subtitulo}>
        Se recarga el {fechaLarga(balas.recargaEl)}. Solo en {torneo.nombre}.
      </Texto>

      {balas.activas && (
        <Tarjeta acento={colores.escudo}>
          <Texto style={estilos.nombrePieza}>Escudo</Texto>
          <Texto style={estilos.queda}>
            Te quedan {balas.escudos} de {BLUESHELLS_POR_MES}
          </Texto>
          {manana && (
            <Texto style={estilos.cuerpo}>
              {nombreDe(manana.autor)} te ha lanzado una blueshell: mañana tu palabra
              llevará la que haya elegido. El escudo se activa desde el tablero, al
              empezar.
            </Texto>
          )}
          {balas.recibidas.length > 0 && !balas.protegido && (
            <Texto style={estilos.cuerpo}>
              Hoy te cae {balas.recibidas.length === 1 ? 'una bala' : 'más de una bala'}.
              El escudo se gasta en el tablero, no desde aquí.
            </Texto>
          )}
          {balas.protegido && (
            <Texto style={estilos.cuerpo}>Hoy ya has gastado el escudo.</Texto>
          )}
        </Tarjeta>
      )}

      {ulti.activa && (
        <Tarjeta acento={colores.peligro}>
          <Texto style={estilos.nombrePieza}>Ulti</Texto>
          <Texto style={estilos.queda}>
            {ulti.quedan} de {ULTIS_POR_MES} · eliges la palabra de mañana para los demás
          </Texto>
          {ulti.hoy && (
            <Texto style={estilos.cuerpo}>
              {ulti.esMia
                ? `Hoy juegan tu ${ulti.hoy.palabra.toUpperCase()}. Tú, la normal.`
                : `Hoy jugáis la palabra de ${nombreDe(ulti.hoy.autor)}.`}
            </Texto>
          )}
          {ulti.manana && (
            <Texto style={estilos.cuerpo}>
              {ulti.manana.autor === uid
                ? `Mañana juegan ${ulti.manana.palabra.toUpperCase()}.`
                : `Mañana hay ulti de ${nombreDe(ulti.manana.autor)}.`}
            </Texto>
          )}
          {ulti.puedoGastar ? (
            <>
              <CasillasCodigo
                valor={palabraUlti}
                onChange={(texto) => {
                  setPalabraUlti(texto);
                  setConfirmando(null);
                }}
                largo={5}
                alfabeto="palabra"
              />
              <Boton
                titulo={confirmando === 'ulti' ? '¿Seguro? Toca otra vez' : 'Lanzar'}
                variante={confirmando === 'ulti' ? 'peligro' : 'principal'}
                deshabilitado={palabraUlti.length < 5 || ocupado}
                cargando={ocupado && confirmando === 'ulti'}
                onPress={gastar}
              />
            </>
          ) : (
            <Texto style={estilos.cuerpo}>{ulti.impedimento}</Texto>
          )}
        </Tarjeta>
      )}

      {balas.activas && (
        <Tarjeta acento={colores.acento}>
          <Texto style={estilos.nombrePieza}>Blueshells</Texto>
          <Texto style={estilos.queda}>
            {balas.balas} de {BLUESHELLS_POR_MES} · para imponerle una palabra al líder
          </Texto>
          {balas.puedoLanzar && nombreLider ? (
            <>
              <Texto style={estilos.cuerpo}>
                Mañana {nombreLider} tendrá que usar esta palabra en el segundo intento.
              </Texto>
              <CasillasCodigo
                valor={palabraBala}
                onChange={(texto) => {
                  setPalabraBala(texto);
                  setConfirmando(null);
                }}
                largo={5}
                alfabeto="palabra"
              />
              <Boton
                titulo={
                  confirmando === 'bala' ? '¿Seguro? Toca otra vez' : `Lanzar a ${nombreLider}`
                }
                variante="secundario"
                deshabilitado={palabraBala.length < 5 || ocupado}
                cargando={ocupado && confirmando === 'bala'}
                onPress={disparar}
              />
            </>
          ) : (
            <Texto style={estilos.aviso}>{balas.impedimento}</Texto>
          )}
        </Tarjeta>
      )}

      {error && <Texto style={estilos.error}>{error}</Texto>}
      {hecha && <Texto style={estilos.hecha}>{hecha}</Texto>}
      {historial.length > 0 && (
        <Sutil>Historial del mes: {historial.join(' · ')}</Sutil>
      )}
      {!balas.activas && !ulti.activa && (
        <Sutil>Este torneo juega sin blueshells ni ulti.</Sutil>
      )}
    </Hoja>
  );
}

function mesActual(): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const hoy = fechaJuego();
  return meses[Number(hoy.slice(5, 7)) - 1];
}

const estilos = StyleSheet.create({
  subtitulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginBottom: espaciado.sm,
  },
  nombrePieza: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    textTransform: 'uppercase',
  },
  queda: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginBottom: espaciado.sm,
  },
  cuerpo: {
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
    marginBottom: espaciado.sm,
  },
  aviso: {
    color: colores.oro,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  error: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  hecha: {
    color: colores.correcta,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
});
