import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import * as Clipboard from 'expo-clipboard';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import {
  PALABRAS_POR_DUELO,
  SEGUNDOS_FINAL,
  balancePorRival,
  duelosJugados,
  type DueloJugado,
} from '../game/duelo';
import { PUNTOS_POR_INTENTO } from '../game/constantes';
import { enlaceDeInvitacion, hayEnlaces } from '../game/invitacion';
import { useApp } from '../estado/AppContext';
import { cargarDueloActivo, guardarDueloActivo } from '../almacen/local';
import * as duelos from '../firebase/duelos';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

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
  /** El duelo con el que estoy esperando en la cola, si estoy esperando. */
  const [enCola, setEnCola] = useState<{ dueloId: string; codigo: string } | null>(null);
  const [buscando, setBuscando] = useState(false);
  /** Los duelos ya jugados. Se piden una vez al abrir la pantalla. */
  const [jugados, setJugados] = useState<DueloJugado[]>([]);
  /**
   * Si la espera acabó en emparejamiento.
   *
   * Es imprescindible para no borrar el duelo bueno: salir de la cola y
   * encontrar rival dejan el mismo rastro —`enCola` a null—, y la limpieza no
   * puede distinguirlos por sí sola. Va en una referencia y no en el estado
   * porque la lee la limpieza, que corre después del último dibujado.
   */
  const emparejado = useRef(false);

  // Si se cerró la pestaña a mitad de un duelo, se puede volver a él: no hay
  // lista de duelos y el código sólo lo tenía quien lo creó.
  useEffect(() => {
    cargarDueloActivo().then(setEnCurso);
  }, []);

  /**
   * Mientras espero en la cola, escucho mi propio duelo: en cuanto alguien
   * entra como rival, se abre solo. No hace falta preguntar cada pocos
   * segundos, la base de datos ya avisa.
   */
  useEffect(() => {
    if (!enCola) return;
    return duelos.observarDuelo(enCola.dueloId, (duelo) => {
      if (duelo?.rival) {
        emparejado.current = true;
        setEnCola(null);
        irAlDuelo(enCola.dueloId);
      }
    });
  }, [enCola, irAlDuelo]);

  /**
   * Si se cierra la pantalla con la cola puesta, se recoge el duelo que quedó
   * esperando. Sin esto, la cola se iría llenando de salas fantasma que hacen
   * perder el turno a quien busca rival de verdad.
   */
  useEffect(() => {
    return () => {
      if (enCola && !emparejado.current) {
        duelos.salirDeLaCola(enCola.dueloId, enCola.codigo);
      }
    };
  }, [enCola]);

  /**
   * El historial se pide una sola vez y sin dejar escucha abierta: son partidas
   * terminadas, no van a cambiar.
   */
  useEffect(() => {
    if (!uid || !hayFirebase) return;
    let vigente = true;
    duelos
      .misDuelos(uid)
      .then((todos) => {
        if (vigente) setJugados(duelosJugados(todos, uid));
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [uid, hayFirebase]);

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

  async function buscarRival() {
    if (!uid) return;
    setError(null);
    setBuscando(true);
    try {
      const resultado = await duelos.entrarEnCola(uid, nombre || 'Jugador', avatar);
      if (resultado.esperando) {
        setEnCola({ dueloId: resultado.dueloId, codigo: resultado.codigo });
      } else {
        irAlDuelo(resultado.dueloId);
      }
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setBuscando(false);
    }
  }

  /** Salir de la cola. El borrado lo hace la limpieza del efecto, un solo camino. */
  function dejarLaCola() {
    setEnCola(null);
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
      {enCola ? (
        <Tarjeta acento={colores.acento}>
          <Titulo>Buscando rival</Titulo>
          <View style={estilos.esperando}>
            <ActivityIndicator color={colores.acento} />
            <Sutil>
              En cuanto otro le dé a buscar partida, empezáis. Puedes dejar esto abierto.
            </Sutil>
          </View>
          <View style={{ height: espaciado.md }} />
          <Boton titulo="Salir de la cola" variante="peligro" onPress={dejarLaCola} />
        </Tarjeta>
      ) : (
        <Tarjeta acento={colores.acento}>
          <Titulo>Duelo rápido</Titulo>
          <Sutil>
            Sin códigos ni invitaciones: te ponemos con quien esté buscando en ese
            momento.
          </Sutil>
          <View style={{ height: espaciado.md }} />
          <Boton
            titulo="Buscar partida"
            onPress={buscarRival}
            cargando={buscando}
            deshabilitado={ocupado !== null}
          />
        </Tarjeta>
      )}

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
          <Texto
            style={estilos.codigo}
            onPress={async () => {
              await Clipboard.setStringAsync(creado.codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1600);
            }}
          >
            {creado.codigo}
          </Texto>
          <Texto style={estilos.pista}>
            {copiado ? '¡Copiado!' : 'Toca el código para copiarlo'}
          </Texto>
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

      {jugados.length > 0 && (
        <Tarjeta acento={colores.oro}>
          <Titulo>Tus duelos</Titulo>

          <View style={estilos.balance}>
            {balancePorRival(jugados).map((rival) => (
              <Texto key={rival.uid} style={estilos.lineaBalance}>
                <Texto style={estilos.negrita}>{rival.nombre}</Texto>
                {'  '}
                <Texto style={estilos.ganados}>{rival.ganados}</Texto>
                {' - '}
                <Texto style={estilos.perdidos}>{rival.perdidos}</Texto>
                {rival.empates > 0 ? `  (${rival.empates} en tablas)` : ''}
              </Texto>
            ))}
          </View>

          <View style={estilos.separador} />
          <Sutil>Los últimos</Sutil>

          {jugados.slice(0, 8).map((duelo) => (
            <View key={duelo.id} style={estilos.filaDuelo}>
              <Texto style={estilos.marcaDuelo}>
                {duelo.resultado === 'ganado'
                  ? '✓'
                  : duelo.resultado === 'perdido'
                    ? '✗'
                    : '='}
              </Texto>
              <Texto style={estilos.nombreDuelo} numberOfLines={1}>
                {duelo.rival?.nombre ?? 'Rival'}
              </Texto>
              <Texto style={estilos.tanteo}>
                {duelo.misPuntos} - {duelo.susPuntos}
              </Texto>
            </View>
          ))}
        </Tarjeta>
      )}

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
          al otro <Texto style={estilos.negrita}>{SEGUNDOS_FINAL} segundos</Texto> para
          cerrar la suya, y mientras espera ve su tablero en grande y en directo, con
          letras y todo. Cuando los dos la cierran, empieza la siguiente.
        </Sutil>
      </Tarjeta>

      {error && <Texto style={estilos.error}>{error}</Texto>}
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
  balance: {
    gap: 4,
    marginTop: espaciado.sm,
  },
  lineaBalance: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
  },
  ganados: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
  perdidos: {
    color: colores.peligro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
  filaDuelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingVertical: 5,
  },
  marcaDuelo: {
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    color: colores.textoSuave,
    width: 16,
    textAlign: 'center',
  },
  nombreDuelo: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  tanteo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
  },
  esperando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginTop: espaciado.sm,
  },
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  negrita: {
    fontFamily: fuentes.titularNegro,
    color: colores.texto,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
  },
  codigo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    letterSpacing: 8,
    textAlign: 'center',
    marginVertical: espaciado.sm,
  },
  pista: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
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
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    marginBottom: espaciado.sm,
  },
  campoCodigo: {
    fontFamily: fuentes.titularNegro,
    letterSpacing: 6,
    textAlign: 'center',
  },
  error: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: espaciado.sm,
  },
});
