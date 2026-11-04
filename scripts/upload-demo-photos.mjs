/**
 * Fotos demo SOLO para el entorno local.
 *
 * - Lee `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de `.env.local`
 *   (nunca imprime la key).
 * - No se ejecuta en CI ni en producción.
 * - Es idempotente: mismas rutas y `upsert`.
 * - `--dry-run` valida los archivos y muestra el plan sin subir ni escribir.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const LOCAL_ESTABLISHMENTS = {
  "10000000-0000-4000-8000-000000000001": "local-comedor.webp",
  "10000000-0000-4000-8000-000000000002": "local-arepas.webp",
  "10000000-0000-4000-8000-000000000003": "local-cafe.webp",
  "10000000-0000-4000-8000-000000000004": "local-parrilla.webp",
  "10000000-0000-4000-8000-000000000005": "local-jugos.webp",
  "10000000-0000-4000-8000-000000000006": "local-panaderia.webp",
  "10000000-0000-4000-8000-000000000007": "local-food-truck.webp",
};

const PRODUCTS = {
  "20000000-0000-4000-8000-000000000001": "product-almuerzo.webp",
  "20000000-0000-4000-8000-000000000002": "product-almuerzo.webp",
  "20000000-0000-4000-8000-000000000003": "product-sopa.webp",
  "20000000-0000-4000-8000-000000000004": "product-arepa.webp",
  "20000000-0000-4000-8000-000000000005": "product-arepa.webp",
  "20000000-0000-4000-8000-000000000006": "product-empanada.webp",
  "20000000-0000-4000-8000-000000000007": "product-cafe.webp",
  "20000000-0000-4000-8000-000000000008": "product-capuchino.webp",
  "20000000-0000-4000-8000-000000000009": "product-capuchino.webp",
  "20000000-0000-4000-8000-000000000010": "product-parrilla.webp",
  "20000000-0000-4000-8000-000000000011": "product-parrilla.webp",
  "20000000-0000-4000-8000-000000000012": "product-papas.webp",
  "20000000-0000-4000-8000-000000000013": "product-jugo.webp",
  "20000000-0000-4000-8000-000000000014": "product-frutas.webp",
  "20000000-0000-4000-8000-000000000015": "product-jugo.webp",
  "20000000-0000-4000-8000-000000000016": "product-pan.webp",
  "20000000-0000-4000-8000-000000000017": "product-croissant.webp",
  "20000000-0000-4000-8000-000000000018": "product-torta.webp",
  "20000000-0000-4000-8000-000000000019": "product-galleta.webp",
  "20000000-0000-4000-8000-000000000020": "product-hamburguesa.webp",
  "20000000-0000-4000-8000-000000000021": "product-perro.webp",
  "20000000-0000-4000-8000-000000000022": "product-salchipapa.webp",
  "20000000-0000-4000-8000-000000000023": "product-wrap.webp",
  "20000000-0000-4000-8000-000000000024": "product-malteada.webp",
};

const dryRun = process.argv.includes("--dry-run");

if (process.env.CI || process.env.VERCEL || process.env.NODE_ENV === "production") {
  console.error("Las fotos demo son solo para Supabase local. Abortando.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  console.error(
    "Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.",
  );
  process.exit(1);
}

const bucket = "establishment-photos";
const root = resolve("public/demo");
const supabase = dryRun
  ? null
  : createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

async function prepare(file, destination) {
  const source = resolve(root, file);
  const buffer = await readFile(source);
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`No se pudo leer ${file}`);
  }
  return { buffer, path: destination, bytes: buffer.byteLength };
}

async function upload(asset) {
  if (!supabase) return;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(asset.path, asset.buffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) throw new Error(`Storage ${asset.path}: ${error.message}`);
}

async function run() {
  const localAssets = await Promise.all(
    Object.entries(LOCAL_ESTABLISHMENTS).map(async ([id, file]) => ({
      id,
      ...(await prepare(file, `${id}/demo-local.webp`)),
    })),
  );
  const productAssets = await Promise.all(
    Object.entries(PRODUCTS).map(async ([id, file]) => ({
      id,
      ...(await prepare(file, `${id}/demo-product.webp`)),
    })),
  );

  if (dryRun) {
    console.log(`Dry run: ${localAssets.length} locales, ${productAssets.length} productos.`);
    for (const asset of [...localAssets, ...productAssets]) {
      console.log(`${asset.id} -> ${asset.path} (${Math.round(asset.bytes / 1024)} KB)`);
    }
    return;
  }

  for (const asset of localAssets) {
    await upload(asset);
    const { error } = await supabase
      .from("establishments")
      .update({ photos: [asset.path] })
      .eq("id", asset.id);
    if (error) throw new Error(`Establecimiento ${asset.id}: ${error.message}`);
  }

  for (const asset of productAssets) {
    await upload(asset);
    const { error } = await supabase
      .from("products")
      .update({ photo_url: asset.path })
      .eq("id", asset.id);
    if (error) throw new Error(`Producto ${asset.id}: ${error.message}`);
  }

  console.log(
    `Fotos demo actualizadas: ${localAssets.length} locales y ${productAssets.length} productos.`,
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
