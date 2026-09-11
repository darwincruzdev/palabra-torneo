import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Switch,
} from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { SelectorAvatar } from '../components/SelectorAvatar';
import { Boton, Sutil, Tarjeta, Titulo } from '../components/ui';
import { Desplegable } from '../components/Desplegable';
import * as Linking from 'expo-linking';
import { BLUESHELLS_POR_MES, MAX_VOCALES_AL_ABRIR } from '../game/reglas';
import {
  MAX_INTENTOS,
  NOTAS_DEL_PARCHE,
  VERSION_PARCHE,
  PALABRAS_PENALIZACION,
  PUNTOS_POR_INTENTO,
} from '../game/constantes';
import { todosLosAvatares, type Avatar as DatosAvatar } from '../game/avatares';
import { cargarHistorial, type EntradaHistorial } from '../almacen/local';
import { fusionarHistorial } from '../game/estadisticas';
import { sumarDias } from '../game/fecha';
import { totalAceptadas, totalSoluciones } from '../game/palabras';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

export function PantallaPerfil() {
  const {
    nombre,
    avatar,
    cambiarPerfil,
    sesion,
    hayFirebase,
    letraGrande,
    cambiarLetraGrande,
    torneos,
    misPartidasPublicadas,
    cargarResumenes,
  } = useApp();
  const [borradorNombre, setBorradorNombre] = useState(nombre);
  const [borradorAvatar, setBorradorAvatar] = useState<DatosAvatar>(avatar);
  const [guardado, setGuardado] = useState(false);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);

  useEffect(() => setBorradorNombre(nombre), [nombre]);
  useEffect(() => setBorradorAvatar(avatar), [avatar]);
  useEffect(() => {
    cargarHistorial().then(setHistorial);
  }, []);

  /**
   * Las estadísticas necesitan el historial completo, así que esta pantalla sí
   * lo pide. Es la única, y se abre de vez en cuando: el resto de la app sigue
   * sin descargarlo.
   */
  useEffect(() => {
    for (const torneo of torneos) cargarResumenes(torneo.id);
  }, [torneos, cargarResumenes]);

  /**
   * Lo guardado en este móvil más lo que consta en el servidor.
   *
   * Hacen falta los dos: el modo libre sólo existe aquí, y las partidas de
   * torneo jugadas desde otro aparato sólo están allí.
   */
  const completo = useMemo(
    () => fusionarHistorial(historial, misPartidasPublicadas),
    [historial, misPartidasPublicadas]
  );

  const stats = useMemo(() => calcularEstadisticas(completo), [completo]);
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
          <Texto style={estilos.nombreGrande}>{borradorNombre || 'Sin nombre'}</Texto>
          {sesion.usuario?.email && (
            <Texto style={estilos.correo}>{sesion.usuario.email}</Texto>
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
      <SelectorAvatar elegido={borradorAvatar} onElegir={setBorradorAvatar} plegable />

      <Boton
        titulo={guardado ? 'Guardado' : 'Guardar perfil'}
        onPress={guardar}
        deshabilitado={borradorNombre.trim().length === 0 || !cambiado}
      />
      {!hayFirebase && (
        <Sutil>Firebase no está configurado: de momento esto sólo se guarda en el móvil.</Sutil>
      )}

      <Texto style={estilos.seccion}>Cómo se ve</Texto>
      <Tarjeta>
        <View style={estilos.ajuste}>
          <View style={{ flex: 1 }}>
            <Texto style={estilos.tituloAjuste}>Letra grande</Texto>
            <Texto style={estilos.descripcionAjuste}>
              Agranda el texto de toda la app y da algo más de alto a las teclas. Se
              guarda con tu cuenta, así que te acompaña a cualquier aparato.
            </Texto>
          </View>
          <Switch
            value={letraGrande}
            onValueChange={cambiarLetraGrande}
            trackColor={{ true: colores.correcta, false: colores.borde }}
            thumbColor={colores.texto}
          />
        </View>
      </Tarjeta>

      <Texto style={estilos.seccion}>Tus estadísticas</Texto>
      <Sutil>
        Suman todas tus partidas, de todos los torneos. Las de torneo se recuperan de tu
        cuenta, así que te acompañan aunque cambies de móvil.
      </Sutil>
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
                <Texto style={estilos.numeroIntento}>{i + 1}</Texto>
                <View
                  style={[
                    estilos.barra,
                    {
                      width: `${Math.max(6, (cuenta / maximo) * 100)}%`,
                      backgroundColor: cuenta > 0 ? colores.correcta : colores.borde,
                    },
                  ]}
                >
                  <Texto style={estilos.cuentaBarra}>{cuenta}</Texto>
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

      <Texto style={estilos.seccion}>Cómo se juega</Texto>
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

      <Texto style={estilos.seccion}>Puntuación del torneo</Texto>
      <Tarjeta>
        {PUNTOS_POR_INTENTO.map((puntos, i) => (
          <View key={i} style={estilos.filaPuntos}>
            <Texto style={estilos.textoPuntos}>
              Acertar al {i + 1}
              {i === 0 ? 'er' : 'º'} intento
            </Texto>
            <Texto style={estilos.valorPuntos}>{puntos}</Texto>
          </View>
        ))}
        <View style={estilos.filaPuntos}>
          <Texto style={estilos.textoPuntos}>No acertar</Texto>
          <Texto style={[estilos.valorPuntos, { color: colores.textoSuave }]}>0</Texto>
        </View>
      </Tarjeta>

      <Texto style={estilos.seccion}>Las normas de la casa</Texto>
      <Sutil>
        Cada torneo enciende las que quiera desde su clasificación. Toca una para leerla.
      </Sutil>
      <View style={{ height: espaciado.sm }} />

      <Desplegable titulo="La regla del líder" resumen="Ir primero cuesta abrir con una de cinco palabras malas.">
        <Sutil>
          Quien termine una jornada primero en solitario — sin empatar a puntos con el
          segundo — arranca la jornada siguiente obligado a usar una de estas cinco
          palabras como primer intento:
        </Sutil>
        <Texto style={estilos.palabras}>
          {PALABRAS_PENALIZACION.map((p) => p.toUpperCase()).join('\n')}
        </Texto>
        <Sutil>
          Las cinco repiten letras, así que gastan un intento dando muy poca información.
          Es el lastre por ir ganando. Si hay empate en lo alto de la tabla, nadie lleva
          penalización. Se cuenta por separado en cada torneo.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="La temporada" resumen="Cada mes empieza de cero y reparte un trofeo.">
        <Sutil>
          Cada mes es una temporada. El día 1 la clasificación vuelve a cero para todos, y
          quien va primero al cerrarse el mes se lleva un trofeo.
        </Sutil>
        <Sutil>
          A final de año gana el torneo quien más trofeos haya juntado. No hace falta que
          nadie cierre nada: se calcula del historial, así que las partidas viejas siguen
          ahí y el palmarés se pone al día solo.
        </Sutil>
        <Sutil>
          Las balas y los escudos también se recargan el día 1, con la temporada nueva.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Faltar tiene precio" resumen="Saltarse una jornada cerrada resta un punto.">
        <Sutil>
          Saltarse una jornada resta un punto. Sólo cuentan las ya cerradas: la de hoy no
          penaliza a nadie hasta que pasa la medianoche.
        </Sutil>
        <Sutil>
          Se empieza a contar desde tu primera partida del mes, así que entrar tarde no te
          cuesta las jornadas de antes, y las faltas no cruzan de una temporada a otra.
          Cada torneo decide si juega con esta norma.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Abrir la jornada" resumen="La primera palabra no puede llevar más de tres vocales.">
        <Sutil>
          La primera palabra del día no puede llevar más de {MAX_VOCALES_AL_ABRIR} vocales.
          Con cuatro vocales y una consonante se barre medio abecedario de un tirón y la
          apertura deja de ser una apuesta.
        </Sutil>
        <Sutil>
          Sólo afecta al primer intento: del segundo en adelante valen todas, entre otras
          cosas porque alguna de esas palabras puede ser la solución del día.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Una mano al último" resumen="Al que va último se le chiva una letra.">
        <Sutil>
          A quien va último en solitario, el juego le chiva una letra de la palabra del
          día. Sale la misma letra toda la jornada, así que recargar no da letras nuevas.
        </Sutil>
        <Sutil>
          Se acaba en cuanto deja de ir último solo: si empata con el penúltimo, ya no hay
          ayuda. Es para no descolgarse, no un premio por ir mal.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="La blueshell" resumen="Dos balas y dos escudos al mes para picar al líder.">
        <Sutil>
          Cada mes tienes {BLUESHELLS_POR_MES} balas y {BLUESHELLS_POR_MES} escudos, y
          se recargan el día 1 junto con la clasificación. La bala se le tira a quien va
          primero: al día siguiente estará obligado a usar de segundo intento la palabra
          que hayas elegido tú.
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
      </Desplegable>

      <View style={{ height: espaciado.lg }} />
      <Boton
        titulo={`Notas del parche ${VERSION_PARCHE}`}
        variante="secundario"
        onPress={() => Linking.openURL(NOTAS_DEL_PARCHE).catch(() => {})}
      />

      <View style={{ height: espaciado.lg }} />
      <Boton titulo="Cerrar sesión" variante="peligro" onPress={() => sesion.salir()} />
    </ScrollView>
  );
}

function Dato({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <View style={estilos.dato}>
      <Texto style={estilos.valorDato}>{valor}</Texto>
      <Texto style={estilos.etiquetaDato}>{etiqueta}</Texto>
    </View>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={estilos.filaLeyenda}>
      <View style={[estilos.muestra, { backgroundColor: color }]} />
      <Texto style={estilos.textoLeyenda}>{texto}</Texto>
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
  ajuste: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  tituloAjuste: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
  },
  descripcionAjuste: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 19,
    marginTop: 2,
  },
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
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  correo: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
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
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    marginVertical: espaciado.sm,
  },
  seccion: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
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
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  etiquetaDato: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
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
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
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
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.micro,
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
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
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
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  valorPuntos: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
  },
  palabras: {
    color: colores.presente,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    letterSpacing: 3,
    lineHeight: 26,
    marginVertical: espaciado.md,
  },
});
