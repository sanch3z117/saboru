/**
 * Destino de los redirects de Auth. En Vercel Preview se queda en el host del
 * deployment para no perder la cookie de sesión; en producción y local usa el
 * origen canónico configurado.
 */
export function resolveAuthSiteUrl({
  origin,
  vercelEnv = process.env.VERCEL_ENV,
  vercelUrl = process.env.VERCEL_URL,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL,
}: {
  origin: string;
  vercelEnv?: string;
  vercelUrl?: string;
  siteUrl?: string;
}) {
  if (vercelEnv === "preview" && vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return siteUrl ?? origin;
}
