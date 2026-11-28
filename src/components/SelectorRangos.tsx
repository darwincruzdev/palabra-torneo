import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { Avatar } from './Avatar';
import { Copas } from './Copas';
import { EtiquetaTitulo } from './EtiquetaTitulo';
import {
  AVATARES_ESPECIALES,
  type Avatar as DatosAvatar,
  type AvatarEspecial,
} from '../game/avatares';
import { TITULOS, marcoDe, type Titulo } from '../game/rangos';
import { colores, espaciado, fuentes, radio, texto as escala } from '../tema';

type Props = {
  copas: number;
  /** El avatar puesto ahora mismo, para marcar cuál está elegido. */
  avatar: DatosAvatar;
  titulo: string | null;
  onElegirAvatar: (avatar: DatosAvatar) => void;
  onElegirTitulo: (id: string | null) => void;
};

const NIVELES: { copas: number; rotulo: string; pie: string }[] = [
  { copas: 1, rotulo: 'Exclusivos', pie: 'Cuatro tintas en vez de una.' },
  { copas: 2, rotulo: 'Animados', pie: 'Se mueven, en la tabla y en todas partes.' },
  { copas: 3, rotulo: 'Legendarios', pie: 'Animados y con aura junto a tu nombre.' },
];

/** "Te faltan 2 copas", o lo que toque. */
function loQueFalta(copas: number, hacenFalta: number): string {
  const faltan = hacenFalta - copas;
  return faltan === 1 ? 'Te falta 1 copa' : `Te faltan ${faltan} copas`;
}

/**
 * Lo que se gana con las copas, para elegirlo o para verlo con el candado.
 *
 * Lo bloqueado se enseña, no se esconde: con la vista previa y lo que falta
 * para llegar. Una lista de la que sólo se ven los premios ya ganados no dice
 * que haya nada más, y entonces no empuja a nadie a ganar el siguiente.
 */
