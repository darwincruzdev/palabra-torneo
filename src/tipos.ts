import type { Marca } from './game/evaluar';
import type { Avatar } from './game/avatares';

export type { Marca, Avatar };

/** Cómo se ve un jugador para los demás: nombre y avatar. */
export type Perfil = {
  uid: string;
  nombre: string;
  avatar: Avatar;
};

/** Resultado de un jugador en una jornada de un torneo. */
export type ResultadoDia = {
  uid: string;
  nombre: string;
  avatar: Avatar;
  /** Intentos usados (1..6). Si no acertó, 6. */
  intentos: number;
  acertada: boolean;
  puntos: number;
  /** Cuadrícula de emojis, para enseñarla sin destripar la palabra. */
  patron: string;
};

/**
 * Una blueshell lanzada. Quién la tira va en la clave del mapa que la contiene.
 *
 * Vive en el documento de la jornada a la que golpea, no en la del día en que
 * se lanzó: así quien la recibe la encuentra donde va a jugar, sin tener que
 * rebuscar en la jornada anterior.
 */
export type Blueshell = {
  /** A quién se le tira. Sólo puede ser quien vaya primero. */
  objetivo: string;
  /** La palabra que se le obliga a poner, ya normalizada. */
  palabra: string;
  /** Día en que se disparó, que es el que decide de qué ciclo se descuenta. */
  lanzada: string;
};

/** Documento torneos/{id}/dias/{fecha} */
export type DiaTorneo = {
  fecha: string;
  resultados: Record<string, ResultadoDia>;
  /** uid del que dispara -> lo que disparó. Una por persona y jornada. */
  blueshells?: Record<string, Blueshell>;
  /** uid -> gastó aquí su protección, que anula todas las de esa jornada. */
  protecciones?: Record<string, true>;
};

/**
 * Las normas de la casa. Cada torneo enciende las que quiera: no todos los
 * grupos juegan con penalización al líder ni con blueshells.
 */
export type ReglasTorneo = {
  /** El líder en solitario abre la jornada con una de las cinco palabras. */
  penalizacionLider: boolean;
  /** Se puede disparar al primero para imponerle una palabra. */
  blueshells: boolean;
  /** Saltarse una jornada cerrada resta un punto. */
  faltaPorNoJugar: boolean;
  /**
   * Qué pasa cuando un mes acaba en empate absoluto.
   *
   * Apagado, el trofeo se comparte. Encendido, el mes queda pendiente hasta que
   * el fundador diga quién lo gana: sirve para resolverlo como quieran —un
   * duelo, a suertes— sin que la app tenga que opinar.
   */
  desempateManual: boolean;
  /**
   * Prohíbe abrir la jornada con una palabra de cuatro vocales.
   *
   * Sólo afecta al primer intento: del segundo en adelante valen todas, entre
   * otras cosas porque alguna de ellas puede ser la solución del día.
   */
  sinVocalesAlAbrir: boolean;
  /**
   * A quien va último en solitario se le chiva una letra de la palabra.
   *
   * Es una mano al que se está descolgando, no un premio: en cuanto deja de ir
   * último solo, se le acaba.
   */
  ayudaAlUltimo: boolean;
};

/**
 * Una palabra impuesta en un intento concreto de la jornada.
 *
 * Es el único lenguaje que entiende el tablero: no sabe si viene de ir primero
 * o de que le hayan disparado, sólo que en el intento N sólo valen estas
 * palabras.
 */
export type Obligacion = {
  /** Intento al que se aplica. 0 es el primero. */
  indice: number;
  /** Palabras admitidas. La penalización acepta cinco; una blueshell, una. */
  palabras: string[];
  motivo: 'lider' | 'blueshell';
  /** Quién la impuso, para poder decir de quién es la bala. */
  autor?: string;
};

/**
 * Documento torneos/{id}. Sólo lo pueden leer sus miembros: contiene la
 * semilla, y quien la tenga puede calcular la palabra de cualquier día.
 */
export type Torneo = {
  id: string;
  nombre: string;
  /** Código de invitación de 6 caracteres. */
  codigo: string;
  /** Determina qué palabra le toca a este torneo cada día. */
  semilla: string;
  propietario: string;
  miembros: string[];
  /** uid -> cómo se ve ese jugador dentro de este torneo. */
  perfiles: Record<string, { nombre: string; avatar: Avatar }>;
  /**
   * Las normas de la casa. Opcional: los torneos creados antes de que
   * existieran no lo traen y se quedan con las de siempre.
   */
  reglas?: ReglasTorneo;
  /**
   * mes -> quién ganó el desempate, cuando el torneo lo resuelve a mano.
   *
   * Sólo se hace caso si ese uid está entre los que empataron de verdad. No es
   * una puerta para repartir trofeos a dedo: sólo para elegir entre iguales.
   */
  desempates?: Record<string, string>;
  /** Las jornadas anteriores a esta fecha no puntúan. */
  fechaInicio: string;
  creado: number;
};

/**
 * Documento codigos/{codigo}. Lo puede leer cualquiera con sesión, porque hace
 * falta para resolver una invitación. Por eso aquí no va la semilla.
 */
export type Invitacion = {
  codigo: string;
  torneoId: string;
  nombre: string;
};

/**
 * Cómo quedó un mes ya cerrado.
 *
 * Es lo que sustituye al día a día de los meses pasados: un mes terminado no va
 * a cambiar nunca, así que no tiene sentido arrastrar sus treinta documentos en
 * la memoria de cada móvil sólo para volver a sumar lo mismo.
 */
