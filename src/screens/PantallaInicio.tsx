import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Ficha } from '../components/Ficha';
import { RejillaMini } from '../components/RejillaMini';
import { Emblema } from '../components/Emblema';
import { Seccion } from '../components/Seccion';
import { BotonCabecera, CabeceraTorneo } from '../components/CabeceraTorneo';
import { AvisoInstalar } from '../components/AvisoInstalar';
import { AvisoParche } from '../components/AvisoParche';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { HojaArsenal } from './HojaArsenal';
import { PALABRAS_PENALIZACION, PUNTOS_POR_INTENTO } from '../game/constantes';
import { clasificacion } from '../game/clasificacion';
import { fechaCorta, fechaJuego, sumarDias } from '../game/fecha';
import { faltaPorJugar, rejillasVisibles } from '../game/pendientes';
import { numeroJornada, solucionDe } from '../game/palabras';
import { BLUESHELLS_POR_MES } from '../game/reglas';
import { ULTIS_POR_MES } from '../game/ulti';
import { PALABRAS_POR_DUELO } from '../game/duelo';
import { PALABRAS_POR_RONDA, reloj, totalDe } from '../game/arcade';
import { COLORES_AVATAR, normalizarAvatar } from '../game/avatares';
import { mesDe, mesLargo } from '../game/temporada';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import { useCuentaAtras } from '../estado/useCuentaAtras';
import { colores, espaciado, fuentes, texto as escala } from '../tema';
import type { DiaTorneo, Torneo } from '../tipos';

type Props = {
  irAJugar: () => void;
  irATorneos: () => void;
  irATabla: () => void;
  irAJornadas: () => void;
  irADuelos: () => void;
  irAArcade: () => void;
  irAAjustes: (torneoId: string) => void;
  /** Abre el arsenal nada más entrar. Sólo lo usa la maqueta de capturas. */
  arsenalInicial?: boolean;
};

