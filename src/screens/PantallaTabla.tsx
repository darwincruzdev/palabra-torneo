import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Ficha } from '../components/Ficha';
import { RejillaMini } from '../components/RejillaMini';
import { BotonCabecera, CabeceraTorneo } from '../components/CabeceraTorneo';
import { IconoCompartir } from '../components/Iconos';
import { FichaArcade } from '../components/FichaArcade';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { HojaInvitar } from './HojaInvitar';
import { normalizarAvatar } from '../game/avatares';
import {
  campeonDelAno,
  clasificacion,
  liderDestacado,
  trofeosDeResumenes,
  trofeosPorJugador,
} from '../game/clasificacion';
import { PUNTOS_POR_FALTA, PUNTOS_POR_INTENTO } from '../game/constantes';
import { fechaJuego, fechaLarga } from '../game/fecha';
import { rejillasVisibles } from '../game/pendientes';
import { numeroJornada } from '../game/palabras';
import {
  anoDe,
  mesAnterior,
  mesDe,
  mesLargo,
  mesSiguiente,
  primerDiaDelMes,
} from '../game/temporada';
import { blueshellsContra, estaProtegido } from '../game/reglas';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  irATorneos: () => void;
  irAAjustes: (torneoId: string) => void;
  /** Abre la hoja de invitar al entrar. Sólo capturas. */
  invitarInicial?: boolean;
};

type Vista = 'mes' | 'hoy' | 'palmares';

const COLOR_PUESTO = [colores.oro, colores.presente, colores.bronce];

