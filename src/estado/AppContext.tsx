import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Avatar,
  PartidaHecha,
  ResumenMes,
  DiaTorneo,
  Obligacion,
  ReglasTorneo,
  RecordArcade,
  ResultadoDia,
  Ulti,
  Torneo,
  TorneoActivo,
} from '../tipos';
import {
  clasificacion,
  colistaDestacado,
  liderDestacado,
  resumirMeses,
  trofeosDeResumenes,
  trofeosPorJugador,
} from '../game/clasificacion';
import { misPartidas } from '../game/estadisticas';
import {
  impedimentoParaUlti,
  problemaConLaPalabra,
  ultiDe,
  ultisQueLeQuedan,
  type UltiLanzada,
} from '../game/ulti';
import { esMejor } from '../game/arcade';
import { fechaJuego, sumarDias } from '../game/fecha';
import { esAceptada } from '../game/palabras';
import { normalizar } from '../game/normalizar';
import {
  balasQueLeQuedan,
  escudosQueLeQuedan,
  estaProtegido,
  normalizarReglas,
  obligacionesDe,
  todasLasBlueshells,
  type BlueshellLanzada,
} from '../game/reglas';
import {
  balasContra,
  balasDeLaJornada,
  balasEfectivas,
  type BalaResuelta,
} from '../game/balas';
import {
  mesDe,
  mesSiguiente,
  primerDiaDelMes,
  ultimoDiaDelMes,
} from '../game/temporada';
import { avatarInicial, normalizarAvatar } from '../game/avatares';
import { avisadasTrasVer } from '../game/rangos';
import {
  borrarTodoLoLocal,
  cargarPerfilLocal,
  cargarRecordArcade,
  guardarRecordArcadeLocal,
  guardarPerfilLocal,
  guardarTorneoActivo,
} from '../almacen/local';
import { borrarMisDuelos } from '../firebase/duelos';
import { useSesionGoogle, type EstadoSesion } from '../firebase/sesion';
import { FACTOR_LETRA_GRANDE, ProveedorEscala } from './escala';
import * as datos from '../firebase/datos';
import { construirMaqueta, MAQUETA_ACTIVA, UID_MAQUETA } from '../maqueta/datos';