export type ResumenMes = {
  mes: string;
  /** La tabla final de ese mes, ya ordenada. */
  filas: FilaClasificacion[];
  /**
   * Quién se llevó el trofeo. Si el mes quedó pendiente de desempate, son los
   * que empataron, y `pendiente` lo distingue.
   */
  ganadores: string[];
  pendiente?: boolean;
  /** Jornadas que llegaron a jugarse, para poder decirlo. */
  jornadas: number;
};

export type FilaClasificacion = {
  uid: string;
  nombre: string;
  avatar: Avatar;
  puntos: number;
  jugadas: number;
  /** Jornadas cerradas que se saltó, desde la primera que jugó. */
  faltas: number;
  aciertos: number;
  intentosTotales: number;
  mediaIntentos: number | null;
};

/**
 * Partida guardada en el móvil. Hay una por torneo y día: cada torneo tiene su
 * propia palabra, así que se juega una partida en cada uno.
 */
export type PartidaLocal = {
  /** Id del torneo, o 'libre' cuando se juega sin competir. */
  torneoId: string;
  fecha: string;
  intentos: string[];
  estado: 'jugando' | 'ganada' | 'perdida';
  /** Si estaba obligado a abrir con una de las palabras de penalización. */
  penalizado: boolean;
  /**
   * Las palabras impuestas de la jornada, congeladas al empezar.
   *
   * Se guardan en la partida y no se recalculan en cada dibujado a propósito:
   * si alguien dispara con la partida ya empezada, la obligación no puede
   * aparecer de golpe a mitad de camino.
   */
  obligaciones?: Obligacion[];
  /**
   * Si esta partida se juega con la norma de no abrir con cuatro vocales.
   *
   * Se congela al empezar, igual que las palabras impuestas: cambiar la norma a
   * media partida no puede invalidar un intento ya escrito.
   */
  sinVocalesAlAbrir?: boolean;
  /** La letra que se le chiva por ir último, si le toca ayuda. */
  pista?: string | null;
  /** Si ya se envió el resultado al torneo. */
  enviado: boolean;
};

/* ------------------------------------------------------------------ duelos */

/** Cómo se ve un jugador dentro de un duelo. */
export type JugadorDuelo = {
  uid: string;
  nombre: string;
  avatar: Avatar;
};

/** Lo que va haciendo un jugador, sin letras: sólo colores y puntos. */
export type ProgresoDuelo = {
  /**
   * Una entrada por palabra. Cada intento son cinco caracteres de código
   * (c/p/a), concatenados. Nunca viajan las letras del rival.
   */
  rejilla: string[];
  /**
   * Qué palabras ha cerrado, por acierto, por agotar los seis intentos o por
   * quedarse sin los treinta segundos. Se guarda aparte de la rejilla porque una
   * palabra cortada por tiempo no se distingue de una a medias.
   */
  cerradas: boolean[];
  /**
   * Las palabras escritas, una entrada por palabra del duelo, con los intentos
   * pegados uno detrás de otro ("saltocrean" son dos intentos).
   *
   * Va en una sola cadena y no en una lista de listas porque Firestore no
   * admite arrays anidados. Como todas las palabras miden cinco letras, se
   * trocea sin ambigüedad.
   *
   * Sólo se enseñan a quien ya ha cerrado esa palabra, en la pantalla de espera:
   * ver cómo se pelea el otro es media gracia del duelo, y a esas alturas ya no
   * le destripa nada a quien mira.
   */
  letras: string[];
  puntos: number;
};

/**
 * Documento duelos/{id}.
 *
 * Sólo lo leen los dos participantes: lleva la semilla, y con ella se pueden
 * calcular las diez palabras.
 */
export type Duelo = {
  id: string;
  codigo: string;
  semilla: string;
  creado: number;
  estado: 'esperando' | 'jugando' | 'terminado';
  retador: JugadorDuelo;
  rival: JugadorDuelo | null;
  /**
   * Duelo de cola: cualquiera puede entrar sin código.
   *
   * Es lo que convierte el propio documento del duelo en la sala de espera, sin
   * necesidad de una colección aparte: quien busca rival lista los que están
   * abiertos y sin rival, y se mete en el más antiguo.
   */
  abierto?: boolean;
  /** Id del duelo de revancha, cuando alguno de los dos la propone. */
  revancha?: string;
  /** Para las reglas de seguridad: quién puede leer y escribir. */
  jugadores: string[];
  progreso: Record<string, ProgresoDuelo>;
  /** uid -> la última carita que ha tirado. No afecta al resultado. */
  pullas?: Record<string, Pullazo>;
};

/**
 * La última pulla que ha tirado un jugador.
 *
 * `en` es la hora del móvil de quien la envía, y sólo sirve para distinguir una
 * pulla de la siguiente: mandar dos veces la misma carita tiene que notarse. No
 * se compara con el reloj de quien la recibe, que puede ir descuadrado.
 */
export type Pullazo = {
  emoji: string;
  en: number;
};

/** Documento codigosDuelo/{codigo}: resuelve una invitación sin dar la semilla. */
export type InvitacionDuelo = {
  codigo: string;
  dueloId: string;
  retador: string;
};

/** Torneo en el que se está jugando ahora mismo. */
export type TorneoActivo =
  | { tipo: 'libre'; id: 'libre'; nombre: string; semilla: undefined }
  | { tipo: 'torneo'; id: string; nombre: string; semilla: string; torneo: Torneo };
