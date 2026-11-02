import { mkdir } from "node:fs/promises";

import sharp from "sharp";

const source = "docs/brand/app-icon.svg";

const outputs = [
  { size: 192, file: "public/icons/icon-192.png" },
  { size: 512, file: "public/icons/icon-512.png" },
  { size: 1024, file: "public/icons/icon-1024.png" },
];

await mkdir("public/icons", { recursive: true });

for (const { size, file } of outputs) {
  await sharp(source, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`${file} ${size}x${size}`);
}
