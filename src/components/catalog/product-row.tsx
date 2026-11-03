import Link from "next/link";

import { isOpenAt } from "@/lib/catalog/schedule";
import type { CatalogSearchItem } from "@/lib/catalog/search";
import { formatDistance, formatPrice } from "@/lib/format";

export function ProductRow({ item }: { item: CatalogSearchItem }) {
  const open = isOpenAt(item.establishment_schedule, new Date());

  return (
    <li className="grid gap-2 border-b border-carbon/15 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline">
      <div>
        <h3 className="font-display text-lg leading-snug font-semibold">
          <Link
            href={`/producto/${item.id}`}
            className="underline-offset-4 hover:underline"
          >
            {item.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-carbon/75">
          <Link
            href={`/establecimiento/${item.establishment_slug}`}
            className="underline underline-offset-4"
          >
            {item.establishment_name}
          </Link>{" "}
          · {item.category} · {formatDistance(item.distance_m)}
        </p>
      </div>

      <div className="sm:text-right">
        <p className="font-display text-lg font-semibold">
          {formatPrice(item.price_cop)}
        </p>
        <p className="text-sm text-carbon/70">
          {open ? "Abierto ahora" : "Cerrado"}
        </p>
      </div>
    </li>
  );
}
