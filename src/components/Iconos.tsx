import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { color: string; tamano?: number };

/** Casa de la pestaña Inicio. */
export function IconoCasa({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Trofeo de la pestaña Tabla. */
export function IconoTrofeo({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 4h8v2.2a4 4 0 0 1-8 0V4Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M8 6H5.5A2.5 2.5 0 0 0 8 10.2M16 6h2.5A2.5 2.5 0 0 1 16 10.2M12 12.2V16M9 20h6M10 16h4v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Calendario de la pestaña Jornadas. */
export function IconoCalendario({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5" width="16" height="15" rx="2" stroke={color} strokeWidth={1.8} />
      <Path d="M4 10h16M8 3.5V7M16 3.5V7" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Persona de la pestaña Perfil. */
export function IconoPersona({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth={1.8} />
      <Path
        d="M5.5 19.2c1.2-2.8 3.5-4.2 6.5-4.2s5.3 1.4 6.5 4.2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Compartir, para abrir la hoja de invitación. */
export function IconoCompartir({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="7" cy="12" r="2.2" stroke={color} strokeWidth={1.8} />
      <Circle cx="17" cy="7" r="2.2" stroke={color} strokeWidth={1.8} />
      <Circle cx="17" cy="17" r="2.2" stroke={color} strokeWidth={1.8} />
      <Path d="m9 11 6-3M9 13l6 3" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Ajustes del torneo. */
export function IconoEngranaje({ color, tamano = 22 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
      <Path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Lápiz del perfil. */
export function IconoLapiz({ color, tamano = 20 }: Props) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 5.5 18.5 10 8 20.5H3.5V16L14 5.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Las cuatro fichas del botón JUGAR.
 *
 * Es el mismo motivo del icono, reducido a un cuadrado verde.
 */
export function IconoJugar({ tamano = 28 }: { tamano?: number }) {
  const claro = '#F4F7F2';
  const medio = '#D7E8CF';
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 28 28" fill="none">
      <Rect x="3" y="3" width="9" height="9" rx="2" fill={claro} />
      <Rect x="16" y="3" width="9" height="9" rx="2" fill={medio} />
      <Rect x="3" y="16" width="9" height="9" rx="2" fill={medio} />
      <Rect x="16" y="16" width="9" height="9" rx="2" fill={claro} />
    </Svg>
  );
}