/** La casa del torneo: hoy, la tabla en corto y el resto de modos. */
export function PantallaInicio({
  irAJugar,
  irATorneos,
  irATabla,
  irAJornadas,
  irADuelos,
  irAArcade,
  irAAjustes,
  arsenalInicial,
}: Props) {
  const {
    torneoCabecera,
    torneos,
    jornadas,
    uid,
    penalizadoEn,
    elegirTorneo,
    blueshellsDe,
    ultisDe,
    recordArcade,
  } = useApp();
  const [arsenal, setArsenal] = useState(Boolean(arsenalInicial));
  const hoy = fechaJuego();
  const cuenta = useCuentaAtras();
  const torneo = torneoCabecera;

  useEffect(() => {
    if (arsenalInicial) setArsenal(true);
  }, [arsenalInicial]);

  if (!torneo) {
    return (
      <View style={estilos.pantalla}>
        <CabeceraTorneo nombre="Sin torneo" detalle="Crea uno o únete" onPress={irATorneos} />
        <ScrollView contentContainerStyle={estilos.contenido}>
          <AvisoParche />
          <AvisoInstalar />
          <Tarjeta acento={colores.correcta}>
            <Texto style={estilos.tituloHoy}>Monta el tuyo</Texto>
            <Sutil>
              Una palabra al día, la misma para todo el grupo, con tabla y trofeo a fin de mes.
            </Sutil>
            <Boton titulo="Crear o unirme" onPress={irATorneos} />
          </Tarjeta>
          <OtrasFormas
            record={recordArcade}
            onDuelo={irADuelos}
            onDiaria={() => {
              elegirTorneo(TORNEO_LIBRE.id);
              irAJugar();
            }}
            onArcade={irAArcade}
          />
        </ScrollView>
      </View>
    );
  }

  const dias = jornadas[torneo.id] ?? [];
  const dia = dias.find((d) => d.fecha === hoy);
  const meToca = faltaPorJugar(dias, uid, hoy);
  const jugados = torneo.miembros.filter((m) => dia?.resultados?.[m]).length;
  const jornada = numeroJornada(hoy, torneo.fechaInicio);
  const penalizado = penalizadoEn(torneo.id);
  const filas = clasificacion(torneo, dias);
  const otros = torneos.filter(
    (t) => t.id !== torneo.id && faltaPorJugar(jornadas[t.id] ?? [], uid, hoy)
  );
  const balas = blueshellsDe(torneo.id);
  const ulti = ultisDe(torneo.id);
  const ayer = sumarDias(hoy, -1);
  const diaAyer = ayer >= torneo.fechaInicio ? dias.find((d) => d.fecha === ayer) : undefined;

  return (
    <View style={estilos.pantalla}>
      <CabeceraTorneo
        nombre={torneo.nombre}
        torneoId={torneo.id}
        detalle={`Jornada ${jornada} · ${fechaCorta(hoy)}`}
        onPress={irATorneos}
        derecha={
          <BotonCabecera etiqueta="Ajustes del torneo" onPress={() => irAAjustes(torneo.id)}>
            <Texto style={{ color: colores.texto, fontSize: 16 }}>⚙</Texto>
          </BotonCabecera>
        }
      />
      <ScrollView contentContainerStyle={estilos.contenido}>
        <AvisoParche />
        <AvisoInstalar />

        <Tarjeta acento={meToca ? colores.correcta : colores.acento}>
          <Texto style={estilos.rotuloHoy}>
            Hoy · jornada {jornada}
            {!meToca ? ` · ${jugados} de ${torneo.miembros.length}` : ''}
          </Texto>
          <Texto style={estilos.tituloHoy}>{meToca ? 'Te toca jugar' : 'Ya has jugado'}</Texto>
          <Texto style={estilos.cuerpo}>
            {fraseDeHoy(torneo, dia, uid)} Nueva {cuenta}.
          </Texto>
        </Tarjeta>

        {penalizado && (
          <Tarjeta acento={colores.penalizacion}>
            <Texto style={estilos.cuerpo}>
              👑 Vas líder en solitario · abres con una de estas
            </Texto>
            <View style={estilos.palabras}>
              {PALABRAS_PENALIZACION.map((palabra) => (
                <Texto key={palabra} style={estilos.palabra}>
                  {palabra.toUpperCase()}
                </Texto>
              ))}
            </View>
          </Tarjeta>
        )}

        <Boton
          titulo={meToca ? 'Jugar la palabra de hoy' : 'Ver la palabra de hoy'}
          onPress={() => {
            elegirTorneo(torneo.id);
            irAJugar();
          }}
        />

        {otros[0] && (
          <Pressable
            onPress={() => {
              elegirTorneo(otros[0].id);
              irAJugar();
            }}
            accessibilityRole="button"
            style={estilos.otro}
          >
            <Emblema nombre={otros[0].nombre} id={otros[0].id} lado={28} />
            <Texto style={estilos.cuerpoFlex} numberOfLines={1}>
              {otros[0].nombre} · también te falta
            </Texto>
            <Texto style={estilos.jugarOtro}>Jugar ›</Texto>
          </Pressable>
        )}

        <Seccion titulo={`Hoy en ${torneo.nombre} · ${jugados}/${torneo.miembros.length}`} accion="Detalle" onAccion={irATabla} />
        <Tarjeta>
          {torneo.miembros.map((miembro) => {
            const resultado = dia?.resultados?.[miembro];
            const ver =
              Boolean(resultado?.patron) && rejillasVisibles(hoy, hoy, !meToca);
            return (
              <View key={miembro} style={estilos.miembro}>
                <Avatar
                  avatar={normalizarAvatar(torneo.perfiles?.[miembro]?.avatar)}
                  lado={28}
                />
                <Texto style={estilos.nombre} numberOfLines={1}>
                  {torneo.perfiles?.[miembro]?.nombre ?? 'Jugador'}
                </Texto>
                {ver && resultado?.patron ? <RejillaMini patron={resultado.patron} /> : null}
                <Texto style={resultado ? estilos.marca : estilos.pendiente}>
                  {resultado
                    ? `${resultado.acertada ? resultado.intentos : 'X'}/${6} +${resultado.puntos}`
                    : 'pendiente'}
                </Texto>
              </View>
            );
          })}
        </Tarjeta>

        <Seccion titulo={`Tabla · ${mesLargo(mesDe(hoy)).split(' de ')[0]}`} accion="Ver completa" onAccion={irATabla} />
        <Podio filas={filas} uid={uid} />

        {diaAyer && (
          <>
            <Seccion titulo="Ayer" accion="Jornadas" onAccion={irAJornadas} />
            <Tarjeta>
              <View style={estilos.palabraAyer}>
                {solucionDe(ayer, torneo.semilla)
                  .toUpperCase()
                  .split('')
                  .map((letra, i) => (
                    <Ficha key={i} letra={letra} lado={36} />
                  ))}
              </View>
              <Texto style={estilos.cuerpo}>{quienGano(torneo, diaAyer)}</Texto>
            </Tarjeta>
          </>
        )}

        <Seccion titulo="Tu arsenal" accion="Abrir" onAccion={() => setArsenal(true)} />
        <Pressable onPress={() => setArsenal(true)} accessibilityRole="button">
          <View style={estilos.arsenal}>
            <Contador
              valor={`${balas.balas}/${BLUESHELLS_POR_MES}`}
              etiqueta="Blueshells"
              color={colores.acento}
            />
            <Contador
              valor={`${balas.escudos}/${BLUESHELLS_POR_MES}`}
              etiqueta="Escudos"
              color={colores.escudo}
            />
            <Contador
              valor={`${ulti.quedan}/${ULTIS_POR_MES}`}
              etiqueta="Ulti"
              color={colores.peligro}
            />
          </View>
        </Pressable>

        <OtrasFormas
          record={recordArcade}
          onDuelo={irADuelos}
          onDiaria={() => {
            elegirTorneo(TORNEO_LIBRE.id);
            irAJugar();
          }}
          onArcade={irAArcade}
        />
        <Texto style={estilos.pistaPuntos}>
          Puntos: {PUNTOS_POR_INTENTO.map((p, i) => `${i + 1}.º ${p}`).join(' · ')} · fallo 0
        </Texto>
      </ScrollView>
      <HojaArsenal torneoId={torneo.id} visible={arsenal} cerrar={() => setArsenal(false)} />
    </View>
  );
}

