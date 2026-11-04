"use client";

import { useId } from "react";

import { brand } from "@/lib/brand";

/**
 * Logotipo horizontal de SaborU.
 *
 * Es un componente cliente porque `useId` genera un id distinto por instancia
 * para el `<title>`; antes se repetía `saboru-logo-title` y el nombre accesible
 * de la segunda instancia apuntaba al primero.
 */
export function SaboruLogo({ className }: { className?: string }) {
  const titleId = useId();

  return (
    <svg
      viewBox="0 0 820 220"
      className={className}
      role="img"
      aria-labelledby={titleId}
      focusable="false"
    >
      <title id={titleId}>SaborU — Antojo con criterio</title>
      <g transform="translate(24 30) scale(0.625)">
        <path
          d="M128 24C82 24 44 62 44 108c0 48 54 92 78 124 2.6 3.4 9.4 3.4 12 0 24-32 78-76 78-124 0-46-38-84-84-84Z"
          fill={brand.colors.campus}
          stroke={brand.colors.carbon}
          strokeWidth="8"
          strokeLinejoin="round"
        />
        <circle
          cx="128"
          cy="106"
          r="42"
          fill={brand.colors.cream}
          stroke={brand.colors.carbon}
          strokeWidth="6"
        />
        <path
          d="M110 90v20c0 12 8 20 18 20s18-8 18-20V90"
          fill="none"
          stroke={brand.colors.carbon}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m128 88 3.5 8.4 9.1.8-6.9 6 2.1 8.9-7.8-4.7-7.8 4.7 2.1-8.9-6.9-6 9.1-.8Z"
          fill={brand.colors.antojo}
          stroke={brand.colors.antojo}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
      <text
        x="220"
        y="118"
        fontFamily={`var(--font-poppins), ${brand.fonts.display}, sans-serif`}
        fontSize="76"
        fontWeight="800"
        fill={brand.colors.carbon}
      >
        Sabor
        <tspan fill={brand.colors.antojo} fontSize="84">
          U
        </tspan>
      </text>
      <text
        x="224"
        y="164"
        fontFamily={`var(--font-poppins), ${brand.fonts.display}, sans-serif`}
        fontSize="28"
        fontWeight="400"
        fill={brand.colors.carbon}
      >
        Antojo con criterio.
      </text>
    </svg>
  );
}
