import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/components/auth/session-menu", () => ({
  SessionMenu: () => null,
}));

vi.mock("@/server/queries/catalog", () => ({
  getBlocks: async () => [{ id: "block-1", name: "Bloque Central" }],
  getCategories: async () => ["almuerzos"],
  getDefaultBlock: async () => ({ id: "block-1", name: "Bloque Central" }),
  getFeaturedEstablishments: async () => [],
}));

describe("HomePage", () => {
  it("presenta la propuesta, el buscador y la sección Destacado", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /qué comer, cuánto cuesta y qué tan lejos queda/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /busca por presupuesto y cercanía/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("spinbutton", { name: "Presupuesto (COP)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /destacado/i }),
    ).toBeInTheDocument();
  });
});
