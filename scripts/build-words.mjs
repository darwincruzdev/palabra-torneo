/**
 * Genera las listas de palabras del juego a partir de:
 *   - scripts/tmp/package/index.json  (diccionario español completo, ~636k palabras)
 *   - scripts/tmp/es_50k.txt          (lista de frecuencia de uso, OpenSubtitles 2018)
 *
 * Salida:
 *   - src/data/allowed.json    palabras de 5 letras aceptadas como intento
 *   - src/data/solutions.json  subconjunto de palabras comunes que pueden salir como solución
 *
 * Normalización: minúsculas, sin tildes ni diéresis, la Ñ se conserva.
 * Ejecutar con: npm run build:words
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

const DICT = path.join(here, 'tmp', 'package', 'index.json');
const FREQ = path.join(here, 'tmp', 'es_50k.txt');
const OUT_DIR = path.join(root, 'src', 'data');

const LONGITUD = 5;
const MAX_SOLUCIONES = 2500;

const ENE = 'ñ';
const MARCA = ''; // marcador temporal para que NFD no descomponga la ñ
const DIACRITICOS = /[̀-ͯ]/g;

/** Quita tildes y diéresis pero mantiene la Ñ. */
function normalizar(palabra) {
  return palabra
    .toLowerCase()
    .split(ENE)
    .join(MARCA)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .split(MARCA)
    .join(ENE);
}

const VALIDA = new RegExp(`^[a-z${ENE}]+$`);
const esValida = (p) => p.length === LONGITUD && VALIDA.test(p);

// Palabras que no queremos que salgan como solución diaria (es un juego familiar).
// Siguen siendo válidas como intento, sólo no se sortean.
const VETADAS = new Set(
  [
    'putas', 'putos', 'zorra', 'culos', 'meada', 'meado', 'meona', 'polla',
    'tetas', 'follo', 'folla', 'folle', 'cagar', 'cagas', 'cagan', 'cague',
    'cagon', 'mames', 'mamon', 'joder', 'jodes', 'joden', 'jodan', 'jodas',
    'matar', 'matas', 'matan', 'droga', 'nazis', 'pipis', 'culon', 'pubis',
    'coger', 'coges', 'pedos', 'cacas', 'orina', 'semen', 'vagos',
  ].map(normalizar)
);

// Se garantiza que estas palabras existan en la lista de aceptadas:
// son las cinco palabras de penalización del líder del torneo.
const OBLIGATORIAS = ['vivir', 'pelee', 'amada', 'cocos', 'tutus'];

function main() {
  if (!fs.existsSync(DICT) || !fs.existsSync(FREQ)) {
    console.error(
      'Faltan los ficheros fuente en scripts/tmp/. Descárgalos con:\n' +
        '  npm pack an-array-of-spanish-words --pack-destination scripts/tmp\n' +
        '  tar -xzf scripts/tmp/an-array-of-spanish-words-*.tgz -C scripts/tmp\n' +
        '  curl -L -o scripts/tmp/es_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt'
    );
    process.exit(1);
  }

  // 1. Diccionario completo -> palabras aceptadas de 5 letras.
  const diccionario = JSON.parse(fs.readFileSync(DICT, 'utf8'));
  const aceptadas = new Set();
  for (const bruta of diccionario) {
    const p = normalizar(bruta);
    if (esValida(p)) aceptadas.add(p);
  }
  for (const p of OBLIGATORIAS) aceptadas.add(p);

  // 2. Lista de frecuencia -> orden de "qué palabra conoce todo el mundo".
  const frecuencia = new Map(); // palabra normalizada -> frecuencia acumulada
  for (const linea of fs.readFileSync(FREQ, 'utf8').split('\n')) {
    const [bruta, cuenta] = linea.trim().split(' ');
    if (!bruta || !cuenta) continue;
    const p = normalizar(bruta);
    if (!esValida(p)) continue;
    frecuencia.set(p, (frecuencia.get(p) ?? 0) + Number(cuenta));
  }

  // 3. Soluciones = palabras comunes que además están en el diccionario.
  const soluciones = [...frecuencia.entries()]
    .filter(([p]) => aceptadas.has(p) && !VETADAS.has(p))
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SOLUCIONES)
    .map(([p]) => p)
    .sort();

  const faltan = OBLIGATORIAS.filter((p) => !aceptadas.has(p));
  if (faltan.length) throw new Error(`No están en aceptadas: ${faltan.join(', ')}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const listaAceptadas = [...aceptadas].sort();
  fs.writeFileSync(path.join(OUT_DIR, 'allowed.json'), JSON.stringify(listaAceptadas));
  fs.writeFileSync(path.join(OUT_DIR, 'solutions.json'), JSON.stringify(soluciones));

  console.log(`aceptadas : ${listaAceptadas.length}`);
  console.log(`soluciones: ${soluciones.length}`);
  console.log(`muestra   : ${soluciones.slice(0, 12).join(', ')}`);
}

main();
