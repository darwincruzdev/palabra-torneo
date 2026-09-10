import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { RejillaPatron } from '../components/RejillaPatron';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { PUNTOS_POR_INTENTO } from '../game/constantes';
import { fechaJuego, fechaLarga } from '../game/fecha';
import { numeroJornada, solucionDe } from '../game/palabras';
import { normalizarAvatar } from '../game/avatares';
import { useApp } from '../estado/AppContext';
import { mesLargo } from '../game/temporada';
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
  const { torneos, jornadas, uid, resumenes, cargarResumenes } = useApp();
  /**
   * Qué cuadrículas están abiertas, por jornada y jugador.
   *
   * Cerradas de partida porque con siete jugadores y varias jornadas la
   * pantalla se volvería un muro de emojis; así se mira la de quien interesa.
   */
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  function alternar(clave: string) {
    setAbiertas((previas) => ({ ...previas, [clave]: !previas[clave] }));
  }

  const torneo = torneos.find((t) => t.id === torneoId);
  const hoy = fechaJuego();

  useEffect(() => {
    cargarResumenes(torneoId);
  }, [torneoId, cargarResumenes]);

  /** Los meses ya cerrados, en resumen. Sus días no se descargan. */
  const cerrados = resumenes[torneoId] ?? [];

  const dias = useMemo(() => {
    const todas = jornadas[torneoId] ?? [];
    // La de hoy entra también, pero se destapa aparte: enseña la palabra.
    return todas
      .filter((d) => d.fecha <= hoy && d.fecha >= (torneo?.fechaInicio ?? ''))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [jornadas, torneoId, hoy, torneo]);

  /** Si ya jugué lo de hoy. Hasta entonces, la jornada de hoy va tapada. */
  const yaJugueHoy = Boolean(
    uid && (jornadas[torneoId] ?? []).find((d) => d.fecha === hoy)?.resultados?.[uid]
  );

  if (!torneo) {
    return (
      <View style={estilos.vacio}>
        <Sutil>Este torneo ya no está disponible.</Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  if (dias.length === 0 && cerrados.length === 0) {
    return (
      <View style={estilos.vacio}>
        <Texto style={estilos.tituloVacio}>Todavía no hay jornadas</Texto>
        <Sutil>
          En cuanto alguien juegue aparecerá aquí la jornada, con la palabra y la
          partida de cada uno.
        </Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      {dias.map((dia) => {
        const esHoy = dia.fecha === hoy;

        /**
         * De la jornada de hoy se tapa la palabra, y nada más.
         *
         * Las cuadrículas no destripan: dicen la forma de la partida de otro,
         * no qué escribió ni cuál es la solución. Es exactamente lo que se
         * comparte por ahí el mismo día. La palabra sí, así que ésa espera a
         * que juegues.
         */
        const tapada = esHoy && !yaJugueHoy;
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
                <Texto style={[estilos.palabra, tapada && estilos.palabraTapada]}>
                  {tapada ? '?????' : palabra.toUpperCase()}
                </Texto>
                <Texto style={estilos.fecha}>
                  {esHoy ? 'Hoy · ' : ''}Jornada{' '}
                  {numeroJornada(dia.fecha, torneo.fechaInicio)} · {fechaLarga(dia.fecha)}
                </Texto>
              </View>
            </View>

            {tapada && (
              <Texto style={estilos.avisoTapada}>
                La palabra se destapa cuando juegues la tuya.
              </Texto>
            )}

            <View style={estilos.lista}>
              {resultados.map((fila) => {
                const clave = `${dia.fecha}:${fila.uid}`;
                const hayRejilla = Boolean(fila.resultado?.patron);
                const abierta = abiertas[clave] === true;
                return (
                  <View key={fila.uid}>
                    <Pressable
                      onPress={() => hayRejilla && alternar(clave)}
                      disabled={!hayRejilla}
                      accessibilityRole={hayRejilla ? 'button' : undefined}
                      accessibilityLabel={
                        hayRejilla
                          ? `${abierta ? 'Ocultar' : 'Ver'} la partida de ${fila.nombre}`
                          : undefined
                      }
                      style={({ pressed }) => [estilos.fila, pressed && { opacity: 0.6 }]}
                    >
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
                          {hayRejilla && (
                            <Texto style={estilos.lupa}>{abierta ? '▾' : '▸'}</Texto>
                          )}
                          <Texto style={estilos.intentos}>
                            {fila.resultado.acertada
                              ? `${fila.resultado.intentos}/6`
                              : 'X/6'}
                          </Texto>
                          <Texto
                            style={[
                              estilos.puntos,
                              fila.resultado.puntos === PUNTOS_POR_INTENTO[0] &&
                                estilos.pleno,
                            ]}
                          >
                            {fila.resultado.puntos}
                          </Texto>
                        </>
                      ) : (
                        <Texto style={estilos.sinJugar}>
                          {esHoy ? 'aún no' : 'no jugó'}
                        </Texto>
                      )}
                    </Pressable>

                    {abierta && fila.resultado?.patron && (
                      <RejillaPatron patron={fila.resultado.patron} />
                    )}
                  </View>
                );
              })}
            </View>
          </Tarjeta>
        );
      })}

      {/* Los meses cerrados ya no se enseñan día a día: sólo cómo quedaron.
          Un mes terminado no cambia, así que arrastrar sus treinta documentos
          en cada móvil era gastar memoria y batería para volver a sumar lo
          mismo. */}
      {cerrados.map((resumen) => (
        <Tarjeta key={resumen.mes} estilo={estilos.tarjeta} acento={colores.oro}>
          <Texto style={estilos.mesCerrado}>{mesLargo(resumen.mes)}</Texto>
          <Texto style={estilos.detalleMes}>
            {resumen.jornadas} {resumen.jornadas === 1 ? 'jornada' : 'jornadas'}
            {resumen.ganadores.length > 0 &&
              (resumen.pendiente
                ? ' · trofeo pendiente de desempate'
                : ` · 🏆 ${resumen.ganadores
                    .map((g) => torneo.perfiles?.[g]?.nombre ?? 'Jugador')
                    .join(' y ')}`)}
          </Texto>

          <View style={estilos.lista}>
            {resumen.filas.map((fila, i) => (
              <View key={fila.uid} style={estilos.fila}>
                <Texto style={estilos.puesto}>{i + 1}</Texto>
                <Avatar avatar={fila.avatar} lado={28} />
                <Texto
                  style={[estilos.nombre, fila.uid === uid && estilos.nombrePropio]}
                  numberOfLines={1}
                >
                  {fila.nombre}
                  {fila.uid === uid ? ' (tú)' : ''}
                </Texto>
                <Texto style={estilos.intentos}>
                  {fila.aciertos}/{fila.jugadas}
                </Texto>
                <Texto style={estilos.puntos}>{fila.puntos}</Texto>
              </View>
            ))}
          </View>
        </Tarjeta>
      ))}
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
  palabraTapada: {
    color: colores.textoTenue,
  },
  avisoTapada: {
    color: colores.presente,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    marginTop: espaciado.xs,
  },
  mesCerrado: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detalleMes: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginBottom: espaciado.sm,
  },
  puesto: {
    color: colores.textoSuave,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
    width: 16,
    textAlign: 'center',
  },
  lupa: {
    color: colores.textoSuave,
    fontSize: 12,
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
