import { afterEach, describe, expect, it, vi } from "vitest";

import { firstPhotoSrc, photoSrc } from "@/lib/photos";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("photoSrc", () => {
  it("devuelve null para una foto ausente o vacía", () => {
    expect(photoSrc(null)).toBeNull();
    expect(photoSrc(undefined)).toBeNull();
    expect(photoSrc("   ")).toBeNull();
  });

  it("respeta una URL absoluta", () => {
    expect(photoSrc("https://images.example.com/plato.webp")).toBe(
      "https://images.example.com/plato.webp",
    );
    expect(photoSrc("http://localhost:3000/demo/plato.webp")).toBe(
      "http://localhost:3000/demo/plato.webp",
    );
  });

  it("respeta un archivo servido por la app", () => {
    expect(photoSrc("/demo/plato.webp")).toBe("/demo/plato.webp");
  });

  it("convierte una ruta de Storage en URL pública", () => {
    expect(
      photoSrc(
        "3f0f7d1e-6f1a-4d0a-8d0e-3f0f7d1e6f1a/plato.webp",
        "https://demo.supabase.co/",
      ),
    ).toBe(
      "https://demo.supabase.co/storage/v1/object/public/establishment-photos/3f0f7d1e-6f1a-4d0a-8d0e-3f0f7d1e6f1a/plato.webp",
    );
  });

  it("usa NEXT_PUBLIC_SUPABASE_URL si no se pasa una base", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://env.supabase.co");

    expect(photoSrc("local/foto.webp")).toBe(
      "https://env.supabase.co/storage/v1/object/public/establishment-photos/local/foto.webp",
    );
  });

  it("devuelve null si no hay base configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(photoSrc("local/foto.webp")).toBeNull();
  });

  it("codifica los segmentos con espacios y conserva las barras", () => {
    expect(photoSrc("mi local/foto 1.webp", "https://demo.supabase.co")).toBe(
      "https://demo.supabase.co/storage/v1/object/public/establishment-photos/mi%20local/foto%201.webp",
    );
  });

  it("no interpreta un esquema peligroso como URL navegable", () => {
    expect(photoSrc("javascript:alert(1)", "https://demo.supabase.co")).toBe(
      "https://demo.supabase.co/storage/v1/object/public/establishment-photos/javascript%3Aalert(1)",
    );
  });
});

describe("firstPhotoSrc", () => {
  it("toma la primera foto de una lista", () => {
    expect(
      firstPhotoSrc(["a/uno.webp", "a/dos.webp"], "https://demo.supabase.co"),
    ).toContain("a/uno.webp");
  });

  it("devuelve null si la lista está vacía", () => {
    expect(firstPhotoSrc([], "https://demo.supabase.co")).toBeNull();
    expect(firstPhotoSrc(null, "https://demo.supabase.co")).toBeNull();
  });
});
