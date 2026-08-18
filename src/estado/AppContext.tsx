import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Avatar, DiaTorneo, ResultadoDia, Torneo, TorneoActivo } from '../tipos';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego } from '../game/fecha';
import { avatarInicial, normalizarAvatar } from '../game/avatares';
import {
  cargarPerfilLocal,
  cargarTorneoActivo,
  guardarPerfilLocal,
  guardarTorneoActivo,
} from '../almacen/local';
import { useSesionGoogle, type EstadoSesion } from '../firebase/sesion';
import * as datos from '../firebase/datos';

export const TORNEO_LIBRE: TorneoActivo = {
  tipo: 'libre',
  id: 'libre',
  nombre: 'Modo libre',
  semilla: undefined,
};

type Estado = {
  sesion: EstadoSesion;
  hayFirebase: boolean;
  uid: string | null;
  nombre: string;
  avatar: Avatar;
  /** null mientras se averigua; false = hay que pasar por la bienvenida. */
  perfilConfigurado: boolean | null;
  torneos: Torneo[];
  jornadas: Record<string, DiaTorneo[]>;
  /** El torneo cuya palabra se está jugando ahora mismo. */
  activo: TorneoActivo;
  elegirTorneo: (torneoId: string) => void;
  /** ¿Lidero en solitario este torneo? Entonces hoy juego con palabra impuesta. */
  penalizadoEn: (torneoId: string) => boolean;
  cambiarPerfil: (nombre: string, avatar: Avatar) => Promise<void>;
  crearTorneo: (nombre: string) => Promise<Torneo>;
  unirsePorCodigo: (codigo: string) => Promise<Torneo | null>;
  salir: (torneoId: string) => Promise<void>;
  publicar: (
    torneoId: string,
    fecha: string,
    resultado: Omit<ResultadoDia, 'uid' | 'nombre' | 'avatar'>
  ) => Promise<void>;
};

const Contexto = createContext<Estado | null>(null);

