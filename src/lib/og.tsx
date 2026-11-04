import { brand } from "@/lib/brand";
import { photoSrc } from "@/lib/photos";

/**
 * Satori no procesa WebP de forma fiable; este endpoint entrega un PNG con la
 * foto pública o un 404, y la tarjeta usa el fallback de marca.
 */
export async function fetchOgPhoto(path: string | null | undefined) {
  const value = path?.trim();
  if (!value || !photoSrc(value)) return null;
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
  return `${base}/api/og-photo?path=${encodeURIComponent(value)}`;
}

export function OgCard({
  title,
  subtitle,
  meta,
  photo,
}: {
  title: string;
  subtitle: string;
  meta: string;
  photo: string | null;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: brand.colors.cream,
        color: brand.colors.carbon,
        fontFamily: "sans-serif",
        border: `16px solid ${brand.colors.carbon}`,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "54px",
              height: "54px",
              borderRadius: "9999px",
              backgroundColor: brand.colors.campus,
              border: `4px solid ${brand.colors.carbon}`,
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            U
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            <span>
              Sabor<span style={{ color: brand.colors.antojo }}>U</span>
            </span>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 400,
                color: "rgba(43,43,43,0.65)",
              }}
            >
              Antojo con criterio.
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <span
            style={{
              display: "flex",
              alignSelf: "flex-start",
              borderRadius: "9999px",
              backgroundColor: brand.colors.campus,
              padding: "8px 16px",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {subtitle}
          </span>
          <div
            style={{
              fontSize: "64px",
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: "620px",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 600,
              color: "rgba(43,43,43,0.72)",
            }}
          >
            {meta}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "20px",
            color: "rgba(43,43,43,0.65)",
          }}
        >
          <span
            style={{
              display: "flex",
              width: "16px",
              height: "16px",
              borderRadius: "9999px",
              backgroundColor: brand.colors.verified,
            }}
          />
          UPTC · Tunja
        </div>
      </div>

      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          width={440}
          height={630}
          style={{ width: "440px", height: "630px", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: "440px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: brand.colors.campus,
            fontSize: "150px",
            fontWeight: 800,
            color: brand.colors.carbon,
          }}
        >
          U
        </div>
      )}
    </div>
  );
}
