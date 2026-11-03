"use client";

import { useEffect, useMemo, useState } from "react";

import { RetryButton } from "@/components/offline/retry-button";
import { OfflineFavoriteButton } from "@/components/offline/offline-favorite-button";
import { OfflineReportForm } from "@/components/offline/offline-report-form";
import { OfflineReviewForm } from "@/components/offline/offline-review-form";
import { formatSchedule, type WeeklySchedule } from "@/lib/catalog/schedule";
import { searchCatalog, type CatalogSearchItem } from "@/lib/catalog/search";
import { formatDate, formatPrice, formatRating } from "@/lib/format";
import { snapshotToSearchItems } from "@/lib/offline/snapshot";
import { readSnapshot, refreshSnapshot } from "@/lib/offline/snapshot-store";
import { readViewer, type CachedViewer } from "@/lib/offline/viewer";
import { createClient } from "@/lib/supabase/browser";
import type { CatalogSnapshot, PublicReviewRow } from "@/types/catalog";

type Status = "loading" | "ready" | "empty" | "corrupt" | "quota";

const RADIUS_M = 5000;

function parseBudget(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function reviewAverage(review: PublicReviewRow) {
  return (
    (review.rating_sabor +
      review.rating_cantidad +
      review.rating_precio +
      review.rating_presentacion +
      review.rating_calidad_precio) /
    5
  );
}

export function OfflineCatalog() {
  const [status, setStatus] = useState<Status>("loading");
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [budget, setBudget] = useState("");
  const [blockId, setBlockId] = useState("");
  const [category, setCategory] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [selected, setSelected] = useState<CatalogSearchItem | null>(null);
  const [session, setSession] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [viewer, setViewer] = useState<CachedViewer | null>(null);

  useEffect(() => {
    let cancelled = false;

    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        const user = data.session?.user;
        setSession(user ? { userId: user.id, email: user.email ?? "" } : null);
        setViewer(readViewer());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: CatalogSnapshot) => {
      if (cancelled) return;
      setSnapshot(next);
      setStatus("ready");
    };

    const load = async () => {
      const local = await readSnapshot();
      if (cancelled) return;

      if (local.ok) {
        apply(local.record.snapshot);
      } else {
        setStatus(local.reason === "corrupt" ? "corrupt" : "empty");
      }

      if (navigator.onLine === false) {
        return;
      }

      const refreshed = await refreshSnapshot();
      if (cancelled) return;

      if (refreshed.ok) {
        apply(refreshed.snapshot);
      } else if (!local.ok) {
        setStatus(
          refreshed.reason === "quota"
            ? "quota"
            : local.reason === "corrupt"
              ? "corrupt"
              : "empty",
        );
      }
    };

    const updateOnline = () => setOnline(navigator.onLine !== false);
    const handleOnline = () => {
      updateOnline();
      void load();
    };

    updateOnline();
    void load();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", updateOnline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  const blocks = useMemo(
    () =>
      (snapshot?.blocks ?? []).filter(
        (
          block,
        ): block is typeof block & {
          latitude: number;
          longitude: number;
        } => block.latitude !== null && block.longitude !== null,
      ),
    [snapshot],
  );

  const activeBlock = useMemo(
    () =>
      blocks.find((block) => block.id === blockId) ??
      blocks.find((block) => block.name === "Bloque Central") ??
      blocks[0] ??
      null,
    [blocks, blockId],
  );

  const categories = useMemo(() => {
    const unique = new Set(
      (snapshot?.products ?? [])
        .map((product) => product.category)
        .filter((value) => value.length > 0),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "es"));
  }, [snapshot]);

  const items = useMemo(() => {
    if (!snapshot || !activeBlock) {
      return [];
    }
    return searchCatalog(snapshotToSearchItems(snapshot, activeBlock), {
      budget: parseBudget(budget),
      category: category || null,
      maxDistanceM: RADIUS_M,
      openNow,
    });
  }, [snapshot, activeBlock, budget, category, openNow]);

  const canParticipate = useMemo(() => {
    if (!session) return false;
    if (viewer && viewer.userId === session.userId) {
      return viewer.role === "student" && viewer.canReview;
    }
    return session.email.toLowerCase().endsWith("@uptc.edu.co");
  }, [session, viewer]);

  if (status === "loading") {
    return <p className="py-10 text-base text-carbon/70">Cargando catálogo…</p>;
  }

  if (status === "empty" || status === "corrupt" || status === "quota") {
    return (
      <div className="max-w-[46ch] py-10">
        <h1 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-4xl">
          {status === "quota"
            ? "No pudimos guardar el catálogo"
            : status === "corrupt"
              ? "El catálogo guardado está dañado"
              : "Sin conexión"}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-carbon/80">
          {status === "quota"
            ? "El almacenamiento del dispositivo está lleno. Puedes seguir usando SaborU con conexión; libera espacio e inténtalo de nuevo."
            : status === "corrupt"
              ? "Vuelve a conectarte para descargar el catálogo de nuevo."
              : "Vuelve a conectarte para descargar el catálogo."}
        </p>
        <RetryButton />
      </div>
    );
  }

  if (!snapshot || !activeBlock) {
    return (
      <div className="max-w-[46ch] py-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-carbon">
          Sin conexión
        </h1>
        <p className="mt-4 text-base leading-relaxed text-carbon/80">
          Vuelve a conectarte para descargar el catálogo.
        </p>
        <RetryButton />
      </div>
    );
  }

  if (selected) {
    return (
      <OfflineDetail
        item={selected}
        snapshot={snapshot}
        canParticipate={canParticipate}
        sessionUserId={session?.userId ?? null}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-carbon pb-5">
        <div>
          <h1 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-4xl">
            Catálogo sin conexión
          </h1>
          <p className="mt-2 text-sm text-carbon/65">
            Catálogo actualizado el {formatDate(snapshot.generated_at)}
          </p>
        </div>
        <p
          className={`inline-flex items-center px-3 py-1 text-xs font-semibold ${
            online
              ? "bg-verified-soft text-verified-ink"
              : "bg-campus text-carbon"
          }`}
        >
          {online ? "En línea" : "Sin conexión"}
        </p>
      </div>

      <section
        aria-labelledby="filtros-offline"
        className="mt-6 bg-campus px-5 py-6 text-carbon sm:px-6"
      >
        <h2 id="filtros-offline" className="font-display text-lg font-semibold">
          Busca por presupuesto y cercanía
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="off-budget" className="text-sm font-medium">
              Presupuesto (COP)
            </label>
            <input
              id="off-budget"
              type="number"
              inputMode="numeric"
              min={500}
              step={500}
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="Sin límite"
              className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="off-block" className="text-sm font-medium">
              Bloque
            </label>
            <select
              id="off-block"
              value={activeBlock.id}
              onChange={(event) => setBlockId(event.target.value)}
              className="border border-carbon bg-cream px-3 py-2 text-base text-carbon"
            >
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="off-category" className="text-sm font-medium">
              Categoría
            </label>
            <select
              id="off-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="border border-carbon bg-cream px-3 py-2 text-base text-carbon"
            >
              <option value="">Todas</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-end gap-2 pb-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(event) => setOpenNow(event.target.checked)}
              className="size-4 accent-carbon"
            />
            Abierto ahora
          </label>
        </div>

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-carbon underline underline-offset-4"
          onClick={() => {
            setBudget("");
            setCategory("");
            setOpenNow(false);
          }}
        >
          Limpiar filtros
        </button>
      </section>

      <p className="mt-6 text-sm text-carbon/70">
        {items.length} {items.length === 1 ? "resultado" : "resultados"} con
        estos filtros.
      </p>

      {items.length === 0 ? (
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-carbon/75">
          No encontramos productos con esos filtros. Prueba con más presupuesto,
          otro bloque u otra categoría.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-carbon/15 border-y border-carbon/15">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="grid w-full gap-2 py-4 text-left transition-colors hover:bg-campus/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline"
              >
                <span>
                  <span className="font-display text-lg font-semibold text-carbon">
                    {item.name}
                  </span>
                  <span className="mt-1 block text-sm text-carbon/70">
                    {item.establishment_name}
                    <span aria-hidden="true"> · </span>
                    {Math.round(item.distance_m)} m
                    {item.category ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {item.category}
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="font-display text-lg font-semibold text-carbon sm:text-right">
                  {formatPrice(item.price_cop)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OfflineDetail({
  item,
  snapshot,
  canParticipate,
  sessionUserId,
  onBack,
}: {
  item: CatalogSearchItem;
  snapshot: CatalogSnapshot;
  canParticipate: boolean;
  sessionUserId: string | null;
  onBack: () => void;
}) {
  const establishment = snapshot.establishments.find(
    (row) => row.id === item.establishment_id,
  );
  const stats = snapshot.product_stats.find(
    (row) => row.product_id === item.id,
  );
  const reviews = snapshot.reviews
    .filter((review) => review.product_id === item.id)
    .slice(0, 5);
  const schedule = formatSchedule(
    (establishment?.schedule as WeeklySchedule | null) ?? null,
  );
  const hasSchedule = schedule.some((day) => day.ranges.length > 0);
  const averageValues = stats
    ? [
        stats.avg_sabor,
        stats.avg_cantidad,
        stats.avg_precio,
        stats.avg_presentacion,
        stats.avg_calidad_precio,
      ]
    : [];
  const overallAverage =
    averageValues.length === 5 &&
    averageValues.every((value): value is number => value !== null)
      ? averageValues.reduce((total, value) => total + value, 0) / 5
      : null;

  const averageLabel = (value: number | null) =>
    value === null ? "—" : formatRating(value);

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-carbon underline underline-offset-4"
      >
        Volver a resultados
      </button>

      <article className="mt-4">
        <h1 className="font-display text-3xl leading-[1.05] font-extrabold tracking-tight text-carbon sm:text-4xl">
          {item.name}
        </h1>
        <p className="mt-3 font-display text-2xl font-semibold text-carbon">
          {formatPrice(item.price_cop)}
        </p>
        <p className="mt-2 text-sm text-carbon/70">
          {item.establishment_name}
          <span aria-hidden="true"> · </span>
          {Math.round(item.distance_m)} m
          {establishment?.address ? (
            <>
              <span aria-hidden="true"> · </span>
              {establishment.address}
            </>
          ) : null}
        </p>

        {item.description ? (
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-carbon/85">
            {item.description}
          </p>
        ) : null}

        {item.allergens.length > 0 ? (
          <p className="mt-3 text-sm text-carbon/70">
            Alérgenos: {item.allergens.join(", ")}
          </p>
        ) : null}

        {canParticipate && sessionUserId ? (
          <OfflineFavoriteButton
            userId={sessionUserId}
            establishmentId={item.establishment_id}
            productId={item.id}
          />
        ) : null}

        <section aria-labelledby="off-horario" className="mt-8">
          <h2
            id="off-horario"
            className="font-display text-xl font-semibold text-carbon"
          >
            Horario
          </h2>
          {hasSchedule ? (
            <dl className="mt-2 grid gap-x-8 text-sm sm:grid-cols-2">
              {schedule.map((day) => (
                <div
                  key={day.key}
                  className="flex items-baseline justify-between gap-4 border-b border-carbon/10 py-1.5"
                >
                  <dt className="text-carbon/70">{day.label}</dt>
                  <dd className="text-carbon tabular-nums">
                    {day.ranges.length > 0 ? day.ranges.join(" · ") : "Cerrado"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-base text-carbon/70">
              Horario por confirmar.
            </p>
          )}
        </section>

        <section aria-labelledby="off-stats" className="mt-8">
          <h2
            id="off-stats"
            className="font-display text-xl font-semibold text-carbon"
          >
            Calificación
          </h2>
          {stats ? (
            <div className="mt-2 max-w-[52ch] text-sm leading-relaxed text-carbon/85">
              <p className="font-display text-2xl font-semibold text-carbon">
                {overallAverage === null ? "—" : formatRating(overallAverage)} /
                5
              </p>
              <p className="mt-1 text-carbon/65">
                {stats.review_count} reseñas · Sabor{" "}
                {averageLabel(stats.avg_sabor)} · Cantidad{" "}
                {averageLabel(stats.avg_cantidad)} · Precio{" "}
                {averageLabel(stats.avg_precio)} · Presentación{" "}
                {averageLabel(stats.avg_presentacion)} · Calidad/precio{" "}
                {averageLabel(stats.avg_calidad_precio)}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-base text-carbon/70">
              Aún no hay suficientes reseñas para mostrar promedios.
            </p>
          )}
        </section>

        <section aria-labelledby="off-reviews" className="mt-8">
          <h2
            id="off-reviews"
            className="font-display text-xl font-semibold text-carbon"
          >
            Reseñas recientes
          </h2>
          {reviews.length === 0 ? (
            <p className="mt-2 text-base text-carbon/70">
              Todavía no hay comentarios públicos de este producto.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {reviews.map((review) => (
                <li key={review.id} className="border-l-2 border-campus pl-3">
                  <p className="text-sm font-semibold text-carbon">
                    {formatRating(reviewAverage(review))} / 5
                    <span className="font-normal text-carbon/55">
                      <span aria-hidden="true"> · </span>
                      {formatDate(review.created_at)}
                    </span>
                  </p>
                  {review.comment ? (
                    <p className="mt-1 max-w-[55ch] text-sm leading-relaxed text-carbon/85">
                      {review.comment}
                    </p>
                  ) : null}
                  {canParticipate && sessionUserId ? (
                    <OfflineReportForm
                      userId={sessionUserId}
                      reviewId={review.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {canParticipate && sessionUserId ? (
          <OfflineReviewForm
            userId={sessionUserId}
            productId={item.id}
            establishmentId={item.establishment_id}
          />
        ) : (
          <p className="mt-8 max-w-[52ch] text-sm leading-relaxed text-carbon/65">
            {sessionUserId
              ? "Solo estudiantes institucionales de la UPTC pueden reseñar."
              : "Inicia sesión con tu correo institucional para reseñar desde el modo sin conexión."}
          </p>
        )}
      </article>
    </div>
  );
}
