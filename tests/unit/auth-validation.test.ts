import { describe, expect, it } from "vitest";

import { homeForRole } from "@/lib/auth/roles";
import { emailSchema, studentEmailSchema } from "@/lib/auth/validation";

describe("studentEmailSchema", () => {
  it("normaliza mayúsculas y espacios", () => {
    const result = studentEmailSchema.safeParse("  Estudiante@UPTC.EDU.CO ");

    expect(result.success).toBe(true);
    expect(result.data).toBe("estudiante@uptc.edu.co");
  });

  it("rechaza correos de otros dominios", () => {
    const result = studentEmailSchema.safeParse("persona@gmail.com");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/institucional/i);
  });

  it("rechaza correos mal formados", () => {
    expect(studentEmailSchema.safeParse("sin-arroba").success).toBe(false);
  });
});

describe("emailSchema", () => {
  it("acepta correos externos válidos para vendedores", () => {
    const result = emailSchema.safeParse("Vendedor@Example.COM");

    expect(result.success).toBe(true);
    expect(result.data).toBe("vendedor@example.com");
  });
});

describe("homeForRole", () => {
  it("mapea cada rol a su ruta inicial", () => {
    expect(homeForRole("student")).toBe("/");
    expect(homeForRole("vendor")).toBe("/panel");
    expect(homeForRole("admin")).toBe("/admin");
  });
});
