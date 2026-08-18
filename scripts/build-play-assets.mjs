/**
 * Genera los gráficos que pide la ficha de Google Play:
 *   - play/icono-512.png        icono de la ficha, 512x512 sin transparencia
 *   - play/cabecera-1024x500.png  gráfico de cabecera
 *
 * Las capturas de pantalla no se generan aquí: se hacen con la app corriendo.
 * Mira docs/google-play.md.
 *
 * Uso: npm run build:play
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(here, '..', 'play');

const COLOR = {
  fondo: '#0f1115',
  verde: '#3aa757',
  ambar: '#e2a303',
  pizarra: '#4e5a6b',
  texto: '#ffffff',
  suave: '#9aa3ad',
};

const FICHA = 138;
const HUECO_V = 13;
const HUECO_H = 24;
const RADIO = 22;

const COLUMNAS = [
  { fichas: 2, color: COLOR.ambar },
  { fichas: 3, color: COLOR.verde },
  { fichas: 1, color: COLOR.pizarra },
];

function piezas() {
  const lista = [];
  COLUMNAS.forEach((columna, i) => {
    const x = i * (FICHA + HUECO_H);
    for (let n = 0; n < columna.fichas; n++) {
      lista.push({
        x,
        y: -(n + 1) * FICHA - n * HUECO_V,
        color: columna.color,
      });
    }
  });
  return lista;
}

const LISTA = piezas();
const ANCHO_MARCA = COLUMNAS.length * FICHA + (COLUMNAS.length - 1) * HUECO_H;
const ALTO_MARCA = 3 * FICHA + 2 * HUECO_V;

/** La marca dibujada con su esquina superior izquierda en (x, y). */
function marca(x, y, alto) {
  const escala = alto / ALTO_MARCA;
  const cuerpo = LISTA.map(
    (p) =>
      `<rect x="${p.x}" y="${p.y}" width="${FICHA}" height="${FICHA}" ` +
      `rx="${RADIO}" fill="${p.color}" />`
  ).join('');
  // El grupo tiene el suelo del podio en y=0, de ahí el desplazamiento.
  return `<g transform="translate(${x} ${y + alto}) scale(${escala.toFixed(4)})">${cuerpo}</g>`;
}

// Comillas simples: el valor va dentro de un atributo XML entrecomillado.
const TIPOGRAFIA = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

async function iconoFicha() {
  const lado = 512;
  const alto = Math.round(lado * 0.5);
  const x = Math.round((lado - (ANCHO_MARCA * alto) / ALTO_MARCA) / 2);
  const y = Math.round((lado - alto) / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">
  <rect width="${lado}" height="${lado}" fill="${COLOR.fondo}"/>
  ${marca(x, y, alto)}
</svg>`;

  const destino = path.join(SALIDA, 'icono-512.png');
  // Play pide el icono sin canal alfa util; lo aplanamos sobre el fondo.
  await sharp(Buffer.from(svg)).flatten({ background: COLOR.fondo }).png().toFile(destino);
  return destino;
}

async function cabecera() {
  const ancho = 1024;
  const alto = 500;
  const altoMarca = 300;
  const xMarca = 96;
  const yMarca = Math.round((alto - altoMarca) / 2);
  const xTexto = xMarca + Math.round((ANCHO_MARCA * altoMarca) / ALTO_MARCA) + 64;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}">
  <rect width="${ancho}" height="${alto}" fill="${COLOR.fondo}"/>
  ${marca(xMarca, yMarca, altoMarca)}
  <text x="${xTexto}" y="222" font-family="${TIPOGRAFIA}" font-size="72" font-weight="800" letter-spacing="1" fill="${COLOR.texto}">PALABRA</text>
  <text x="${xTexto}" y="300" font-family="${TIPOGRAFIA}" font-size="72" font-weight="800" letter-spacing="1" fill="${COLOR.verde}">TORNEO</text>
  <text x="${xTexto}" y="348" font-family="${TIPOGRAFIA}" font-size="24" fill="${COLOR.suave}">Una palabra al día, un torneo con los tuyos.</text>
</svg>`;

  const destino = path.join(SALIDA, 'cabecera-1024x500.png');
  await sharp(Buffer.from(svg)).flatten({ background: COLOR.fondo }).png().toFile(destino);
  return destino;
}

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  for (const destino of [await iconoFicha(), await cabecera()]) {
    const { size } = fs.statSync(destino);
    const meta = await sharp(destino).metadata();
    console.log(
      `  ${path.basename(destino).padEnd(26)} ${meta.width}x${meta.height}\t${(size / 1024).toFixed(1)} KB`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
