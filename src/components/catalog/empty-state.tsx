import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref = "/",
  actionLabel = "Volver al inicio",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="border-t border-carbon/20 py-10">
      <p className="font-display text-xl font-semibold text-carbon">{title}</p>
      <p className="mt-2 max-w-[52ch] text-base leading-relaxed text-carbon/75">
        {description}
      </p>
      <Link
        href={actionHref}
        className="mt-4 inline-block text-sm font-semibold text-carbon underline underline-offset-4"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
