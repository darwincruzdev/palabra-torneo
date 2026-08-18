/**
 * El sistema visual de Palabra Torneo.
 *
 * La referencia es un marcador de estadio: tinta profunda, tipografía
 * condensada en los titulares y las cifras, reglas horizontales marcadas y un
 * cian de LED como acento. La app es competición —jornadas, clasificación,
 * puntos, duelos— y el aspecto lo dice.
 *
 * El verde y el ámbar no son decorativos: son el idioma del juego (la letra
 * está y va en su sitio / está pero no ahí). Por eso el acento de interfaz es
 * cian, que no se confunde con ninguno de los dos.
 */

export const colores = {
  /** Tinta con un punto de azul, no negro plano. */
  fondo: '#0A0D12',
  /** Lo que se levanta del fondo: tarjetas, teclas apagadas. */
  superficie: '#141922',
  /** Un escalón más arriba, para lo que va encima de una superficie. */
  elevado: '#1D2430',
  borde: '#28313F',
  bordeCasilla: '#3A4557',

  texto: '#F2F5F8',
  textoSuave: '#8D9AAC',
  textoTenue: '#5C6879',

  /* El idioma del juego. */
  correcta: '#3DA35D',
  presente: '#E0A215',
  ausente: '#525E6E',

  /* Acento de interfaz: el azul de los marcadores. */
  acento: '#28C8E0',
  acentoApagado: '#12414C',

  tecla: '#3E4A5C',
  teclaUsada: '#1A212B',
  teclaTexto: '#F2F5F8',

  peligro: '#E4523F',
  oro: '#F3C64B',
  plata: '#C6CEDA',
  bronce: '#C98A4B',
} as const;

/**
 * Dos familias con trabajos distintos: la condensada para titulares, cifras y
 * cualquier cosa que deba leerse como un marcador; la normal para el texto
 * corrido, donde la condensada cansaría.
 */
export const fuentes = {
  titular: 'BarlowCondensed_700Bold',
  titularNegro: 'BarlowCondensed_800ExtraBold',
  cuerpo: 'Barlow_400Regular',
  cuerpoFuerte: 'Barlow_600SemiBold',
  /** Las letras del tablero y del teclado, que piden peso. */
  ficha: 'Barlow_800ExtraBold',
} as const;

/** Escala de tamaños. Saltos grandes: un marcador no susurra. */
export const texto = {
  micro: 11,
  pequeno: 13,
  normal: 15,
  medio: 17,
  grande: 22,
  titulo: 30,
  cifra: 44,
  cifraGrande: 68,
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 32,
} as const;

/** Radios con jerarquía: lo pequeño casi recto, lo grande redondeado. */
export const radio = {
  sm: 4,
  md: 10,
  lg: 18,
  pastilla: 999,
} as const;

/**
 * Titulares de sección: condensados, en mayúsculas y espaciados. Es el gesto
 * que más marca el estilo de marcador, y sale en todas las pantallas.
 */
export const rotulo = {
  fontFamily: fuentes.titular,
  fontSize: texto.pequeno,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  color: colores.textoSuave,
} as const;