export function ProveedorApp({ children }: { children: React.ReactNode }) {
  const sesion = useSesionGoogle();
  const uid = sesion.usuario?.uid ?? null;

  const [nombre, setNombre] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(() => normalizarAvatar(null));
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [jornadas, setJornadas] = useState<Record<string, DiaTorneo[]>>({});
  const [activoId, setActivoId] = useState<string>(TORNEO_LIBRE.id);
  const [configurado, setConfigurado] = useState<boolean | null>(null);

  // Perfil: primero lo que haya en el móvil, para no parpadear, y luego lo que
  // diga el servidor, que es lo que ven los demás.
  useEffect(() => {
    cargarPerfilLocal().then((guardado) => {
      if (!guardado) return;
      setNombre(guardado.nombre);
      setAvatar(normalizarAvatar(guardado.avatar));
      if (guardado.configurado) setConfigurado(true);
    });
    cargarTorneoActivo().then((id) => {
      if (id) setActivoId(id);
    });
  }, []);

  useEffect(() => {
    if (!uid || !datos.hayFirebase) return;
    datos
      .leerPerfil(uid)
      .then((perfil) => {
        if (perfil?.configurado) {
          setNombre(perfil.nombre);
          setAvatar(perfil.avatar);
          setConfigurado(true);
          guardarPerfilLocal({ ...perfil, configurado: true });
          return;
        }
        // Primera vez: se propone el nombre de la cuenta de Google y un avatar,
        // pero no se da por bueno hasta que la persona pase por la bienvenida.
        const propuesto =
          perfil?.nombre ||
          sesion.usuario?.displayName?.split(' ')[0]?.slice(0, 20) ||
          'Jugador';
        setNombre(propuesto);
        setAvatar(perfil?.avatar ?? avatarInicial(uid));
        setConfigurado(false);
      })
      .catch(() => setConfigurado(false));
  }, [uid, sesion.usuario]);

  // Mis torneos.
  useEffect(() => {
    if (!uid || !datos.hayFirebase) {
      setTorneos([]);
      return;
    }
    return datos.observarMisTorneos(uid, setTorneos);
  }, [uid]);

  // Una suscripción por torneo a sus jornadas.
  useEffect(() => {
    if (!datos.hayFirebase) return;
    const cancelaciones = torneos.map((torneo) =>
      datos.observarJornadas(torneo.id, (dias) =>
        setJornadas((previo) => ({ ...previo, [torneo.id]: dias }))
      )
    );
    return () => cancelaciones.forEach((cancelar) => cancelar());
  }, [torneos]);

  const hoy = fechaJuego();

  const activo: TorneoActivo = useMemo(() => {
    const torneo = torneos.find((t) => t.id === activoId);
    if (!torneo) return TORNEO_LIBRE;
    return {
      tipo: 'torneo',
      id: torneo.id,
      nombre: torneo.nombre,
      semilla: torneo.semilla,
      torneo,
    };
  }, [torneos, activoId]);

  /**
   * La penalización se calcula con la clasificación cerrada a ayer: quien
   * terminó la jornada anterior primero en solitario abre la de hoy con una de
   * las cinco palabras obligatorias. Es por torneo, porque cada uno lleva su
   * propia clasificación.
   */
  const penalizadoEn = useCallback(
    (torneoId: string) => {
      if (!uid) return false;
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo) return false;
      const filas = clasificacion(torneo, jornadas[torneoId] ?? [], hoy);
      return liderDestacado(filas) === uid;
    },
    [torneos, jornadas, uid, hoy]
  );

  const elegirTorneo = useCallback((torneoId: string) => {
    setActivoId(torneoId);
    guardarTorneoActivo(torneoId);
  }, []);

  const cambiarPerfil = useCallback(
    async (nuevoNombre: string, nuevoAvatar: Avatar) => {
      const limpio = nuevoNombre.trim().slice(0, 20);
      const seguro = normalizarAvatar(nuevoAvatar);
      setNombre(limpio);
      setAvatar(seguro);
      setConfigurado(true);
      await guardarPerfilLocal({ nombre: limpio, avatar: seguro, configurado: true });
      if (!uid || !datos.hayFirebase) return;
      await datos.guardarPerfil(uid, limpio, seguro).catch(() => {});
      // Que la clasificación de cada torneo se entere del cambio.
      await datos.propagarPerfil(
        uid,
        torneos.map((t) => t.id),
        limpio,
        seguro
      );
    },
    [uid, torneos]
  );

  const crearTorneo = useCallback(
    async (nombreTorneo: string) => {
      if (!uid) throw new Error('Hay que entrar con Google para crear un torneo');
      const torneo = await datos.crearTorneo(nombreTorneo, uid, nombre || 'Jugador', avatar);
      elegirTorneo(torneo.id);
      return torneo;
    },
    [uid, nombre, avatar, elegirTorneo]
  );

  const unirsePorCodigo = useCallback(
    async (codigo: string) => {
      if (!uid) throw new Error('Hay que entrar con Google para unirse a un torneo');
      const invitacion = await datos.buscarInvitacion(codigo);
      if (!invitacion) return null;
      await datos.unirseATorneo(invitacion.torneoId, uid, nombre || 'Jugador', avatar);
      elegirTorneo(invitacion.torneoId);
      return (
        torneos.find((t) => t.id === invitacion.torneoId) ??
        ({ id: invitacion.torneoId, nombre: invitacion.nombre } as Torneo)
      );
    },
    [uid, nombre, avatar, torneos, elegirTorneo]
  );

  const salir = useCallback(
    async (torneoId: string) => {
      if (!uid) return;
      await datos.salirDeTorneo(torneoId, uid);
      if (activoId === torneoId) elegirTorneo(TORNEO_LIBRE.id);
    },
    [uid, activoId, elegirTorneo]
  );

  const publicar = useCallback(
    async (
      torneoId: string,
      fecha: string,
      parcial: Omit<ResultadoDia, 'uid' | 'nombre' | 'avatar'>
    ) => {
      if (!uid || !datos.hayFirebase || torneoId === TORNEO_LIBRE.id) return;
      await datos.publicarResultado(torneoId, fecha, {
        ...parcial,
        uid,
        nombre: nombre || 'Jugador',
        avatar,
      });
    },
    [uid, nombre, avatar]
  );

  const valor: Estado = {
    sesion,
    hayFirebase: datos.hayFirebase,
    uid,
    nombre,
    avatar,
    perfilConfigurado: configurado,
    torneos,
    jornadas,
    activo,
    elegirTorneo,
    penalizadoEn,
    cambiarPerfil,
    crearTorneo,
    unirsePorCodigo,
    salir,
    publicar,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp(): Estado {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp fuera de ProveedorApp');
  return valor;
}
