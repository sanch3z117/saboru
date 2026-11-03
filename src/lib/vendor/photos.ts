export const PHOTO_BUCKET = "establishment-photos";
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MAX_COUNT = 5;

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PhotoValidation =
  | { ok: true; extension: string }
  | { ok: false; message: string };

export function validatePhoto(file: {
  type: string;
  size: number;
}): PhotoValidation {
  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return {
      ok: false,
      message: "La foto debe ser JPEG, PNG o WebP.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, message: "La foto está vacía." };
  }

  if (file.size > PHOTO_MAX_BYTES) {
    return { ok: false, message: "La foto no puede pasar de 5 MB." };
  }

  return { ok: true, extension };
}

export function photoPath(
  establishmentId: string,
  fileId: string,
  extension: string,
) {
  if (!UUID_PATTERN.test(establishmentId) || !UUID_PATTERN.test(fileId)) {
    throw new Error("Ruta de foto inválida");
  }
  return `${establishmentId}/${fileId}.${extension}`;
}

export function isOwnPhotoPath(path: string, establishmentId: string) {
  return path.startsWith(`${establishmentId}/`);
}
