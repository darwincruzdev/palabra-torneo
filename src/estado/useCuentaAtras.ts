import { useEffect, useState } from 'react';
import { msHastaProximaJornada } from '../game/fecha';

/**
 * Lo que falta para que entre la palabra de mañana, en texto.
 *
 * Se actualiza cada medio minuto: al terminar la partida lo primero que se
 * pregunta uno es cuánto queda para la siguiente, y tener que calcularlo
 * mirando el reloj es incómodo.
 */
export function useCuentaAtras(): string {
  const [texto, setTexto] = useState(() => formatear(msHastaProximaJornada()));

  useEffect(() => {
    const tic = setInterval(() => setTexto(formatear(msHastaProximaJornada())), 30_000);
    return () => clearInterval(tic);
  }, []);

  return texto;
}

function formatear(ms: number): string {
  const minutosTotales = Math.max(0, Math.floor(ms / 60_000));
  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  if (horas === 0 && minutos === 0) return 'en menos de un minuto';
  if (horas === 0) return `en ${minutos} min`;
  if (minutos === 0) return `en ${horas} h`;
  return `en ${horas} h ${minutos} min`;
}
