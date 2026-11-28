import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Texto } from './Texto';
import { Hoja } from './Hoja';
import { Avatar } from './Avatar';
import { EtiquetaTitulo } from './EtiquetaTitulo';
import { Boton } from './ui';
import { useApp } from '../estado/AppContext';
import { AVATARES_ESPECIALES } from '../game/avatares';
import { desbloqueosEntre } from '../game/rangos';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  /** Lleva a la sección del perfil donde se cambian avatar y título. */
  irAElegir: () => void;
};

/**
 * Lo que has desbloqueado con tus copas, una sola vez.
 *
 * Sale la primera vez que se abre la app teniendo algo sin avisar: al lanzar
 * esto, a quien ya tenga copas se le cuenta de una vez todo lo que lleva; a
 * partir de ahí, sólo lo que vaya ganando. Una copa que no desbloquea nada no
 * saca ningún aviso, porque `desbloqueosEntre` no devuelve nada que contar.
 *
 * Lo avisado se apunta en su documento, no sólo en el móvil, para que no se le
 * repita al entrar desde otro aparato.
 */
export function AvisoRangos({ irAElegir }: Props) {
  const { copas, rangosAvisados, marcarRangosAvisados, perfilConfigurado } = useApp();
  const [cerrado, setCerrado] = useState(false);

  const nuevos = useMemo(
    () => desbloqueosEntre(rangosAvisados ?? 0, copas),
    [rangosAvisados, copas]
  );

  // `perfilConfigurado` es la señal de que ya se ha leído un perfil: sin ella, al
  // arrancar se le contaría a todo el mundo lo del lanzamiento otra vez,
  // mientras el de verdad viene de camino.
  const visible = perfilConfigurado === true && !cerrado && nuevos.length > 0;

  async function cerrar() {
    setCerrado(true);
    await marcarRangosAvisados();
  }

  const avatares = nuevos.flatMap((d) => d.avatares);
  const titulo = nuevos.map((d) => d.titulo).filter(Boolean).pop() ?? null;
  const marco = nuevos.map((d) => d.marco).filter(Boolean).pop() ?? null;

  return (
    <Hoja visible={visible} cerrar={cerrar} titulo="Has desbloqueado">
      <View style={estilos.zona}>
        <Texto style={estilos.copas}>
          {copas === 1 ? '1 copa' : `${copas} copas`}
        </Texto>

        {avatares.length > 0 && (
          <View style={estilos.bloque}>
            <Texto style={estilos.rotulo}>
              {avatares.length === 1 ? 'Un avatar nuevo' : `${avatares.length} avatares nuevos`}
            </Texto>
            <View style={estilos.rejilla}>
              {avatares.map((especial) => (
                <View key={especial.id} style={estilos.ficha}>
                  <Avatar
                    avatar={{
                      color: 0,
                      patron: especial.patron,
                      especial: AVATARES_ESPECIALES.indexOf(especial),
                    }}
                    lado={46}
                    marco={especial.aura ? 'aura' : null}
                  />
                  <Texto style={estilos.nombre}>{especial.nombre}</Texto>
                </View>
              ))}
            </View>
          </View>
        )}

        {titulo && (
          <View style={estilos.bloque}>
            <Texto style={estilos.rotulo}>Título</Texto>
            <EtiquetaTitulo titulo={titulo} />
          </View>
        )}

        {marco === 'oro' && (
          <Texto style={estilos.extra}>
            Y el marco dorado, que no tiene nadie más.
          </Texto>
        )}
        {marco === 'aura' && (
          <Texto style={estilos.extra}>
            Y un aura junto a tu nombre, que se ve en la tabla y en las jornadas.
          </Texto>
        )}

        <Boton
          titulo="Elegir avatar y título"
          onPress={() => {
            cerrar();
            irAElegir();
          }}
        />
      </View>
    </Hoja>
  );
}

const estilos = StyleSheet.create({
  zona: { gap: espaciado.md },
  copas: {
    color: colores.oro,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
  },
  bloque: { gap: espaciado.xs },
  rotulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.sm },
  ficha: { alignItems: 'center', gap: 2, width: 62 },
  nombre: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  extra: { color: colores.texto, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno },
});
