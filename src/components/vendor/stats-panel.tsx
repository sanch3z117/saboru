import { formatDate, formatRating } from "@/lib/format";
import type { ProductRow, VendorDashboard } from "@/server/queries/vendor";

const CRITERIA = [
  { key: "avg_sabor", label: "Sabor" },
  { key: "avg_cantidad", label: "Cantidad" },
  { key: "avg_precio", label: "Precio" },
  { key: "avg_presentacion", label: "Presentación" },
  { key: "avg_calidad_precio", label: "Calidad/precio" },
] as const;

function EmptyStats({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-[52ch] border-l-2 border-carbon/25 pl-3 text-sm leading-relaxed text-carbon/70">
      {children}
    </p>
  );
}

export function StatsPanel({
  dashboard,
  products,
}: {
  dashboard: VendorDashboard;
  products: ProductRow[];
}) {
  const productNames = new Map(products.map((item) => [item.id, item.name]));
  const maxHourCount = Math.max(
    1,
    ...dashboard.viewsByHour.map((row) => row.view_count),
  );

  if (dashboard.forbidden) {
    return (
      <p className="text-sm text-carbon/70">
        No pudimos leer las estadísticas de este local.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-display text-xl font-semibold text-carbon">
          Tu local frente al campus
        </h2>
        {dashboard.comparison ? (
          <div className="mt-3 border-y border-carbon/20 py-4">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <p className="text-sm text-carbon/65">Tu promedio</p>
                <p className="font-display text-4xl leading-none font-extrabold text-carbon">
                  {dashboard.comparison.local_avg === null
                    ? "—"
                    : formatRating(dashboard.comparison.local_avg)}
                </p>
                <p className="mt-1 text-sm text-carbon/60">
                  Con {dashboard.comparison.local_review_count} reseñas
                </p>
              </div>
              <div>
                <p className="text-sm text-carbon/65">Campus</p>
                <p className="font-display text-4xl leading-none font-extrabold text-carbon/55">
                  {dashboard.comparison.campus_avg === null
                    ? "—"
                    : formatRating(dashboard.comparison.campus_avg)}
                </p>
              </div>
              {dashboard.comparison.campus_avg === null ||
              dashboard.comparison.local_avg === null ? (
                <p className="pb-1 text-sm text-carbon/70">
                  El campus todavía no tiene reseñas suficientes para comparar.
                </p>
              ) : (
                <p className="pb-1 text-sm font-semibold text-carbon">
                  {dashboard.comparison.local_avg >=
                  dashboard.comparison.campus_avg
                    ? "Estás por encima del campus"
                    : "Todavía por debajo del campus"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyStats>
            Necesitas al menos 5 reseñas publicadas en el local para comparar
            tu promedio con el del campus. Mientras tanto, la ficha sigue
            recibiendo reseñas.
          </EmptyStats>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-carbon">
          Reseñas por producto
        </h2>
        {dashboard.stats.length === 0 ? (
          <EmptyStats>
            Ningún producto llega todavía al mínimo de 5 reseñas. Cuando lo
            alcance, verás aquí su promedio por criterio.
          </EmptyStats>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-carbon/30 text-left text-carbon/70">
                  <th className="py-2 pr-3 font-semibold">Producto</th>
                  <th className="py-2 pr-3 font-semibold">Reseñas</th>
                  {CRITERIA.map((criterion) => (
                    <th key={criterion.key} className="py-2 pr-3 font-semibold">
                      {criterion.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {dashboard.stats.map((row) => (
                  <tr key={row.product_id} className="border-b border-carbon/10">
                    <td className="py-2 pr-3 font-medium text-carbon">
                      {productNames.get(row.product_id) ?? "Producto"}
                    </td>
                    <td className="py-2 pr-3 text-carbon/80">
                      {row.review_count}
                    </td>
                    {CRITERIA.map((criterion) => (
                      <td key={criterion.key} className="py-2 pr-3 text-carbon/80">
                        {formatRating(row[criterion.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-carbon">
          Productos más consultados
        </h2>
        {dashboard.topProducts.length === 0 ? (
          <EmptyStats>
            Aún no hay consultas registradas. Se cuentan cuando alguien abre la
            ficha de un producto.
          </EmptyStats>
        ) : (
          <ol className="mt-3 divide-y divide-carbon/10 border-y border-carbon/20">
            {dashboard.topProducts.map((row, index) => (
              <li
                key={row.product_id}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="flex min-w-0 items-baseline gap-3">
                  <span className="font-display text-sm font-semibold text-carbon/50">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm text-carbon">{row.name}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon/80">
                  {row.view_count} consultas
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-carbon">
          Consultas por hora
        </h2>
        {dashboard.viewsByHour.length === 0 ? (
          <EmptyStats>
            Sin consultas todavía. Cuando lleguen, verás a qué horas busca la
            gente tu comida.
          </EmptyStats>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {dashboard.viewsByHour.map((row) => (
              <li key={row.hour} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-sm tabular-nums text-carbon/70">
                  {String(row.hour).padStart(2, "0")}:00
                </span>
                <span className="h-3 flex-1 bg-carbon/10">
                  <span
                    className="block h-full bg-campus"
                    style={{
                      width: `${Math.max(6, (row.view_count / maxHourCount) * 100)}%`,
                    }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-carbon/80">
                  {row.view_count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-carbon">
          Comentarios recientes
        </h2>
        <p className="mt-1 text-sm text-carbon/60">
          Sin autor: solo el comentario, el producto y las notas.
        </p>
        {dashboard.comments.length === 0 ? (
          <EmptyStats>
            Los comentarios aparecen cuando el local supera 5 reseñas
            publicadas. No mostramos quién los escribió.
          </EmptyStats>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {dashboard.comments.map((row, index) => (
              <li
                key={`${row.product_id}-${row.created_at}-${index}`}
                className="border-l-2 border-campus pl-3"
              >
                <p className="text-sm font-semibold text-carbon">
                  {row.product_name}
                  <span className="font-normal text-carbon/55">
                    <span aria-hidden="true"> · </span>
                    {formatDate(row.created_at)}
                  </span>
                </p>
                <p className="mt-1 max-w-[55ch] text-sm leading-relaxed text-carbon/85">
                  {row.comment}
                </p>
                <p className="mt-1 text-xs tabular-nums text-carbon/60">
                  Sabor {row.rating_sabor} · Cantidad {row.rating_cantidad} ·
                  Precio {row.rating_precio} · Presentación{" "}
                  {row.rating_presentacion} · Calidad/precio{" "}
                  {row.rating_calidad_precio}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
