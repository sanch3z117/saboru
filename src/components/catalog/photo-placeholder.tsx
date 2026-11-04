import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Reemplazo de marca para una foto que no existe o no cargó.
 * No anuncia nada a lectores de pantalla: el nombre del local o producto ya
 * está en el texto que acompaña a la imagen.
 */
export function PhotoPlaceholder({
  className,
  label = "Sin foto",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 overflow-hidden border-2 border-carbon/20 bg-cream text-carbon/60",
        className,
      )}
    >
      <span className="absolute inset-2 rounded-[8px] border border-dashed border-carbon/15" />
      <svg viewBox="0 0 64 64" className="relative size-9" aria-hidden="true">
        <path
          d="M32 6C22 6 14 14 14 24c0 12 12.4 21.6 16.8 31.4.8 1.8 2.4 1.8 3.2 0C38.4 45.6 51 36 51 24 51 14 42 6 32 6Z"
          fill={brand.colors.campus}
          stroke={brand.colors.carbon}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle
          cx="32"
          cy="24"
          r="10"
          fill={brand.colors.cream}
          stroke={brand.colors.carbon}
          strokeWidth="2.5"
        />
        <path
          d="M27 20v5c0 4 2.5 6.5 5 6.5s5-2.5 5-6.5v-5"
          fill="none"
          stroke={brand.colors.carbon}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m32 19 1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3Z"
          fill={brand.colors.antojo}
        />
      </svg>
      <span className="relative text-xs font-medium">{label}</span>
    </div>
  );
}
