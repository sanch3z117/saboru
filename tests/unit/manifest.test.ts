import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("manifest", () => {
  it("se instala como aplicación independiente en la raíz", () => {
    const result = manifest();

    expect(result.name).toContain("SaborU");
    expect(result.short_name).toBe("SaborU");
    expect(result.start_url).toBe("/");
    expect(result.scope).toBe("/");
    expect(result.display).toBe("standalone");
    expect(result.lang).toBe("es-CO");
  });

  it("declara los iconos 192, 512 y 1024, más el maskable", () => {
    const icons = manifest().icons ?? [];

    expect(icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "any" }),
        expect.objectContaining({ sizes: "1024x1024", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
    expect(icons).toHaveLength(4);
  });
});
