import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';

/** Máximo que se espera a las fuentes antes de tirar con la letra del sistema. */
const ESPERA_MAXIMA_MS = 3000;

/**
 * Carga las dos familias del sistema visual.
 *
 * Van empaquetadas con la app en vez de tirar de la letra del sistema: es lo
 * que más separa el aspecto de "aplicación por defecto", y además hace que se
 * vea igual en Android que en el navegador, que con la del sistema no pasaba.
 *
 * Devuelve true cuando se puede dibujar, que no es lo mismo que "han cargado":
 * si fallan o tardan demasiado también devuelve true, y la app sale con la letra
 * del sistema. Un problema de tipografía es un problema de estética; dejar la
 * pantalla en negro para siempre es un problema de que la app no funciona. Ya
 * pasó una vez en producción, con las fuentes sin subir al servidor.
 */
export function useTipografia(): boolean {
  const [listas, error] = useFonts({
    Barlow_400Regular,
    Barlow_600SemiBold,
    Barlow_800ExtraBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  const [seAcaboLaEspera, setSeAcaboLaEspera] = useState(false);

  useEffect(() => {
    if (listas) return;
    const reloj = setTimeout(() => setSeAcaboLaEspera(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(reloj);
  }, [listas]);

  if (error) console.warn('No se pudieron cargar las fuentes:', error);

  return listas || !!error || seAcaboLaEspera;
}
