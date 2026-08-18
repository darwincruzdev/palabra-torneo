/**
 * Genera los iconos de la app a partir de SVG dibujado aquí mismo, para poder
 * rehacerlos sin abrir ningún editor.
 *
 * La marca son las fichas del juego apiladas como un podio: dos columnas
 * ámbar y verde y una suelta, que es lo que es la app — palabras y torneo.
 * Se dibuja con rectángulos, sin texto, para no depender de las fuentes que
 * tenga instalado el sistema.
 *
 * Colores tomados de src/tema.ts.
 *
 * Uso: npm run build:icons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(here, '..', 'assets');

const COLOR = {
  fondo: '#0f1115',
  verde: '#3aa757',
  ambar: '#e2a303',
  pizarra: '#4e5a6b',
  blanco: '#ffffff',
};

const LIENZO = 1024;

const FICHA = 138;
const HUECO_V = 13; // entre fichas de una misma columna
const HUECO_H = 24; // entre columnas
const RADIO = 22;

/**
 * Columnas del podio: 2.º, 1.º y 3.er puesto. El escalón central es el más
 * alto, como en un podio de verdad.
 */
const COLUMNAS = [
  { fichas: 2, color: COLOR.ambar },
  { fichas: 3, color: COLOR.verde },
  { fichas: 1, color: COLOR.pizarra },
];

/** Las fichas en coordenadas propias, con el suelo del podio en y=0. */
function piezas() {
  const lista = [];
  COLUMNAS.forEach((columna, i) => {
    const x = i * (FICHA + HUECO_H);
    for (let n = 0; n < columna.fichas; n++) {
      const y = -(n + 1) * FICHA - n * HUECO_V;
      lista.push({ x, y, color: columna.color });
    }
  });
  return lista;
}

function caja(lista) {
  const xs = lista.flatMap((p) => [p.x, p.x + FICHA]);
  const ys = lista.flatMap((p) => [p.y, p.y + FICHA]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, ancho: maxX - minX, alto: maxY - minY };
}

const LISTA = piezas();
const CAJA = caja(LISTA);
const CENTRO = {
  x: CAJA.minX + CAJA.ancho / 2,
  y: CAJA.minY + CAJA.alto / 2,
};

/**
 * Radio del círculo que envuelve la marca, medido esquina a esquina desde su
 * centro. Es lo que hay que meter dentro de la zona segura de Android, y sale
 * más ajustado que usar la diagonal de la caja porque el podio deja dos
 * esquinas vacías.
 */
function radioMarca() {
  let maximo = 0;
  for (const p of LISTA) {
    for (const [ex, ey] of [
      [p.x, p.y],
      [p.x + FICHA, p.y],
      [p.x, p.y + FICHA],
      [p.x + FICHA, p.y + FICHA],
    ]) {
      maximo = Math.max(maximo, Math.hypot(ex - CENTRO.x, ey - CENTRO.y));
    }
  }
  return maximo;
}

const RADIO_MARCA = radioMarca();

/**
 * @param escala factor sobre el tamaño natural de la marca
 * @param fondo  color de fondo, o null para dejarlo transparente
 * @param color  fuerza un color único en todas las fichas (versión monocroma)
 */
function svg({ escala = 1, fondo = null, color = null } = {}) {
  const cuerpo = LISTA.map(
    (p) =>
      `<rect x="${p.x}" y="${p.y}" width="${FICHA}" height="${FICHA}" ` +
      `rx="${RADIO}" fill="${color ?? p.color}" />`
  ).join('\n      ');

  const mitad = LIENZO / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LIENZO}" height="${LIENZO}" viewBox="0 0 ${LIENZO} ${LIENZO}">
  ${fondo ? `<rect width="${LIENZO}" height="${LIENZO}" fill="${fondo}" />` : ''}
  <g transform="translate(${mitad} ${mitad}) scale(${escala.toFixed(4)}) translate(${-CENTRO.x} ${-CENTRO.y})">
      ${cuerpo}
  </g>
</svg>`;
}

/** Escala para que la marca ocupe una fracción del ancho del lienzo. */
function escalaPorAncho(fraccion) {
  return (LIENZO * fraccion) / CAJA.ancho;
}

/**
 * Escala para que la marca quepa en el círculo visible de un icono adaptativo.
 * Android dibuja 108dp de lienzo y sólo enseña los 72dp centrales, y el
 * recorte es circular, así que lo que manda es el radio, no la caja.
 */
function escalaZonaSegura(margen = 0.98) {
  const radioSeguro = (LIENZO * (72 / 108)) / 2;
  return (radioSeguro * margen) / RADIO_MARCA;
}

async function escribir(nombre, contenido, lado = LIENZO) {
  const destino = path.join(ASSETS, nombre);
  await sharp(Buffer.from(contenido)).resize(lado, lado).png().toFile(destino);
  const { size } = fs.statSync(destino);
  console.log(`  ${nombre.padEnd(30)} ${lado}x${lado}\t${(size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log(`marca ${CAJA.ancho}x${CAJA.alto}, radio ${RADIO_MARCA.toFixed(0)}`);

  // Icono normal: lleva el fondo dentro. iOS y la web le aplican su máscara.
  await escribir('icon.png', svg({ escala: escalaPorAncho(0.66), fondo: COLOR.fondo }));

  // Icono adaptativo de Android, en dos capas.
  await escribir('android-icon-background.png', svg({ fondo: COLOR.fondo, escala: 0 }));
  await escribir('android-icon-foreground.png', svg({ escala: escalaZonaSegura() }));

  // Monocromo para los temas dinámicos de Android 13+: el sistema lo recolorea,
  // así que sólo cuenta la silueta.
  await escribir(
    'android-icon-monochrome.png',
    svg({ escala: escalaZonaSegura(), color: COLOR.blanco })
  );

  // Splash: sin fondo, que lo pone app.json.
  await escribir('splash-icon.png', svg({ escala: escalaPorAncho(0.5) }));

  await escribir('favicon.png', svg({ escala: escalaPorAncho(0.72), fondo: COLOR.fondo }), 196);

  console.log('Listo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
