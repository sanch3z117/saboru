import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
type ReviewRow = Database["public"]["Tables"]["reviews"]["Row"];
type ReportRow = Database["public"]["Tables"]["review_reports"]["Row"];
type EstablishmentRow = Database["public"]["Tables"]["establishments"]["Row"];
type InviteRow = Database["public"]["Tables"]["vendor_invites"]["Row"];

type ReviewSummary = Pick<
  ReviewRow,
  "id" | "comment" | "status" | "created_at" | "product_id" | "establishment_id"
>;

type ReportSummary = Pick<
  ReportRow,
  "id" | "reason" | "status" | "created_at" | "review_id"
>;

export type AdminReview = {
  id: string;
  comment: string | null;
  status: ReviewRow["status"];
  createdAt: string;
  productId: string;
  productName: string;
  establishmentId: string;
  establishmentName: string;
  establishmentSlug: string;
};

export type AdminReport = {
  id: string;
  reason: string;
  status: ReportRow["status"];
  createdAt: string;
  reviewId: string;
  reviewComment: string | null;
  reviewStatus: ReviewRow["status"] | null;
  productName: string;
  establishmentName: string;
  establishmentSlug: string;
};

export type AdminEstablishment = {
  id: string;
  name: string;
  slug: string;
  status: EstablishmentRow["status"];
  plan: EstablishmentRow["plan"];
  ownerId: string | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
};

export type AdminInvite = {
  id: string;
  email: string;
  establishmentName: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};

export type AdminBlock = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type AdminDashboard = {
  reviews: AdminReview[];
  reports: AdminReport[];
  establishments: AdminEstablishment[];
  invites: AdminInvite[];
  blocks: AdminBlock[];
};

function firstError(results: { error: { message: string } | null }[]) {
  return results.find((result) => result.error)?.error ?? null;
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

/**
 * Datos de /admin. Las consultas pasan por RLS de admin; las mutaciones van
 * por RPC security definer. Nunca devuelve el `user_id` de quien reseña.
 */
export async function getAdminDashboard(
  client: Client,
): Promise<AdminDashboard> {
  const [
    reviewResult,
    reportResult,
    establishmentResult,
    inviteResult,
    blockResult,
  ] = await Promise.all([
    client
      .from("reviews")
      .select("id, comment, status, created_at, product_id, establishment_id")
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("review_reports")
      .select("id, reason, status, created_at, review_id")
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("establishments")
      .select("id, name, slug, status, plan, owner_id, created_at")
      .order("name"),
    client
      .from("vendor_invites")
      .select(
        "id, email, establishment_id, expires_at, accepted_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("public_blocks")
      .select("id, name, latitude, longitude")
      .order("name"),
  ]);

  const error = firstError([
    reviewResult,
    reportResult,
    establishmentResult,
    inviteResult,
    blockResult,
  ]);
  if (error) {
    throw new Error(error.message);
  }

  const reviews = (reviewResult.data ?? []) as ReviewSummary[];
  const reports = (reportResult.data ?? []) as ReportSummary[];
  const establishments = (establishmentResult.data ?? []) as Pick<
    EstablishmentRow,
    "id" | "name" | "slug" | "status" | "plan" | "owner_id" | "created_at"
  >[];
  const invites = (inviteResult.data ?? []) as InviteRow[];

  const recentIds = new Set(reviews.map((review) => review.id));
  const missingReportReviewIds = unique(
    reports
      .map((report) => report.review_id)
      .filter((reviewId) => !recentIds.has(reviewId)),
  );

  let reportReviews: ReviewSummary[] = [];
  if (missingReportReviewIds.length > 0) {
    const result = await client
      .from("reviews")
      .select("id, comment, status, created_at, product_id, establishment_id")
      .in("id", missingReportReviewIds);
    if (result.error) {
      throw new Error(result.error.message);
    }
    reportReviews = (result.data ?? []) as ReviewSummary[];
  }

  const allReviews = [...reviews, ...reportReviews];
  const productIds = unique(allReviews.map((review) => review.product_id));
  const ownerIds = unique(
    establishments
      .map((establishment) => establishment.owner_id)
      .filter((ownerId): ownerId is string => Boolean(ownerId)),
  );

  const [productResult, ownerResult] = await Promise.all([
    productIds.length > 0
      ? client.from("products").select("id, name").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length > 0
      ? client
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const productError = firstError([productResult, ownerResult]);
  if (productError) {
    throw new Error(productError.message);
  }

  const productById = new Map(
    (productResult.data ?? []).map((product) => [product.id, product]),
  );
  const establishmentById = new Map(
    establishments.map((establishment) => [establishment.id, establishment]),
  );
  const ownerById = new Map(
    (ownerResult.data ?? []).map((owner) => [owner.id, owner]),
  );
  const reviewById = new Map(allReviews.map((review) => [review.id, review]));

  function mapReview(review: ReviewSummary): AdminReview {
    const establishment = establishmentById.get(review.establishment_id);

    return {
      id: review.id,
      comment: review.comment,
      status: review.status,
      createdAt: review.created_at,
      productId: review.product_id,
      productName:
        productById.get(review.product_id)?.name ?? "Producto eliminado",
      establishmentId: review.establishment_id,
      establishmentName: establishment?.name ?? "Local eliminado",
      establishmentSlug: establishment?.slug ?? "",
    };
  }

  const mappedReviews = reviews.map(mapReview);
  const mappedReports = reports.map((report) => {
    const review = reviewById.get(report.review_id);
    const establishment = review
      ? establishmentById.get(review.establishment_id)
      : undefined;

    return {
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.created_at,
      reviewId: report.review_id,
      reviewComment: review?.comment ?? null,
      reviewStatus: review?.status ?? null,
      productName: review
        ? (productById.get(review.product_id)?.name ?? "Producto eliminado")
        : "Reseña eliminada",
      establishmentName: establishment?.name ?? "Local eliminado",
      establishmentSlug: establishment?.slug ?? "",
    };
  });

  return {
    reviews: mappedReviews,
    reports: mappedReports,
    establishments: establishments.map((establishment) => {
      const owner = establishment.owner_id
        ? ownerById.get(establishment.owner_id)
        : undefined;

      return {
        id: establishment.id,
        name: establishment.name,
        slug: establishment.slug,
        status: establishment.status,
        plan: establishment.plan,
        ownerId: establishment.owner_id,
        ownerName: owner?.full_name ?? "",
        ownerEmail: owner?.email ?? "",
        createdAt: establishment.created_at,
      };
    }),
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      establishmentName:
        establishmentById.get(invite.establishment_id)?.name ??
        "Local eliminado",
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      createdAt: invite.created_at,
    })),
    blocks: (blockResult.data ?? [])
      .filter(
        (
          block,
        ): block is {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
        } => block.latitude !== null && block.longitude !== null,
      )
      .map((block) => ({
        id: block.id,
        name: block.name,
        latitude: block.latitude,
        longitude: block.longitude,
      })),
  };
}
