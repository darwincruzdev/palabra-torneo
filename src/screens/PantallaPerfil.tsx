import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { SelectorAvatar } from '../components/SelectorAvatar';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { JORNADAS_POR_CICLO } from '../game/reglas';
import {
  MAX_INTENTOS,
  PALABRAS_PENALIZACION,
  PUNTOS_POR_INTENTO,
} from '../game/constantes';
import { todosLosAvatares, type Avatar as DatosAvatar } from '../game/avatares';
import { cargarHistorial, type EntradaHistorial } from '../almacen/local';
import { sumarDias } from '../game/fecha';
import { totalAceptadas, totalSoluciones } from '../game/palabras';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, radio } from '../tema';

export function PantallaPerfil() {
  const { nombre, avatar, cambiarPerfil, sesion, hayFirebase } = useApp();
  const [borradorNombre, setBorradorNombre] = useState(nombre);
  const [borradorAvatar, setBorradorAvatar] = useState<DatosAvatar>(avatar);
  const [guardado, setGuardado] = useState(false);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);

  useEffect(() => setBorradorNombre(nombre), [nombre]);
  useEffect(() => setBorradorAvatar(avatar), [avatar]);
  useEffect(() => {
    cargarHistorial().then(setHistorial);
  }, []);

  const stats = useMemo(() => calcularEstadisticas(historial), [historial]);
  const opciones = useMemo(() => todosLosAvatares(), []);

  const cambiado =
    borradorNombre !== nombre ||
    borradorAvatar.color !== avatar.color ||
    borradorAvatar.patron !== avatar.patron;

  async function guardar() {
    await cambiarPerfil(borradorNombre, borradorAvatar);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 1600);
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <View style={estilos.cabeceraPerfil}>
        <Avatar avatar={borradorAvatar} lado={72} />
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombreGrande}>{borradorNombre || 'Sin nombre'}</Text>
          {sesion.usuario?.email && (
            <Text style={estilos.correo}>{sesion.usuario.email}</Text>
          )}
        </View>
      </View>

      <Titulo>Tu nombre</Titulo>
      <Sutil>Es el que ven los demás en la clasificación del torneo.</Sutil>
      <TextInput
        value={borradorNombre}
        onChangeText={setBorradorNombre}
        placeholder="Darwin"
        placeholderTextColor={colores.textoSuave}
        maxLength={20}
        style={estilos.campo}
      />

      <Titulo>Tu avatar</Titulo>
      <Sutil>Lo dibuja la app, no hace falta subir ninguna foto.</Sutil>
      <View style={estilos.rejilla}>
        <SelectorAvatar elegido={borradorAvatar} onElegir={setBorradorAvatar} />
      </View>

      <Boton
        titulo={guardado ? 'Guardado' : 'Guardar perfil'}
        onPress={guardar}
        deshabilitado={borradorNombre.trim().length === 0 || !cambiado}
      />
      {!hayFirebase && (
        <Sutil>Firebase no está configurado: de momento esto sólo se guarda en el móvil.</Sutil>
      )}

      <Text style={estilos.seccion}>Tus estadísticas</Text>
      <Sutil>Suman todas tus partidas, de todos los torneos.</Sutil>
      <Tarjeta>
        <View style={estilos.filaStats}>
          <Dato valor={stats.jugadas} etiqueta="jugadas" />
          <Dato valor={`${stats.porcentaje}%`} etiqueta="aciertos" />
          <Dato valor={stats.racha} etiqueta="racha" />
          <Dato valor={stats.mejorRacha} etiqueta="mejor racha" />
        </View>
        <View style={estilos.separador} />
        <Sutil>Reparto de intentos</Sutil>
        <View style={{ marginTop: espaciado.sm, gap: 6 }}>
          {stats.reparto.map((cuenta, i) => {
            const maximo = Math.max(1, ...stats.reparto);
            return (
              <View key={i} style={estilos.filaBarra}>
                <Text style={estilos.numeroIntento}>{i + 1}</Text>
                <View
                  style={[
                    estilos.barra,
                    {
                      width: `${Math.max(6, (cuenta / maximo) * 100)}%`,
                      backgroundColor: cuenta > 0 ? colores.correcta : colores.borde,
                    },
                  ]}
                >
                  <Text style={estilos.cuentaBarra}>{cuenta}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={estilos.separador} />
        <View style={estilos.filaStats}>
          <Dato valor={stats.puntos} etiqueta="puntos acumulados" />
          <Dato
            valor={stats.media === null ? '—' : stats.media.toFixed(2)}
            etiqueta="puntos por jornada"
          />
        </View>
      </Tarjeta>

      <Text style={estilos.seccion}>Cómo se juega</Text>
      <Tarjeta>
        <Sutil>
          Cada torneo tiene su propia palabra secreta de cinco letras al día, distinta de
          la de los demás torneos, y {MAX_INTENTOS} intentos para acertarla. Al enviar una
          palabra, cada letra se pinta:
        </Sutil>
        <View style={{ gap: 8, marginTop: espaciado.md }}>
          <Leyenda color={colores.correcta} texto="La letra está y va en esa posición." />
          <Leyenda
            color={colores.presente}
            texto="La letra está en la palabra, pero en otro sitio."
          />
          <Leyenda
            color={colores.ausente}
            texto="La letra no está. En el teclado se apaga, pero puedes seguir usándola."
          />
        </View>
        <View style={estilos.separador} />
        <Sutil>
          Se escribe sin tildes y la Ñ tiene su tecla. Valen{' '}
          {totalAceptadas.toLocaleString('es-ES')} palabras distintas como intento, y la
          solución sale siempre de un grupo de {totalSoluciones.toLocaleString('es-ES')}{' '}
          palabras de uso corriente.
        </Sutil>
      </Tarjeta>

      <Text style={estilos.seccion}>Puntuación del torneo</Text>
      <Tarjeta>
        {PUNTOS_POR_INTENTO.map((puntos, i) => (
          <View key={i} style={estilos.filaPuntos}>
            <Text style={estilos.textoPuntos}>
              Acertar al {i + 1}
              {i === 0 ? 'er' : 'º'} intento
            </Text>
            <Text style={estilos.valorPuntos}>{puntos}</Text>
          </View>
        ))}
        <View style={estilos.filaPuntos}>
          <Text style={estilos.textoPuntos}>No acertar</Text>
          <Text style={[estilos.valorPuntos, { color: colores.textoSuave }]}>0</Text>
        </View>
      </Tarjeta>

      <Text style={estilos.seccion}>La regla del líder</Text>
      <Tarjeta>
        <Sutil>
          Quien termine una jornada primero en solitario — sin empatar a puntos con el
          segundo — arranca la jornada siguiente obligado a usar una de estas cinco
          palabras como primer intento:
        </Sutil>
        <Text style={estilos.palabras}>
          {PALABRAS_PENALIZACION.map((p) => p.toUpperCase()).join('\n')}
        </Text>
        <Sutil>
          Las cinco repiten letras, así que gastan un intento dando muy poca información.
          Es el lastre por ir ganando. Si hay empate en lo alto de la tabla, nadie lleva
          penalización. Se cuenta por separado en cada torneo.
        </Sutil>
      </Tarjeta>

      <Text style={estilos.seccion}>La blueshell</Text>
      <Tarjeta>
        <Sutil>
          Cada {JORNADAS_POR_CICLO} jornadas tienes una bala y un escudo, y sólo uno de
          cada. La bala se le tira a quien va primero: al día siguiente estará obligado a
          usar de segundo intento la palabra que hayas elegido tú.
        </Sutil>
        <Sutil>
          Se pueden juntar varias contra la misma persona. Entonces le ocupan un intento
          cada una, en el segundo, el tercero y así: cuatro balas dejan casi la jornada
          escrita de antemano.
        </Sutil>
        <Sutil>
          El escudo se gasta desde el tablero el día que te caen, y las anula todas de
          golpe, tantas como te hayan tirado. Se dispara desde la clasificación del
          torneo, y cada torneo decide si juega con esta norma o sin ella.
        </Sutil>
      </Tarjeta>

      <View style={{ height: espaciado.lg }} />
      <Boton titulo="Cerrar sesión" variante="peligro" onPress={() => sesion.salir()} />
    </ScrollView>
  );
}

function Dato({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.valorDato}>{valor}</Text>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
    </View>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={estilos.filaLeyenda}>
      <View style={[estilos.muestra, { backgroundColor: color }]} />
      <Text style={estilos.textoLeyenda}>{texto}</Text>
    </View>
  );
}

function calcularEstadisticas(historial: EntradaHistorial[]) {
  const jugadas = historial.length;
  const aciertos = historial.filter((e) => e.acertada).length;
  const puntos = historial.reduce((suma, e) => suma + e.puntos, 0);

  const reparto = new Array(MAX_INTENTOS).fill(0) as number[];
  for (const e of historial) {
    if (e.acertada) reparto[e.intentos - 1] += 1;
  }

  // Racha: jornadas consecutivas acertadas hasta la última jugada. Un día sin
  // jugar también corta la racha.
  let mejorRacha = 0;
  let seguidas = 0;
  let fechaPrevia: string | null = null;
  for (const e of historial) {
    const consecutiva = fechaPrevia !== null && sumarDias(fechaPrevia, 1) === e.fecha;
    seguidas = e.acertada ? (consecutiva ? seguidas + 1 : 1) : 0;
    mejorRacha = Math.max(mejorRacha, seguidas);
    fechaPrevia = e.fecha;
  }

  return {
    jugadas,
    aciertos,
    puntos,
    reparto,
    racha: seguidas,
    mejorRacha,
    porcentaje: jugadas === 0 ? 0 : Math.round((aciertos / jugadas) * 100),
    media: jugadas === 0 ? null : puntos / jugadas,
  };
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  cabeceraPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    marginBottom: espaciado.md,
  },
  nombreGrande: {
    color: colores.texto,
    fontSize: 22,
    fontWeight: '800',
  },
  correo: {
    color: colores.textoSuave,
    fontSize: 12,
    marginTop: 2,
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
    marginVertical: espaciado.sm,
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginVertical: espaciado.md,
  },
  seccion: {
    color: colores.texto,
    fontSize: 16,
    fontWeight: '800',
    marginTop: espaciado.lg,
    marginBottom: espaciado.xs,
  },
  filaStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dato: {
    alignItems: 'center',
    flex: 1,
  },
  valorDato: {
    color: colores.texto,
    fontSize: 24,
    fontWeight: '900',
  },
  etiquetaDato: {
    color: colores.textoSuave,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espaciado.md,
  },
  filaBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  numeroIntento: {
    color: colores.textoSuave,
    fontSize: 12,
    width: 12,
  },
  barra: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignItems: 'flex-end',
  },
  cuentaBarra: {
    color: colores.texto,
    fontSize: 11,
    fontWeight: '700',
  },
  filaLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  muestra: {
    width: 26,
    height: 26,
    borderRadius: radio.sm,
  },
  textoLeyenda: {
    color: colores.textoSuave,
    fontSize: 13,
    flex: 1,
  },
  filaPuntos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  textoPuntos: {
    color: colores.texto,
    fontSize: 14,
  },
  valorPuntos: {
    color: colores.oro,
    fontSize: 18,
    fontWeight: '900',
  },
  palabras: {
    color: colores.presente,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    lineHeight: 26,
    marginVertical: espaciado.md,
  },
});
