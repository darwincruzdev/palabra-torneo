import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Emblema } from '../components/Emblema';
import { CasillasCodigo } from '../components/CasillasCodigo';
import { EscanerQr } from '../components/EscanerQr';
import { Boton, Sutil } from '../components/ui';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego } from '../game/fecha';
import { faltaPorJugar } from '../game/pendientes';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  alJugar: (torneoId: string) => void;
  alVerTabla: (torneoId: string) => void;
  codigoEntrante?: string | null;
  codigoConsumido?: () => void;
};

/** La lista de torneos. Es la única forma de cambiar el de la cabecera. */
export function PantallaTorneos({ alJugar, alVerTabla, codigoEntrante, codigoConsumido }: Props) {
  const { hayFirebase, torneos, jornadas, uid, torneoCabecera, elegirTorneo, crearTorneo, unirsePorCodigo, penalizadoEn } =
    useApp();
  const [creando, setCreando] = useState(false);
  const [uniendo, setUniendo] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'crear' | 'unirse' | null>(null);
  const [escaner, setEscaner] = useState(false);
  const hoy = fechaJuego();

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
      setExito(`Torneo «${torneo.nombre}» creado.`);
      alJugar(torneo.id);
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
      alVerTabla(torneo.id);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  if (!hayFirebase) {
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Sutil>
          Para competir hace falta conectar Firebase. Mientras tanto puedes jugar La diaria.
          Está explicado en el README.
        </Sutil>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      {torneos.length === 0 && (
        <Sutil>Todavía no estás en ninguno. Crea uno o entra con un código.</Sutil>
      )}

      {torneos.map((torneo) => {
        const filas = clasificacion(torneo, jornadas[torneo.id] ?? []);
        const puesto = filas.findIndex((f) => f.uid === uid) + 1;
        const mio = filas.find((f) => f.uid === uid);
        const falta = faltaPorJugar(jornadas[torneo.id] ?? [], uid, hoy);
        const resultadoHoy = (jornadas[torneo.id] ?? []).find((d) => d.fecha === hoy)?.resultados?.[
          uid ?? ''
        ];
        const activo = torneoCabecera?.id === torneo.id;
        const lidero =
          liderDestacado(clasificacion(torneo, jornadas[torneo.id] ?? [], { hasta: hoy })) === uid &&
          penalizadoEn(torneo.id);

        return (
          <Pressable
            key={torneo.id}
            onPress={() => elegirTorneo(torneo.id)}
            accessibilityRole="button"
            style={[estilos.tarjeta, activo && estilos.activa]}
          >
            <View style={estilos.fila}>
              <Emblema nombre={torneo.nombre} id={torneo.id} lado={40} />
              <View style={{ flex: 1 }}>
                <View style={estilos.linea}>
                  <Texto style={estilos.nombre} numberOfLines={1}>
                    {torneo.nombre}
                  </Texto>
                  {activo && <Texto style={estilos.chapa}>Activo</Texto>}
                </View>
                <View style={estilos.caras}>
                  {filas.slice(0, 6).map((fila) => (
                    <Avatar key={fila.uid} avatar={fila.avatar} lado={18} />
                  ))}
                  <Texto style={estilos.meta}>
                    {torneo.miembros.length} jugadores
                  </Texto>
                </View>
              </View>
              <View style={estilos.marcador}>
                <Texto style={estilos.puntos}>{mio?.puntos ?? 0}</Texto>
                <Texto style={estilos.meta}>
                  {puesto > 0 ? `${puesto}.º de ${filas.length}` : '—'}
                </Texto>
              </View>
            </View>

            <View style={estilos.estado}>
              <Texto style={falta ? estilos.falta : estilos.hecha} numberOfLines={1}>
                {falta
                  ? `Te falta la de hoy${lidero ? ' · 👑 abres con impuesta' : ''}`
                  : resultadoHoy
                    ? `Hoy: ${resultadoHoy.acertada ? `${resultadoHoy.intentos}/6` : 'X/6'} · +${resultadoHoy.puntos}`
                    : 'Hoy jugada'}
              </Texto>
              {falta ? (
                <Pressable
                  onPress={() => {
                    elegirTorneo(torneo.id);
                    alJugar(torneo.id);
                  }}
                  hitSlop={8}
                >
                  <Texto style={estilos.accion}>Jugar ›</Texto>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    elegirTorneo(torneo.id);
                    alVerTabla(torneo.id);
                  }}
                  hitSlop={8}
                >
                  <Texto style={estilos.accion}>Ver tabla ›</Texto>
                </Pressable>
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

      {error && <Texto style={estilos.error}>{error}</Texto>}
      {exito && <Texto style={estilos.exito}>{exito}</Texto>}

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
    </ScrollView>
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
  activa: { borderColor: colores.acento },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
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