function fraseDeHoy(torneo: Torneo, dia: DiaTorneo | undefined, uid: string | null): string {
  const faltan = torneo.miembros.filter((m) => !dia?.resultados?.[m]);
  if (faltan.length === 0) return 'Hoy ya ha jugado todo el grupo.';
  const nombres = faltan.map((m) => (m === uid ? 'tú' : (torneo.perfiles?.[m]?.nombre ?? 'alguien')));
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `Falta ${lista}.`;
}

function quienGano(torneo: Torneo, dia: DiaTorneo): string {
  const lista = Object.values(dia.resultados ?? {});
  if (lista.length === 0) return 'Nadie la jugó.';
  const mejor = [...lista].sort((a, b) => b.puntos - a.puntos)[0];
  const nombre = torneo.perfiles?.[mejor.uid]?.nombre ?? mejor.nombre;
  return mejor.acertada
    ? `La sacó mejor ${nombre} · ${mejor.intentos}/6`
    : 'Nadie la acertó.';
}

function Podio({
  filas,
  uid,
}: {
  filas: ReturnType<typeof clasificacion>;
  uid: string | null;
}) {
  const top = filas.slice(0, 3);
  if (top.length === 0) return null;
  const orden = [top[1], top[0], top[2]].filter(Boolean);
  const yo = filas.find((f) => f.uid === uid);
  const primero = top[0];
  const nota =
    yo && primero && yo.uid === primero.uid && top[1]
      ? `Sacas ${yo.puntos - top[1].puntos} pts a ${top[1].nombre}`
      : yo && primero && yo.uid !== primero.uid
        ? `${primero.nombre} te saca ${primero.puntos - yo.puntos} pts`
        : null;

  return (
    <Tarjeta>
      <View style={estilos.podio}>
        {orden.map((fila) => {
          const puesto = filas.findIndex((f) => f.uid === fila.uid) + 1;
          const alto = puesto === 1 ? 72 : puesto === 2 ? 56 : 44;
          return (
            <View key={fila.uid} style={estilos.columnaPodio}>
              <Ficha
                letra={String(fila.puntos)}
                lado={puesto === 1 ? 64 : 52}
                color={COLORES_AVATAR[fila.avatar.color] ?? COLORES_AVATAR[0]}
              />
              <View style={[estilos.peldaño, { height: alto / 4 }]} />
              <Texto style={estilos.nombrePodio} numberOfLines={1}>
                {fila.nombre}
              </Texto>
              <Texto style={estilos.puesto}>{puesto}.º</Texto>
            </View>
          );
        })}
      </View>
      {nota && <Texto style={estilos.nota}>{nota}</Texto>}
    </Tarjeta>
  );
}

