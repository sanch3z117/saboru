/**
 * Resolución de fotos públicas de SaborU.
 *
 * En la base se guardan rutas de Storage (`establishment-id/archivo.webp`) o
 * URLs completas. La UI nunca debe concatenar el bucket a mano.
 */
export const PHOTO_BUCKET = "establishment-photos";

export type PhotoSource = string | null | undefined;

function storageBaseUrl(baseUrl?: string) {
  const value = baseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  return value?.trim().replace(/\/+$/, "") || null;
}

export function photoSrc(path: PhotoSource, baseUrl?: string): string | null {
  const value = path?.trim();
  if (!value) {
    return null;
  }

  // URL absoluta (por ejemplo una foto demo externa o un CDN).
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  // Archivo servido por la propia app (`/brand/...`, `/demo/...`).
  if (value.startsWith("/")) {
    return value;
  }

  // Ruta pública de Storage.
  const base = storageBaseUrl(baseUrl);
  if (!base) {
    return null;
  }

  const encodedPath = value
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${base}/storage/v1/object/public/${PHOTO_BUCKET}/${encodedPath}`;
}

export function firstPhotoSrc(
  photos: readonly string[] | null | undefined,
  baseUrl?: string,
) {
  return photoSrc(photos?.[0], baseUrl);
}
