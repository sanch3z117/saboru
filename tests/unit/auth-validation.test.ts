import { describe, expect, it } from "vitest";

import { DEMO_EMAIL_NOTICE, demoEmailModeEnabled } from "@/lib/auth/demo";
import { homeForRole } from "@/lib/auth/roles";
import {
  emailSchema,
  studentEmailSchema,
  studentRegistrationEmailSchema,
} from "@/lib/auth/validation";

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

describe("modo demo de correo", () => {
  it("solo se activa con el valor exacto true", () => {
    expect(demoEmailModeEnabled("true")).toBe(true);
    expect(demoEmailModeEnabled("false")).toBe(false);
    expect(demoEmailModeEnabled("TRUE")).toBe(false);
    expect(demoEmailModeEnabled("")).toBe(false);
    expect(demoEmailModeEnabled(undefined)).toBe(false);
  });

  it("mantiene la regla institucional cuando está apagado", () => {
    const schema = studentRegistrationEmailSchema(false);

    expect(schema.safeParse("persona@gmail.com").success).toBe(false);
    expect(schema.safeParse("persona@uptc.edu.co").success).toBe(true);
  });

  it("acepta y normaliza correos externos cuando está encendido", () => {
    const result = studentRegistrationEmailSchema(true).safeParse(
      " Demo.Persona@Gmail.COM ",
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe("demo.persona@gmail.com");
  });

  it("usa el aviso exacto acordado", () => {
    expect(DEMO_EMAIL_NOTICE).toBe(
      "Modo demo: puedes registrarte con cualquier correo",
    );
  });
});

describe("homeForRole", () => {
  it("mapea cada rol a su ruta inicial", () => {
    expect(homeForRole("student")).toBe("/");
    expect(homeForRole("vendor")).toBe("/panel");
    expect(homeForRole("admin")).toBe("/admin");
  });
});
