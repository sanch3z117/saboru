import { describe, expect, it } from "vitest";

import { adminErrorMessage } from "@/lib/admin/errors";
import {
  adminEstablishmentPlanSchema,
  adminEstablishmentSchema,
  adminEstablishmentStatusSchema,
  adminInviteSchema,
  adminReportStatusSchema,
  adminReviewStatusSchema,
} from "@/lib/validations/admin";

const BLOCK_ID = "00000000-0000-4000-8000-000000000001";

const validEstablishment = {
  name: "Cafetería Central",
  slug: "cafeteria-central",
  description: "Café y panadería",
  address: "Bloque Central",
  category: "café",
  blockId: BLOCK_ID,
  lat: "5.552",
  lng: "-73.3567",
};

describe("validaciones de admin", () => {
  it("acepta un local válido y normaliza el slug", () => {
    const parsed = adminEstablishmentSchema.safeParse({
      ...validEstablishment,
      name: "Cafetería Central",
      slug: "  Cafeteria-Central  ",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slug).toBe("cafeteria-central");
      expect(parsed.data.lat).toBe(5.552);
      expect(parsed.data.lng).toBe(-73.3567);
    }
  });

  it("rechaza slug inválido, bloque inválido y coordenadas fuera de rango", () => {
    expect(
      adminEstablishmentSchema.safeParse({
        ...validEstablishment,
        slug: "con espacios",
      }).success,
    ).toBe(false);

    expect(
      adminEstablishmentSchema.safeParse({
        ...validEstablishment,
        blockId: "no-es-uuid",
      }).success,
    ).toBe(false);

    expect(
      adminEstablishmentSchema.safeParse({
        ...validEstablishment,
        lat: "95",
      }).success,
    ).toBe(false);
  });

  it("valida los enums de estado y plan", () => {
    expect(adminReviewStatusSchema.safeParse("hidden").success).toBe(true);
    expect(adminReviewStatusSchema.safeParse("deleted").success).toBe(false);
    expect(adminReportStatusSchema.safeParse("dismissed").success).toBe(true);
    expect(adminReportStatusSchema.safeParse("open").success).toBe(false);
    expect(adminEstablishmentStatusSchema.safeParse("active").success).toBe(
      true,
    );
    expect(adminEstablishmentStatusSchema.safeParse("draft").success).toBe(
      false,
    );
    expect(adminEstablishmentPlanSchema.safeParse("featured").success).toBe(
      true,
    );
    expect(adminEstablishmentPlanSchema.safeParse("gold").success).toBe(false);
  });

  it("normaliza el correo de la invitación", () => {
    const parsed = adminInviteSchema.safeParse({
      email: "  Nuevo.Vendedor@Example.COM ",
      establishmentId: BLOCK_ID,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.email).toBe("nuevo.vendedor@example.com");
    }

    expect(
      adminInviteSchema.safeParse({
        email: "sin-arroba",
        establishmentId: BLOCK_ID,
      }).success,
    ).toBe(false);
  });
});

describe("mensajes de error de admin", () => {
  it("traduce permisos, slugs, invitaciones y errores desconocidos", () => {
    expect(adminErrorMessage({ code: "42501" })).toContain("administrador");
    expect(adminErrorMessage({ message: "slug_exists" })).toContain("slug");
    expect(adminErrorMessage({ message: "invite_exists" })).toContain(
      "invitación",
    );
    expect(adminErrorMessage({ message: "algo-inesperado" })).toContain(
      "Intenta de nuevo",
    );
  });
});
