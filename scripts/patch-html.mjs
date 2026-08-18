/**
 * Retoca el index.html que genera Expo para impedir que el navegador traduzca
 * la página.
 *
 * El juego está lleno de letras sueltas: las casillas del tablero y las teclas.
 * El traductor de Chrome las toma por palabras y las sustituye — una "A" se
 * convierte en "AMETRO", una "N" en "NORTE" — y el juego queda inservible.
 * Encima Expo declara la página como inglesa (`lang="en"`) aunque el contenido
 * esté en español, que es justo lo que dispara la traducción automática.
 *
 * Se ejecuta al final de `npm run build:web`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(here, '..', 'dist', 'index.html');

const META = '<meta name="google" content="notranslate" />';

function main() {
  if (!fs.existsSync(destino)) {
    console.error('No encuentro dist/index.html. ¿Se ha ejecutado antes expo export?');
    process.exit(1);
  }

  let html = fs.readFileSync(destino, 'utf8');
  const original = html;

  // 1. El idioma real, y la petición explícita de no traducir.
  html = html.replace(/<html[^>]*>/i, '<html lang="es" translate="no">');

  // 2. La marca que respeta el traductor de Google.
  if (!html.includes('content="notranslate"')) {
    html = html.replace(/<head>/i, `<head>\n    ${META}`);
  }

  // 3. Cinturón y tirantes: la clase que también reconoce el traductor.
  html = html.replace(/<body([^>]*)>/i, (todo, atributos) =>
    atributos.includes('notranslate')
      ? todo
      : `<body${atributos} class="notranslate">`
  );

  if (html === original) {
    console.log('index.html ya estaba parcheado.');
    return;
  }

  fs.writeFileSync(destino, html);
  console.log('index.html parcheado: lang="es", translate="no", notranslate.');
}

main();
