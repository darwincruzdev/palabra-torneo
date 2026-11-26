import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Texto } from './Texto';
import { Emblema } from './Emblema';
import { Sutil } from './ui';
import { colorDeTorneo } from '../game/emblema';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  /** Para las capturas: abre este torneo sin pasar por la lista. */
  forzarId?: string | null;
  que: 'la tabla' | 'las jornadas';
  children: (torneoId: string, volver?: () => void) => React.ReactNode;
};

/**
 * Tabla y Jornadas empiezan eligiendo torneo.
 *
 * Con uno solo no hay nada que elegir: se abre directamente y sin flecha de
 * vuelta. Con varios, la flecha de la cabecera regresa a estas tarjetas.
 */
export function VistaTorneo({ forzarId, que, children }: Props) {
  const { torneos } = useApp();
  const insets = useSafeAreaInsets();
  const [elegido, setElegido] = useState<string | null>(forzarId ?? null);

  useEffect(() => {
    if (forzarId) setElegido(forzarId);
  }, [forzarId]);

  if (torneos.length === 0) {
    return (
      <View style={[estilos.vacio, { paddingTop: insets.top }]}>
        <Texto style={estilos.titulo}>Sin torneos</Texto>
        <Sutil>Cuando estés en uno, {que} salen aquí. Se crean desde Jugar.</Sutil>
      </View>
    );
  }

  const unico = torneos.length === 1 ? torneos[0].id : null;
  const id =
    unico ?? (elegido && torneos.some((t) => t.id === elegido) ? elegido : null);

  if (!id) {
    return (
      <ScrollView contentContainerStyle={[estilos.contenido, { paddingTop: insets.top + espaciado.lg }]}>
        <Texto style={estilos.rotulo}>Elige un torneo</Texto>
        <Sutil>Para ver {que}.</Sutil>
        {torneos.map((torneo) => (
          <Pressable
            key={torneo.id}
            onPress={() => setElegido(torneo.id)}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${que} de ${torneo.nombre}`}
            style={[estilos.tarjeta, { borderColor: colorDeTorneo(torneo.id) }]}
          >
            <Emblema nombre={torneo.nombre} id={torneo.id} lado={40} />
            <Texto style={estilos.nombre} numberOfLines={1}>
              {torneo.nombre}
            </Texto>
            <Texto style={[estilos.ver, { color: colorDeTorneo(torneo.id) }]}>Ver ›</Texto>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return <>{children(id, unico ? undefined : () => setElegido(null))}</>;
}

const estilos = StyleSheet.create({
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
    padding: espaciado.lg,
  },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.grande,
    textTransform: 'uppercase',
  },
  contenido: { padding: espaciado.lg, gap: espaciado.sm },
  rotulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    padding: espaciado.md,
  },
  nombre: {
    flex: 1,
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.medio,
  },
  ver: { fontFamily: fuentes.cuerpoFuerte, fontSize: escala.pequeno },
});
