import {
  LoaderCircle,
  LocateFixed,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export function MapControls({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onLocate,
  locating,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onLocate: () => void;
  locating: boolean;
}) {
  return (
    <div
      data-testid="map-controls"
      className="absolute top-3 right-3 z-10 flex flex-col gap-2"
    >
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={onZoomIn}
        aria-label="Acercar el mapa"
        title="Acercar"
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={onZoomOut}
        aria-label="Alejar el mapa"
        title="Alejar"
      >
        <Minus aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={onRecenter}
        aria-label="Centrar en el campus"
        title="Centrar en el campus"
      >
        <Maximize2 aria-hidden="true" className="size-4" />
      </Button>
      <Button
        type="button"
        variant="default"
        size="icon"
        onClick={onLocate}
        disabled={locating}
        aria-label="Usar mi ubicación"
        title="Usar mi ubicación"
      >
        {locating ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LocateFixed aria-hidden="true" className="size-4" />
        )}
      </Button>
    </div>
  );
}
