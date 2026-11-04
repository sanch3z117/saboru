import { RotateCcw } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function MapFallback({
  message,
  provider,
  onRetry,
}: {
  message: string;
  provider: "maptiler" | "osm";
  onRetry?: () => void;
}) {
  return (
    <div
      data-testid="map-fallback"
      className="absolute inset-0 z-20 flex flex-col justify-between gap-4 overflow-y-auto bg-cream p-4 sm:p-5"
    >
      <Alert tone="warning" title="El mapa no está disponible">
        <p>{message}</p>
        <p className="mt-1 text-carbon/70">
          Puedes ver los locales y la distancia en la lista de abajo.
        </p>
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-carbon/55">
          {provider === "maptiler"
            ? "© MapTiler · © OpenStreetMap contributors"
            : "© OpenStreetMap contributors"}
        </p>
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Reintentar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
