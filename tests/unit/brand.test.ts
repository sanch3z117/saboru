import { describe, expect, it } from "vitest";

import { brand, brandColor } from "@/lib/brand";

describe("brand", () => {
  it("publica los colores documentados en docs/05", () => {
    expect(brand.colors).toEqual({
      campus: "#F5B800",
      antojo: "#F26B21",
      carbon: "#2B2B2B",
      cream: "#FFF6E5",
      verified: "#2E9E6B",
      verifiedSoft: "#E6F4EC",
      verifiedInk: "#1F7A50",
    });
  });

  it("usa Poppins para titulares e Inter para interfaz", () => {
    expect(brand.fonts.display).toBe("Poppins");
    expect(brand.fonts.sans).toBe("Inter");
  });

  it("fija radios de 12/10 px y sombra dura sin blur", () => {
    expect(brand.radius.card).toBe(12);
    expect(brand.radius.panel).toBe(10);
    expect(brand.shadow.hard).toBe("4px 4px 0 0 #2B2B2B");
    expect(brand.shadow.hard).not.toContain("blur");
  });

  it("expone los colores por nombre sin devolver undefined", () => {
    expect(brandColor("antojo")).toBe(brand.colors.antojo);
  });
});
