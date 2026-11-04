import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SaboruLogo } from "@/components/brand/saboru-logo";

describe("SaboruLogo", () => {
  it("genera un id de título único por instancia", () => {
    const { container } = render(
      <>
        <SaboruLogo />
        <SaboruLogo />
      </>,
    );

    const logos = Array.from(
      container.querySelectorAll<SVGSVGElement>('svg[role="img"]'),
    );
    expect(logos).toHaveLength(2);

    const titleIds = logos.map((logo) => logo.getAttribute("aria-labelledby"));
    expect(titleIds.every(Boolean)).toBe(true);
    expect(new Set(titleIds).size).toBe(2);

    for (const [index, logo] of logos.entries()) {
      const titleId = titleIds[index];
      const title = logo.querySelector("title");
      expect(title?.getAttribute("id")).toBe(titleId);
      expect(title?.textContent).toContain("SaborU");
    }
  });

  it("dibuja el pin con los colores de marca", () => {
    const { container } = render(<SaboruLogo />);
    const pin = container.querySelector("svg path");

    expect(pin?.getAttribute("fill")).toBe("#F5B800");
    expect(pin?.getAttribute("stroke")).toBe("#2B2B2B");
  });
});
