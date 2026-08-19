import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { PUNTOS_POR_INTENTO } from '../game/constantes';
import { fechaJuego, fechaLarga } from '../game/fecha';
import { numeroJornada, solucionDe } from '../game/palabras';
import { normalizarAvatar } from '../game/avatares';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  torneoId: string;
  volver: () => void;
};

/**
 * Las jornadas ya cerradas de un torneo.
 *
 * Se enseña la palabra de cada día, que a esas alturas ya no destripa nada, y
 * cómo quedó cada uno. Es la parte de picarse: ver que alguien la sacó a la
 * primera el martes.
 */
export function PantallaHistorial({ torneoId, volver }: Props) {
  const { torneos, jornadas, uid } = useApp();

  const torneo = torneos.find((t) => t.id === torneoId);
  const hoy = fechaJuego();

  const dias = useMemo(() => {
    const todas = jornadas[torneoId] ?? [];
    // La de hoy no, que aún se está jugando y enseñaría la palabra.
    return todas
      .filter((d) => d.fecha < hoy && d.fecha >= (torneo?.fechaInicio ?? ''))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [jornadas, torneoId, hoy, torneo]);

  if (!torneo) {
    return (
      <View style={estilos.vacio}>
        <Sutil>Este torneo ya no está disponible.</Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  if (dias.length === 0) {
    return (
      <View style={estilos.vacio}>
        <Texto style={estilos.tituloVacio}>Todavía no hay jornadas cerradas</Texto>
        <Sutil>
          Mañana, cuando entre la palabra nueva, aparecerá aquí la de hoy con los
          resultados de todos.
        </Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      {dias.map((dia) => {
        const palabra = solucionDe(dia.fecha, torneo.semilla);
        const resultados = torneo.miembros
          .map((miembro) => ({
            uid: miembro,
            nombre: torneo.perfiles?.[miembro]?.nombre ?? 'Jugador',
            avatar: normalizarAvatar(torneo.perfiles?.[miembro]?.avatar),
            resultado: dia.resultados?.[miembro],
          }))
          .sort((a, b) => (b.resultado?.puntos ?? -1) - (a.resultado?.puntos ?? -1));

        return (
          <Tarjeta key={dia.fecha} estilo={estilos.tarjeta}>
            <View style={estilos.cabecera}>
              <View style={{ flex: 1 }}>
                <Texto style={estilos.palabra}>{palabra.toUpperCase()}</Texto>
                <Texto style={estilos.fecha}>
                  Jornada {numeroJornada(dia.fecha, torneo.fechaInicio)} ·{' '}
                  {fechaLarga(dia.fecha)}
                </Texto>
              </View>
            </View>

            <View style={estilos.lista}>
              {resultados.map((fila) => (
                <View key={fila.uid} style={estilos.fila}>
                  <Avatar avatar={fila.avatar} lado={28} />
                  <Texto
                    style={[estilos.nombre, fila.uid === uid && estilos.nombrePropio]}
                    numberOfLines={1}
                  >
                    {fila.nombre}
                    {fila.uid === uid ? ' (tú)' : ''}
                  </Texto>
                  {fila.resultado ? (
                    <>
                      <Texto style={estilos.intentos}>
                        {fila.resultado.acertada ? `${fila.resultado.intentos}/6` : 'X/6'}
                      </Texto>
                      <Texto
                        style={[
                          estilos.puntos,
                          fila.resultado.puntos === PUNTOS_POR_INTENTO[0] && estilos.pleno,
                        ]}
                      >
                        {fila.resultado.puntos}
                      </Texto>
                    </>
                  ) : (
                    <Texto style={estilos.sinJugar}>no jugó</Texto>
                  )}
                </View>
              ))}
            </View>
          </Tarjeta>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.md,
    paddingBottom: espaciado.xl * 2,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.xl,
  },
  tituloVacio: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tarjeta: {
    gap: espaciado.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  palabra: {
    color: colores.correcta,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 4,
  },
  fecha: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: 3,
  },
  lista: {
    gap: espaciado.sm,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingTop: espaciado.md,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  nombre: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
  },
  nombrePropio: {
    fontFamily: fuentes.titularNegro,
  },
  intentos: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    minWidth: 34,
    textAlign: 'right',
  },
  puntos: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.medio,
    minWidth: 26,
    textAlign: 'right',
  },
  pleno: {
    color: colores.oro,
  },
  sinJugar: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    fontStyle: 'italic',
  },
});
