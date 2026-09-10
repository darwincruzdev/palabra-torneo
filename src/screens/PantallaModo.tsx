import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { AvisoInstalar } from '../components/AvisoInstalar';
import { AvisoParche } from '../components/AvisoParche';
import { SelectorTorneo } from '../components/SelectorTorneo';
import { Cifra, Rotulo } from '../components/ui';
import { clasificacion } from '../game/clasificacion';
import { PALABRAS_POR_DUELO } from '../game/duelo';
import { fechaJuego } from '../game/fecha';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, radio, texto } from '../tema';

type Props = {
  irAJugar: () => void;
  irATorneos: () => void;
  irADuelos: () => void;
  irAPerfil: () => void;
};

/**
 * La primera pantalla después de entrar.
 *
 * El torneo ocupa una pieza grande con la puntuación en cifras de marcador, y
 * duelo y libre van debajo en dos columnas estrechas. La asimetría es
 * deliberada: tres tarjetas idénticas no dicen cuál es la que importa.
 */
export function PantallaModo({ irAJugar, irATorneos, irADuelos, irAPerfil }: Props) {
  const { nombre, avatar, torneos, jornadas, uid, elegirTorneo } = useApp();
  const [eligiendoTorneo, setEligiendoTorneo] = useState(false);
  const insets = useSafeAreaInsets();

  const hoy = fechaJuego();

  const pendientes = torneos.filter(
    (t) => !(jornadas[t.id] ?? []).find((d) => d.fecha === hoy)?.resultados?.[uid ?? '']
  ).length;

  /** Puntos y puesto en el torneo donde voy mejor clasificado. */
  const mejor = useMemo(() => {
    let resultado: { puntos: number; puesto: number } | null = null;
    for (const torneo of torneos) {
      const filas = clasificacion(torneo, jornadas[torneo.id] ?? []);
      const puesto = filas.findIndex((f) => f.uid === uid);
      if (puesto < 0) continue;
      if (!resultado || puesto + 1 < resultado.puesto) {
        resultado = { puntos: filas[puesto].puntos, puesto: puesto + 1 };
      }
    }
    return resultado;
  }, [torneos, jornadas, uid]);

  function jugarLibre() {
    elegirTorneo(TORNEO_LIBRE.id);
    irAJugar();
  }

  function jugarTorneo() {
    if (torneos.length === 0) return irATorneos();
    if (torneos.length === 1) {
      elegirTorneo(torneos[0].id);
      return irAJugar();
    }
    setEligiendoTorneo(true);
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: insets.top + espaciado.lg, paddingBottom: insets.bottom + espaciado.xl },
      ]}
    >
      <Pressable onPress={irAPerfil} style={estilos.saludo} accessibilityRole="button">
        <Avatar avatar={avatar} lado={48} />
        <View style={{ flex: 1 }}>
          <Rotulo>Jugador</Rotulo>
          <Texto style={estilos.hola} numberOfLines={1}>
            {nombre || 'Sin nombre'}
          </Texto>
        </View>
        <Texto style={estilos.editar}>Editar</Texto>
      </Pressable>

      <AvisoParche />

      <AvisoInstalar />

      {/* La pieza grande: el torneo, con la puntuación como en un marcador. */}
      <Pressable
        onPress={jugarTorneo}
        accessibilityRole="button"
        accessibilityLabel="Modo torneo"
        style={({ pressed }) => [estilos.principal, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={estilos.reglaSuperior} />

        <View style={estilos.filaPrincipal}>
          <View style={estilos.textoPrincipal}>
            <Rotulo>Modo torneo</Rotulo>
            <Texto style={estilos.tituloPrincipal}>
              {torneos.length === 0 ? 'Monta el tuyo' : 'A por la jornada'}
            </Texto>
            <Texto style={estilos.descripcionPrincipal}>
              {torneos.length === 0
                ? 'Compite con los tuyos. Crea un torneo y reparte la invitación.'
                : pendientes > 0
                  ? `Te queda por jugar en ${pendientes} ${pendientes === 1 ? 'torneo' : 'torneos'}.`
                  : 'Hoy ya has jugado en todos. Mira cómo va la tabla.'}
            </Texto>
          </View>

          <View style={estilos.marcador}>
            {mejor ? (
              <>
                <Cifra valor={mejor.puntos} etiqueta="puntos" />
                <View style={estilos.puestoCaja}>
                  <Texto style={estilos.puesto}>{mejor.puesto}.º</Texto>
                </View>
              </>
            ) : (
              <Cifra valor="—" etiqueta="sin torneo" color={colores.textoTenue} />
            )}
          </View>
        </View>
      </Pressable>

      {/* Y debajo, las dos secundarias en columnas estrechas. */}
      <View style={estilos.fila}>
        <Secundaria
          rotulo="Duelo"
          titulo="1 vs 1"
          descripcion={`Al mejor de ${PALABRAS_POR_DUELO}, en directo.`}
          color={colores.peligro}
          onPress={irADuelos}
        />
        <Secundaria
          rotulo="Libre"
          titulo="Practicar"
          descripcion="Una palabra al día. No puntúa."
          color={colores.acento}
          onPress={jugarLibre}
        />
      </View>

      {torneos.length > 0 && (
        <Pressable onPress={irATorneos} style={estilos.enlace} accessibilityRole="button">
          <Texto style={estilos.textoEnlace}>Mis torneos y clasificaciones</Texto>
        </Pressable>
      )}

      <SelectorTorneo
        visible={eligiendoTorneo}
        cerrar={() => setEligiendoTorneo(false)}
        irATorneos={irATorneos}
        ocultarLibre
        alElegir={irAJugar}
      />
    </ScrollView>
  );
}

