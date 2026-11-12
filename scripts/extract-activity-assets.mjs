import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const source = "public/assets/community-activities.png";
const output = "public/assets/activities";
const names = ["panen", "pemilahan", "pelatihan", "sosialisasi", "kasgot", "kunjungan"];

await mkdir(output, { recursive: true });

for (let index = 0; index < names.length; index += 1) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  const top = row === 2 ? 682 : row * 341;
  const height = row === 2 ? 342 : 341;

  await sharp(source)
    .extract({ left: column * 768, top, width: 768, height })
    .resize(1200, 675, { fit: "cover", position: "attention" })
    .webp({ quality: 88 })
    .toFile(`${output}/${names[index]}.webp`);
}

console.log(`Generated ${names.length} activity images in ${output}`);
