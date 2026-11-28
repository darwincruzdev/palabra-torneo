import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Texto } from '../components/Texto';
import { Avatar } from '../components/Avatar';
import { Emblema } from '../components/Emblema';
import { SelectorAvatar } from '../components/SelectorAvatar';
import { Copas } from '../components/Copas';
import { Boton, Sutil, Tarjeta } from '../components/ui';
import { Confirmacion } from '../components/Confirmacion';
import { IconoLapiz } from '../components/Iconos';
import { NOTAS_DEL_PARCHE, VERSION_PARCHE } from '../game/constantes';
import { clasificacion, trofeosDeResumenes, trofeosPorJugador } from '../game/clasificacion';
import { fusionarHistorial, resumenPersonal } from '../game/estadisticas';
import { fechaJuego } from '../game/fecha';
import { cargarHistorial } from '../almacen/local';
import { type Avatar as DatosAvatar } from '../game/avatares';
import { useApp } from '../estado/AppContext';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

type Props = {
  irANormas: () => void;
  irATorneo: (torneoId: string) => void;
};

/** Tus números, tus torneos y la cuenta. Las normas viven en su propia pantalla. */
export function PantallaPerfil({ irANormas, irATorneo }: Props) {
  const {
    nombre,
    avatar,
    cambiarPerfil,
    sesion,
    hayFirebase,
    letraGrande,
    cambiarLetraGrande,
    torneos,
    jornadas,
    misPartidasPublicadas,
    resumenes,
    cargarResumenes,
    uid,
    borrarCuenta,
  } = useApp();
  const [editando, setEditando] = useState(false);
  const [borradorNombre, setBorradorNombre] = useState(nombre);
  const [borradorAvatar, setBorradorAvatar] = useState<DatosAvatar>(avatar);
  const [historial, setHistorial] = useState<Awaited<ReturnType<typeof cargarHistorial>>>([]);
  const [preguntando, setPreguntando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const hoy = fechaJuego();
  const insets = useSafeAreaInsets();

  useEffect(() => setBorradorNombre(nombre), [nombre]);
  useEffect(() => setBorradorAvatar(avatar), [avatar]);
  useEffect(() => {
    cargarHistorial().then(setHistorial);
  }, []);
  useEffect(() => {
    for (const torneo of torneos) cargarResumenes(torneo.id);
  }, [torneos, cargarResumenes]);

  const completo = useMemo(
    () => fusionarHistorial(historial, misPartidasPublicadas),
    [historial, misPartidasPublicadas]
  );
  const stats = useMemo(() => resumenPersonal(completo, hoy), [completo, hoy]);

  const desde = useMemo(() => {
    const fechas = completo.map((p) => p.fecha).sort();
    if (fechas.length === 0) return null;
    const [ano, mes] = fechas[0].split('-');
    const nombres = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${nombres[Number(mes) - 1]} ${ano}`;
  }, [completo]);

  const cambiado =
    borradorNombre !== nombre ||
    borradorAvatar.color !== avatar.color ||
    borradorAvatar.patron !== avatar.patron;

  const mios = torneos.filter((t) => t.propietario === uid);
  const aviso = [
    `Se borran tu nombre, tu avatar, tus ajustes y el historial de este aparato, y sales de ${
      torneos.length === 1 ? 'tu torneo' : `tus ${torneos.length} torneos`
    }.`,
    'Los puntos de las jornadas ya jugadas se quedan en la clasificación, pero sin tu nombre.',
    mios.length > 0 &&
      `Fundaste ${mios.map((t) => t.nombre).join(', ')}. Al irte nadie podrá cambiar sus normas.`,
    'No tiene vuelta atrás.',
  ]
    .filter(Boolean)
    .join('\n\n');

  async function confirmarBorrado() {
    setPreguntando(false);
    setBorrando(true);
    const error = await borrarCuenta();
    setBorrando(false);
    setFallo(error);
  }

  const maximo = Math.max(1, ...stats.reparto);

  return (
    <ScrollView
      contentContainerStyle={[estilos.contenido, { paddingTop: insets.top + espaciado.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.cabecera}>
        <Avatar avatar={avatar} lado={64} />
        <View style={{ flex: 1 }}>
          <Texto style={estilos.nombre}>{nombre || 'Sin nombre'}</Texto>
          <Texto style={estilos.meta}>
            {torneos.length} {torneos.length === 1 ? 'torneo' : 'torneos'}
            {desde ? ` · desde ${desde}` : ''}
          </Texto>
        </View>
        <Pressable
          onPress={() => setEditando((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Editar perfil"
          style={estilos.lapiz}
        >
          <IconoLapiz color={colores.texto} />
        </Pressable>
      </View>

      {editando && (
        <Tarjeta>
          <TextInput
            value={borradorNombre}
            onChangeText={setBorradorNombre}
            placeholder="Tu nombre"
            placeholderTextColor={colores.textoSuave}
            maxLength={20}
            style={estilos.campo}
          />
          <SelectorAvatar elegido={borradorAvatar} onElegir={setBorradorAvatar} plegable />
          <Boton
            titulo="Guardar perfil"
            onPress={() => {
              cambiarPerfil(borradorNombre, borradorAvatar).then(() => setEditando(false));
            }}
            deshabilitado={borradorNombre.trim().length === 0 || !cambiado}
          />
          {!hayFirebase && <Sutil>Sin Firebase, esto sólo se guarda en el móvil.</Sutil>}
        </Tarjeta>
      )}

      <View style={estilos.cifras}>
        <Cifra valor={stats.jugadas} etiqueta="jugadas" />
        <Cifra valor={`${stats.porcentaje}%`} etiqueta="aciertos" />
        <Cifra valor={stats.racha} etiqueta="racha" />
        <Cifra valor={stats.mejorRacha} etiqueta="mejor racha" />
      </View>

      <Tarjeta>
        <View style={estilos.filaTitulo}>
          <Texto style={estilos.rotulo}>En cuántos intentos</Texto>
          <Texto style={estilos.meta}>
            media {stats.media === null ? '—' : stats.media.toFixed(1).replace('.', ',')}
          </Texto>
        </View>
        {stats.reparto.map((cuenta, i) => (
          <View key={i} style={estilos.barraFila}>
            <Texto style={estilos.numero}>{i + 1}</Texto>
            <View
              style={[
                estilos.barra,
                {
                  width: `${Math.max(8, (cuenta / maximo) * 100)}%`,
                  backgroundColor: cuenta > 0 ? colores.correcta : colores.borde,
                },
              ]}
            >
              <Texto style={estilos.cuenta}>{cuenta}</Texto>
            </View>
          </View>
        ))}
        <View style={estilos.barraFila}>
          <Texto style={estilos.numero}>X</Texto>
          <View style={[estilos.barra, { width: '12%', backgroundColor: colores.ausente }]}>
            <Texto style={estilos.cuenta}>{stats.jugadas - stats.aciertos}</Texto>
          </View>
        </View>
      </Tarjeta>

      {torneos.length > 0 && (
        <>
          <Texto style={estilos.rotulo}>Tus torneos</Texto>
          {torneos.map((torneo) => {
            const filas = clasificacion(torneo, jornadas[torneo.id] ?? []);
            const puesto = filas.findIndex((f) => f.uid === uid) + 1;
            const puntos = filas.find((f) => f.uid === uid)?.puntos ?? 0;
            const trofeos = trofeosPorJugador(trofeosDeResumenes(resumenes[torneo.id] ?? []))[uid ?? ''] ?? 0;
            return (
              <Pressable
                key={torneo.id}
                onPress={() => irATorneo(torneo.id)}
                accessibilityRole="button"
                style={estilos.torneo}
              >
                <Emblema nombre={torneo.nombre} id={torneo.id} lado={36} />
                <Texto style={estilos.nombreTorneo} numberOfLines={1}>
                  {torneo.nombre}
                </Texto>
                <Copas copas={trofeos} />
                <Texto style={estilos.puesto}>
                  {puesto > 0 ? `${puesto}.º · ${puntos} pts` : `${puntos} pts`}
                </Texto>
              </Pressable>
            );
          })}
        </>
      )}

      <Pressable onPress={irANormas} style={estilos.entrada} accessibilityRole="button">
        <Texto style={estilos.entradaTexto}>Cómo se juega y normas</Texto>
        <Texto style={estilos.flecha}>›</Texto>
      </Pressable>
      <Pressable
        onPress={() => Linking.openURL(NOTAS_DEL_PARCHE).catch(() => {})}
        style={estilos.entrada}
        accessibilityRole="button"
      >
        <Texto style={estilos.entradaTexto}>Novedades de la versión {VERSION_PARCHE}</Texto>
        <Texto style={estilos.flecha}>›</Texto>
      </Pressable>
      <View style={estilos.entrada}>
        <View style={{ flex: 1 }}>
          <Texto style={estilos.entradaTexto}>Letra grande</Texto>
          <Texto style={estilos.meta}>Agranda el texto de toda la app.</Texto>
        </View>
        <Switch
          value={letraGrande}
          onValueChange={cambiarLetraGrande}
          trackColor={{ true: colores.correcta, false: colores.borde }}
          thumbColor={colores.texto}
        />
      </View>

      {sesion.usuario && (
        <Boton titulo="Cerrar sesión" variante="secundario" onPress={() => sesion.salir()} />
      )}

      <Tarjeta>
        <Texto style={estilos.entradaTexto}>Borrar mi cuenta</Texto>
        <Sutil>
          Se va tu nombre, el avatar y tu sitio en los torneos. Los puntos ya escritos se quedan,
          sin nombre.
        </Sutil>
        {fallo && <Texto style={estilos.fallo}>{fallo}</Texto>}
        <Boton
          titulo={borrando ? 'Borrando…' : 'Borrar mi cuenta'}
          variante="peligro"
          deshabilitado={borrando || !uid}
          onPress={() => setPreguntando(true)}
        />
      </Tarjeta>

      <Confirmacion
        visible={preguntando}
        titulo="Borrar la cuenta"
        mensaje={aviso}
        textoConfirmar="Borrarla"
        peligro
        onConfirmar={confirmarBorrado}
        onCancelar={() => setPreguntando(false)}
      />
    </ScrollView>
  );
}

function Cifra({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  return (
    <View style={estilos.cifra}>
      <Texto style={estilos.cifraValor}>{valor}</Texto>
      <Texto style={estilos.cifraEtiqueta}>{etiqueta}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.sm, paddingBottom: espaciado.xl * 2 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.md, marginBottom: espaciado.sm },
  nombre: {
    color: colores.texto,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.titulo,
    textTransform: 'uppercase',
  },
  meta: { color: colores.textoSuave, fontFamily: fuentes.cuerpo, fontSize: escala.micro, marginTop: 2 },
  lapiz: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campo: {
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 12,
    paddingHorizontal: espaciado.md,
    paddingVertical: 12,
    color: colores.texto,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.normal,
    marginBottom: espaciado.sm,
  },
  cifras: { flexDirection: 'row', gap: 6 },
  cifra: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    alignItems: 'center',
    paddingVertical: espaciado.md,
  },
  cifraValor: { color: colores.texto, fontFamily: fuentes.titularNegro, fontSize: escala.grande },
  cifraEtiqueta: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  filaTitulo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: espaciado.sm },
  rotulo: {
    color: colores.textoSuave,
    fontFamily: fuentes.titular,
    fontSize: escala.micro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  numero: { color: colores.textoSuave, width: 12, fontFamily: fuentes.cuerpo, fontSize: escala.micro },
  barra: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, minWidth: 24 },
  cuenta: { color: colores.texto, fontFamily: fuentes.cuerpoFuerte, fontSize: escala.micro, textAlign: 'right' },
  torneo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.sm,
  },
  nombreTorneo: { flex: 1, color: colores.texto, fontFamily: fuentes.cuerpoFuerte, fontSize: escala.normal },
  puesto: { color: colores.textoSuave, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    backgroundColor: colores.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espaciado.md,
  },
  entradaTexto: { flex: 1, color: colores.texto, fontFamily: fuentes.cuerpoFuerte, fontSize: escala.normal },
  flecha: { color: colores.textoTenue, fontSize: 22 },
  fallo: { color: colores.peligro, fontFamily: fuentes.cuerpo, fontSize: escala.pequeno },
});
