"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/catalog/pagination";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  DEFAULT_CATALOG_ORDER,
  DISCOVERY_PAGE_SIZE,
  discoverySearchParams,
  parseDiscoveryFilters,
  type DiscoveryFilters,
} from "@/lib/catalog/discovery";
import { searchCatalog, paginate } from "@/lib/catalog/search";
import { CAMPUS_CENTER } from "@/lib/map/config";
import {
  groupSearchItemsByPlace,
  type SearchPlaceGroup,
} from "@/lib/map/places";
import { snapshotToSearchItems } from "@/lib/offline/snapshot";
import type { CatalogSnapshot } from "@/types/catalog";

import { DiscoveryResults } from "./discovery-results";
import { DiscoverySearch } from "./discovery-search";
import { DiscoverySheet } from "./discovery-sheet";
import { DiscoverySkeleton } from "./discovery-skeleton";
import {
  DISCOVERY_GRID_CLASS,
  DISCOVERY_MAP_FRAME_CLASS,
} from "./discovery-layout";
import { CampusMapLoader } from "@/components/map/campus-map-loader";
import { cn } from "@/lib/utils";

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60_000,
};

function isCatalogSnapshot(value: unknown): value is CatalogSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<CatalogSnapshot>;
  return (
    Array.isArray(snapshot.blocks) &&
    Array.isArray(snapshot.establishments) &&
    Array.isArray(snapshot.products) &&
    Array.isArray(snapshot.product_stats) &&
    Array.isArray(snapshot.reviews)
  );
}

function DiscoveryError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-6 max-w-xl">
      <Alert tone="error" title="No pudimos cargar el catálogo">
        {message}
      </Alert>
      <Button type="button" className="mt-4" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