function Contador({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  return (
    <View style={estilos.contador}>
      <Texto style={[estilos.contadorValor, { color }]}>{valor}</Texto>
      <Texto style={estilos.contadorEtiqueta}>{etiqueta}</Texto>
    </View>
  );
}

function OtrasFormas({
  record,
  onDuelo,
  onDiaria,
  onArcade,
}: {
  record: { puntos: number; segundos: number; acertadas: number; intentos: number; fecha: string } | null;
  onDuelo: () => void;
  onDiaria: () => void;
  onArcade: () => void;
}) {
  return (
    <>
      <Seccion titulo="Otras formas de jugar" />
      <View style={estilos.modos}>
        <Modo titulo="Duelo" detalle={`${PALABRAS_POR_DUELO} en directo`} color={colores.peligro} onPress={onDuelo} />
        <Modo titulo="La diaria" detalle="Sin puntos" color={colores.acento} onPress={onDiaria} />
        <Modo
          titulo="Arcade"
          detalle={record ? `${totalDe(record)} · ${reloj(record.segundos)}` : `${PALABRAS_POR_RONDA} seguidas`}
          color={colores.oro}
          onPress={onArcade}
        />
      </View>
    </>
  );
}

function Modo({
  titulo,
  detalle,
  color,
  onPress,
}: {
  titulo: string;
  detalle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [estilos.modo, { borderColor: color, opacity: pressed ? 0.75 : 1 }]}
    >
      <Texto style={[estilos.modoTitulo, { color }]}>{titulo}</Texto>
      <Texto style={estilos.modoDetalle}>{detalle}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espaciado.md, gap: espaciado.sm, paddingBottom: espaciado.xl },
  rotuloHoy: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tituloHoy: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  cuerpo: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 20,
  },
  cuerpoFlex: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  palabras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: espaciado.sm },
  palabra: {
    color: colores.fondo,
    backgroundColor: colores.penalizacion,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  otro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    padding: espaciado.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  jugarOtro: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  miembro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: 6,
  },
  nombre: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  marca: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
  },
  pendiente: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  podio: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  columnaPodio: { alignItems: 'center', width: 96, gap: 4 },
  peldaño: { width: 28 },
  nombrePodio: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  puesto: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
  },
  nota: {
    color: colores.acento,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
    marginTop: espaciado.sm,
  },
  palabraAyer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: espaciado.sm,
  },
  arsenal: { flexDirection: 'row', gap: espaciado.sm },
  contador: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    paddingVertical: espaciado.md,
  },
  contadorValor: {
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  contadorEtiqueta: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  modos: { flexDirection: 'row', gap: espaciado.sm },
  modo: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: colores.superficie,
    padding: espaciado.sm,
    minHeight: 78,
    justifyContent: 'flex-end',
  },
  modoTitulo: {
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    textTransform: 'uppercase',
  },
  modoDetalle: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: 2,
  },
  pistaPuntos: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
});
