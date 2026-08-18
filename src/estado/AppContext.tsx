import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type {
  Avatar,
  DiaTorneo,
  Obligacion,
  ReglasTorneo,
  ResultadoDia,
  Torneo,
  TorneoActivo,
} from '../tipos';
import { clasificacion, liderDestacado } from '../game/clasificacion';
import { fechaJuego, sumarDias } from '../game/fecha';
import { esAceptada } from '../game/palabras';
import { normalizar } from '../game/normalizar';
import {
  blueshellGastada,
  blueshellsContra,
  blueshellsEfectivas,
  estaProtegido,
  jornadasParaRecargar,
  normalizarReglas,
  obligacionesDe,
  proteccionGastada,
  type BlueshellLanzada,
} from '../game/reglas';
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
  /** Las normas de la casa de un torneo, con las de siempre por defecto. */
  reglasDe: (torneoId: string) => ReglasTorneo;
  /** Qué palabras tengo impuestas hoy en ese torneo, y en qué intento. */
  obligacionesHoy: (torneoId: string) => Obligacion[];
  /** Todo lo que hace falta para pintar y usar las blueshells. */
  blueshellsDe: (torneoId: string) => EstadoBlueshell;
  cambiarReglas: (torneoId: string, reglas: ReglasTorneo) => Promise<void>;
  /** Dispara contra quien va primero. La palabra golpea mañana. */
  lanzarBlueshell: (torneoId: string, palabra: string) => Promise<void>;
  /** Gasta la protección de hoy: anula todas las balas recibidas. */
  usarProteccion: (torneoId: string) => Promise<void>;
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

/** La foto de las blueshells de un torneo para la persona que mira. */
export type EstadoBlueshell = {
  /** La norma está encendida en este torneo. */
  activas: boolean;
  /** A quién se puede disparar ahora mismo, o null si no hay líder destacado. */
  lider: string | null;
  puedoLanzar: boolean;
  /** Por qué no puedo, en una frase, o null si sí puedo. */
  impedimento: string | null;
  /** Las que me caen hoy a mí, protección aparte. */
  recibidas: BlueshellLanzada[];
  /** Ya gasté hoy la protección. */
  protegido: boolean;
  puedoProteger: boolean;
  /** Jornadas que faltan para recargar bala y protección, contando la de hoy. */
  paraRecargar: number;
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
  const reglasDe = useCallback(
    (torneoId: string) =>
      normalizarReglas(torneos.find((t) => t.id === torneoId)?.reglas),
    [torneos]
  );

  const penalizadoEn = useCallback(
    (torneoId: string) => {
      if (!uid) return false;
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo) return false;
      if (!normalizarReglas(torneo.reglas).penalizacionLider) return false;
      const filas = clasificacion(torneo, jornadas[torneoId] ?? [], hoy);
      return liderDestacado(filas) === uid;
    },
    [torneos, jornadas, uid, hoy]
  );

  const obligacionesHoy = useCallback(
    (torneoId: string): Obligacion[] => {
      if (!uid) return [];
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo) return [];
      const dias = jornadas[torneoId] ?? [];
      return obligacionesDe({
        reglas: normalizarReglas(torneo.reglas),
        liderando: liderDestacado(clasificacion(torneo, dias, hoy)) === uid,
        blueshells: blueshellsEfectivas(
          dias.find((d) => d.fecha === hoy),
          uid
        ),
      });
    },
    [torneos, jornadas, uid, hoy]
  );

  /**
   * El líder al que se le puede disparar es el que va primero *ahora*, con la
   * jornada de hoy incluida, que es el que se ve arriba en la tabla. No es el
   * mismo cálculo que la penalización, que mira la clasificación cerrada a
   * ayer: ahí se trata de castigar a quien terminó primero la jornada anterior.
   */
  const blueshellsDe = useCallback(
    (torneoId: string): EstadoBlueshell => {
      const torneo = torneos.find((t) => t.id === torneoId);
      const vacio: EstadoBlueshell = {
        activas: false,
        lider: null,
        puedoLanzar: false,
        impedimento: null,
        recibidas: [],
        protegido: false,
        puedoProteger: false,
        paraRecargar: 0,
      };
      if (!torneo || !uid) return vacio;

      const activas = normalizarReglas(torneo.reglas).blueshells;
      const dias = jornadas[torneoId] ?? [];
      const diaHoy = dias.find((d) => d.fecha === hoy);
      const lider = liderDestacado(clasificacion(torneo, dias));
      const recibidas = blueshellsContra(diaHoy, uid);
      const protegido = estaProtegido(diaHoy, uid);
      const balaGastada = blueshellGastada(dias, torneo.fechaInicio, hoy, uid);

      const impedimento = !activas
        ? 'Este torneo juega sin blueshells.'
        : balaGastada
          ? 'Ya has gastado tu bala en este ciclo.'
          : !lider
            ? 'Ahora mismo no hay un líder en solitario al que disparar.'
            : lider === uid
              ? 'Vas primero: no puedes dispararte a ti mismo.'
              : null;

      return {
        activas,
        lider,
        puedoLanzar: activas && impedimento === null,
        impedimento,
        recibidas,
        protegido,
        puedoProteger:
          activas &&
          recibidas.length > 0 &&
          !protegido &&
          !proteccionGastada(dias, torneo.fechaInicio, hoy, uid),
        paraRecargar: jornadasParaRecargar(torneo.fechaInicio, hoy),
      };
    },
    [torneos, jornadas, uid, hoy]
  );

  const cambiarReglas = useCallback(
    async (torneoId: string, reglas: ReglasTorneo) => {
      if (!uid || !datos.hayFirebase) return;
      await datos.guardarReglas(torneoId, reglas);
    },
    [uid]
  );

  const lanzarBlueshell = useCallback(
    async (torneoId: string, palabra: string) => {
      if (!uid) throw new Error('Hay que entrar con Google para disparar');
      const estado = blueshellsDe(torneoId);
      if (!estado.puedoLanzar || !estado.lider) {
        throw new Error(estado.impedimento ?? 'Ahora no puedes disparar');
      }
      const limpia = normalizar(palabra);
      if (!esAceptada(limpia)) {
        throw new Error('Esa palabra no está en la lista, elige otra');
      }
      // Golpea mañana: la bala es para la jornada siguiente, no para ésta.
      await datos.lanzarBlueshell(torneoId, sumarDias(hoy, 1), uid, {
        objetivo: estado.lider,
        palabra: limpia,
        lanzada: hoy,
      });
    },
    [uid, hoy, blueshellsDe]
  );

  const usarProteccion = useCallback(
    async (torneoId: string) => {
      if (!uid) return;
      if (!blueshellsDe(torneoId).puedoProteger) return;
      await datos.activarProteccion(torneoId, hoy, uid);
    },
    [uid, hoy, blueshellsDe]
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
    reglasDe,
    obligacionesHoy,
    blueshellsDe,
    cambiarReglas,
    lanzarBlueshell,
    usarProteccion,
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
