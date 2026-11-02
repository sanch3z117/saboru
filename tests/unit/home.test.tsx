import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("HomePage", () => {
  it("presenta la propuesta y los tres criterios de búsqueda", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /qué comer, cuánto cuesta y qué tan lejos queda/i,
      }),
    ).toBeInTheDocument();

    for (const criterion of ["Presupuesto", "Cercanía", "Calidad"]) {
      expect(screen.getByText(criterion)).toBeInTheDocument();
    }
  });
});
