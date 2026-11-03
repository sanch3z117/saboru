import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";
import { EstablishmentForm } from "@/components/vendor/establishment-form";
import { PanelNotice } from "@/components/vendor/panel-notice";
import { PhotoManager } from "@/components/vendor/photo-manager";
import { ProductManager } from "@/components/vendor/product-manager";
import { StatsPanel } from "@/components/vendor/stats-panel";
import { requireRole } from "@/lib/auth/guards";
import type { WeeklySchedule } from "@/lib/catalog/schedule";
import { formatCoordinate, parsePointHex } from "@/lib/vendor/schedule";
import {
  getOwnEstablishment,
  getVendorDashboard,
  getVendorProducts,
  photoPublicUrl,
} from "@/server/queries/vendor";

export const metadata: Metadata = {
  title: "Panel del vendedor",
};

const STATUS: Record<string, { label: string; tone: string }> = {
  active: {
    label: "Publicado en el catálogo",
    tone: "bg-verified-soft text-verified-ink",
  },
  suspended: {
    label: "Suspendido: no aparece en el catálogo",
    tone: "bg-campus text-carbon",
  },
  pending: { label: "En revisión", tone: "bg-carbon/10 text-carbon" },
  draft: { label: "Borrador", tone: "bg-carbon/10 text-carbon" },
};

const PLAN: Record<string, string> = {
  basic: "Plan básico",
  featured: "Plan destacado",
  pro: "Plan pro",
};

function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="border-t border-carbon pt-4">
      <h2 className="font-display text-xl font-semibold text-carbon">
        {children}
      </h2>
      {hint ? (
        <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-carbon/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default async function VendorPanelPage() {
  const { supabase, user, profile } = await requireRole("vendor");
  const establishment = await getOwnEstablishment(supabase, user.id);

  const greeting = profile.full_name || profile.email;

  if (!establishment) {
    return (
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8">
          <p className="text-sm font-semibold text-carbon/60">
            Panel del vendedor
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-carbon">
            Hola, {greeting}
          </h1>
          <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-carbon/80">
            Tu cuenta todavía no tiene un local asignado. Cuando el equipo de
            SaborU apruebe tu invitación, aquí podrás editar la ficha, los
            productos y ver tus estadísticas.
          </p>
        </main>
      </div>
    );
  }

  const [products, dashboard] = await Promise.all([
    getVendorProducts(supabase, establishment.id),
    getVendorDashboard(establishment.id),
  ]);

  const photos = establishment.photos.map((path) => ({
    path,
    url: photoPublicUrl(path),
  }));
  const coordinates = parsePointHex(establishment.location);
  const status = STATUS[establishment.status] ?? STATUS.pending;

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <PanelNotice />

        <header className="border-b border-carbon pb-6">
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-4xl">
              <span className="mb-1 block font-sans text-sm font-semibold tracking-normal text-carbon/60">
                Panel del vendedor
              </span>
              {establishment.name}
            </h1>
            <span
              className={`inline-flex items-center px-3 py-1 text-xs font-semibold ${status.tone}`}
            >
              {status.label}
            </span>
          </div>
          <p className="mt-2 text-sm text-carbon/65">
            {PLAN[establishment.plan] ?? establishment.plan}
            {establishment.address ? (
              <>
                <span aria-hidden="true"> · </span>
                {establishment.address}
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            {establishment.category || "Sin categoría"}
          </p>
        </header>

        {establishment.status === "suspended" ? (
          <p className="mt-6 border border-carbon bg-campus px-4 py-3 text-sm font-medium text-carbon">
            Tu local está suspendido y no se muestra en el catálogo. Puedes
            seguir editando la ficha y los productos; las estadísticas de las
            reseñas anteriores siguen disponibles.
          </p>
        ) : null}

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <div className="flex flex-col gap-10">
            <section aria-labelledby="ficha">
              <SectionTitle hint="Lo que ve el estudiante cuando entra a tu local.">
                <span id="ficha">Tu ficha</span>
              </SectionTitle>
              <EstablishmentForm
                establishment={{
                  name: establishment.name,
                  description: establishment.description,
                  address: establishment.address,
                  category: establishment.category,
                  schedule: establishment.schedule as WeeklySchedule,
                  lat: coordinates ? formatCoordinate(coordinates.lat) : "",
                  lng: coordinates ? formatCoordinate(coordinates.lng) : "",
                }}
              />
            </section>

            <section aria-labelledby="fotos">
              <SectionTitle hint="Hasta 5 fotos del local o de tus platos. JPEG, PNG o WebP, máximo 5 MB.">
                <span id="fotos">Fotos</span>
              </SectionTitle>
              <PhotoManager photos={photos} />
            </section>

            <section aria-labelledby="productos">
              <SectionTitle hint="Precios en pesos colombianos. Marca como agotado lo que no tengas hoy.">
                <span id="productos">Productos</span>
              </SectionTitle>
              <ProductManager products={products} />
            </section>
          </div>

          <aside aria-label="Estadísticas del local">
            <StatsPanel dashboard={dashboard} products={products} />
          </aside>
        </div>
      </main>
    </div>
  );
}
