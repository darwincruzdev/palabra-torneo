import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Emblema } from '../components/Emblema';
import { CasillasCodigo } from '../components/CasillasCodigo';
import { EscanerQr } from '../components/EscanerQr';
import { Boton, Sutil } from '../components/ui';
import { Hoja } from '../components/Hoja';
import { clasificacion } from '../game/clasificacion';
import { fechaJuego } from '../game/fecha';
import { colorDeTorneo } from '../game/emblema';
import { faltaPorJugar } from '../game/pendientes';
import { PALABRAS_POR_DUELO } from '../game/duelo';
import { PALABRAS_POR_RONDA, reloj, totalDe } from '../game/arcade';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  /** Entra en el espacio del torneo (Inicio). */
  entrar: (torneoId: string) => void;
  /** Entra directo a la palabra de ese torneo. */
  jugar: (torneoId: string) => void;
  jugarDiaria: () => void;
  irADuelos: () => void;
  irAArcade: () => void;
  codigoEntrante?: string | null;
  codigoConsumido?: () => void;
};

/** La lista de torneos. Es la única forma de cambiar el de la cabecera. */
export function PantallaTorneos({
  entrar,
  jugar,
  jugarDiaria,
  irADuelos,
  irAArcade,
  codigoEntrante,
  codigoConsumido,
}: Props) {
  const { hayFirebase, torneos, jornadas, uid, crearTorneo, unirsePorCodigo, penalizadoEn, recordArcade } =
    useApp();
  const [creando, setCreando] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'crear' | 'unirse' | null>(null);
  const [escaner, setEscaner] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const hoy = fechaJuego();
  const pendientes = torneos.filter((t) => faltaPorJugar(jornadas[t.id] ?? [], uid, hoy));

  useEffect(() => {
    if (codigoEntrante) {
      setCodigo(codigoEntrante);
      setUniendo(true);
      codigoConsumido?.();
    }
  }, [codigoEntrante, codigoConsumido]);

  async function pulsarCrear() {
    if (nombreNuevo.trim().length < 3) {
      setError('Ponle un nombre de al menos 3 letras al torneo');
      return;
    }
    setError(null);
    setOcupado('crear');
    try {
      const torneo = await crearTorneo(nombreNuevo);
      setNombreNuevo('');
      setCreando(false);
      setExito(`Torneo «${torneo.nombre}» creado. Entra cuando quieras.`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function pulsarUnirse(forzado?: string) {
    const usado = (forzado ?? codigo).trim();
    if (usado.length !== 6) {
      setError('El código tiene 6 caracteres');
      return;
    }
    setError(null);
    setOcupado('unirse');
    try {
      const torneo = await unirsePorCodigo(usado);
      if (!torneo) {
        setError('No existe ningún torneo con ese código');
        return;
      }
      setCodigo('');
      setExito(`Ya estás en «${torneo.nombre}».`);
      setUniendo(false);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  function pulsarJugarGeneral() {
    if (pendientes.length > 1) {
      setEligiendo(true);
      return;
    }
    if (pendientes.length === 1) {
      jugar(pendientes[0].id);
      return;
    }
    if (torneos.length === 0) {
      jugarDiaria();
      return;
    }
    setError('Hoy ya has jugado en todos tus torneos.');
  }

  const tituloJugar =
    pendientes.length > 1
      ? `Elegir torneo · ${pendientes.length} pendientes`
      : pendientes.length === 1
        ? `Jugar en ${pendientes[0].nombre}`
        : torneos.length === 0
          ? 'Jugar La diaria'
          : 'Hoy ya está jugado';

  return (
    <>
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Boton titulo={tituloJugar} onPress={pulsarJugarGeneral} />
      {torneos.length === 0 && (
        <Sutil>
          {hayFirebase
            ? 'Todavía no estás en ninguno. Crea uno o entra con un código, o juega sin competir.'
            : 'Sin Firebase no hay torneos. Puedes jugar La diaria, un duelo o el arcade.'}
        </Sutil>
      )}

      {torneos.map((torneo) => {
        const filas = clasificacion(torneo, jornadas[torneo.id] ?? []);
        const puesto = filas.findIndex((f) => f.uid === uid) + 1;
        const mio = filas.find((f) => f.uid === uid);
        const falta = faltaPorJugar(jornadas[torneo.id] ?? [], uid, hoy);
        const resultadoHoy = (jornadas[torneo.id] ?? []).find((d) => d.fecha === hoy)?.resultados?.[
          uid ?? ''
        ];
        const color = colorDeTorneo(torneo.id);
        const lider = filas[0];
        const penalizado = penalizadoEn(torneo.id);
        const dia = (jornadas[torneo.id] ?? []).find((d) => d.fecha === hoy);
        const faltan = torneo.miembros.filter((m) => !dia?.resultados?.[m]);

        return (
          <Pressable
            key={torneo.id}
            onPress={() => entrar(torneo.id)}
            accessibilityRole="button"
            accessibilityLabel={`Entrar en ${torneo.nombre}`}
            style={[estilos.tarjeta, { borderColor: color }]}
          >
            <View style={estilos.fila}>
              <Emblema nombre={torneo.nombre} id={torneo.id} lado={44} />
              <View style={{ flex: 1 }}>
                <Texto style={estilos.nombre} numberOfLines={1}>
                  {torneo.nombre}
                </Texto>
                <Texto style={estilos.meta}>
                  {puesto > 0 ? `${puesto}.º de ${filas.length}` : 'sin puesto'}
                  {lider
                    ? lider.uid === uid
                      ? ' · lideras tú'
                      : ` · lidera ${lider.nombre}`
                    : ''}
                </Texto>
              </View>
              <View style={estilos.marcador}>
                <Texto style={[estilos.puntos, { color }]}>{mio?.puntos ?? 0}</Texto>
                <Texto style={falta ? estilos.falta : estilos.hecha}>
                  {falta ? 'Pendiente' : 'Jugado'}
                </Texto>
              </View>
            </View>

            <Texto style={estilos.meta} numberOfLines={2}>
              {faltan.length === 0
                ? 'Hoy ha jugado todo el grupo'
                : `Faltan ${faltan
                    .map((m) => (m === uid ? 'tú' : (torneo.perfiles?.[m]?.nombre ?? 'alguien')))
                    .join(', ')}`}
              {!falta && resultadoHoy ? ` · +${resultadoHoy.puntos} hoy` : ''}
            </Texto>
            {penalizado && (
              <Texto style={estilos.penalizacion}>Hoy abres con palabra impuesta</Texto>
            )}

            <View style={estilos.estado}>
              <View style={estilos.caras}>
                {filas.slice(0, 6).map((fila) => (
                  <Avatar key={fila.uid} avatar={fila.avatar} lado={18} />
                ))}
              </View>
              {falta ? (
                <Pressable
                  onPress={() => jugar(torneo.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Jugar en ${torneo.nombre}`}
                >
                  <Texto style={[estilos.accion, { color }]}>Jugar ›</Texto>
                </Pressable>
              ) : (
                <Texto style={[estilos.accion, { color }]}>Entrar ›</Texto>
              )}
            </View>
          </Pressable>
        );
      })}

      <View style={estilos.acciones}>
        <Pressable
          onPress={() => {
            setCreando((v) => !v);
            setUniendo(false);
          }}
          style={estilos.accionGrande}
          accessibilityRole="button"
        >
          <Texto style={estilos.mas}>+</Texto>
          <Texto style={estilos.accionTitulo}>Crear torneo</Texto>
          <Texto style={estilos.meta}>Con palabra propia y tus normas</Texto>
        </Pressable>
        <Pressable
          onPress={() => {
            setUniendo((v) => !v);
            setCreando(false);
          }}
          style={estilos.accionGrande}
          accessibilityRole="button"
        >
          <Texto style={estilos.mas}>⧉</Texto>
          <Texto style={estilos.accionTitulo}>Unirme</Texto>
          <Texto style={estilos.meta}>Con código, enlace o QR</Texto>
        </Pressable>
      </View>

      {creando && (
        <>
          <TextInput
            value={nombreNuevo}
            onChangeText={setNombreNuevo}
            placeholder="Familia Cruz, Los del curro..."
            placeholderTextColor={colores.textoSuave}
            style={estilos.campo}
            maxLength={30}
          />
          <Boton
            titulo="Crear"
            onPress={pulsarCrear}
            cargando={ocupado === 'crear'}
            deshabilitado={ocupado !== null}
          />
        </>
      )}

      {uniendo && (
        <>
          <Texto style={estilos.rotulo}>Código de invitación</Texto>
          <CasillasCodigo valor={codigo} onChange={setCodigo} />
          <View style={estilos.filaBotones}>
            <Boton
              titulo="Unirme"
              onPress={() => pulsarUnirse()}
              cargando={ocupado === 'unirse'}
              deshabilitado={ocupado !== null}
              estilo={{ flex: 1 }}
            />
            <Boton
              titulo="Escanear"
              variante="secundario"
              onPress={() => setEscaner(true)}
              estilo={{ flex: 1 }}
            />
          </View>
        </>
      )}

      <Texto style={estilos.rotulo}>Otras formas de jugar</Texto>
      <View style={estilos.acciones}>
        <Modo titulo="Duelo" detalle={`${PALABRAS_POR_DUELO} en directo`} color={colores.peligro} onPress={irADuelos} />
        <Modo titulo="La diaria" detalle="Sin puntos" color={colores.acento} onPress={jugarDiaria} />
        <Modo
          titulo="Arcade"
          detalle={
            recordArcade
              ? `${totalDe(recordArcade)} · ${reloj(recordArcade.segundos)}`
              : `${PALABRAS_POR_RONDA} seguidas`
          }
          color={colores.oro}
          onPress={irAArcade}
        />
      </View>

      {error && <Texto style={estilos.error}>{error}</Texto>}
      {exito && <Texto style={estilos.exito}>{exito}</Texto>}
    </ScrollView>

      <Hoja visible={eligiendo} cerrar={() => setEligiendo(false)} titulo="¿En cuál juegas?">
        <Sutil>Hay más de un torneo pendiente. Elige uno: no se entra en ninguno solo.</Sutil>
        {pendientes.map((torneo) => (
          <Pressable
            key={torneo.id}
            onPress={() => {
              setEligiendo(false);
              jugar(torneo.id);
            }}
            accessibilityRole="button"
            style={estilos.opcion}
          >
            <Emblema nombre={torneo.nombre} id={torneo.id} lado={36} />
            <Texto style={estilos.nombre}>{torneo.nombre}</Texto>
            <Texto style={[estilos.accion, { color: colorDeTorneo(torneo.id) }]}>Jugar ›</Texto>
          </Pressable>
        ))}
      </Hoja>

      <EscanerQr
        visible={escaner}
        cerrar={() => setEscaner(false)}
        alLeer={(leido) => {
          setEscaner(false);
          setCodigo(leido);
          setUniendo(true);
          pulsarUnirse(leido);
        }}
      />
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
      <Texto style={[estilos.accionTitulo, { color }]}>{titulo}</Texto>
      <Texto style={estilos.meta}>{detalle}</Texto>
    </Pressable>
  );
}

function mensajeDeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  if (texto.includes('permission')) {
    return 'Firestore ha rechazado la operación. Revisa las reglas de seguridad.';
  }
  if (texto.includes('offline') || texto.includes('network')) {
    return 'Sin conexión. Inténtalo otra vez cuando tengas internet.';
  }
  return texto;
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.sm, paddingBottom: espaciado.xl * 2 },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  penalizacion: {
    color: colores.penalizacion,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: espaciado.sm,
  },
  modo: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: colores.superficie,
    padding: espaciado.sm,
    minHeight: 72,
    justifyContent: 'flex-end',
  },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
    flexShrink: 1,
  },
  chapa: {
    color: colores.fondo,
    backgroundColor: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: 10,
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    borderRadius: 4,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  caras: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  meta: { color: colores.textoSuave, fontFamily: fuentes.cuerpo, fontSize: escala.micro },
  marcador: { alignItems: 'flex-end' },
  puntos: { color: colores.texto, fontFamily: fuentes.titularNegro, fontSize: escala.grande },
  estado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  falta: { color: colores.penalizacion, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno, flex: 1 },
  hecha: { color: colores.correcta, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno, flex: 1 },
  accion: { color: colores.acento, fontFamily: fuentes.cuerpoFuerte, fontSize: escala.pequeno },
  acciones: { flexDirection: 'row', gap: espaciado.sm, marginTop: espaciado.sm },
  accionGrande: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  mas: { color: colores.correcta, fontFamily: fuentes.titularNegro, fontSize: 28 },
  accionTitulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  rotulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: espaciado.sm,
  },
  filaBotones: { flexDirection: 'row', gap: espaciado.sm },
  campo: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 12,
    paddingHorizontal: espaciado.md,
    paddingVertical: 12,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
  },
  error: { color: colores.peligro, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno },
  exito: { color: colores.correcta, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno },
});
