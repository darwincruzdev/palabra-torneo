import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Ficha } from '../components/Ficha';
import { RejillaMini } from '../components/RejillaMini';
import { CabeceraTorneo } from '../components/CabeceraTorneo';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { fechaCorta, fechaJuego, fechaLarga } from '../game/fecha';
import { numeroJornada, solucionDe } from '../game/palabras';
import { rejillasVisibles } from '../game/pendientes';
import { normalizarAvatar } from '../game/avatares';
import { mesLargo } from '../game/temporada';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';
import type { DiaTorneo, Torneo } from '../tipos';

type Props = {
  irATorneos: () => void;
};

/**
 * Cada jornada con su palabra y, si se despliega, la partida de todos.
 *
 * La de hoy no enseña la palabra ni las rejillas ajenas hasta que hayas jugado.
 */
export function PantallaHistorial({ irATorneos }: Props) {
  const { torneoCabecera, jornadas, uid, resumenes, cargarResumenes } = useApp();
  const [abierta, setAbierta] = useState<string | null>(null);
  const torneo = torneoCabecera;
  const hoy = fechaJuego();

  useEffect(() => {
    if (torneo) cargarResumenes(torneo.id);
  }, [torneo, cargarResumenes]);

  const dias = useMemo(() => {
    if (!torneo) return [];
    return (jornadas[torneo.id] ?? [])
      .filter((d) => d.fecha <= hoy && d.fecha >= torneo.fechaInicio)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [jornadas, torneo, hoy]);

  const cerrados = torneo ? (resumenes[torneo.id] ?? []) : [];

  if (!torneo) {
    return (
      <View style={estilos.vacio}>
        <Texto style={estilos.tituloVacio}>Sin jornadas</Texto>
        <Sutil>Cuando estés en un torneo, aquí queda la palabra de cada día.</Sutil>
        <Boton titulo="Mis torneos" onPress={irATorneos} />
      </View>
    );
  }

  const yaJugueHoy = Boolean(
    uid && (jornadas[torneo.id] ?? []).find((d) => d.fecha === hoy)?.resultados?.[uid]
  );

  return (
    <View style={estilos.pantalla}>
      <CabeceraTorneo
        nombre={torneo.nombre}
        torneoId={torneo.id}
        detalle={`${dias.length} jornadas desde el ${fechaCorta(torneo.fechaInicio)}`}
        onPress={irATorneos}
      />
      <ScrollView contentContainerStyle={estilos.contenido}>
        {dias.length === 0 && cerrados.length === 0 && (
          <Sutil>En cuanto alguien juegue aparecerá aquí la jornada.</Sutil>
        )}

        {dias.map((dia) => (
          <Jornada
            key={dia.fecha}
            torneo={torneo}
            dia={dia}
            hoy={hoy}
            uid={uid}
            yaJugueHoy={yaJugueHoy}
            abierta={abierta === dia.fecha}
            alternar={() => setAbierta((actual) => (actual === dia.fecha ? null : dia.fecha))}
          />
        ))}

        {cerrados.map((resumen) => (
          <Tarjeta key={resumen.mes} acento={colores.oro}>
            <Texto style={estilos.mes}>{mesLargo(resumen.mes)}</Texto>
            <Texto style={estilos.meta}>
              {resumen.jornadas} jornadas
              {resumen.ganadores.length > 0 &&
                (resumen.pendiente
                  ? ' · trofeo pendiente'
                  : ` · 🏆 ${resumen.ganadores
                      .map((g) => torneo.perfiles?.[g]?.nombre ?? 'Jugador')
                      .join(' y ')}`)}
            </Texto>
          </Tarjeta>
        ))}
      </ScrollView>
    </View>
  );
}

function Jornada({
  torneo,
  dia,
  hoy,
  uid,
  yaJugueHoy,
  abierta,
  alternar,
}: {
  torneo: Torneo;
  dia: DiaTorneo;
  hoy: string;
  uid: string | null;
  yaJugueHoy: boolean;
  abierta: boolean;
  alternar: () => void;
}) {
  const esHoy = dia.fecha === hoy;
  const tapada = esHoy && !yaJugueHoy;
  const palabra = solucionDe(dia.fecha, torneo.semilla);
  const mio = uid ? dia.resultados?.[uid] : undefined;
  const ganador = Object.values(dia.resultados ?? {}).sort((a, b) => b.puntos - a.puntos)[0];
  const verRejillas = rejillasVisibles(dia.fecha, hoy, esHoy ? yaJugueHoy : Boolean(mio) || !esHoy);

  return (
    <Tarjeta>
      <Pressable onPress={alternar} accessibilityRole="button">
        <View style={estilos.cabecera}>
          <View style={estilos.fichas}>
            {(tapada ? '?????' : palabra.toUpperCase()).split('').map((letra, i) => (
              <Ficha
                key={i}
                letra={letra}
                lado={32}
                color={tapada ? colores.elevado : colores.correcta}
              />
            ))}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {ganador && !tapada ? (
              <Texto style={estilos.gano}>
                Ganó {torneo.perfiles?.[ganador.uid]?.nombre ?? ganador.nombre}
                {ganador.acertada ? ` · ${ganador.intentos}/6` : ''}
              </Texto>
            ) : (
              <Texto style={estilos.meta}>{esHoy ? 'Hoy' : fechaLarga(dia.fecha)}</Texto>
            )}
            <Texto style={estilos.meta}>
              {mio
                ? `Tú ${mio.acertada ? mio.intentos : 'X'}/6 · +${mio.puntos}`
                : esHoy
                  ? 'Te toca'
                  : 'No jugaste'}
            </Texto>
          </View>
        </View>
        <Texto style={estilos.fecha}>
          Jornada {numeroJornada(dia.fecha, torneo.fechaInicio)} · {fechaCorta(dia.fecha)} {abierta ? '▾' : '▸'}
        </Texto>
      </Pressable>

      {abierta && (
        <View style={estilos.lista}>
          {tapada && (
            <Sutil>La palabra y las rejillas se destapan cuando juegues la tuya.</Sutil>
          )}
          {torneo.miembros.map((miembro) => {
            const resultado = dia.resultados?.[miembro];
            const mostrar = Boolean(resultado?.patron) && verRejillas && !(tapada && miembro !== uid);
            return (
              <View key={miembro} style={estilos.fila}>
                <Avatar
                  avatar={normalizarAvatar(torneo.perfiles?.[miembro]?.avatar)}
                  lado={26}
                />
                <Texto style={estilos.nombre} numberOfLines={1}>
                  {torneo.perfiles?.[miembro]?.nombre ?? 'Jugador'}
                  {miembro === uid ? ' (tú)' : ''}
                </Texto>
                {mostrar && resultado?.patron ? <RejillaMini patron={resultado.patron} lado={7} /> : null}
                <Texto style={resultado ? estilos.puntos : estilos.meta}>
                  {resultado
                    ? `${resultado.acertada ? `${resultado.intentos}/6` : 'X/6'} +${resultado.puntos}`
                    : 'no jugó'}
                </Texto>
              </View>
            );
          })}
        </View>
      )}
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espaciado.md, gap: espaciado.sm, paddingBottom: espaciado.xl },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.lg,
  },
  tituloVacio: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textTransform: 'uppercase',
  },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', gap: espaciado.sm },
  fichas: { flexDirection: 'row', gap: 4, flexShrink: 1 },
  gano: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
    textAlign: 'right',
  },
  meta: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'right',
  },
  fecha: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: 6,
  },
  lista: { marginTop: espaciado.sm, gap: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombre: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  puntos: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
  },
  mes: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textTransform: 'uppercase',
  },
});
