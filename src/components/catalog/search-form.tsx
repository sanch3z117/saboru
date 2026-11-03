import { Button } from "@/components/ui/button";
import type { BlockRow } from "@/types/catalog";

type SearchFormProps = {
  blocks: BlockRow[];
  categories: string[];
  defaults?: {
    budget?: string;
    blockId?: string;
    category?: string;
    openNow?: boolean;
  };
};

const fieldClass =
  "h-11 w-full rounded-none border border-carbon bg-cream px-3 text-base text-carbon placeholder:text-carbon/50";
const labelClass = "text-sm font-medium text-carbon";

export function SearchForm({ blocks, categories, defaults }: SearchFormProps) {
  return (
    <form
      action="/buscar"
      method="get"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="presupuesto" className={labelClass}>
          Presupuesto (COP)
        </label>
        <input
          id="presupuesto"
          name="presupuesto"
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          placeholder="Sin límite"
          defaultValue={defaults?.budget ?? ""}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="bloque" className={labelClass}>
          Bloque
        </label>
        <select
          id="bloque"
          name="bloque"
          defaultValue={defaults?.blockId ?? blocks[0]?.id ?? ""}
          className={fieldClass}
        >
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoria" className={labelClass}>
          Categoría
        </label>
        <select
          id="categoria"
          name="categoria"
          defaultValue={defaults?.category ?? ""}
          className={fieldClass}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:flex-col lg:items-start lg:gap-2">
        <label className="flex items-center gap-2 text-sm font-medium text-carbon">
          <input
            type="checkbox"
            name="abierto"
            value="1"
            defaultChecked={defaults?.openNow}
            className="size-4 accent-carbon"
          />
          Abierto ahora
        </label>
        <Button type="submit" className="w-full sm:w-auto">
          Buscar
        </Button>
      </div>
    </form>
  );
}
