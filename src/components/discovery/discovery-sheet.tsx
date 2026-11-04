"use client";

import Link from "next/link";

import { MapPopup } from "@/components/map/map-popup";
import {
  DialogDescription,
  DialogTitle,
  Sheet,
  SheetContent,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import type { MapPlace } from "@/lib/map/places";

export function DiscoverySheet({
  place,
  items,
  onClose,
}: {
  place: MapPlace | null;
  items: CatalogSearchItem[];
  onClose: () => void;
}) {
  return (
    <Sheet
      open={Boolean(place)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {place ? (
        <SheetContent
          side="bottom"
          data-testid="discovery-sheet"
          className="max-h-[85dvh] overflow-y-auto"
        >
          <DialogTitle className="sr-only">{place.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Local seleccionado en el mapa, con sus productos coincidentes.
          </DialogDescription>

          <MapPopup place={place} />

          {items.length > 0 ? (
            <div className="mt-3 border-t border-carbon/15 pt-3">
              <p className="text-sm font-semibold text-carbon">
                {items.length}{" "}
                {items.length === 1
                  ? "producto coincide"
                  : "productos coinciden"}
              </p>
              <ul className="mt-1 divide-y divide-carbon/10">
                {items.map((item) => (
                  <li key={item.id} className="py-1.5 text-sm">
                    <Link
                      href={`/producto/${item.id}`}
                      className="font-medium text-carbon underline-offset-4 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <span className="text-carbon/60">
                      {" "}
                      · {formatPrice(item.price_cop)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
