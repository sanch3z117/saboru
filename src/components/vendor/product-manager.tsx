"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { useVendorFormFeedback } from "@/components/vendor/use-vendor-form-feedback";
import { formatPrice } from "@/lib/format";
import { initialVendorState } from "@/lib/vendor/form-state";
import {
  deleteProductAction,
  saveProductAction,
} from "@/server/actions/vendor";
import type { Database } from "@/types/database";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export function ProductManager({ products }: { products: ProductRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <ul className="divide-y divide-carbon/15 border-y border-carbon/15">
        {products.map((product) => (
          <li key={product.id} className="py-4">
            {editingId === product.id ? (
              <div>
                <h3 className="font-display text-base font-semibold text-carbon">
                  Editar {product.name}
                </h3>
                <ProductForm product={product} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setEditingId(null)}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-carbon">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm text-carbon/70">
                    {formatPrice(product.price_cop)}
                    <span aria-hidden="true"> · </span>
                    {product.category || "Sin categoría"}
                    <span aria-hidden="true"> · </span>
                    {product.available ? "Disponible" : "Agotado"}
                  </p>
                  {product.description ? (
                    <p className="mt-1 max-w-[55ch] text-sm leading-relaxed text-carbon/80">
                      {product.description}
                    </p>
                  ) : null}
                  {product.allergens.length > 0 ? (
                    <p className="mt-1 text-xs text-carbon/60">
                      Alérgenos: {product.allergens.join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingId(product.id)}
                  >
                    Editar
                  </Button>
                  <DeleteProductButton productId={product.id} />
                </div>
              </div>
            )}
          </li>
        ))}
        {products.length === 0 ? (
          <li className="py-4 text-base text-carbon/70">
            Aún no tienes productos. Agrega el primero aquí abajo.
          </li>
        ) : null}
      </ul>

      <div className="mt-6 border-t border-carbon/15 pt-4">
        <h3 className="font-display text-lg font-semibold text-carbon">
          Agregar producto
        </h3>
        <ProductForm />
      </div>
    </div>
  );
}

function ProductForm({ product }: { product?: ProductRow }) {
  const [state, formAction, pending] = useActionState(
    saveProductAction,
    initialVendorState,
  );
  useVendorFormFeedback(state, pending);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`name-${product?.id ?? "new"}`}
            className="text-sm font-medium text-carbon"
          >
            Nombre
          </label>
          <input
            id={`name-${product?.id ?? "new"}`}
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={product?.name}
            placeholder="Almuerzo del día"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`price-${product?.id ?? "new"}`}
            className="text-sm font-medium text-carbon"
          >
            Precio en pesos
          </label>
          <input
            id={`price-${product?.id ?? "new"}`}
            name="price_cop"
            type="number"
            inputMode="numeric"
            required
            min={500}
            max={200000}
            step={100}
            defaultValue={product?.price_cop}
            placeholder="9000"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`category-${product?.id ?? "new"}`}
            className="text-sm font-medium text-carbon"
          >
            Categoría
          </label>
          <input
            id={`category-${product?.id ?? "new"}`}
            name="category"
            maxLength={40}
            defaultValue={product?.category}
            placeholder="Almuerzo, bebida, postre…"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`allergens-${product?.id ?? "new"}`}
            className="text-sm font-medium text-carbon"
          >
            Alérgenos (separados por coma)
          </label>
          <input
            id={`allergens-${product?.id ?? "new"}`}
            name="allergens"
            maxLength={200}
            defaultValue={product?.allergens.join(", ")}
            placeholder="maní, lácteos"
            className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`description-${product?.id ?? "new"}`}
          className="text-sm font-medium text-carbon"
        >
          Descripción
        </label>
        <textarea
          id={`description-${product?.id ?? "new"}`}
          name="description"
          rows={2}
          maxLength={400}
          defaultValue={product?.description}
          placeholder="Qué lleva y por qué vale la pena."
          className="border border-carbon bg-cream px-3 py-2 text-base text-carbon placeholder:text-carbon/45"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-carbon">
        <input
          type="checkbox"
          name="available"
          defaultChecked={product?.available ?? true}
          className="size-4 accent-carbon"
        />
        Disponible hoy
      </label>

      {state.status === "error" ? (
        <p role="alert" className="text-sm font-semibold text-carbon">
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="w-fit"
        variant={product ? "secondary" : "default"}
      >
        {pending
          ? "Guardando…"
          : product
            ? "Guardar cambios"
            : "Agregar producto"}
      </Button>
    </form>
  );
}

function DeleteProductButton({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(
    deleteProductAction,
    initialVendorState,
  );
  useVendorFormFeedback(state, pending);

  return (
    <form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit" variant="link" size="sm" disabled={pending}>
        Eliminar
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-xs font-semibold text-carbon">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