function Secundaria({
  rotulo,
  titulo,
  descripcion,
  color,
  onPress,
}: {
  rotulo: string;
  titulo: string;
  descripcion: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}. ${descripcion}`}
      style={({ pressed }) => [estilos.secundaria, { opacity: pressed ? 0.8 : 1 }]}
    >
      <View style={[estilos.reglaSuperior, { backgroundColor: color }]} />
      <Texto style={[estilos.rotuloSecundaria, { color }]}>{rotulo.toUpperCase()}</Texto>
      <Texto style={estilos.tituloSecundaria}>{titulo}</Texto>
      <Texto style={estilos.descripcionSecundaria}>{descripcion}</Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    paddingHorizontal: espaciado.lg,
    gap: espaciado.md,
  },
  saludo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingBottom: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  hola: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.grande,
    letterSpacing: 0.5,
  },
  editar: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: texto.pequeno,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  principal: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espaciado.lg,
    paddingTop: espaciado.lg + 3,
    overflow: 'hidden',
    marginTop: espaciado.sm,
  },
  reglaSuperior: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colores.correcta,
  },
  filaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  textoPrincipal: {
    flex: 1,
    gap: 2,
  },
  tituloPrincipal: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.titulo,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  descripcionPrincipal: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: texto.pequeno,
    lineHeight: 19,
    marginTop: 4,
  },
  marcador: {
    alignItems: 'center',
    gap: espaciado.sm,
    borderLeftWidth: 1,
    borderLeftColor: colores.borde,
    paddingLeft: espaciado.md,
    minWidth: 92,
  },
  puestoCaja: {
    backgroundColor: colores.elevado,
    borderRadius: radio.pastilla,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  puesto: {
    color: colores.acento,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.normal,
  },
  fila: {
    flexDirection: 'row',
    gap: espaciado.md,
  },
  secundaria: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espaciado.md,
    paddingTop: espaciado.md + 3,
    overflow: 'hidden',
    gap: 2,
  },
  rotuloSecundaria: {
    fontFamily: fuentes.titular,
    fontSize: texto.micro,
    letterSpacing: 1.6,
  },
  tituloSecundaria: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: texto.grande,
    textTransform: 'uppercase',
  },
  descripcionSecundaria: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: texto.micro,
    lineHeight: 16,
  },
  enlace: {
    paddingVertical: espaciado.sm,
    alignItems: 'center',
  },
  textoEnlace: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: texto.normal,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
