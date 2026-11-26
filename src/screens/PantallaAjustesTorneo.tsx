import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { Confirmacion } from '../components/Confirmacion';
import { HojaInvitar } from './HojaInvitar';
import { normalizarAvatar } from '../game/avatares';
import { BLUESHELLS_POR_MES, MAX_VOCALES_AL_ABRIR } from '../game/reglas';
import type { ReglasTorneo } from '../tipos';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  torneoId: string;
  volver: () => void;
};

/** Miembros, normas, código, reinicio y salida. Lo que no se mira cada día. */
export function PantallaAjustesTorneo({ torneoId, volver }: Props) {
  const { torneos, uid, reglasDe, cambiarReglas, salir, reiniciarTorneo } = useApp();
  const torneo = torneos.find((t) => t.id === torneoId);
  const reglas = reglasDe(torneoId);
  const esFundador = Boolean(torneo && uid === torneo.propietario);
  const [preguntando, setPreguntando] = useState<'salir' | 'reiniciar' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [invitar, setInvitar] = useState(false);

  if (!torneo) {
    return (
      <View style={estilos.vacio}>
        <Sutil>Este torneo ya no está disponible.</Sutil>
        <Boton titulo="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  function alternar(cual: keyof ReglasTorneo, valor: boolean) {
    cambiarReglas(torneo!.id, { ...reglas, [cual]: valor }).catch(() => {});
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={estilos.filaRotulo}>
        <Texto style={estilos.rotulo}>Jugadores · {torneo.miembros.length}</Texto>
        <Pressable onPress={() => setInvitar(true)} accessibilityRole="button">
          <Texto style={estilos.invitar}>Invitar</Texto>
        </Pressable>
      </View>
      <View style={estilos.caras}>
        {torneo.miembros.map((miembro) => (
          <View key={miembro} style={estilos.cara}>
            <Avatar
              avatar={normalizarAvatar(torneo.perfiles?.[miembro]?.avatar)}
              lado={44}
            />
            <Texto style={estilos.nombreCara} numberOfLines={1}>
              {torneo.perfiles?.[miembro]?.nombre ?? 'Jugador'}
            </Texto>
          </View>
        ))}
      </View>

      <View style={estilos.filaRotulo}>
        <Texto style={estilos.rotulo}>Normas de la casa</Texto>
        <Texto style={estilos.solo}>solo el fundador</Texto>
      </View>
      <Tarjeta>
        <Regla
          titulo="Penalización al líder"
          descripcion="El primero abre con VIVIR, PELEE, AMADA..."
          valor={reglas.penalizacionLider}
          editable={esFundador}
          alCambiar={(v) => alternar('penalizacionLider', v)}
        />
        <Regla
          titulo="Sin cuatro vocales al abrir"
          descripcion={`La 1.ª palabra, máximo ${MAX_VOCALES_AL_ABRIR} vocales`}
          valor={reglas.sinVocalesAlAbrir}
          editable={esFundador}
          alCambiar={(v) => alternar('sinVocalesAlAbrir', v)}
        />
        <Regla
          titulo="Una letra para el último"
          descripcion="Al que va último se le chiva una"
          valor={reglas.ayudaAlUltimo}
          editable={esFundador}
          alCambiar={(v) => alternar('ayudaAlUltimo', v)}
        />
        <Regla
          titulo="Blueshells y escudos"
          descripcion={`${BLUESHELLS_POR_MES} + ${BLUESHELLS_POR_MES} al mes para picar al líder`}
          valor={reglas.blueshells}
          editable={esFundador}
          alCambiar={(v) => alternar('blueshells', v)}
        />
        <Regla
          titulo="La ulti"
          descripcion="Una al mes: eliges la palabra de los demás"
          valor={reglas.ulti}
          editable={esFundador}
          alCambiar={(v) => alternar('ulti', v)}
        />
        <Regla
          titulo="Falta por no jugar"
          descripcion="Saltarse una jornada resta 1 punto"
          valor={reglas.faltaPorNoJugar}
          editable={esFundador}
          alCambiar={(v) => alternar('faltaPorNoJugar', v)}
        />
        <Regla
          titulo="Desempatar el mes a mano"
          descripcion="Si no, decide aciertos y media de intentos"
          valor={reglas.desempateManual}
          editable={esFundador}
          alCambiar={(v) => alternar('desempateManual', v)}
        />
      </Tarjeta>

      <Tarjeta>
        <View style={estilos.filaCodigo}>
          <Texto style={estilos.codigo}>Código {torneo.codigo}</Texto>
          <Pressable
            onPress={() => {
              Clipboard.setStringAsync(torneo.codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1400);
            }}
            accessibilityRole="button"
          >
            <Texto style={estilos.copiar}>{copiado ? 'Copiado' : 'Copiar'}</Texto>
          </Pressable>
        </View>
      </Tarjeta>

      {esFundador && (
        <Boton
          titulo="Reiniciar la competición"
          variante="secundario"
          onPress={() => setPreguntando('reiniciar')}
        />
      )}
      {error && <Texto style={estilos.error}>{error}</Texto>}
      <Boton titulo="Salir del torneo" variante="peligro" onPress={() => setPreguntando('salir')} />

      <Confirmacion
        visible={preguntando === 'salir'}
        titulo="Salir del torneo"
        mensaje={`Vas a salir de "${torneo.nombre}". Para volver necesitarás el código.`}
        textoConfirmar="Salir"
        peligro
        onConfirmar={() => {
          setPreguntando(null);
          salir(torneo.id).then(volver);
        }}
        onCancelar={() => setPreguntando(null)}
      />
      <Confirmacion
        visible={preguntando === 'reiniciar'}
        titulo="Reiniciar la competición"
        mensaje="La clasificación se pone a cero y la nueva arranca mañana. Las partidas viejas siguen en las jornadas."
        textoConfirmar="Reiniciar"
        onConfirmar={() => {
          setPreguntando(null);
          setError(null);
          reiniciarTorneo(torneo.id).catch(() =>
            setError('No se ha podido reiniciar. Puede que falten las reglas nuevas del servidor.')
          );
        }}
        onCancelar={() => setPreguntando(null)}
      />
      <HojaInvitar torneoId={torneo.id} visible={invitar} cerrar={() => setInvitar(false)} />
    </ScrollView>
  );
}

function Regla({
  titulo,
  descripcion,
  valor,
  editable,
  alCambiar,
}: {
  titulo: string;
  descripcion: string;
  valor: boolean;
  editable: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <View style={estilos.regla}>
      <View style={{ flex: 1 }}>
        <Texto style={estilos.tituloRegla}>{titulo}</Texto>
        <Texto style={estilos.descripcionRegla}>{descripcion}</Texto>
      </View>
      <Switch
        value={valor}
        onValueChange={alCambiar}
        disabled={!editable}
        trackColor={{ true: colores.correcta, false: colores.borde }}
        thumbColor={colores.texto}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espaciado.lg,
    gap: espaciado.sm,
    paddingBottom: espaciado.xl * 2,
  },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.md },
  rotulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  invitar: {
    color: colores.acento,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  caras: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.md,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
  },
  cara: { width: 64, alignItems: 'center', gap: 4 },
  nombreCara: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
    textAlign: 'center',
  },
  filaRotulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espaciado.sm,
  },
  solo: {
    color: colores.textoTenue,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.micro,
  },
  regla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  tituloRegla: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  descripcionRegla: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    marginTop: 2,
  },
  filaCodigo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codigo: {
    color: colores.texto,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  copiar: {
    color: colores.acento,
    fontFamily: fuentes.cuerpoFuerte,
    fontSize: escala.normal,
  },
  error: {
    color: colores.peligro,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
  },
});
