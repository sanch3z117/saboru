import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";

import { ServiceWorkerUpdate } from "@/components/offline/service-worker-update";
import { SyncProvider } from "@/components/offline/sync-provider";
import { ViewerRefresher } from "@/components/offline/viewer-refresher";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://127.0.0.1:3000",
  ),
  title: {
    default: "SaborU · Antojo con criterio",
    template: "%s · SaborU",
  },
  description:
    "Descubre, compara y califica dónde comer en tu campus: presupuesto, cercanía y reseñas de estudiantes de la UPTC.",
  applicationName: "SaborU",
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5b800",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased`}
      >
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:border-2 focus:border-carbon focus:bg-campus focus:px-4 focus:text-sm focus:font-semibold focus:text-carbon"
        >
          Saltar al contenido
        </a>
        {children}
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col">
          <SyncProvider />
          <ServiceWorkerUpdate />
        </div>
        <ViewerRefresher />
      </body>
    </html>
  );
}