export const TORNEO_LIBRE: TorneoActivo = {
  tipo: 'libre',
  id: 'libre',
  nombre: 'La diaria',
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
  /** Las jornadas de la temporada en curso. Lo anterior va en `resumenes`. */
  jornadas: Record<string, DiaTorneo[]>;
  /** Cómo quedó cada mes cerrado. Se llena al llamar a `cargarResumenes`. */
  resumenes: Record<string, ResumenMes[]>;
  cargarResumenes: (torneoId: string) => Promise<void>;
  /**
   * Mis partidas que constan en el servidor: las del mes en curso más las de
   * los meses que se hayan cargado. Es lo que hace que las estadísticas
   * sobrevivan a cambiar de móvil.
   */
  misPartidasPublicadas: PartidaHecha[];
  /** El torneo cuya palabra se está jugando ahora mismo. */
  activo: TorneoActivo;
  /**
   * El torneo que enseña la cabecera en Inicio, Tabla y Jornadas.
   *
   * La diaria no lo sustituye: jugar sin competir no te cambia de grupo.
   */
  torneoCabecera: Torneo | null;
  elegirTorneo: (torneoId: string) => void;
  /** ¿Lidero en solitario este torneo? Entonces hoy juego con palabra impuesta. */
  penalizadoEn: (torneoId: string) => boolean;
  /**
   * Mi resultado ya publicado en una jornada, si lo hay.
   *
   * Manda sobre lo que haya guardado el móvil: la partida local vive en cada
   * navegador, así que sólo el servidor sabe de verdad si esa jornada está
   * hecha. Es lo que impide repetirla desde otro sitio.
   */
  miResultado: (torneoId: string, fecha: string) => ResultadoDia | null;
  /** ¿Voy último en solitario? Entonces hoy me toca una letra de regalo. */
  ultimoEn: (torneoId: string) => boolean;
  /** Las normas de la casa de un torneo, con las de siempre por defecto. */
  reglasDe: (torneoId: string) => ReglasTorneo;
  /** Qué palabras tengo impuestas hoy en ese torneo, y en qué intento. */
  obligacionesHoy: (torneoId: string) => Obligacion[];
  /** Todo lo que hace falta para pintar y usar las blueshells. */
  blueshellsDe: (torneoId: string) => EstadoBlueshell;
  cambiarReglas: (torneoId: string, reglas: ReglasTorneo) => Promise<void>;
  /**
   * Dispara contra quien termine primero hoy. La palabra golpea mañana.
   *
   * No devuelve víctima porque todavía no la hay: se sabrá al cerrar la
   * jornada. Devuelve la palabra, para poder contarlo al grupo.
   */
  lanzarBlueshell: (torneoId: string, palabra: string) => Promise<{ palabra: string }>;
  /** Gasta la protección de hoy: anula todas las balas recibidas. */
  usarProteccion: (torneoId: string) => Promise<void>;
  /** La foto de la ulti de un torneo para quien mira. */
  ultisDe: (torneoId: string) => EstadoUlti;
  /** Gasta la ulti poniéndole esa palabra al resto del torneo para mañana. */
  lanzarUlti: (torneoId: string, palabra: string) => Promise<void>;
  cambiarPerfil: (
    nombre: string,
    avatar: Avatar,
    titulo?: string | null
  ) => Promise<void>;
  /** El id del título que lleva puesto. Puede no corresponderle: se comprueba al pintarlo. */
  titulo: string | null;
  /** Copas de todos sus torneos juntas. */
  copas: number;
  /** ¿Están todos los historiales cargados? Si no, `copas` se queda corto. */
  copasFiables: boolean;
  /** Hasta cuántas copas se le avisó de lo que desbloqueaba. */
  rangosAvisados: number | null;
  marcarRangosAvisados: () => Promise<void>;
  /** Modo de letra grande: agranda todo el texto de la app. */
  letraGrande: boolean;
  cambiarLetraGrande: (valor: boolean) => Promise<void>;
  /** Borra la cuenta entera. Devuelve el aviso si algo ha fallado, o null. */
  borrarCuenta: () => Promise<string | null>;
  /** Mi mejor ronda de arcade, o null si todavía no he hecho ninguna. */
  recordArcade: RecordArcade | null;
  /** Anota una ronda terminada. Sólo se queda si mejora lo que había. */
  guardarRecordArcade: (marca: RecordArcade) => void;
  /** La marca de otra persona del torneo, para poder mirarla. */
  recordArcadeDe: (uid: string) => Promise<RecordArcade | null>;
  crearTorneo: (nombre: string) => Promise<Torneo>;
  unirsePorCodigo: (codigo: string) => Promise<Torneo | null>;
  salir: (torneoId: string) => Promise<void>;
  /** El fundador decide quién gana un mes empatado. */
  decidirDesempate: (torneoId: string, mes: string, jugador: string) => Promise<void>;
  /** El fundador reinicia la competición: la clasificación cuenta desde hoy. */
  reiniciarTorneo: (torneoId: string) => Promise<void>;
  publicar: (
    torneoId: string,
    fecha: string,
    resultado: Omit<ResultadoDia, 'uid' | 'nombre' | 'avatar'>
  ) => Promise<void>;
};

/** La foto de la ulti de un torneo para la persona que mira. */
export type EstadoUlti = {
  /** La norma está encendida en este torneo. */
  activa: boolean;
  /** La que manda hoy, si la hay. */
  hoy: UltiLanzada | null;
  /** La que ya está puesta para mañana, si alguien se adelantó. */
  manana: UltiLanzada | null;
  /** ¿La de hoy es mía? Entonces juego la palabra normal. */
  esMia: boolean;
  puedoGastar: boolean;
  /** Por qué no puedo, en una frase, o null si sí puedo. */
  impedimento: string | null;
  /** Las que me quedan este mes: cero o una. */
  quedan: number;
  /** Cuándo vuelve: el día 1 del mes que viene. */
  recargaEl: string;
};

