"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { adminErrorMessage } from "@/lib/admin/errors";
import {
  adminEstablishmentPlanSchema,
  adminEstablishmentSchema,
  adminEstablishmentStatusSchema,
  adminInviteSchema,
  adminReportStatusSchema,
  adminReviewStatusSchema,
} from "@/lib/validations/admin";
import { weeklyScheduleSchema } from "@/lib/validations/vendor";
import { createClient } from "@/lib/supabase/server";
import { scheduleFromFormData } from "@/lib/vendor/schedule";
import type { Json } from "@/types/database";

type AdminSession =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
    }
  | { ok: false; message: string };

async function adminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Inicia sesión como administrador." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false, message: "Solo un administrador puede hacer esto." };
  }

  return { ok: true, supabase };
}

async function redirectWithNotice(code: string): Promise<never> {
  const store = await cookies();
  store.set("saboru_admin_notice", code, {
    path: "/admin",
    maxAge: 60,
    sameSite: "lax",
  });
  redirect("/admin");
}

async function redirectWithError(message: string): Promise<never> {
  const store = await cookies();
  store.set("saboru_admin_error", message, {
    path: "/admin",
    maxAge: 60,
    sameSite: "lax",
  });
  redirect("/admin");
}

function revalidateAdmin() {
  revalidatePath("/admin");
}

function revalidateCatalog(
  context: {
    productId?: string | null;
    establishmentSlug?: string | null;
  } = {},
) {
  revalidatePath("/");
  revalidatePath("/buscar");
  revalidatePath("/producto/[id]", "page");
  revalidatePath("/establecimiento/[slug]", "page");
  revalidatePath("/panel");

  if (context.productId) {
    revalidatePath(`/producto/${context.productId}`);
  }
  if (context.establishmentSlug) {
    revalidatePath(`/establecimiento/${context.establishmentSlug}`);
  }
}

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Revisa el formulario.";
}

async function getReviewContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reviewId: string,
) {
  const { data: review } = await supabase
    .from("reviews")
    .select("product_id, establishment_id")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) {
    return {};
  }

  const { data: establishment } = await supabase
    .from("establishments")
    .select("slug")
    .eq("id", review.establishment_id)
    .maybeSingle();

  return {
    productId: review.product_id,
    establishmentSlug: establishment?.slug ?? null,
  };
}

async function getReportContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reportId: string,
) {
  const { data: report } = await supabase
    .from("review_reports")
    .select("review_id")
    .eq("id", reportId)
    .maybeSingle();

  return report ? getReviewContext(supabase, report.review_id) : {};
}

async function getEstablishmentContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  establishmentId: string,
) {
  const { data: establishment } = await supabase
    .from("establishments")
    .select("slug")
    .eq("id", establishmentId)
    .maybeSingle();

  return { establishmentSlug: establishment?.slug ?? null };
}

export async function setReviewStatusAction(formData: FormData): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = z
    .object({
      reviewId: z.uuid(),
      status: adminReviewStatusSchema,
    })
    .safeParse({
      reviewId: formData.get("reviewId"),
      status: formData.get("status"),
    });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const { error } = await session.supabase.rpc("admin_set_review_status", {
    p_review_id: parsed.data.reviewId,
    p_status: parsed.data.status,
  });

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  const context = await getReviewContext(
    session.supabase,
    parsed.data.reviewId,
  );
  revalidateAdmin();
  revalidateCatalog(context);

  await redirectWithNotice(
    parsed.data.status === "hidden" ? "review_hidden" : "review_published",
  );
}

export async function setReportStatusAction(formData: FormData): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = z
    .object({
      reportId: z.uuid(),
      status: adminReportStatusSchema,
    })
    .safeParse({
      reportId: formData.get("reportId"),
      status: formData.get("status"),
    });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const { error } = await session.supabase.rpc("admin_resolve_report", {
    p_report_id: parsed.data.reportId,
    p_status: parsed.data.status,
  });

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  const context = await getReportContext(
    session.supabase,
    parsed.data.reportId,
  );
  revalidateAdmin();
  revalidateCatalog(context);

  await redirectWithNotice(
    parsed.data.status === "reviewed" ? "report_reviewed" : "report_dismissed",
  );
}

export async function setEstablishmentStatusAction(
  formData: FormData,
): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = z
    .object({
      establishmentId: z.uuid(),
      status: adminEstablishmentStatusSchema,
    })
    .safeParse({
      establishmentId: formData.get("establishmentId"),
      status: formData.get("status"),
    });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const { error } = await session.supabase.rpc(
    "admin_set_establishment_status",
    {
      p_establishment_id: parsed.data.establishmentId,
      p_status: parsed.data.status,
    },
  );

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  const context = await getEstablishmentContext(
    session.supabase,
    parsed.data.establishmentId,
  );
  revalidateAdmin();
  revalidateCatalog(context);

  await redirectWithNotice(
    parsed.data.status === "active"
      ? "establishment_active"
      : "establishment_suspended",
  );
}

export async function setEstablishmentPlanAction(
  formData: FormData,
): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = z
    .object({
      establishmentId: z.uuid(),
      plan: adminEstablishmentPlanSchema,
    })
    .safeParse({
      establishmentId: formData.get("establishmentId"),
      plan: formData.get("plan"),
    });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const { error } = await session.supabase.rpc("admin_set_establishment_plan", {
    p_establishment_id: parsed.data.establishmentId,
    p_plan: parsed.data.plan,
  });

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  const context = await getEstablishmentContext(
    session.supabase,
    parsed.data.establishmentId,
  );
  revalidateAdmin();
  revalidateCatalog(context);

  await redirectWithNotice("plan_updated");
}

export async function createEstablishmentAction(
  formData: FormData,
): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = adminEstablishmentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") ?? "",
    address: formData.get("address") ?? "",
    category: formData.get("category"),
    blockId: formData.get("blockId"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const schedule = scheduleFromFormData(formData);
  if (!schedule.ok) {
    await redirectWithError(schedule.message);
    return;
  }

  const parsedSchedule = weeklyScheduleSchema.safeParse(schedule.data);
  if (!parsedSchedule.success) {
    await redirectWithError(firstIssue(parsedSchedule.error));
    return;
  }

  const { error } = await session.supabase.rpc("admin_create_establishment", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: parsed.data.description,
    p_address: parsed.data.address,
    p_block_id: parsed.data.blockId,
    p_lat: parsed.data.lat,
    p_lng: parsed.data.lng,
    p_category: parsed.data.category,
    p_schedule: parsedSchedule.data as Json,
  });

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  revalidateAdmin();
  await redirectWithNotice("establishment_created");
}

export async function createInviteAction(formData: FormData): Promise<void> {
  const session = await adminSession();
  if (!session.ok) {
    await redirectWithError(session.message);
    return;
  }

  const parsed = adminInviteSchema.safeParse({
    email: formData.get("email"),
    establishmentId: formData.get("establishmentId"),
  });

  if (!parsed.success) {
    await redirectWithError(firstIssue(parsed.error));
    return;
  }

  const { error } = await session.supabase.rpc("admin_create_vendor_invite", {
    p_email: parsed.data.email,
    p_establishment_id: parsed.data.establishmentId,
  });

  if (error) {
    await redirectWithError(adminErrorMessage(error));
    return;
  }

  revalidateAdmin();
  await redirectWithNotice("invite_created");
}
