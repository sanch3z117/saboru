import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PHOTO_BUCKET,
  PHOTO_MAX_COUNT,
  isOwnPhotoPath,
  photoPath,
  validatePhoto,
} from "@/lib/vendor/photos";
import type {
  EstablishmentInput,
  LocationInput,
  ProductInput,
  WeeklyScheduleInput,
} from "@/lib/validations/vendor";
import type { Database } from "@/types/database";

import { getOwnEstablishment } from "@/server/queries/vendor";

type Client = SupabaseClient<Database>;

export type VendorResult =
  | { ok: true; photos?: string[] }
  | { ok: false; message: string };

export async function updateOwnEstablishment(
  client: Client,
  userId: string,
  input: EstablishmentInput & {
    schedule: WeeklyScheduleInput;
    location: LocationInput;
  },
): Promise<VendorResult> {
  const establishment = await getOwnEstablishment(client, userId);
  if (!establishment) {
    return { ok: false, message: "No encontramos un local a tu nombre." };
  }

  const { error } = await client
    .from("establishments")
    .update({
      name: input.name,
      description: input.description,
      address: input.address,
      category: input.category,
      schedule: input.schedule,
    })
    .eq("id", establishment.id)
    .eq("owner_id", userId);

  if (error) {
    return { ok: false, message: "No pudimos guardar la ficha." };
  }

  const location = await client.rpc("vendor_set_establishment_location", {
    p_establishment_id: establishment.id,
    p_lat: input.location.lat,
    p_lng: input.location.lng,
  });

  if (location.error) {
    return { ok: false, message: "No pudimos guardar la ubicación." };
  }

  return { ok: true };
}

export async function saveProduct(
  client: Client,
  userId: string,
  input: ProductInput,
): Promise<VendorResult> {
  const establishment = await getOwnEstablishment(client, userId);
  if (!establishment) {
    return { ok: false, message: "No encontramos un local a tu nombre." };
  }

  const values = {
    name: input.name,
    description: input.description,
    price_cop: input.price_cop,
    category: input.category,
    available: input.available,
    allergens: input.allergens,
  };

  const { error } = input.productId
    ? await client
        .from("products")
        .update(values)
        .eq("id", input.productId)
        .eq("establishment_id", establishment.id)
    : await client
        .from("products")
        .insert({ ...values, establishment_id: establishment.id });

  if (error) {
    return { ok: false, message: "No pudimos guardar el producto." };
  }

  return { ok: true };
}

export async function deleteProduct(
  client: Client,
  userId: string,
  productId: string,
): Promise<VendorResult> {
  const establishment = await getOwnEstablishment(client, userId);
  if (!establishment) {
    return { ok: false, message: "No encontramos un local a tu nombre." };
  }

  const { error } = await client
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("establishment_id", establishment.id);

  if (error) {
    return { ok: false, message: "No pudimos eliminar el producto." };
  }

  return { ok: true };
}

export async function uploadEstablishmentPhoto(
  client: Client,
  userId: string,
  file: File,
): Promise<VendorResult> {
  const establishment = await getOwnEstablishment(client, userId);
  if (!establishment) {
    return { ok: false, message: "No encontramos un local a tu nombre." };
  }

  const validation = validatePhoto({ type: file.type, size: file.size });
  if (!validation.ok) {
    return { ok: false, message: validation.message };
  }

  if (establishment.photos.length >= PHOTO_MAX_COUNT) {
    return {
      ok: false,
      message: `Puedes tener hasta ${PHOTO_MAX_COUNT} fotos.`,
    };
  }

  const path = photoPath(
    establishment.id,
    crypto.randomUUID(),
    validation.extension,
  );

  const upload = await client.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upload.error) {
    return { ok: false, message: "No pudimos subir la foto." };
  }

  const photos = [...establishment.photos, path];
  const { error } = await client
    .from("establishments")
    .update({ photos })
    .eq("id", establishment.id)
    .eq("owner_id", userId);

  if (error) {
    await client.storage.from(PHOTO_BUCKET).remove([path]);
    return { ok: false, message: "No pudimos guardar la foto en la ficha." };
  }

  return { ok: true, photos };
}

export async function deleteEstablishmentPhoto(
  client: Client,
  userId: string,
  path: string,
): Promise<VendorResult> {
  const establishment = await getOwnEstablishment(client, userId);
  if (!establishment) {
    return { ok: false, message: "No encontramos un local a tu nombre." };
  }

  if (!isOwnPhotoPath(path, establishment.id)) {
    return { ok: false, message: "Esa foto no pertenece a tu local." };
  }

  const photos = establishment.photos.filter((item) => item !== path);

  const removal = await client.storage.from(PHOTO_BUCKET).remove([path]);
  if (removal.error) {
    return { ok: false, message: "No pudimos borrar la foto." };
  }

  const { error } = await client
    .from("establishments")
    .update({ photos })
    .eq("id", establishment.id)
    .eq("owner_id", userId);

  if (error) {
    return { ok: false, message: "No pudimos actualizar la ficha." };
  }

  return { ok: true, photos };
}
