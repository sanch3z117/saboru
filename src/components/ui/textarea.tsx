import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-card border-2 border-carbon bg-cream px-3 py-2 text-base text-carbon transition-colors outline-none placeholder:text-carbon/50 focus-visible:border-carbon focus-visible:ring-2 focus-visible:ring-carbon/20 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-antojo",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
