import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginación de resultados"
      className="mt-8 flex items-center justify-between gap-4 border-t border-carbon/15 pt-4 text-sm"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="font-semibold text-carbon underline underline-offset-4"
        >
          Anterior
        </Link>
      ) : (
        <span className="text-carbon/40">Anterior</span>
      )}

      <span className="text-carbon/70">
        Página {page} de {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="font-semibold text-carbon underline underline-offset-4"
        >
          Siguiente
        </Link>
      ) : (
        <span className="text-carbon/40">Siguiente</span>
      )}
    </nav>
  );
}
