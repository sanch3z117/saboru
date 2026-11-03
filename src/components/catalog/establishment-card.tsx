import Link from "next/link";

import type { PublicEstablishment } from "@/types/catalog";

import { PhotoPlaceholder } from "./photo-placeholder";

export function EstablishmentCard({
  establishment,
}: {
  establishment: Pick<
    PublicEstablishment,
    "id" | "name" | "slug" | "category" | "plan" | "description"
  >;
}) {
  return (
    <article className="flex flex-col">
      <PhotoPlaceholder className="aspect-[16/9] w-full sm:aspect-[4/3]" />
      <h3 className="mt-3 font-display text-lg leading-snug font-semibold">
        <Link
          href={`/establecimiento/${establishment.slug}`}
          className="underline-offset-4 hover:underline"
        >
          {establishment.name}
        </Link>
      </h3>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="text-sm text-carbon/70">{establishment.category}</span>
        {establishment.plan !== "basic" ? (
          <span className="bg-campus px-2 py-0.5 text-xs font-semibold text-carbon">
            Destacado
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-snug text-carbon/70">
        {establishment.description}
      </p>
    </article>
  );
}
