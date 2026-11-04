import type { Metadata } from "next";

import { AdminActionRefresh } from "@/components/admin/admin-action-refresh";
import { AdminNotice } from "@/components/admin/admin-notice";
import { CreateEstablishmentForm } from "@/components/admin/create-establishment-form";
import { EstablishmentPlanForm } from "@/components/admin/establishment-plan-form";
import { EstablishmentStatusForm } from "@/components/admin/establishment-status-form";
import { InviteForm } from "@/components/admin/invite-form";
import { ReportActions } from "@/components/admin/report-actions";
import { ReviewActions } from "@/components/admin/review-actions";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import {
  ESTABLISHMENT_STATUS_LABELS,
  PLAN_LABELS,
  REPORT_STATUS_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/admin/labels";
import { requireRole } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { getAdminDashboard } from "@/server/queries/admin";

export const metadata: Metadata = {
  title: "Administración",
};

function SectionTitle({
  id,
  children,
  hint,
}: {
  id: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="border-b-2 border-carbon/20 pb-4">
      <h2
        id={id}
        className="font-display text-xl font-semibold tracking-tight text-carbon sm:text-2xl"
      >
        {children}
      </h2>
      {hint ? (
        <p className="mt-1 max-w-[65ch] text-sm leading-relaxed text-carbon/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-pill border-2 border-carbon bg-campus px-2.5 py-0.5 text-xs font-semibold text-carbon">
      {children}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 rounded-panel border-2 border-dashed border-carbon/30 px-4 py-5 text-sm leading-relaxed text-carbon/70">
      {children}
    </p>
  );
}

export default async function AdminPage() {
  const { supabase, profile } = await requireRole("admin");
  const dashboard = await getAdminDashboard(supabase);

  const openReports = dashboard.reports.filter(
    (report) => report.status === "open",
  );
  const pendingEstablishments = dashboard.establishments.filter(
    (establishment) =>
      establishment.status === "draft" || establishment.status === "pending",
  );
  const hiddenReviews = dashboard.reviews.filter(
    (review) => review.status === "hidden",
  );
  const activeEstablishments = dashboard.establishments.filter(
    (establishment) => establishment.status === "active",
  );
  const unownedEstablishments = dashboard.establishments.filter(
    (establishment) => !establishment.ownerId,
  );
  const greeting = profile.full_name || profile.email;
  const sections = [
    { href: "#reportes", label: "Reportes", count: openReports.length },
    { href: "#resenas", label: "Reseñas", count: dashboard.reviews.length },
    {
      href: "#locales",
      label: "Locales",
      count: dashboard.establishments.length,
    },
    { href: "#crear-local", label: "Crear local" },
    {
      href: "#invitaciones",
      label: "Invitaciones",
      count: dashboard.invites.length,
    },
  ];

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main
        id="contenido"
        className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 lg:px-10"
      >
        <AdminNotice />
        <AdminActionRefresh />

        <header className="rounded-card border-2 border-carbon bg-campus p-5 shadow-hard sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-pill border-2 border-carbon bg-cream px-3 py-1 text-sm font-semibold text-carbon">
                Administración
              </p>
              <h1 className="mt-1 font-display text-4xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-5xl">
                Moderación y locales
              </h1>
              <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-carbon">
                Revisa lo que reporta la comunidad, decide qué se publica y
                acompaña a los locales del campus. Hola, {greeting}.
              </p>
            </div>
            <div className="rounded-panel border-2 border-carbon bg-cream p-2">
              <SignOutButton />
            </div>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Reportes abiertos", openReports.length],
              ["Locales por aprobar", pendingEstablishments.length],
              ["Reseñas ocultas", hiddenReviews.length],
              ["Locales publicados", activeEstablishments.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-panel border-2 border-carbon bg-cream px-3 py-3 sm:px-4"
              >
                <dt className="text-xs font-semibold text-carbon/70">
                  {label}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-carbon sm:text-3xl">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <aside className="min-w-0 lg:sticky lg:top-24">
            <p className="mb-2 hidden px-1 text-xs font-semibold text-carbon/65 lg:block">
              Secciones
            </p>
            <nav
              aria-label="Navegación de administración"
              className="flex gap-2 overflow-x-auto rounded-card border-2 border-carbon bg-cream p-2 shadow-hard-sm lg:flex-col lg:overflow-visible"
            >
              {sections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="inline-flex min-h-10 shrink-0 items-center justify-between gap-4 rounded-panel border-2 border-transparent px-3 py-2 text-sm font-semibold text-carbon hover:border-carbon hover:bg-campus focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon lg:w-full"
                >
                  <span>{section.label}</span>
                  {section.count !== undefined ? (
                    <span className="rounded-pill border border-carbon/30 bg-carbon/5 px-2 py-0.5 text-xs tabular-nums">
                      {section.count}
                    </span>
                  ) : null}
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-col gap-8">
            <section
              id="reportes"
              aria-labelledby="reportes-heading"
              className="scroll-mt-28 rounded-card border-2 border-carbon bg-cream p-4 sm:p-6"
            >
              <SectionTitle
                id="reportes-heading"
                hint="Un reporte no oculta la reseña por sí solo: revisa el contexto y decide."
              >
                Reportes de reseñas
              </SectionTitle>

              {dashboard.reports.length === 0 ? (
                <EmptyState>
                  No hay reportes abiertos. Cuando alguien marque una reseña, la
                  verás aquí.
                </EmptyState>
              ) : (
                <ul className="mt-2 divide-y divide-carbon/15">
                  {dashboard.reports.map((report) => (
                    <li
                      key={report.id}
                      className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-carbon">
                          Motivo: {report.reason}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed break-words text-carbon/80">
                          “{report.reviewComment || "Sin comentario"}”
                        </p>
                        <p className="mt-2 text-xs text-carbon/60">
                          {report.establishmentName} · {report.productName} ·{" "}
                          {formatDate(report.createdAt)} ·{" "}
                          {REPORT_STATUS_LABELS[report.status] ?? report.status}
                        </p>
                      </div>
                      <ReportActions
                        reportId={report.id}
                        status={report.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              id="resenas"
              aria-labelledby="resenas-heading"
              className="scroll-mt-28 rounded-card border-2 border-carbon bg-cream p-4 sm:p-6"
            >
              <SectionTitle
                id="resenas-heading"
                hint="Publicar u ocultar cambia los promedios y la ficha pública del producto."
              >
                Reseñas recientes
              </SectionTitle>

              {dashboard.reviews.length === 0 ? (
                <EmptyState>Todavía no hay reseñas que moderar.</EmptyState>
              ) : (
                <ul className="mt-2 divide-y divide-carbon/15">
                  {dashboard.reviews.map((review) => (
                    <li
                      key={review.id}
                      className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge>
                            {REVIEW_STATUS_LABELS[review.status] ??
                              review.status}
                          </StatusBadge>
                          <p className="text-xs text-carbon/60">
                            {review.establishmentName} · {review.productName} ·{" "}
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed break-words text-carbon/80">
                          {review.comment || "Sin comentario"}
                        </p>
                      </div>
                      <ReviewActions
                        reviewId={review.id}
                        status={review.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section
              id="locales"
              aria-labelledby="locales-heading"
              className="scroll-mt-28 rounded-card border-2 border-carbon bg-cream p-4 sm:p-6"
            >
              <SectionTitle
                id="locales-heading"
                hint="Aprobar publica el local. Suspender lo saca del catálogo sin borrar sus datos. El plan no altera el orden del ranking."
              >
                Locales
              </SectionTitle>

              {dashboard.establishments.length === 0 ? (
                <EmptyState>
                  No hay locales cargados. Crea el primero desde el formulario
                  de abajo.
                </EmptyState>
              ) : (
                <ul className="mt-2 divide-y divide-carbon/15">
                  {dashboard.establishments.map((establishment) => (
                    <li
                      key={establishment.id}
                      className="grid gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-lg font-semibold text-carbon">
                            {establishment.name}
                          </p>
                          <StatusBadge>
                            {ESTABLISHMENT_STATUS_LABELS[
                              establishment.status
                            ] ?? establishment.status}
                          </StatusBadge>
                          <StatusBadge>
                            Plan{" "}
                            {PLAN_LABELS[establishment.plan] ??
                              establishment.plan}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-xs text-carbon/60">
                          /{establishment.slug} ·{" "}
                          {establishment.ownerName || "Sin dueño"}
                          {establishment.ownerEmail
                            ? ` · ${establishment.ownerEmail}`
                            : ""}{" "}
                          · {formatDate(establishment.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                        <EstablishmentStatusForm
                          establishmentId={establishment.id}
                          status={establishment.status}
                        />
                        <EstablishmentPlanForm
                          establishmentId={establishment.id}
                          establishmentName={establishment.name}
                          plan={establishment.plan}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="grid gap-8">
              <section
                id="crear-local"
                aria-labelledby="crear-local-heading"
                className="scroll-mt-28 rounded-card border-2 border-carbon bg-cream p-4 sm:p-6"
              >
                <SectionTitle
                  id="crear-local-heading"
                  hint="Se crea como borrador para que revises la ficha antes de publicarla."
                >
                  Crear local
                </SectionTitle>
                <CreateEstablishmentForm blocks={dashboard.blocks} />
              </section>

              <section
                id="invitaciones"
                aria-labelledby="invitaciones-heading"
                className="scroll-mt-28 rounded-card border-2 border-carbon bg-cream p-4 sm:p-6"
              >
                <SectionTitle
                  id="invitaciones-heading"
                  hint="La invitación usa el correo exacto con el que entrará el vendedor y vence en 7 días."
                >
                  Invitar vendedor
                </SectionTitle>
                <InviteForm
                  establishments={unownedEstablishments.map(
                    (establishment) => ({
                      id: establishment.id,
                      name: establishment.name,
                    }),
                  )}
                />

                <h3 className="mt-8 font-display text-lg font-semibold text-carbon">
                  Invitaciones recientes
                </h3>
                {dashboard.invites.length === 0 ? (
                  <EmptyState>No hay invitaciones creadas.</EmptyState>
                ) : (
                  <ul className="mt-2 divide-y divide-carbon/15">
                    {dashboard.invites.map((invite) => (
                      <li key={invite.id} className="py-3">
                        <p className="text-sm font-semibold text-carbon">
                          {invite.email}
                        </p>
                        <p className="mt-1 text-xs text-carbon/60">
                          {invite.establishmentName} ·{" "}
                          {invite.acceptedAt
                            ? `Aceptada el ${formatDate(invite.acceptedAt)}`
                            : `Vence el ${formatDate(invite.expiresAt)}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