export function SelectorRangos({
  copas,
  avatar,
  titulo,
  onElegirAvatar,
  onElegirTitulo,
}: Props) {
  return (
    <View style={estilos.zona}>
      <View style={estilos.cabecera}>
        <Copas copas={copas} tamano={18} />
        <Texto style={estilos.resumen}>
          {copas === 0
            ? 'Todavía no has ganado ninguna copa'
            : copas === 1
              ? '1 copa, de todos tus torneos'
              : `${copas} copas, de todos tus torneos`}
        </Texto>
      </View>

      {NIVELES.map((nivel) => {
        const suyos = AVATARES_ESPECIALES.filter((a) => a.copas === nivel.copas);
        const abierto = copas >= nivel.copas;
        return (
          <View key={nivel.copas} style={estilos.nivel}>
            <View style={estilos.filaRotulo}>
              <Texto style={estilos.rotulo}>{nivel.rotulo}</Texto>
              {abierto ? (
                <Copas copas={nivel.copas} tamano={12} />
              ) : (
                <Texto style={estilos.candado}>
                  🔒 {loQueFalta(copas, nivel.copas)}
                </Texto>
              )}
            </View>
            <Texto style={estilos.pie}>{nivel.pie}</Texto>
            <View style={estilos.rejilla}>
              {suyos.map((especial) => (
                <FichaEspecial
                  key={especial.id}
                  especial={especial}
                  indice={AVATARES_ESPECIALES.indexOf(especial)}
                  abierto={abierto}
                  elegido={avatar.especial === AVATARES_ESPECIALES.indexOf(especial)}
                  onElegir={() =>
                    onElegirAvatar({
                      ...avatar,
                      especial: AVATARES_ESPECIALES.indexOf(especial),
                    })
                  }
                />
              ))}
            </View>
          </View>
        );
      })}

      {avatar.especial !== undefined && (
        <Pressable
          onPress={() => {
            const { especial, ...normal } = avatar;
            onElegirAvatar(normal);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [estilos.quitar, pressed && { opacity: 0.6 }]}
        >
          <Texto style={estilos.textoQuitar}>Volver a mi avatar normal</Texto>
        </Pressable>
      )}

      <View style={estilos.nivel}>
        <Texto style={estilos.rotulo}>Títulos</Texto>
        <Texto style={estilos.pie}>
          Llevas el más alto salvo que elijas otro. Se ve junto a tu nombre en la tabla.
        </Texto>
        {TITULOS.map((suyo) => (
          <FilaTitulo
            key={suyo.id}
            titulo={suyo}
            copas={copas}
            elegido={titulo === suyo.id}
            onElegir={() => onElegirTitulo(suyo.id)}
          />
        ))}
      </View>
    </View>
  );
}

function FichaEspecial({
  especial,
  indice,
  abierto,
  elegido,
  onElegir,
}: {
  especial: AvatarEspecial;
  indice: number;
  abierto: boolean;
  elegido: boolean;
  onElegir: () => void;
}) {
  const vista = (
    <View style={estilos.ficha}>
      <View style={!abierto && estilos.apagado}>
        <Avatar
          avatar={{ color: 0, patron: especial.patron, especial: indice }}
          lado={46}
          seleccionado={elegido}
          marco={especial.aura ? 'aura' : null}
        />
      </View>
      <Texto style={[estilos.nombreFicha, !abierto && estilos.nombreBloqueado]}>
        {abierto ? especial.nombre : '🔒'}
      </Texto>
    </View>
  );

  if (!abierto) {
    return (
      <View
        accessibilityLabel={`${especial.nombre}, bloqueado: ${especial.copas} copas`}
      >
        {vista}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onElegir}
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      accessibilityLabel={`Avatar ${especial.nombre}`}
    >
      {vista}
    </Pressable>
  );
}

function FilaTitulo({
  titulo,
  copas,
  elegido,
  onElegir,
}: {
  titulo: Titulo;
  copas: number;
  elegido: boolean;
  onElegir: () => void;
}) {
  const abierto = copas >= titulo.copas;

  if (!abierto) {
    return (
      <View style={[estilos.filaTitulo, estilos.apagado]}>
        <EtiquetaTitulo titulo={titulo} />
        <Texto style={estilos.candado}>🔒 {loQueFalta(copas, titulo.copas)}</Texto>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onElegir}
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      style={({ pressed }) => [
        estilos.filaTitulo,
        elegido && estilos.filaElegida,
        pressed && { opacity: 0.6 },
      ]}
    >
      <EtiquetaTitulo titulo={titulo} />
      <View style={estilos.derecha}>
        {marcoDe(titulo.copas) === 'oro' && (
          <Texto style={estilos.extra}>marco de oro</Texto>
        )}
        {elegido && <Texto style={estilos.puesto}>PUESTO</Texto>}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  zona: { width: '100%', gap: espaciado.md },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  resumen: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.pequeno,
    flex: 1,
  },
  nivel: { gap: 4 },
  filaRotulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  rotulo: {
    color: colores.texto,
    fontFamily: fuentes.titular,
    fontSize: escala.pequeno,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pie: { color: colores.textoSuave, fontFamily: fuentes.cuerpo, fontSize: escala.micro },
  candado: { color: colores.textoSuave, fontFamily: fuentes.cuerpo, fontSize: escala.micro },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginTop: 4,
  },
  ficha: { alignItems: 'center', gap: 2, width: 62 },
  apagado: { opacity: 0.35 },
  nombreFicha: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  nombreBloqueado: { fontSize: escala.pequeno },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
    paddingVertical: 8,
    paddingHorizontal: espaciado.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filaElegida: { borderColor: colores.acento, backgroundColor: colores.elevado },
  derecha: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm },
  extra: { color: colores.oro, fontFamily: fuentes.cuerpo, fontSize: escala.micro },
  puesto: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
  },
  quitar: { alignSelf: 'flex-start', paddingVertical: 4 },
  textoQuitar: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textDecorationLine: 'underline',
  },
});
