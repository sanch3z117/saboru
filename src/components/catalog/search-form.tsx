import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

export function SearchForm({ blocks, categories, defaults }: SearchFormProps) {
  return (
    <form
      action="/buscar"
      method="get"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="presupuesto">Presupuesto (COP)</Label>
        <Input
          id="presupuesto"
          name="presupuesto"
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          placeholder="Sin límite"
          defaultValue={defaults?.budget ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="bloque">Bloque</Label>
        <Select
          id="bloque"
          name="bloque"
          defaultValue={defaults?.blockId ?? blocks[0]?.id ?? ""}
        >
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="categoria">Categoría</Label>
        <Select
          id="categoria"
          name="categoria"
          defaultValue={defaults?.category ?? ""}
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:flex-col lg:items-start lg:gap-2">
        <Label className="flex items-center gap-2 leading-normal">
          <input
            type="checkbox"
            name="abierto"
            value="1"
            defaultChecked={defaults?.openNow}
            className="size-4 accent-carbon"
          />
          Abierto ahora
        </Label>
        <Button type="submit" className="w-full sm:w-auto">
          Buscar
        </Button>
      </div>
    </form>
  );
}
