import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "public/assets/logos");
const sourceDir = path.join(root, "assets-source/logos");

const logos = [
  { name: "garda-hijau", source: path.join(sourceDir, "garda-hijau.png") },
  { name: "whatsapp", source: path.join(sourceDir, "whatsapp.png") },
  { name: "bem-unikom", source: path.join(sourceDir, "bem-unikom.png") },
  { name: "unikom", source: path.join(sourceDir, "unikom.png") },
  { name: "diktisaintek", source: path.join(sourceDir, "diktisaintek.png") },
  { name: "smart-maggot", source: path.join(sourceDir, "smart-maggot.png") },
  { name: "kelurahan-mengger", source: path.join(sourceDir, "kelurahan-mengger.png"), removeWhite: true },
  { name: "dlh-kota-bandung", source: path.join(sourceDir, "dlh-kota-bandung.png"), removeWhite: true },
];

function removeEdgeWhite(data, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];
  const isBackground = (index) => {
    const offset = index * 4;
    return data[offset] >= 238 && data[offset + 1] >= 238 && data[offset + 2] >= 238;
  };
  const add = (x, y) => {
    const index = y * width + x;
    if (!visited[index] && isBackground(index)) {
      visited[index] = 1;
      queue.push(index);
    }
  };

  for (let x = 0; x < width; x += 1) {
    add(x, 0);
    add(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    add(0, y);
    add(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) add(x - 1, y);
    if (x + 1 < width) add(x + 1, y);
    if (y > 0) add(x, y - 1);
    if (y + 1 < height) add(x, y + 1);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }
}

await fs.mkdir(outputDir, { recursive: true });

for (const logo of logos) {
  let image = sharp(logo.source).ensureAlpha();
  if (logo.removeWhite) {
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    removeEdgeWhite(data, info.width, info.height);
    image = sharp(data, { raw: info });
  }

  await image
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 56, right: 56, bottom: 56, left: 56, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(outputDir, `${logo.name}.png`));
}

console.log(`Prepared ${logos.length} transparent 512x512 logo assets.`);