/** La foto de las blueshells de un torneo para la persona que mira. */
export type EstadoBlueshell = {
  /** La norma está encendida en este torneo. */
  activas: boolean;
  puedoLanzar: boolean;
  /** Por qué no puedo, en una frase, o null si sí puedo. */
  impedimento: string | null;
  /** Las que me caen hoy a mí, protección aparte. */
  recibidas: BalaResuelta[];
  /** Ya gasté hoy la protección. */
  protegido: boolean;
  puedoProteger: boolean;
  /** Balas y escudos que le quedan a uno este mes. */
  balas: number;
  escudos: number;
  /** Cuándo se recarga todo: el día 1 del mes que viene. */
  recargaEl: string;
  /**
   * Las balas de todo el mundo, para que el grupo se entere.
   *
   * Las de hoy ya han caído y tienen víctima: se lanzaron ayer y la jornada de
   * ayer está cerrada. Las de mañana se lanzaron hoy y están en el aire —
   * todavía no se sabe quién terminará primero—, así que van sin resolver.
   */
  enJuego: { hoy: BalaResuelta[]; manana: BlueshellLanzada[] };
};

const Contexto = createContext<Estado | null>(null);

export function ProveedorApp({ children }: { children: React.ReactNode }) {
  const sesion = useSesionGoogle();
  const uid = sesion.usuario?.uid ?? (MAQUETA_ACTIVA ? UID_MAQUETA : null);
  const [recordArcade, setRecordArcade] = useState<RecordArcade | null>(null);

  const [nombre, setNombre] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(() => normalizarAvatar(null));
  const [titulo, setTitulo] = useState<string | null>(null);
  const [rangosAvisados, setRangosAvisados] = useState<number | null>(null);
  const [copasCache, setCopasCache] = useState<number | null>(null);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [jornadas, setJornadas] = useState<Record<string, DiaTorneo[]>>({});
  /**
   * Los meses cerrados, ya reducidos a cómo quedaron.
   *
   * No se cargan al abrir la app: sólo cuando alguien va a mirarlos. Y una vez
   * reducidos se tiran los días, que es lo que evita arrastrar el historial
   * entero en la memoria de cada móvil.
   */
  const [resumenes, setResumenes] = useState<Record<string, ResumenMes[]>>({});
  const cargandoResumenes = useRef<Set<string>>(new Set());
  /**
   * Mis partidas de meses cerrados, sacadas del historial al reducirlo.
   *
   * Se guardan aquí porque las estadísticas personales no pueden depender de la
   * memoria de un móvil: quien se instala la app en otro aparato tenía el
   * perfil a cero aunque llevara meses jugando.
   */
  const [partidasViejas, setPartidasViejas] = useState<Record<string, PartidaHecha[]>>({});
  const [activoId, setActivoId] = useState<string>(TORNEO_LIBRE.id);
  /**
   * El último torneo de verdad que se eligió.
   *
   * `activoId` puede ser La diaria. La cabecera no: si no, jugar una palabra
   * suelta te sacaría del grupo en el que estabas.
   */
  const [cabeceraId, setCabeceraId] = useState<string | null>(null);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [letraGrande, setLetraGrande] = useState(false);

  // Perfil: primero lo que haya en el móvil, para no parpadear, y luego lo que
  // diga el servidor, que es lo que ven los demás.
  useEffect(() => {
    cargarPerfilLocal().then((guardado) => {
      if (MAQUETA_ACTIVA) return;
      if (!guardado) return;
      setNombre(guardado.nombre);
      setAvatar(normalizarAvatar(guardado.avatar));
      setTitulo(guardado.titulo ?? null);
      setRangosAvisados(guardado.rangosAvisados ?? null);
      setLetraGrande(guardado.letraGrande === true);
      if (guardado.configurado) setConfigurado(true);
    });
    // No se recupera el último torneo al abrir: la entrada es la lista, y se
    // entra en uno solo cuando la persona lo elige.
    cargarRecordArcade().then((guardado) => {
      if (guardado) setRecordArcade((previa) => (esMejor(guardado, previa) ? guardado : previa));
    });
  }, []);

  useEffect(() => {
    if (!uid || !datos.hayFirebase) return;
    datos
      .leerPerfil(uid)
      .then((perfil) => {
        // La del servidor y la del móvil pueden no coincidir: se juega sin
        // cuenta, o desde dos aparatos. Manda la mejor, no la última en llegar.
        if (perfil?.arcade) {
          const delServidor = perfil.arcade;
          setRecordArcade((previa) => (esMejor(delServidor, previa) ? delServidor : previa));
        }
        if (perfil?.configurado) {
          setNombre(perfil.nombre);
          setAvatar(perfil.avatar);
          setTitulo(perfil.titulo ?? null);
          // El del servidor manda: es el que sabe si ya se le avisó desde otro
          // aparato. Sin él, lo que hubiera en el móvil.
          setRangosAvisados((previo) => perfil.rangosAvisados ?? previo);
          setCopasCache(perfil.copas);
          setLetraGrande(perfil.letraGrande);
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
      /**
       * Si la lectura falla, no se decide nada.
       *
       * Antes aquí se ponía `false`, que es "eres nuevo": un corte de red o un
       * permiso denegado te mandaban a la bienvenida a elegir nombre y avatar
       * otra vez, y encima en cada recarga. Un fallo no es una respuesta. Se
       * deja como estaba —si el móvil ya sabía que tienes perfil, sigue
       * sabiéndolo— y sólo se manda a la bienvenida cuando el servidor contesta
       * de verdad que no hay perfil.
       */
      .catch((fallo) => {
        console.warn('No se ha podido leer el perfil', fallo);
      });
  }, [uid, sesion.usuario]);

  // Datos inventados para las capturas. No tocan Firebase ni salen en una build normal.
  useEffect(() => {
    if (!MAQUETA_ACTIVA || sesion.usuario) return;
    const inventados = construirMaqueta(fechaJuego());
    setNombre(inventados.nombre);
    setAvatar(inventados.avatar);
    setConfigurado(true);
    setTorneos(inventados.torneos);
    setJornadas(inventados.jornadas);
    setResumenes(inventados.resumenes);
    setRecordArcade(inventados.record);
  }, [sesion.usuario]);

  // Mis torneos.
  useEffect(() => {
    // La maqueta trae sus propios torneos y no debe pisarlos con la red.
    if (MAQUETA_ACTIVA && !sesion.usuario) return;
    if (!uid || !datos.hayFirebase) {
      setTorneos([]);
      return;
    }
    return datos.observarMisTorneos(uid, setTorneos);
  }, [uid, sesion.usuario]);

  const hoy = fechaJuego();

  /**
   * Una escucha por torneo, pero sólo de la temporada en curso.
   *
   * La ventana se estira hasta mañana aunque se salga del mes: las blueshells
   * viven en el día al que golpean, así que la que se dispara el 31 está ya en
   * el documento del 1.
   */
  useEffect(() => {
    if (!datos.hayFirebase) return;
    if (MAQUETA_ACTIVA && !sesion.usuario) return;
    const mes = mesDe(hoy);
    const desde = primerDiaDelMes(mes);
    const finDeMes = ultimoDiaDelMes(mes);
    const manana = sumarDias(hoy, 1);
    const hasta = manana > finDeMes ? manana : finDeMes;

    const cancelaciones = torneos.map((torneo) =>
      datos.observarJornadas(torneo.id, desde, hasta, (dias) =>
        setJornadas((previo) => ({ ...previo, [torneo.id]: dias }))
      )
    );
    return () => cancelaciones.forEach((cancelar) => cancelar());
  }, [torneos, hoy, sesion.usuario]);

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
  /**
   * Trae el historial de un torneo y lo deja reducido a resúmenes.
   *
   * Se pide una sola vez por torneo y sesión, y sólo desde las pantallas que
   * miran meses pasados. La pantalla de juego y la de modos no lo piden nunca,
   * que es donde más importa no gastar batería ni datos.
   */
  const cargarResumenes = useCallback(
    async (torneoId: string) => {
      if (!datos.hayFirebase) return;
      if (MAQUETA_ACTIVA && !sesion.usuario) return;
      if (cargandoResumenes.current.has(torneoId)) return;
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo) return;

      cargandoResumenes.current.add(torneoId);
      try {
        const historial = await datos.obtenerJornadas(torneoId);
        setResumenes((previo) => ({
          ...previo,
          [torneoId]: resumirMeses(torneo, historial, hoy),
        }));
        // De todo el historial sólo se conservan mis partidas: son las que
        // alimentan las estadísticas, y son treinta al mes en vez de todas.
        if (uid) {
          setPartidasViejas((previo) => ({
            ...previo,
            [torneoId]: misPartidas(torneoId, historial, uid),
          }));
        }
      } catch {
        // Sin historial se sigue jugando: la temporada en curso no depende de él.
        cargandoResumenes.current.delete(torneoId);
      }
    },
    [torneos, hoy, uid, sesion.usuario]
  );

  /** Lo del mes en curso llega en vivo; lo viejo, de lo que se haya cargado. */
  const misPartidasPublicadas = useMemo(() => {
    if (!uid) return [];
    const delMes = torneos.flatMap((t) => misPartidas(t.id, jornadas[t.id] ?? [], uid));
    return [...Object.values(partidasViejas).flat(), ...delMes];
  }, [torneos, jornadas, partidasViejas, uid]);

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
      const filas = clasificacion(torneo, jornadas[torneoId] ?? [], { hasta: hoy });
      return liderDestacado(filas) === uid;
    },
    [torneos, jornadas, uid, hoy]
  );

  const miResultado = useCallback(
    (torneoId: string, fecha: string): ResultadoDia | null => {
      if (!uid) return null;
      const dia = (jornadas[torneoId] ?? []).find((d) => d.fecha === fecha);
      return dia?.resultados?.[uid] ?? null;
    },
    [jornadas, uid]
  );

  /**
   * La ayuda al colista se decide con la clasificación cerrada a ayer, igual
   * que la penalización del líder: si se recalculara con la jornada de hoy,
   * la letra podría aparecer y desaparecer según fueran jugando los demás.
   */
  const ultimoEn = useCallback(
    (torneoId: string) => {
      if (!uid) return false;
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo) return false;
      if (!normalizarReglas(torneo.reglas).ayudaAlUltimo) return false;
      const filas = clasificacion(torneo, jornadas[torneoId] ?? [], { hasta: hoy });
      return colistaDestacado(filas) === uid;
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
        liderando: liderDestacado(clasificacion(torneo, dias, { hasta: hoy })) === uid,
        blueshells: balasEfectivas(
          dias.find((d) => d.fecha === hoy),
          torneo,
          dias,
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
        puedoLanzar: false,
        impedimento: null,
        recibidas: [],
        protegido: false,
        puedoProteger: false,
        balas: 0,
        escudos: 0,
        recargaEl: primerDiaDelMes(mesSiguiente(mesDe(hoy))),
        enJuego: { hoy: [], manana: [] },
      };
      if (!torneo || !uid) return vacio;

      const activas = normalizarReglas(torneo.reglas).blueshells;
      const dias = jornadas[torneoId] ?? [];
      const diaHoy = dias.find((d) => d.fecha === hoy);
      const recibidas = balasContra(diaHoy, torneo, dias, uid);
      const protegido = estaProtegido(diaHoy, uid);
      const mes = mesDe(hoy);
      const balas = balasQueLeQuedan(dias, torneo.fechaInicio, mes, uid);
      const escudos = escudosQueLeQuedan(dias, torneo.fechaInicio, mes, uid);

      /**
       * Ya no hace falta que haya un líder para disparar.
       *
       * Antes se exigía uno destacado y que no fueras tú, porque la víctima se
       * elegía en ese instante. Ahora la bala va "al que termine primero hoy",
       * y eso no se sabe todavía: se puede disparar siempre que queden balas.
       */
      const impedimento = !activas
        ? 'Este torneo juega sin blueshells.'
        : balas === 0
          ? 'Te has quedado sin balas este mes.'
          : null;

      return {
        activas,
        puedoLanzar: activas && impedimento === null,
        impedimento,
        recibidas,
        protegido,
        puedoProteger: activas && recibidas.length > 0 && !protegido && escudos > 0,
        balas,
        escudos,
        recargaEl: primerDiaDelMes(mesSiguiente(mes)),
        enJuego: {
          hoy: balasDeLaJornada(diaHoy, torneo, dias),
          manana: todasLasBlueshells(dias.find((d) => d.fecha === sumarDias(hoy, 1))),
        },
      };
    },
    [torneos, jornadas, uid, hoy]
  );

  /**
   * La ulti de un torneo.
   *
   * La de hoy decide a qué palabra juega cada uno; la de mañana sólo sirve para
   * saber si el sitio está cogido y para que el grupo se entere de que viene
   * una — quién la ha puesto se ve, la palabra no.
   */
  const ultisDe = useCallback(
    (torneoId: string): EstadoUlti => {
      const mes = mesDe(hoy);
      const vacio: EstadoUlti = {
        activa: false,
        hoy: null,
        manana: null,
        esMia: false,
        puedoGastar: false,
        impedimento: null,
        quedan: 0,
        recargaEl: primerDiaDelMes(mesSiguiente(mes)),
      };
      const torneo = torneos.find((t) => t.id === torneoId);
      if (!torneo || !uid) return vacio;

      const reglas = normalizarReglas(torneo.reglas);
      const dias = jornadas[torneoId] ?? [];
      const laDeHoy = ultiDe(dias.find((d) => d.fecha === hoy), reglas);
      const laDeManana = ultiDe(dias.find((d) => d.fecha === sumarDias(hoy, 1)), reglas);
      const quedan = ultisQueLeQuedan(dias, torneo.fechaInicio, mes, uid);
      const impedimento = impedimentoParaUlti({
        activa: reglas.ulti,
        quedan,
        ocupada: laDeManana !== null,
      });

      return {
        activa: reglas.ulti,
        hoy: laDeHoy,
        manana: laDeManana,
        esMia: laDeHoy?.autor === uid,
        puedoGastar: reglas.ulti && impedimento === null,
        impedimento,
        quedan,
        recargaEl: primerDiaDelMes(mesSiguiente(mes)),
      };
    },
    [torneos, jornadas, uid, hoy]
  );

  const lanzarUlti = useCallback(
    async (torneoId: string, palabra: string) => {
      if (!uid) throw new Error('Hay que entrar con Google para gastar la ulti');
      const estado = ultisDe(torneoId);
      if (!estado.puedoGastar) {
        throw new Error(estado.impedimento ?? 'Ahora no puedes gastar la ulti');
      }
      const limpia = normalizar(palabra);
      const problema = problemaConLaPalabra(limpia);
      if (problema) throw new Error(problema);

      const ulti: Ulti = { palabra: limpia, lanzada: hoy };
      try {
        // Afecta a mañana: la jornada de hoy ya la está jugando gente.
        await datos.lanzarUlti(torneoId, sumarDias(hoy, 1), uid, ulti);
      } catch (e) {
        // El servidor no deja dos ultis en la misma jornada. Si dos personas
        // pulsan a la vez, la segunda llega aquí: el permiso denegado es la
        // respuesta correcta, pero contado así no se entiende nada.
        const codigo = (e as { code?: string })?.code ?? '';
        if (codigo.includes('permission-denied')) {
          throw new Error('Alguien se te ha adelantado: mañana ya tiene palabra puesta.');
        }
        throw e;
      }
    },
    [uid, hoy, ultisDe]
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
      if (!estado.puedoLanzar) {
        throw new Error(estado.impedimento ?? 'Ahora no puedes disparar');
      }
      const limpia = normalizar(palabra);
      if (!esAceptada(limpia)) {
        throw new Error('Esa palabra no está en la lista, elige otra');
      }
      /**
       * Golpea mañana, pero la decide hoy.
       *
       * Va guardada en la jornada de mañana, que es cuando obliga, y lleva
       * apuntado el día en que se disparó: con eso se resuelve contra el líder
       * al cierre de hoy. No se guarda víctima, que todavía no la hay.
       */
      await datos.lanzarBlueshell(torneoId, sumarDias(hoy, 1), uid, {
        palabra: limpia,
        lanzada: hoy,
        mes: mesDe(hoy),
      });
      return { palabra: limpia };
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
    if (torneoId !== TORNEO_LIBRE.id) setCabeceraId(torneoId);
  }, []);

  // Al recuperar el torneo guardado, la cabecera tiene que seguirle.
  useEffect(() => {
    if (activoId !== TORNEO_LIBRE.id) setCabeceraId(activoId);
  }, [activoId]);

  const torneoCabecera = useMemo(() => {
    if (!cabeceraId) return null;
    return torneos.find((t) => t.id === cabeceraId) ?? null;
  }, [torneos, cabeceraId]);

  /**
   * Las copas de todos los torneos juntas, que es de lo que salen los rangos.
   *
   * Sale del palmarés, no de un contador aparte: es el mismo recuento que pinta
   * la tabla, sumado por torneos. Lo que no esté cargado no cuenta, y por eso
   * va acompañado de `copasFiables`.
   */
  const copasCalculadas = useMemo(() => {
    if (!uid) return 0;
    return torneos.reduce(
      (suma, torneo) =>
        suma +
        (trofeosPorJugador(trofeosDeResumenes(resumenes[torneo.id] ?? []))[uid] ?? 0),
      0
    );
  }, [torneos, resumenes, uid]);

  /**
   * ¿Está el historial de todos sus torneos, o faltan por cargar?
   *
   * Importa más de lo que parece. Mientras falte alguno, `copas` se queda corto,
   * y con un número corto habría que quitarle el título a quien sí lo ha ganado
   * y sacarle un aviso de algo que ya sabía. Con esto en false no se hace ni lo
   * uno ni lo otro: se enseña lo que eligió y se calla.
   */
  const copasFiables = useMemo(
    () => !!uid && torneos.every((torneo) => resumenes[torneo.id] !== undefined),
    [torneos, resumenes, uid]
  );

  /**
   * Las copas que se dan por buenas ahora mismo.
   *
   * Con el historial cargado, el recuento de verdad. Sin él, lo último que se
   * contó, que viaja en su propio documento y llega en la misma lectura que el
   * nombre: así el aviso puede salir nada más abrir sin pedir un solo
   * documento más, que es lo que costaría contar las copas de verdad.
   */
  const copas = copasFiables ? copasCalculadas : copasCache ?? copasCalculadas;

  /** En cuanto se cuentan de verdad, se deja apuntado para el próximo arranque. */
  useEffect(() => {
    if (!uid || !datos.hayFirebase || !copasFiables) return;
    if (copasCache === copasCalculadas) return;
    setCopasCache(copasCalculadas);
    datos.guardarCopas(uid, copasCalculadas).catch(() => {});
  }, [uid, copasFiables, copasCalculadas, copasCache]);

  const cambiarPerfil = useCallback(
    async (nuevoNombre: string, nuevoAvatar: Avatar, nuevoTitulo?: string | null) => {
      const limpio = nuevoNombre.trim().slice(0, 20);
      const seguro = normalizarAvatar(nuevoAvatar);
      const suTitulo = nuevoTitulo === undefined ? titulo : nuevoTitulo;
      setNombre(limpio);
      setAvatar(seguro);
      setTitulo(suTitulo);
      setConfigurado(true);
      await guardarPerfilLocal({
        nombre: limpio,
        avatar: seguro,
        titulo: suTitulo,
        configurado: true,
        rangosAvisados,
      });
      if (!uid || !datos.hayFirebase) return;
      /**
       * Sin `catch`: si esto falla hay que enterarse.
       *
       * Se tragaba el error, así que un perfil que no llegaba a guardarse
       * dejaba a la persona dando vueltas por la bienvenida sin una sola pista
       * de por qué. Quien llama decide qué enseñar.
       */
      await datos.guardarPerfil(uid, limpio, seguro, suTitulo);
      // Que la clasificación de cada torneo se entere del cambio.
      await datos.propagarPerfil(
        uid,
        torneos.map((t) => t.id),
        limpio,
        seguro,
        suTitulo
      );
    },
    [uid, torneos, titulo, rangosAvisados]
  );

  /**
   * Da por avisado lo que lleva ganado, para no repetirle el mismo aviso.
   *
   * Nunca baja: las copas pueden bajar si un mes empatado se decide al revés, y
   * si esto bajara con ellas volvería a avisar de lo mismo al recuperarlas.
   */
  const marcarRangosAvisados = useCallback(async () => {
    const hasta = avisadasTrasVer(rangosAvisados ?? 0, copas);
    setRangosAvisados(hasta);
    const perfilLocal = await cargarPerfilLocal();
    await guardarPerfilLocal({
      nombre: perfilLocal?.nombre ?? nombre,
      avatar: perfilLocal?.avatar ?? avatar,
      titulo: perfilLocal?.titulo ?? titulo,
      configurado: perfilLocal?.configurado,
      letraGrande: perfilLocal?.letraGrande,
      rangosAvisados: hasta,
    });
    if (!uid || !datos.hayFirebase) return;
    await datos.guardarRangosAvisados(uid, hasta).catch(() => {});
  }, [uid, copas, rangosAvisados, nombre, avatar, titulo]);

  const cambiarLetraGrande = useCallback(
    async (valor: boolean) => {
      setLetraGrande(valor);
      const perfilLocal = await cargarPerfilLocal();
      await guardarPerfilLocal({
        nombre: perfilLocal?.nombre ?? nombre,
        avatar: perfilLocal?.avatar ?? avatar,
        configurado: perfilLocal?.configurado,
        letraGrande: valor,
      });
      if (!uid || !datos.hayFirebase) return;
      await datos.guardarLetraGrande(uid, valor).catch(() => {});
    },
    [uid, nombre, avatar]
  );

  /**
   * Borra la cuenta: primero el rastro, después el acceso.
   *
   * Ese orden es obligado. Borrar la cuenta de Google primero dejaría la app
   * sin permiso para tocar nada, y el nombre se quedaría puesto en los torneos
   * para siempre.
   *
   * Si el borrado del acceso falla porque la sesión es vieja, los datos ya se
   * han ido: al volver a entrar no hay nada que ver y basta con repetirlo.
   */
  const borrarCuenta = useCallback(async (): Promise<string | null> => {
    if (!uid) return 'No hay ninguna sesión abierta.';
    if (datos.hayFirebase) {
      await datos.borrarMiRastro(uid, torneos).catch(() => {});
      await borrarMisDuelos(uid).catch(() => {});
    }
    await borrarTodoLoLocal();
    return sesion.borrarAcceso();
  }, [uid, torneos, sesion]);

  /**
   * Anota una ronda de arcade terminada.
   *
   * Sólo se guarda si bate lo anterior, así que una ronda mala no borra la
   * buena. Va al móvil y, si hay cuenta, al documento de usuario, que es de
   * donde lo leen los demás desde la clasificación.
   */
  const guardarRecord = useCallback(
    (marca: RecordArcade) => {
      setRecordArcade((previa) => {
        if (!esMejor(marca, previa)) return previa;
        guardarRecordArcadeLocal(marca);
        if (uid && datos.hayFirebase) datos.guardarRecordArcade(uid, marca).catch(() => {});
        return marca;
      });
    },
    [uid]
  );

  const recordArcadeDe = useCallback(async (otro: string) => {
    if (!datos.hayFirebase) return null;
    return datos.leerRecordArcade(otro).catch(() => null);
  }, []);

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

  /**
   * Reinicia la competición desde la jornada siguiente.
   *
   * Desde mañana y no desde hoy a propósito: la jornada de hoy ya está a medio
   * jugar, y arrancarla en hoy le dejaba los puntos de esta mañana a quien ya
   * hubiera jugado. El que no había jugado se veía a cero y los demás no, así
   * que parecía que el reinicio sólo funcionaba para uno. Empezando mañana, la
   * tabla se queda a cero para todos en el mismo instante.
   */
  const reiniciarTorneo = useCallback(
    async (torneoId: string) => {
      if (!uid || !datos.hayFirebase) throw new Error('Hay que entrar con Google');
      await datos.reiniciarTorneo(torneoId, sumarDias(hoy, 1));
    },
    [uid, hoy]
  );

  const decidirDesempate = useCallback(
    async (torneoId: string, mes: string, jugador: string) => {
      if (!uid || !datos.hayFirebase) throw new Error('Hay que entrar con Google');
      await datos.guardarDesempate(torneoId, mes, jugador);
    },
    [uid]
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
    titulo,
    copas,
    copasFiables,
    rangosAvisados,
    marcarRangosAvisados,
    perfilConfigurado: configurado,
    torneos,
    jornadas,
    resumenes,
    cargarResumenes,
    misPartidasPublicadas,
    activo,
    torneoCabecera,
    elegirTorneo,
    penalizadoEn,
    ultimoEn,
    miResultado,
    reglasDe,
    obligacionesHoy,
    blueshellsDe,
    cambiarReglas,
    lanzarBlueshell,
    usarProteccion,
    ultisDe,
    lanzarUlti,
    cambiarPerfil,
    letraGrande,
    cambiarLetraGrande,
    borrarCuenta,
    recordArcade,
    guardarRecordArcade: guardarRecord,
    recordArcadeDe,
    crearTorneo,
    unirsePorCodigo,
    salir,
    reiniciarTorneo,
    decidirDesempate,
    publicar,
  };

  return (
    <Contexto.Provider value={valor}>
      <ProveedorEscala factor={letraGrande ? FACTOR_LETRA_GRANDE : 1}>
        {children}
      </ProveedorEscala>
    </Contexto.Provider>
  );
}

export function useApp(): Estado {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useApp fuera de ProveedorApp');
  return valor;
}
