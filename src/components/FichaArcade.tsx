import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { Avatar } from './Avatar';
import { Boton } from './ui';
import { PALABRAS_POR_RONDA, TOTAL_MAXIMO, reloj, totalDe } from '../game/arcade';
import { fechaLarga } from '../game/fecha';
import { useApp } from '../estado/AppContext';
import type { Avatar as DatosAvatar, RecordArcade } from '../tipos';
import { ANCHO_COLUMNA, colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  /** A quién se mira. Null cierra la ficha. */
  uid: string | null;
  nombre: string;
  avatar: DatosAvatar;
  cerrar: () => void;
};

/**
 * La marca de arcade de alguien del torneo.
 *
 * Se abre tocando su nombre en la clasificación. Es la única cosa del juego que
 * se mira de otra persona sin que ella haga nada, y por eso enseña sólo lo que
 * ya es público de todas formas: el nombre, el avatar y una puntuación.
 */
export function FichaArcade({ uid, nombre, avatar, cerrar }: Props) {
  const { recordArcadeDe, uid: yo, recordArcade } = useApp();
  const [marca, setMarca] = useState<RecordArcade | null>(null);
  const [cargando, setCargando] = useState(false);

  const soyYo = uid !== null && uid === yo;

  useEffect(() => {
    if (!uid) return;
    // La mía ya la tengo en memoria, y además recién puesta al día: pedirla al
    // servidor sólo serviría para enseñarla un parpadeo más tarde.
    if (soyYo) {
      setMarca(recordArcade);
      return;
    }
    let vigente = true;
    setCargando(true);
    setMarca(null);
    recordArcadeDe(uid)
      .then((encontrada) => {
        if (vigente) setMarca(encontrada);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [uid, soyYo, recordArcade, recordArcadeDe]);

  return (
    <Modal visible={uid !== null} transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable style={estilos.fondo} onPress={cerrar}>
        <Pressable style={estilos.panel} onPress={() => {}}>
          <View style={estilos.cabecera}>
            <Avatar avatar={avatar} lado={44} />
            <View style={{ flex: 1 }}>
              <Texto style={estilos.rotulo}>Marca de arcade</Texto>
              <Texto style={estilos.nombre} numberOfLines={1}>
                {nombre}
                {soyYo ? ' (tú)' : ''}
              </Texto>
            </View>
          </View>

          {cargando ? (
            <View style={estilos.centro}>
              <ActivityIndicator color={colores.acento} />
            </View>
          ) : marca ? (
            <>
              <View style={estilos.marcador}>
                <Dato valor={`${totalDe(marca)}`} etiqueta={`de ${TOTAL_MAXIMO}`} destacado />
                <Dato valor={reloj(marca.segundos)} etiqueta="tiempo" />
                <Dato
                  valor={`${marca.acertadas}/${PALABRAS_POR_RONDA}`}
                  etiqueta="acertadas"
                />
              </View>
              <Texto style={estilos.pie}>
                {marca.intentos} intentos en total
                {marca.fecha ? ` · ${fechaLarga(marca.fecha)}` : ''}
              </Texto>
            </>
          ) : (
            <Texto style={estilos.vacio}>
              {soyYo
                ? 'Todavía no has hecho ninguna ronda de arcade.'
                : `${nombre} todavía no ha jugado al arcade.`}
            </Texto>
          )}

          <Boton titulo="Cerrar" variante="secundario" onPress={cerrar} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Dato({
  valor,
  etiqueta,
  destacado,
}: {
  valor: string;
  etiqueta: string;
  destacado?: boolean;
}) {
  return (
    <View style={estilos.dato}>
      <Texto style={[estilos.valorDato, destacado && { color: colores.oro }]}>{valor}</Texto>
      <Texto style={estilos.etiquetaDato}>{etiqueta}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: espaciado.lg,
  },
  panel: {
    width: '100%',
    maxWidth: ANCHO_COLUMNA,
    alignSelf: 'center',
    backgroundColor: colores.superficie,
    borderRadius: radio.lg,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  rotulo: {
    color: colores.oro,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  centro: {
    paddingVertical: espaciado.lg,
    alignItems: 'center',
  },
  marcador: {
    flexDirection: 'row',
    backgroundColor: colores.elevado,
    borderRadius: radio.md,
    paddingVertical: espaciado.md,
  },
  dato: {
    flex: 1,
    alignItems: 'center',
  },
  valorDato: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
  },
  etiquetaDato: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  pie: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    textAlign: 'center',
  },
  vacio: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: espaciado.sm,
  },
});
