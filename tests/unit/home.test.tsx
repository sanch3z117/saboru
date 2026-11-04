import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/components/auth/session-menu", () => ({
  SessionMenu: () => null,
}));

vi.mock("@/components/discovery/discovery-surface", () => ({
  DiscoverySurface: () => <div data-testid="discovery-surface" />,
}));

vi.mock("@/server/queries/catalog", () => ({
  getFeaturedEstablishmentCards: async () => [],
}));

describe("HomePage", () => {
  it("presenta la propuesta, el descubrimiento y la sección Destacado", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /qué comer, cuánto cuesta y qué tan lejos queda/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("discovery-surface")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /destacado/i }),
    ).toBeInTheDocument();
  });
});
