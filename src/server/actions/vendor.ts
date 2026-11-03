"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { VendorFormState } from "@/lib/vendor/form-state";
import { createClient } from "@/lib/supabase/server";
import { scheduleFromFormData } from "@/lib/vendor/schedule";
import {
  establishmentSchema,
  locationSchema,
  productSchema,
  weeklyScheduleSchema,
} from "@/lib/validations/vendor";
import {
  deleteEstablishmentPhoto,
  deleteProduct,
  saveProduct,
  updateOwnEstablishment,
  uploadEstablishmentPhoto,
} from "@/server/services/vendor";
import { getOwnEstablishment } from "@/server/queries/vendor";

type VendorSession =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string; slug: string | null }
  | { ok: false; message: string };

async function vendorSession(): Promise<VendorSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Inicia sesión para gestionar tu local." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "vendor") {
    return { ok: false, message: "Solo los vendedores pueden hacer esto." };
  }

  const establishment = await getOwnEstablishment(supabase, user.id);

  return {
    ok: true,
    supabase,
    userId: user.id,
    slug: establishment?.slug ?? null,
  };
}

function revalidateVendor(slug: string | null) {
  revalidatePath("/panel");
  revalidatePath("/");
  revalidatePath("/buscar");
  revalidatePath("/producto/[id]", "page");
  if (slug) {
    revalidatePath(`/establecimiento/${slug}`);
  }
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa el formulario.";
}

export async function saveEstablishmentAction(
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await vendorSession();
  if (!session.ok) {
    return { status: "error", message: session.message };
  }

  const parsed = establishmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    address: formData.get("address") ?? "",
    category: formData.get("category") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const schedule = scheduleFromFormData(formData);
  if (!schedule.ok) {
    return { status: "error", message: schedule.message };
  }

  const parsedSchedule = weeklyScheduleSchema.safeParse(schedule.data);
  if (!parsedSchedule.success) {
    return { status: "error", message: firstIssue(parsedSchedule.error) };
  }

  const location = locationSchema.safeParse({
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
  });
  if (!location.success) {
    return { status: "error", message: firstIssue(location.error) };
  }

  const result = await updateOwnEstablishment(
    session.supabase,
    session.userId,
    {
      ...parsed.data,
      schedule: parsedSchedule.data,
      location: location.data,
    },
  );

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidateVendor(session.slug);
  return { status: "success", message: "Ficha guardada." };
}

export async function saveProductAction(
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await vendorSession();
  if (!session.ok) {
    return { status: "error", message: session.message };
  }

  const parsed = productSchema.safeParse({
    productId: formData.get("productId") ?? "",
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price_cop: formData.get("price_cop"),
    category: formData.get("category") ?? "",
    available: formData.get("available"),
    allergens: formData.get("allergens") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: firstIssue(parsed.error) };
  }

  const result = await saveProduct(
    session.supabase,
    session.userId,
    parsed.data,
  );

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidateVendor(session.slug);
  return {
    status: "success",
    message: parsed.data.productId
      ? "Producto actualizado."
      : "Producto agregado.",
  };
}

export async function deleteProductAction(
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await vendorSession();
  if (!session.ok) {
    return { status: "error", message: session.message };
  }

  const productId = z.uuid().safeParse(formData.get("productId"));
  if (!productId.success) {
    return { status: "error", message: "Producto inválido." };
  }

  const result = await deleteProduct(
    session.supabase,
    session.userId,
    productId.data,
  );

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidateVendor(session.slug);
  return { status: "success", message: "Producto eliminado." };
}

export async function uploadPhotoAction(
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await vendorSession();
  if (!session.ok) {
    return { status: "error", message: session.message };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona una imagen." };
  }

  const result = await uploadEstablishmentPhoto(
    session.supabase,
    session.userId,
    file,
  );

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidateVendor(session.slug);
  return { status: "success", message: "Foto agregada." };
}

export async function deletePhotoAction(
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await vendorSession();
  if (!session.ok) {
    return { status: "error", message: session.message };
  }

  const path = z
    .string()
    .trim()
    .min(1)
    .max(300)
    .safeParse(formData.get("path"));

  if (!path.success) {
    return { status: "error", message: "Foto inválida." };
  }

  const result = await deleteEstablishmentPhoto(
    session.supabase,
    session.userId,
    path.data,
  );

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidateVendor(session.slug);
  return { status: "success", message: "Foto eliminada." };
}
