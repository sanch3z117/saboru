import { describe, expect, it } from "vitest";

import {
  BUDGET_MAX_COP,
  BUDGET_MIN_COP,
  BUDGET_STEP_COP,
  budgetForSlider,
  discoverySearchParams,
  hasActiveDiscoveryFilters,
  parseDiscoveryFilters,
} from "@/lib/catalog/discovery";

describe("filtros de descubrimiento en la URL", () => {
  it("lee y valida los parámetros compartibles", () => {
    const filters = parseDiscoveryFilters(
      new URLSearchParams(
        "q=%20arepa%20&categoria=fritos&presupuesto=10000&abierto=1&orden=price&pagina=3&bloque=block-1",
      ),
    );

    expect(filters).toEqual({
      q: "arepa",
      category: "fritos",
      budget: 10000,
      openNow: true,
      order: "price",
      page: 3,
      blockId: "block-1",
    });
  });

  it("ignora valores inválidos y aplica defaults", () => {
    const filters = parseDiscoveryFilters(
      new URLSearchParams(
        "presupuesto=-3&orden=caro&pagina=0&categoria=&bloque=",
      ),
    );

    expect(filters).toMatchObject({
      budget: null,
      order: "distance",
      page: 1,
      category: null,
      blockId: null,
    });
    expect(hasActiveDiscoveryFilters(filters)).toBe(false);
  });

  it("mapea el presupuesto a la barra visible", () => {
    expect(budgetForSlider(null)).toBe(BUDGET_MAX_COP);
    expect(budgetForSlider(6500)).toBe(6500);
    expect(budgetForSlider(100)).toBe(BUDGET_MIN_COP);
    expect(budgetForSlider(10000)).toBe(BUDGET_MAX_COP);
    expect(BUDGET_STEP_COP).toBe(100);
  });

  it("serializa solo lo distinto del estado por defecto", () => {
    const empty = discoverySearchParams({
      q: "",
      category: null,
      budget: null,
      openNow: false,
      order: "distance",
      page: 1,
      blockId: null,
    });
    expect(empty.toString()).toBe("");

    const params = discoverySearchParams({
      q: "café",
      category: "bebidas",
      budget: 5000,
      openNow: true,
      order: "rating",
      page: 2,
      blockId: "block-1",
    });
    expect(params.toString()).toBe(
      "q=caf%C3%A9&categoria=bebidas&presupuesto=5000&abierto=1&orden=rating&pagina=2&bloque=block-1",
    );
    expect(hasActiveDiscoveryFilters(parseDiscoveryFilters(params))).toBe(true);
  });
});
