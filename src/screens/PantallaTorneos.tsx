import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego } from '../game/fecha';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

type Props = {
  verClasificacion: (torneoId: string) => void;
  /** Código que llegó por un enlace de invitación, para rellenar el campo. */
  codigoEntrante?: string | null;
  codigoConsumido?: () => void;
};

export function PantallaTorneos({
  verClasificacion,
  codigoEntrante,
  codigoConsumido,
}: Props) {
  const { hayFirebase, torneos, jornadas, uid, activo, elegirTorneo, crearTorneo, unirsePorCodigo } =
    useApp();
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'crear' | 'unirse' | null>(null);

  const hoy = fechaJuego();

  // Si se ha abierto la app desde una invitación, el código ya viene puesto.
  useEffect(() => {
    if (codigoEntrante) {
      setCodigo(codigoEntrante);
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
      setExito(`Torneo "${torneo.nombre}" creado. Ya puedes invitar a los tuyos.`);
      verClasificacion(torneo.id);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function pulsarUnirse() {
    if (codigo.trim().length !== 6) {
      setError('El código tiene 6 caracteres');
      return;
    }
    setError(null);
    setOcupado('unirse');
    try {
      const torneo = await unirsePorCodigo(codigo);
      if (!torneo) {
        setError('No existe ningún torneo con ese código');
        return;
      }
      setCodigo('');
      setExito(`Ya estás en "${torneo.nombre}".`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  if (!hayFirebase) {
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Tarjeta>
          <Titulo>Torneos sin configurar</Titulo>
          <Sutil>
            Para competir con los tuyos hace falta conectar la app a un proyecto de
            Firebase. Copia el fichero .env.example a .env, pega ahí los datos de tu
            proyecto y vuelve a arrancar. Está explicado paso a paso en el README.
          </Sutil>
        </Tarjeta>
        <Sutil>Mientras tanto puedes jugar en modo libre con normalidad.</Sutil>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Titulo>Mis torneos</Titulo>
      {torneos.length === 0 && (
        <Sutil>
          Todavía no estás en ninguno. Crea uno y reparte el enlace, o entra con el código
          que te hayan pasado.
        </Sutil>
      )}

      {torneos.map((torneo) => {
        const filas = clasificacion(torneo, jornadas[torneo.id] ?? []);
        const miFila = filas.find((f) => f.uid === uid);
        const puesto = filas.findIndex((f) => f.uid === uid) + 1;
        const lidero = liderDestacado(clasificacion(torneo, jornadas[torneo.id] ?? [], hoy)) === uid;
        const esActivo = activo.id === torneo.id;

        return (
          <Tarjeta key={torneo.id} estilo={esActivo ? estilos.tarjetaActiva : undefined}>
            <Pressable onPress={() => verClasificacion(torneo.id)}>
              <View style={estilos.filaTorneo}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nombreTorneo}>{torneo.nombre}</Text>
                  <Text style={estilos.datosTorneo}>
                    {torneo.miembros.length}{' '}
                    {torneo.miembros.length === 1 ? 'jugador' : 'jugadores'} · código{' '}
                    {torneo.codigo}
                  </Text>
                </View>
                <View style={estilos.marcador}>
                  <Text style={estilos.puntosTorneo}>{miFila?.puntos ?? 0}</Text>
                  <Text style={estilos.datosTorneo}>{puesto > 0 ? `${puesto}º` : '—'}</Text>
                </View>
              </View>

              <View style={estilos.caras}>
                {filas.slice(0, 6).map((fila) => (
                  <Avatar key={fila.uid} avatar={fila.avatar} lado={26} />
                ))}
                {filas.length > 6 && (
                  <Text style={estilos.masJugadores}>+{filas.length - 6}</Text>
                )}
              </View>

              {lidero && (
                <Text style={estilos.avisoLider}>
                  Lideras en solitario: aquí juegas con palabra impuesta.
                </Text>
              )}
            </Pressable>

            {!esActivo && (
              <Pressable onPress={() => elegirTorneo(torneo.id)} style={estilos.botonJugar}>
                <Text style={estilos.textoJugar}>Jugar la palabra de este torneo</Text>
              </Pressable>
            )}
            {esActivo && <Text style={estilos.marcaActivo}>Es el torneo que estás jugando</Text>}
          </Tarjeta>
        );
      })}

      <View style={estilos.separador} />

      <Titulo>Crear un torneo</Titulo>
      <Sutil>Tendrá su propia palabra diaria, distinta de la de cualquier otro torneo.</Sutil>
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

      <View style={estilos.separador} />

      <Titulo>Entrar con un código</Titulo>
      <TextInput
        value={codigo}
        onChangeText={(texto) => setCodigo(texto.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        placeholder="ABC123"
        placeholderTextColor={colores.textoSuave}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={[estilos.campo, estilos.campoCodigo]}
      />
      <Boton
        titulo="Unirme"
        variante="secundario"
        onPress={pulsarUnirse}
        cargando={ocupado === 'unirse'}
        deshabilitado={ocupado !== null}
      />

      {error && <Text style={estilos.error}>{error}</Text>}
      {exito && <Text style={estilos.exito}>{exito}</Text>}
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
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  tarjetaActiva: {
    borderColor: colores.correcta,
  },
  filaTorneo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  nombreTorneo: {
    color: colores.texto,
    fontSize: 17,
    fontWeight: '700',
  },
  datosTorneo: {
    color: colores.textoSuave,
    fontSize: 12,
    marginTop: 2,
  },
  marcador: {
    alignItems: 'flex-end',
  },
  puntosTorneo: {
    color: colores.oro,
    fontSize: 24,
    fontWeight: '900',
  },
  caras: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: espaciado.sm,
  },
  masJugadores: {
    color: colores.textoSuave,
    fontSize: 12,
    marginLeft: 2,
  },
  avisoLider: {
    marginTop: espaciado.sm,
    color: colores.presente,
    fontSize: 12,
  },
  botonJugar: {
    marginTop: espaciado.md,
    paddingVertical: 10,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
  },
  textoJugar: {
    color: colores.cursor,
    fontSize: 13,
    fontWeight: '700',
  },
  marcaActivo: {
    marginTop: espaciado.md,
    color: colores.correcta,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
  },
  campo: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: 12,
    color: colores.texto,
    fontSize: 16,
    marginBottom: espaciado.sm,
  },
  campoCodigo: {
    letterSpacing: 6,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    color: colores.peligro,
    fontSize: 13,
    marginTop: espaciado.sm,
  },
  exito: {
    color: colores.correcta,
    fontSize: 13,
    marginTop: espaciado.sm,
  },
});