/** La clasificación, y nada más: mes, hoy y palmarés. */
export function PantallaTabla({ irATorneos, irAAjustes, invitarInicial }: Props) {
  const {
    torneoCabecera,
    jornadas,
    uid,
    reglasDe,
    resumenes,
    cargarResumenes,
    decidirDesempate,
  } = useApp();
  const [vista, setVista] = useState<Vista>('mes');
  const [invitar, setInvitar] = useState(Boolean(invitarInicial));
  const [mirando, setMirando] = useState<string | null>(null);
  const hoy = fechaJuego();
  const torneo = torneoCabecera;
  const dias = torneo ? (jornadas[torneo.id] ?? []) : [];

  useEffect(() => {
    if (torneo) cargarResumenes(torneo.id);
  }, [torneo, cargarResumenes]);

  const filas = useMemo(() => (torneo ? clasificacion(torneo, dias) : []), [torneo, dias]);
  const lider = useMemo(
    () => (torneo ? liderDestacado(clasificacion(torneo, dias, { hasta: hoy })) : null),
    [torneo, dias, hoy]
  );
  const mes = mesDe(hoy);
  const misResumenes = torneo ? (resumenes[torneo.id] ?? []) : [];
  const trofeos = useMemo(() => trofeosDeResumenes(misResumenes), [misResumenes]);
  const trofeosDe = useMemo(() => trofeosPorJugador(trofeos), [trofeos]);
  const campeonato = useMemo(
    () =>
      torneo
        ? campeonDelAno(torneo, dias, trofeos, anoDe(mes))
        : { uids: [], trofeos: 0, criterio: 'empate' as const },
    [torneo, dias, trofeos, mes]
  );
  const anterior = misResumenes.find((r) => r.mes === mesAnterior(mes));
  const jornadaHoy = dias.find((d) => d.fecha === hoy);
  const yaJugue = Boolean(uid && jornadaHoy?.resultados?.[uid]);
  const reglas = torneo ? reglasDe(torneo.id) : null;

  if (!torneo || !reglas) {
    return (
      <View style={estilos.vacio}>
        <Texto style={estilos.tituloVacio}>Todavía no hay tabla</Texto>
        <Sutil>Crea un torneo o únete a uno y aquí verás cómo vais.</Sutil>
        <Boton titulo="Mis torneos" onPress={irATorneos} />
      </View>
    );
  }

  const nombreDe = (id: string) => torneo.perfiles?.[id]?.nombre ?? 'Jugador';
  const detalle = `Temporada ${mesLargo(mes).split(' de ')[0]} · quedan ${diasQueQuedan(hoy)} jornadas`;

  return (
    <View style={estilos.pantalla}>
      <CabeceraTorneo
        nombre={torneo.nombre}
        torneoId={torneo.id}
        detalle={detalle}
        onPress={irATorneos}
        derecha={
          <>
            <BotonCabecera etiqueta="Invitar" onPress={() => setInvitar(true)}>
              <IconoCompartir color={colores.texto} tamano={16} />
            </BotonCabecera>
            <BotonCabecera etiqueta="Ajustes del torneo" onPress={() => irAAjustes(torneo.id)}>
              <Texto style={estilos.engranaje}>⚙</Texto>
            </BotonCabecera>
          </>
        }
      />

      <View style={estilos.segmento}>
        {(
          [
            ['mes', 'Mes'],
            ['hoy', 'Hoy'],
            ['palmares', 'Palmarés'],
          ] as const
        ).map(([id, etiqueta]) => (
          <Pressable
            key={id}
            onPress={() => setVista(id)}
            accessibilityRole="button"
            style={[estilos.segmentoBoton, vista === id && estilos.segmentoActivo]}
          >
            <Texto style={[estilos.segmentoTexto, vista === id && estilos.segmentoTextoActivo]}>
              {etiqueta}
            </Texto>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={estilos.contenido}>
        {vista === 'mes' && (
          <>
            {filas.map((fila, i) => {
              const hoySuyo = jornadaHoy?.resultados?.[fila.uid];
              const protegido = estaProtegido(jornadaHoy, fila.uid);
              const recibidas = blueshellsContra(jornadaHoy, fila.uid).length;
              return (
                <Pressable
                  key={fila.uid}
                  onPress={() => setMirando(fila.uid)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver la marca de arcade de ${fila.nombre}`}
                  style={[estilos.fila, fila.uid === uid && estilos.filaTu]}
                >
                  <Ficha
                    letra={String(i + 1)}
                    lado={32}
                    color={i < 3 && fila.puntos > 0 ? COLOR_PUESTO[i] : colores.elevado}
                    tinta={i < 3 ? colores.fondo : colores.texto}
                  />
                  <Avatar avatar={fila.avatar} lado={36} />
                  <View style={{ flex: 1 }}>
                    <View style={estilos.lineaNombre}>
                      <Texto style={estilos.nombre} numberOfLines={1}>
                        {fila.nombre}
                      </Texto>
                      {fila.uid === uid && <Texto style={estilos.tu}>TÚ</Texto>}
                      {(trofeosDe[fila.uid] ?? 0) > 0 && (
                        <Texto style={estilos.distintivo}>🏆×{trofeosDe[fila.uid]}</Texto>
                      )}
                      {fila.uid === lider && reglas.penalizacionLider && (
                        <Texto style={estilos.distintivo}>👑</Texto>
                      )}
                      {protegido && <Texto style={estilos.distintivo}>🛡</Texto>}
                      {recibidas > 0 && !protegido && (
                        <Texto style={estilos.distintivo}>🔵×{recibidas}</Texto>
                      )}
                    </View>
                    <Texto style={estilos.detalle} numberOfLines={1}>
                      {fila.jugadas} jugadas
                      {fila.mediaIntentos !== null &&
                        ` · media ${fila.mediaIntentos.toFixed(1).replace('.', ',')}`}
                      {fila.faltas > 0 &&
                        ` · ${fila.faltas} ${fila.faltas === 1 ? 'falta' : 'faltas'} (${
                          fila.faltas * PUNTOS_POR_FALTA
                        })`}
                    </Texto>
                  </View>
                  <View style={estilos.puntos}>
                    <Texto style={estilos.cifra}>{fila.puntos}</Texto>
                    {hoySuyo ? (
                      <Texto style={estilos.hoy}>+{hoySuyo.puntos} hoy</Texto>
                    ) : (
                      <Texto style={estilos.porJugar}>pts</Texto>
                    )}
                  </View>
                </Pressable>
              );
            })}

            <View style={estilos.leyenda}>
              <Texto style={estilos.leyendaItem}>🏆 trofeos del año</Texto>
              <Texto style={estilos.leyendaItem}>👑 abre con palabra impuesta</Texto>
              <Texto style={estilos.leyendaItem}>🛡 escudo usado</Texto>
            </View>

            {anterior && anterior.ganadores.length > 0 && (
              <Tarjeta>
                <Texto style={estilos.campeon}>
                  🏆 Campeón de {mesLargo(anterior.mes).split(' de ')[0]}:{' '}
                  {anterior.ganadores.map(nombreDe).join(' y ')}
                </Texto>
                <Texto style={estilos.detalle}>
                  Palmarés {anoDe(mes)}
                  {campeonato.uids.length > 0 &&
                    ` · ${campeonato.uids.map(nombreDe).join(', ')} ${campeonato.trofeos}`}
                </Texto>
              </Tarjeta>
            )}

            <Texto style={estilos.puntosLeyenda}>
              Puntos:{' '}
              {PUNTOS_POR_INTENTO.map((p, i) => `${i + 1}.º ${p}`).join(' · ')} · fallo 0
            </Texto>
            <Sutil>Toca un nombre para ver su mejor ronda de arcade.</Sutil>
            <Sutil>
              La temporada vuelve a cero el {fechaLarga(primerDiaDelMes(mesSiguiente(mes)))}.
            </Sutil>
          </>
        )}

        {vista === 'hoy' && (
          <Tarjeta>
            <Texto style={estilos.detalle}>
              Jornada {numeroJornada(hoy, torneo.fechaInicio)} · {fechaLarga(hoy)}
            </Texto>
            {torneo.miembros.map((miembro) => {
              const resultado = jornadaHoy?.resultados?.[miembro];
              const ver = Boolean(resultado?.patron) && rejillasVisibles(hoy, hoy, yaJugue);
              return (
                <View key={miembro} style={estilos.filaHoy}>
                  <Avatar
                    avatar={normalizarAvatar(torneo.perfiles?.[miembro]?.avatar)}
                    lado={28}
                  />
                  <Texto style={estilos.nombre} numberOfLines={1}>
                    {nombreDe(miembro)}
                    {miembro === uid ? ' (tú)' : ''}
                  </Texto>
                  {ver && resultado?.patron ? (
                    <RejillaMini patron={resultado.patron} lado={7} />
                  ) : null}
                  <Texto style={resultado ? estilos.resultado : estilos.pendiente}>
                    {resultado
                      ? `${resultado.acertada ? `${resultado.intentos}/6` : 'X/6'} +${resultado.puntos}`
                      : 'pendiente'}
                  </Texto>
                </View>
              );
            })}
            {!yaJugue && (
              <Sutil>Las rejillas de los demás se ven cuando juegues la tuya.</Sutil>
            )}
          </Tarjeta>
        )}

        {vista === 'palmares' && (
          <>
            {campeonato.uids.length > 0 && (
              <Tarjeta acento={colores.oro}>
                <Texto style={estilos.campeon}>
                  {campeonato.uids.length === 1
                    ? `${nombreDe(campeonato.uids[0])} manda en ${anoDe(mes)}`
                    : `Empate: ${campeonato.uids.map(nombreDe).join(' y ')}`}
                </Texto>
                <Sutil>
                  {campeonato.trofeos} {campeonato.trofeos === 1 ? 'trofeo' : 'trofeos'}. A final
                  de año gana quien más junte.
                </Sutil>
              </Tarjeta>
            )}
            {trofeos.length === 0 && <Sutil>Todavía no se ha cerrado ningún mes.</Sutil>}
            {trofeos.map((trofeo) => (
              <Tarjeta key={trofeo.mes}>
                <Texto style={estilos.nombre}>
                  {mesLargo(trofeo.mes)}
                  {trofeo.pendiente ? ' · pendiente' : ''}
                </Texto>
                <Texto style={estilos.detalle}>
                  {trofeo.uids.map(nombreDe).join(' y ')}
                  {trofeo.uids.length > 1 && !trofeo.pendiente ? ' (compartido)' : ''}
                </Texto>
                {trofeo.pendiente && uid === torneo.propietario && (
                  <View style={estilos.desempate}>
                    {trofeo.uids.map((candidato) => (
                      <Boton
                        key={candidato}
                        titulo={`Gana ${nombreDe(candidato)}`}
                        variante="secundario"
                        onPress={() =>
                          decidirDesempate(torneo.id, trofeo.mes, candidato).catch(() => {})
                        }
                      />
                    ))}
                  </View>
                )}
                {trofeo.pendiente && uid !== torneo.propietario && (
                  <Sutil>Lo decide quien fundó el torneo.</Sutil>
                )}
              </Tarjeta>
            ))}
          </>
        )}
      </ScrollView>

      <HojaInvitar torneoId={torneo.id} visible={invitar} cerrar={() => setInvitar(false)} />
      <FichaArcade
        uid={mirando}
        nombre={mirando ? nombreDe(mirando) : ''}
        avatar={normalizarAvatar(mirando ? torneo.perfiles?.[mirando]?.avatar : undefined)}
        cerrar={() => setMirando(null)}
      />
    </View>
  );
}

function diasQueQuedan(hoy: string): number {
  const fin = primerDiaDelMes(mesSiguiente(mesDe(hoy)));
  const a = Date.parse(`${hoy}T00:00:00Z`);
  const b = Date.parse(`${fin}T00:00:00Z`);
  // Sin contar hoy: el 26 de un mes de 30 quedan cuatro jornadas por delante.
  return Math.max(0, Math.round((b - a) / 86400000) - 1);
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
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
  engranaje: { color: colores.texto, fontSize: 16 },
  segmento: {
    flexDirection: 'row',
    margin: espaciado.md,
    backgroundColor: colores.superficie,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: 3,
  },
  segmentoBoton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segmentoActivo: { backgroundColor: colores.elevado },
  segmentoTexto: {
    color: colores.textoTenue,
    fontFamily: fuentes.titular,
    fontSize: escala.pequeno,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  segmentoTextoActivo: { color: colores.texto },
  contenido: { padding: espaciado.md, gap: espaciado.sm, paddingBottom: espaciado.xl },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.sm,
    borderRadius: 12,
  },
  filaTu: { backgroundColor: colores.superficie },
  lineaNombre: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
    flexShrink: 1,
  },
  tu: {
    color: colores.fondo,
    backgroundColor: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: 10,
    letterSpacing: 0.6,
    paddingHorizontal: 5,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distintivo: { fontSize: 12 },
  detalle: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: 2,
  },
  puntos: { alignItems: 'flex-end' },
  cifra: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  hoy: {
    color: colores.correcta,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
  },
  porJugar: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm, marginTop: espaciado.sm },
  leyendaItem: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  campeon: {
    color: colores.oro,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  puntosLeyenda: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  filaHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: 8,
  },
  resultado: {
    marginLeft: 'auto',
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
  },
  pendiente: {
    marginLeft: 'auto',
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  desempate: { gap: espaciado.sm, marginTop: espaciado.sm },
});
