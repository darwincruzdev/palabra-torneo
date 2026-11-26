import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { Texto } from '../components/Texto';
import { useIsFocused } from '@react-navigation/native';
import { Aviso } from '../components/Aviso';
import { Chip } from '../components/Chip';
import { Ficha } from '../components/Ficha';
import { Tablero } from '../components/Tablero';
import { TECLA_BORRAR, TECLA_ENTER, Teclado } from '../components/Teclado';
import { BotonCabecera, CabeceraTorneo } from '../components/CabeceraTorneo';
import { Emblema } from '../components/Emblema';
import { IconoTrofeo } from '../components/Iconos';
import { Boton } from '../components/ui';
import { PALABRAS_PENALIZACION, PUNTOS_POR_INTENTO } from '../game/constantes';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaCorta, fechaJuego } from '../game/fecha';
import { numeroJornada } from '../game/palabras';
import { patronCompartible } from '../game/evaluar';
import { colorDeTorneo } from '../game/emblema';
import { faltaPorJugar } from '../game/pendientes';
import { TORNEO_LIBRE, useApp } from '../estado/AppContext';
import { useJuego } from '../estado/useJuego';
import { useTecladoFisico } from '../estado/useTecladoFisico';
import { useCuentaAtras } from '../estado/useCuentaAtras';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  irATorneos: () => void;
  irATabla: () => void;
};

/**
 * El tablero, con la misma cabecera y la barra de pestañas debajo.
 *
 * Los avisos son chips de una línea. Si toca abrir con penalización, las cinco
 * palabras son botones: tocar una la escribe, no la envía.
 */