export function DiscoverySurface() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseDiscoveryFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [queryInput, setQueryInput] = useState(filters.q);
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);

  const geolocation = useGeolocation(GEOLOCATION_OPTIONS);
  const isMobile = useIsMobile();

  useEffect(() => {
    setQueryInput(filters.q);
  }, [filters.q]);

  const commitFilters = useCallback(
    (patch: Partial<DiscoveryFilters>) => {
      const next: DiscoveryFilters = {
        ...filters,
        q: queryInput,
        ...patch,
      };
      const params = discoverySearchParams(next);
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    },
    [filters, pathname, queryInput, router],
  );

  useEffect(() => {
    if (queryInput === filters.q) return;
    const timer = window.setTimeout(() => {
      commitFilters({ q: queryInput, page: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [commitFilters, filters.q, queryInput]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setStatus("loading");
    setErrorMessage(null);
    setSnapshot(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("error");
      setErrorMessage("Sin conexión. Vuelve a conectarte para buscar.");
      return () => {
        active = false;
        controller.abort();
      };
    }

    fetch("/api/catalog/snapshot", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("snapshot");
        const data: unknown = await response.json();
        if (!isCatalogSnapshot(data)) throw new Error("snapshot-format");
        if (!active) return;
        setSnapshot(data);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStatus("error");
        setErrorMessage(
          navigator.onLine
            ? "Revisa tu conexión e inténtalo de nuevo."
            : "Sin conexión. Vuelve a conectarte para buscar.",
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const blocks = useMemo(
    () => (snapshot?.blocks ?? []).filter((block) => block.latitude !== null),
    [snapshot],
  );

  const activeBlock = useMemo(
    () =>
      blocks.find((block) => block.id === filters.blockId) ??
      blocks.find((block) => block.name === "Bloque Central") ??
      blocks[0] ??
      null,
    [blocks, filters.blockId],
  );

  const origin = useMemo(() => {
    if (geolocation.position) return geolocation.position;
    if (
      activeBlock &&
      activeBlock.latitude !== null &&
      activeBlock.longitude !== null
    ) {
      return {
        latitude: activeBlock.latitude,
        longitude: activeBlock.longitude,
      };
    }
    return CAMPUS_CENTER;
  }, [activeBlock, geolocation.position]);

  const categories = useMemo(() => {
    const unique = new Set(
      (snapshot?.products ?? [])
        .map((product) => product.category)
        .filter(Boolean),
    );
    return [...unique].sort((a, b) => a.localeCompare(b, "es"));
  }, [snapshot]);

  const items = useMemo(
    () => (snapshot ? snapshotToSearchItems(snapshot, origin) : []),
    [origin, snapshot],
  );

  const filtered = useMemo(
    () =>
      searchCatalog(items, {
        q: filters.q,
        budget: filters.budget,
        category: filters.category,
        maxDistanceM: 5000,
        openNow: filters.openNow,
        order: filters.order,
        origin,
      }),
    [filters, items, origin],
  );

  const pageData = useMemo(
    () => paginate(filtered, filters.page, DISCOVERY_PAGE_SIZE),
    [filtered, filters.page],
  );

  const groups: SearchPlaceGroup[] = useMemo(
    () => (snapshot ? groupSearchItemsByPlace(snapshot, pageData.items) : []),
    [pageData.items, snapshot],
  );

  const places = useMemo(() => groups.map((group) => group.place), [groups]);

  const selectedPlace = places.find((place) => place.id === selectedId) ?? null;
  const selectedGroup = selectedId
    ? groups.find((group) => group.place.id === selectedId)
    : undefined;

  useEffect(() => {
    if (selectedId && !places.some((place) => place.id === selectedId)) {
      setSelectedId(null);
    }
  }, [places, selectedId]);

  const handleSelect = useCallback((placeId: string | null) => {
    setSelectedId(placeId);
    if (placeId) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(`discovery-place-${placeId}`)
          ?.scrollIntoView({ block: "nearest" });
      });
    }
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(null);
    setQueryInput("");
    commitFilters({
      q: "",
      category: null,
      budget: null,
      openNow: false,
      order: DEFAULT_CATALOG_ORDER,
      page: 1,
      blockId: null,
    });
  }, [commitFilters]);

  if (status === "loading") {
    return <DiscoverySkeleton />;
  }

  if (status === "error" || !snapshot) {
    return (
      <DiscoveryError
        message={errorMessage ?? "El catálogo no está disponible."}
        onRetry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  const locationMessage =
    geolocation.status === "denied" ||
    geolocation.status === "unavailable" ||
    geolocation.status === "timeout" ||
    geolocation.status === "unsupported";
  const fallbackName = activeBlock?.name ?? "el centro del campus";

  return (
    <div>
      <DiscoverySearch
        query={queryInput}
        onQueryChange={setQueryInput}
        filters={filters}
        categories={categories}
        onFiltersChange={commitFilters}
        onClear={handleClear}
      />

      {!online ? (
        <Alert tone="warning" className="mt-3">
          Sin conexión: el mapa no está disponible; la lista sigue abierta.
        </Alert>
      ) : null}

      {locationMessage ? (
        <Alert tone="warning" className="mt-3">
          Usando {fallbackName} como referencia. Activa la ubicación para ver
          distancias desde donde estás.
        </Alert>
      ) : null}

      {geolocation.status === "granted" ? (
        <p role="status" className="mt-3 text-sm text-carbon/70">
          Viendo distancias desde tu ubicación.
        </p>
      ) : null}

      <div className={cn(DISCOVERY_GRID_CLASS, "mt-4")}>
        <div className={DISCOVERY_MAP_FRAME_CLASS}>
          <h2 className="sr-only">Mapa del campus</h2>
          <CampusMapLoader
            places={places}
            blocks={snapshot.blocks}
            origin={origin}
            userPosition={geolocation.position}
            selectedId={selectedId}
            onSelect={handleSelect}
            onLocate={geolocation.request}
            locating={geolocation.status === "locating"}
            describedBy="resultados-titulo"
          />
        </div>

        <div className="min-w-0">
          <DiscoveryResults
            groups={groups}
            totalProducts={pageData.items.length}
            selectedId={selectedId}
            onSelect={handleSelect}
            onClear={handleClear}
          />
          {pageData.totalPages > 1 ? (
            <Pagination
              page={pageData.page}
              totalPages={pageData.totalPages}
              hrefFor={(page) => {
                const params = discoverySearchParams({
                  ...filters,
                  page,
                });
                const query = params.toString();
                return `${pathname}${query ? `?${query}` : ""}`;
              }}
            />
          ) : null}
        </div>
      </div>

      {isMobile ? (
        <DiscoverySheet
          place={selectedPlace}
          items={selectedGroup?.items ?? []}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
