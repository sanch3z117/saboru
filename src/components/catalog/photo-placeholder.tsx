import { UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

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
        "flex flex-col items-center justify-center gap-2 border border-carbon/15 bg-campus text-carbon/60",
        className,
      )}
    >
      <UtensilsCrossed className="size-7" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