export function PantallaJuego({ irATorneos, irATabla }: Props) {
  const juego = useJuego();
  const { activo, torneos, jornadas, uid, elegirTorneo } = useApp();
  const [detalle, setDetalle] = useState<{ id: string; texto: string } | null>(null);
  const [hueco, setHueco] = useState({ ancho: 300, alto: 380 });
  const cuentaAtras = useCuentaAtras();
  const enfocada = useIsFocused();

  const terminada = juego.estado !== 'jugando';
  const yaHecha = juego.publicada && !terminada ? juego.publicada : null;
  const esLibre = activo.id === TORNEO_LIBRE.id;
  const mostrarFinal = terminada || yaHecha !== null;

  const jornada =
    activo.tipo === 'torneo'
      ? numeroJornada(juego.fecha, activo.torneo.fechaInicio)
      : numeroJornada(juego.fecha);

  const siguiente = torneos.find(
    (t) => t.id !== activo.id && faltaPorJugar(jornadas[t.id] ?? [], uid, juego.fecha)
  );

  const destello = useTecladoFisico({
    escribir: juego.escribir,
    borrar: juego.borrar,
    enviar: juego.enviar,
    activo: !mostrarFinal && enfocada,
  });

  function pulsar(tecla: string) {
    if (tecla === TECLA_ENTER) juego.enviar();
    else if (tecla === TECLA_BORRAR) juego.borrar();
    else juego.escribir(tecla);
  }

  function alternar(id: string, texto: string) {
    setDetalle((actual) => (actual?.id === id ? null : { id, texto }));
  }

  const vale =
    juego.intentos.length < PUNTOS_POR_INTENTO.length
      ? PUNTOS_POR_INTENTO[juego.intentos.length]
      : 0;
  const abriendo =
    !mostrarFinal && juego.obligacion?.motivo === 'lider' && juego.intentos.length === 0;
  const borrador = juego.borrador.join('');

  async function compartir(resultado: { intentos: number; acertada: boolean; puntos: number; patron: string }) {
    const cabecera =
      `${activo.nombre} · jornada ${jornada} — ` +
      `${resultado.acertada ? `${resultado.intentos}/6` : 'X/6'} · ${resultado.puntos} pts`;
    try {
      await Share.share({ message: `${cabecera}\n\n${resultado.patron}` });
    } catch {
      // El usuario canceló el diálogo.
    }
  }

  const resultadoLocal = terminada
    ? {
        intentos: juego.intentos.length,
        acertada: juego.estado === 'ganada',
        puntos: juego.puntos,
        patron: patronCompartible(juego.intentos, juego.solucion),
        palabra: juego.solucion,
      }
    : yaHecha
      ? {
          intentos: yaHecha.intentos,
          acertada: yaHecha.acertada,
          puntos: yaHecha.puntos,
          patron: yaHecha.patron,
          palabra: juego.solucion,
        }
      : null;

  return (
    <View style={estilos.pantalla}>
      <CabeceraTorneo
        nombre={activo.nombre}
        torneoId={activo.tipo === 'torneo' ? activo.id : null}
        detalle={
          esLibre
            ? 'La diaria · esta partida no puntúa'
            : `Jornada ${jornada} · ${fechaCorta(juego.fecha)}`
        }
        volver={irATorneos}
        etiquetaVolver="Volver a mis torneos"
        color={activo.tipo === 'torneo' ? colorDeTorneo(activo.id) : undefined}
        derecha={
          !esLibre ? (
            <BotonCabecera etiqueta="Ver la tabla" onPress={irATabla}>
              <IconoTrofeo color={colores.oro} tamano={16} />
            </BotonCabecera>
          ) : undefined
        }
      />

      {!mostrarFinal && (
        <View style={estilos.avisos}>
          {abriendo && (
            <View style={estilos.penalizacion}>
              <Texto style={estilos.textoPenalizacion}>
                👑 Lideras en solitario · toca una para abrir
              </Texto>
              <View style={estilos.botonesPalabra}>
                {juego.obligacion!.palabras.map((palabra) => {
                  const marcada = borrador === palabra;
                  return (
                    <Pressable
                      key={palabra}
                      onPress={() => juego.rellenar(palabra)}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir con ${palabra}`}
                      style={[estilos.botonPalabra, marcada && estilos.botonPalabraMarcado]}
                    >
                      <Texto style={estilos.letraPalabra}>{palabra.toUpperCase()}</Texto>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={estilos.chips}>
            {!abriendo && juego.penalizado && (
              <Chip
                etiqueta="Penalización"
                color={colores.penalizacion}
                activo={detalle?.id === 'penalizacion'}
                onPress={() =>
                  alternar(
                    'penalizacion',
                    `Penalización: hoy abres con ${PALABRAS_PENALIZACION.map((p) => p.toUpperCase()).join(', ')}.`
                  )
                }
              />
            )}
            {juego.obligacion?.motivo === 'blueshell' && (
              <Chip
                etiqueta={`Blueshell · ${juego.obligacion.palabras[0].toUpperCase()}`}
                color={colores.acento}
                onPress={() =>
                  alternar(
                    'bala',
                    `Blueshell de ${juego.autorObligacion}: la palabra ${
                      juego.obligacion!.indice + 1
                    }.ª tiene que ser ${juego.obligacion!.palabras[0].toUpperCase()}.`
                  )
                }
              />
            )}
            {juego.balasPendientes > 0 && juego.obligacion?.motivo !== 'blueshell' && (
              <Chip
                etiqueta={
                  juego.balasPendientes === 1 ? '1 blueshell' : `${juego.balasPendientes} blueshells`
                }
                color={colores.acento}
                onPress={() =>
                  alternar(
                    'pendientes',
                    'Te han lanzado blueshells. Te impondrán las palabras siguientes, salvo que gastes el escudo.'
                  )
                }
              />
            )}
            {juego.ulti && (
              <Chip
                etiqueta={juego.ulti.autor === uid ? 'Tu ulti' : 'Ulti'}
                color={colores.peligro}
                onPress={() =>
                  alternar(
                    'ulti',
                    juego.ulti!.autor === uid
                      ? `Hoy el torneo juega tu ${juego.ulti!.palabra.toUpperCase()}. A ti te toca la normal.`
                      : 'Alguien ha gastado su ulti: hoy no juegas la palabra del día, sino la que ha elegido.'
                  )
                }
              />
            )}
            {juego.pista && (
              <Chip
                etiqueta={`Pista ${juego.pista.toUpperCase()}`}
                color={colores.correcta}
                onPress={() =>
                  alternar(
                    'pista',
                    `Vas último, así que va una ayuda: la palabra lleva una ${juego.pista!.toUpperCase()}.`
                  )
                }
              />
            )}
            <Chip
              etiqueta={`Vale ${vale} pts`}
              color={colores.oro}
              onPress={() =>
                alternar(
                  'puntos',
                  `Si la aciertas en este intento sumas ${vale}. ${PUNTOS_POR_INTENTO.map(
                    (p, i) => `${i + 1}.º ${p}`
                  ).join(' · ')} · fallo 0.`
                )
              }
            />
          </View>

          {detalle && <Texto style={estilos.detalle}>{detalle.texto}</Texto>}

          {juego.puedeProtegerse && (
            <Pressable
              onPress={juego.protegerse}
              accessibilityRole="button"
              style={({ pressed }) => [estilos.escudo, pressed && { opacity: 0.7 }]}
            >
              <Texto style={estilos.textoEscudo}>
                Gastar escudo y anular {juego.balasPendientes === 1 ? 'la blueshell' : 'las blueshells'}
              </Texto>
            </Pressable>
          )}
        </View>
      )}

      <View style={estilos.franjaAviso}>
        <Aviso mensaje={juego.aviso} />
      </View>

      <View
        style={estilos.zonaTablero}
        onLayout={({ nativeEvent }) =>
          setHueco({
            ancho: Math.min(nativeEvent.layout.width, 360),
            alto: nativeEvent.layout.height,
          })
        }
      >
        {yaHecha && !terminada ? (
          <Texto style={estilos.patronHecha}>{yaHecha.patron || 'Ya jugaste esta jornada.'}</Texto>
        ) : (
          <Tablero
            intentos={juego.intentos}
            borrador={juego.borrador}
            cursor={juego.cursor}
            solucion={juego.solucion}
            filaAnimada={juego.filaAnimada}
            temblor={juego.temblor}
            onCasilla={juego.irACasilla}
            ancho={hueco.ancho}
            alto={hueco.alto}
            corona={juego.penalizado}
          />
        )}
      </View>

      {mostrarFinal && resultadoLocal ? (
        <Resultado
          nombreTorneo={activo.nombre}
          esLibre={esLibre}
          resultado={resultadoLocal}
          ultiPropia={juego.ulti?.autor === uid}
          filas={
            activo.tipo === 'torneo' ? clasificacion(activo.torneo, jornadas[activo.id] ?? []) : []
          }
          liderAntes={
            activo.tipo === 'torneo'
              ? liderDestacado(
                  clasificacion(activo.torneo, jornadas[activo.id] ?? [], { hasta: fechaJuego() })
                )
              : null
          }
          uid={uid}
          cuentaAtras={cuentaAtras}
          siguiente={siguiente}
          onCompartir={() => compartir(resultadoLocal)}
          onTabla={irATabla}
          onSiguiente={
            siguiente
              ? () => {
                  elegirTorneo(siguiente.id);
                }
              : undefined
          }
          yaPublicada={Boolean(yaHecha)}
        />
      ) : (
        <Teclado estado={juego.teclado} onTecla={pulsar} destello={destello} />
      )}
    </View>
  );
}

function Resultado({
  nombreTorneo,
  esLibre,
  resultado,
  ultiPropia,
  filas,
  liderAntes,
  uid,
  cuentaAtras,
  siguiente,
  onCompartir,
  onTabla,
  onSiguiente,
  yaPublicada,
}: {
  nombreTorneo: string;
  esLibre: boolean;
  resultado: { intentos: number; acertada: boolean; puntos: number; patron: string; palabra: string };
  ultiPropia: boolean;
  filas: { uid: string; nombre: string; puntos: number }[];
  liderAntes: string | null;
  uid: string | null;
  cuentaAtras: string;
  siguiente?: { id: string; nombre: string };
  onCompartir: () => void;
  onTabla: () => void;
  onSiguiente?: () => void;
  yaPublicada: boolean;
}) {
  const top = filas.slice(0, 3);
  const liderAhora = filas[0]?.uid ?? null;
  return (
    <View style={estilos.hoja}>
      <View style={estilos.asa} />
      <Texto style={estilos.rotuloFinal}>
        {yaPublicada ? 'Jornada hecha' : resultado.acertada ? 'Acertada' : 'Sin acertar'}
      </Texto>
      <View style={estilos.filaFinal}>
        <View style={{ flex: 1 }}>
          <Texto style={estilos.grito}>
            {resultado.acertada ? `¡En ${resultado.intentos} intentos!` : 'Hoy no ha podido ser'}
          </Texto>
          <View style={estilos.letras}>
            {resultado.palabra.toUpperCase().split('').map((letra, i) => (
              <Ficha key={i} letra={letra} lado={36} color={resultado.acertada ? colores.correcta : colores.ausente} />
            ))}
          </View>
        </View>
        {!esLibre && (
          <View style={estilos.puntosCaja}>
            <Texto style={estilos.puntosMas}>+{resultado.puntos}</Texto>
            <Texto style={estilos.puntosEtiqueta}>puntos</Texto>
          </View>
        )}
      </View>

      {ultiPropia && (
        <Texto style={estilos.nota}>Tu ulti: el resto del torneo ha jugado otra.</Texto>
      )}

      {top.length > 0 && (
        <View style={estilos.top}>
          {top.map((fila, i) => {
            const nota =
              fila.uid === uid
                ? liderAhora === uid
                  ? liderAntes === uid
                    ? 'sigues líder'
                    : 'nuevo líder'
                  : ''
                : '';
            return (
              <View key={fila.uid} style={estilos.filaTop}>
                <Texto style={estilos.puesto}>{i + 1}</Texto>
                <Texto style={estilos.nombreTop} numberOfLines={1}>
                  {fila.nombre}
                  {nota ? ` · ${nota}` : ''}
                </Texto>
                <Texto style={estilos.puntosTop}>{fila.puntos}</Texto>
              </View>
            );
          })}
        </View>
      )}

      <View style={estilos.botones}>
        <Boton titulo="Compartir" onPress={onCompartir} estilo={{ flex: 1 }} />
        {!esLibre && (
          <Boton titulo="Ver tabla" variante="secundario" onPress={onTabla} estilo={{ flex: 1 }} />
        )}
      </View>

      {siguiente && onSiguiente && (
        <Pressable onPress={onSiguiente} accessibilityRole="button" style={estilos.siguiente}>
          <Emblema nombre={siguiente.nombre} id={siguiente.id} lado={28} />
          <Texto style={estilos.siguienteTexto} numberOfLines={1}>
            {siguiente.nombre} te espera
          </Texto>
          <Texto style={estilos.siguienteIr}>Jugar ahora ›</Texto>
        </Pressable>
      )}

      <Texto style={estilos.cuenta}>
        {esLibre ? `En ${nombreTorneo} no hay puntos. ` : ''}Palabra nueva {cuentaAtras}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  avisos: { paddingTop: espaciado.sm, gap: espaciado.xs },
  penalizacion: { paddingHorizontal: espaciado.md, gap: 6 },
  textoPenalizacion: {
    color: colores.penalizacion,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  botonesPalabra: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  botonPalabra: {
    backgroundColor: colores.elevado,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colores.borde,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  botonPalabraMarcado: {
    backgroundColor: colores.penalizacion,
    borderColor: colores.penalizacion,
  },
  letraPalabra: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.pequeno,
    letterSpacing: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: espaciado.md,
  },
  detalle: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    lineHeight: 18,
    paddingHorizontal: espaciado.md,
  },
  escudo: {
    marginHorizontal: espaciado.md,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colores.escudo,
    alignItems: 'center',
  },
  textoEscudo: {
    color: colores.escudo,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  franjaAviso: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
  },
  zonaTablero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    overflow: 'hidden',
  },
  patronHecha: {
    fontSize: escala.medio,
    lineHeight: 22,
    textAlign: 'center',
  },
  hoja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
    gap: espaciado.sm,
    maxHeight: '52%',
  },
  asa: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colores.borde,
  },
  rotuloFinal: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  filaFinal: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md },
  grito: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textTransform: 'uppercase',
  },
  letras: { flexDirection: 'row', gap: 4, marginTop: 6 },
  puntosCaja: {
    backgroundColor: colores.oro,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  puntosMas: {
    color: colores.fondo,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  puntosEtiqueta: {
    color: colores.fondo,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    textTransform: 'uppercase',
  },
  nota: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  top: { gap: 4 },
  filaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  puesto: {
    color: colores.textoTenue,
    fontFamily: fuentes.titularNegro,
    width: 16,
  },
  nombreTop: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  puntosTop: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
  },
  botones: { flexDirection: 'row', gap: espaciado.sm },
  siguiente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 12,
    padding: espaciado.sm,
  },
  siguienteTexto: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
  siguienteIr: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
  },
  cuenta: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
});
