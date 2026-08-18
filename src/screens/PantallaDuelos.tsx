import React, { useEffect, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { PALABRAS_POR_DUELO, SEGUNDOS_FINAL } from '../game/duelo';
import { PUNTOS_POR_INTENTO } from '../game/constantes';
import { enlaceDeInvitacion, hayEnlaces } from '../game/invitacion';
import { useApp } from '../estado/AppContext';
import { cargarDueloActivo, guardarDueloActivo } from '../almacen/local';
import * as duelos from '../firebase/duelos';
import { colores, espaciado, radio } from '../tema';

type Props = {
  irAlDuelo: (dueloId: string) => void;
};

export function PantallaDuelos({ irAlDuelo }: Props) {
  const { uid, nombre, avatar, hayFirebase } = useApp();
  const [codigo, setCodigo] = useState('');
  const [creado, setCreado] = useState<{ id: string; codigo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'crear' | 'unirse' | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [enCurso, setEnCurso] = useState<string | null>(null);

  // Si se cerró la pestaña a mitad de un duelo, se puede volver a él: no hay
  // lista de duelos y el código sólo lo tenía quien lo creó.
  useEffect(() => {
    cargarDueloActivo().then(setEnCurso);
  }, []);

  if (!hayFirebase) {
    return (
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Tarjeta>
          <Titulo>Duelos sin configurar</Titulo>
          <Sutil>
            El duelo necesita conexión para sincronizar con tu rival, y para eso hace
            falta configurar Firebase. Está explicado en el README.
          </Sutil>
        </Tarjeta>
      </ScrollView>
    );
  }

  async function crear() {
    if (!uid) return;
    setError(null);
    setOcupado('crear');
    try {
      const duelo = await duelos.crearDuelo(uid, nombre || 'Jugador', avatar);
      setCreado({ id: duelo.id, codigo: duelo.codigo });
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function entrar() {
    if (!uid) return;
    if (codigo.trim().length !== 6) {
      setError('El código tiene 6 caracteres');
      return;
    }
    setError(null);
    setOcupado('unirse');
    try {
      const invitacion = await duelos.buscarDuelo(codigo);
      if (!invitacion) {
        setError('No existe ningún duelo con ese código');
        return;
      }
      await duelos.unirseADuelo(invitacion.dueloId, uid, nombre || 'Jugador', avatar);
      irAlDuelo(invitacion.dueloId);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  }

  async function compartir() {
    if (!creado) return;
    const cierre = hayEnlaces
      ? `Entra aquí y mete el código ${creado.codigo}: ${enlaceDeInvitacion(creado.codigo)}`
      : `Abre Palabra Torneo, ve a Duelo y mete este código: ${creado.codigo}`;
    try {
      await Share.share({ message: `Te reto a un duelo de Palabra Torneo.\n${cierre}` });
    } catch {
      // Diálogo cancelado.
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Tarjeta>
        <Titulo>Cómo funciona</Titulo>
        <Sutil>
          Uno contra uno, al mejor de {PALABRAS_POR_DUELO} palabras, las mismas para los
          dos y a la vez. Cada palabra da puntos según en qué intento la saques (
          {PUNTOS_POR_INTENTO.join('/')}), con seis intentos: si se agotan, esa palabra va
          a cero.
        </Sutil>
        <View style={estilos.separador} />
        <Sutil>
          Se va palabra a palabra, sin adelantarse. El primero que cierra la suya le deja
          al otro <Text style={estilos.negrita}>{SEGUNDOS_FINAL} segundos</Text> para
          cerrar la suya, y mientras espera ve su tablero en grande y en directo, con
          letras y todo. Cuando los dos la cierran, empieza la siguiente.
        </Sutil>
      </Tarjeta>

      {enCurso && !creado && (
        <Tarjeta estilo={{ borderColor: colores.presente }}>
          <Titulo>Tienes un duelo a medias</Titulo>
          <Sutil>Puedes volver a él donde lo dejaste.</Sutil>
          <View style={{ height: espaciado.md }} />
          <View style={estilos.botones}>
            <Boton
              titulo="Volver al duelo"
              onPress={() => irAlDuelo(enCurso)}
              estilo={{ flex: 1 }}
            />
            <Boton
              titulo="Olvidarlo"
              variante="secundario"
              onPress={() => {
                guardarDueloActivo(null);
                setEnCurso(null);
              }}
              estilo={{ flex: 1 }}
            />
          </View>
        </Tarjeta>
      )}

      {creado ? (
        <Tarjeta estilo={{ borderColor: colores.correcta }}>
          <Titulo>Duelo creado</Titulo>
          <Sutil>Pásale el código a tu rival. Empieza en cuanto él entre.</Sutil>
          <Text
            style={estilos.codigo}
            onPress={async () => {
              await Clipboard.setStringAsync(creado.codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1600);
            }}
          >
            {creado.codigo}
          </Text>
          <Text style={estilos.pista}>
            {copiado ? '¡Copiado!' : 'Toca el código para copiarlo'}
          </Text>
          <View style={estilos.botones}>
            <Boton titulo="Compartir" onPress={compartir} estilo={{ flex: 1 }} />
            <Boton
              titulo="Ir al duelo"
              variante="secundario"
              onPress={() => irAlDuelo(creado.id)}
              estilo={{ flex: 1 }}
            />
          </View>
        </Tarjeta>
      ) : (
        <>
          <Titulo>Retar a alguien</Titulo>
          <Boton
            titulo="Crear un duelo"
            onPress={crear}
            cargando={ocupado === 'crear'}
            deshabilitado={ocupado !== null}
          />
        </>
      )}

      <View style={estilos.separador} />

      <Titulo>Entrar con un código</Titulo>
      <TextInput
        value={codigo}
        onChangeText={(t) => setCodigo(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        placeholder="ABC123"
        placeholderTextColor={colores.textoSuave}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={[estilos.campo, estilos.campoCodigo]}
      />
      <Boton
        titulo="Aceptar el duelo"
        variante="secundario"
        onPress={entrar}
        cargando={ocupado === 'unirse'}
        deshabilitado={ocupado !== null}
      />

      {error && <Text style={estilos.error}>{error}</Text>}
    </ScrollView>
  );
}

function mensajeDeError(e: unknown): string {
  const texto = e instanceof Error ? e.message : String(e);
  const codigo = (e as { code?: string })?.code ?? '';

  // Firestore contesta en inglés y sin contexto; lo traducimos, pero dejamos el
  // original a la vista: sin él es imposible saber qué operación ha rechazado.
  if (/permission|insufficient/i.test(texto)) {
    return `Firestore ha rechazado la operación. Revisa las reglas en la consola de Firebase.\n\n[${codigo || 'sin código'}] ${texto}`;
  }
  if (/offline|network|unavailable/i.test(texto)) {
    return 'Sin conexión. El duelo necesita internet para sincronizar con tu rival.';
  }
  return `${texto || 'No se ha podido completar la operación.'}${codigo ? `\n\n[${codigo}]` : ''}`;
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  negrita: {
    color: colores.texto,
    fontWeight: '800',
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
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
  botones: {
    flexDirection: 'row',
    gap: espaciado.sm,
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
});
