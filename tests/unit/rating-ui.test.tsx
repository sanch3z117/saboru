import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RatingStars } from "@/components/catalog/rating-stars";
import { StarRatingInput } from "@/components/reviews/star-rating-input";

describe("RatingStars", () => {
  it("muestra estrellas y el valor accesible", () => {
    render(<RatingStars value={4.5} reviewCount={12} />);

    expect(
      screen.getByRole("img", { name: "4,5 de 5, 12 reseñas" }),
    ).toBeInTheDocument();
  });

  it("explica cuando no hay reseñas suficientes", () => {
    render(<RatingStars value={null} />);

    expect(screen.getByText("Sin reseñas suficientes")).toBeInTheDocument();
  });
});

describe("StarRatingInput", () => {
  it("ofrece cinco radios accesibles por criterio", () => {
    render(
      <StarRatingInput name="rating_sabor" label="Sabor" required />,
    );

    for (const value of [1, 2, 3, 4, 5]) {
      expect(
        screen.getByRole("radio", {
          name: `${value} de 5 para Sabor`,
        }),
      ).toBeInTheDocument();
    }
  });

  it("marca el valor inicial al editar", () => {
    render(
      <StarRatingInput
        name="rating_sabor"
        label="Sabor"
        defaultValue={4}
      />,
    );

    expect(
      screen.getByRole("radio", { name: "4 de 5 para Sabor" }),
    ).toBeChecked();
  });
});
