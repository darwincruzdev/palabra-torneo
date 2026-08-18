/**
 * Añade palabras a mano a las listas del juego.
 *
 *   node scripts/add-word.mjs cacao mecha        -> aceptadas al escribir
 *   node scripts/add-word.mjs --solucion cacao   -> además puede salir del día
 *
 * Por qué existe: `npm run build:words` regenera las listas desde el
 * diccionario grande y se lleva por delante cualquier retoque a mano. Esto
 * escribe sobre el resultado, así que si vuelves a lanzar el generador tendrás
 * que pasar otra vez por aquí.
 *
 * Lo de --solucion SUSTITUYE en vez de añadir, y no es un capricho: la palabra
 * de cada día sale de (inicio + día * paso) % total, y tanto `inicio` como
 * `paso` se derivan del total. Añadir una palabra cambia el total, y con él el
 * calendario entero de todos los torneos a mitad de competición. Sustituyendo,
 * el total no se mueve y sólo cambia la palabra de un hueco.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(here, '..', 'src', 'data');
const ACEPTADAS = path.join(DATOS, 'allowed.json');
const SOLUCIONES = path.join(DATOS, 'solutions.json');

const LONGITUD = 5;
const ENE = 'ñ';
const MARCA = ''; // marcador temporal para que NFD no descomponga la ñ
const DIACRITICOS = /[̀-ͯ]/g;

/** Minúsculas y sin tildes, conservando la Ñ. Igual que hace el juego. */
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

const VALIDA = new RegExp(`^[a-z${ENE}]{${LONGITUD}}$`);

const leer = (ruta) => JSON.parse(fs.readFileSync(ruta, 'utf8'));
const escribir = (ruta, lista) =>
  fs.writeFileSync(ruta, `${JSON.stringify(lista, null, 0)}\n`, 'utf8');

const argumentos = process.argv.slice(2);
const comoSolucion = argumentos.includes('--solucion');
const palabras = argumentos.filter((a) => !a.startsWith('--')).map(normalizar);

if (palabras.length === 0) {
  console.error('Uso: node scripts/add-word.mjs [--solucion] palabra [palabra...]');
  process.exit(1);
}

const invalidas = palabras.filter((p) => !VALIDA.test(p));
if (invalidas.length > 0) {
  console.error(
    `Estas no valen (hacen falta ${LONGITUD} letras, sin números ni signos): ${invalidas.join(', ')}`
  );
  process.exit(1);
}

const aceptadas = leer(ACEPTADAS);
const soluciones = leer(SOLUCIONES);
const yaAceptadas = new Set(aceptadas);
const yaSoluciones = new Set(soluciones);

for (const palabra of palabras) {
  if (yaAceptadas.has(palabra)) {
    console.log(`· ${palabra} ya se podía escribir`);
  } else {
    aceptadas.push(palabra);
    yaAceptadas.add(palabra);
    console.log(`+ ${palabra} ya se puede escribir`);
  }

  if (!comoSolucion) continue;

  if (yaSoluciones.has(palabra)) {
    console.log(`· ${palabra} ya podía salir como palabra del día`);
    continue;
  }

  // Se sustituye un hueco al azar para no mover el total. Cambia la palabra de
  // un día concreto en cada torneo, pero el calendario no se descoloca.
  const hueco = Math.floor(Math.random() * soluciones.length);
  const sustituida = soluciones[hueco];
  soluciones[hueco] = palabra;
  yaSoluciones.delete(sustituida);
  yaSoluciones.add(palabra);
  console.log(`+ ${palabra} puede salir como palabra del día, en lugar de ${sustituida}`);
}

aceptadas.sort();
escribir(ACEPTADAS, aceptadas);
if (comoSolucion) escribir(SOLUCIONES, soluciones);

console.log(
  `\nAceptadas: ${aceptadas.length} · Soluciones: ${soluciones.length} (el total no debe cambiar)`
);
console.log('Ahora: npm test, y luego npm run deploy:firebase');
