import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { normalizar } from '../game/normalizar';

const LETRA = /^[a-zñ]$/;
const DESTELLO_MS = 130;

type Acciones = {
  escribir: (letra: string) => void;
  borrar: () => void;
  enviar: () => void;
  activo: boolean;
};

/**
 * Escribir con el teclado del ordenador en la versión web.
 *
 * Sin esto hay que ir haciendo clic tecla por tecla, que es lo más incómodo de
 * jugar desde un portátil. Se acepta lo que uno espera: letras, Ñ, Enter para
 * enviar y Retroceso para borrar. Las tildes se quitan al vuelo, así que
 * escribir "acción" mete las letras sin acento igual que el teclado de pantalla.
 *
 * Devuelve la última tecla pulsada para poder iluminarla en pantalla: si no,
 * escribiendo rápido no se ve si la pulsación ha entrado.
 */
export function useTecladoFisico({ escribir, borrar, enviar, activo }: Acciones) {
  const [teclaPulsada, setTeclaPulsada] = useState<string | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Las acciones cambian en cada render; con una referencia evitamos montar y
  // desmontar el escuchador constantemente.
  const acciones = useRef({ escribir, borrar, enviar, activo });
  acciones.current = { escribir, borrar, enviar, activo };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    function destellar(tecla: string) {
      setTeclaPulsada(tecla);
      if (reloj.current) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => setTeclaPulsada(null), DESTELLO_MS);
    }

    function alPulsar(evento: KeyboardEvent) {
      const { escribir, borrar, enviar, activo } = acciones.current;
      if (!activo) return;
      // Atajos del navegador (copiar, recargar...) se dejan en paz.
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;

      if (evento.key === 'Enter') {
        evento.preventDefault();
        destellar('ENTER');
        enviar();
        return;
      }
      if (evento.key === 'Backspace') {
        evento.preventDefault();
        destellar('BORRAR');
        borrar();
        return;
      }

      const letra = normalizar(evento.key);
      if (letra.length === 1 && LETRA.test(letra)) {
        evento.preventDefault();
        destellar(letra);
        escribir(letra);
      }
    }

    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      if (reloj.current) clearTimeout(reloj.current);
    };
  }, []);

  return teclaPulsada;
}
