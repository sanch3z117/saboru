import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-card border-2 border-carbon bg-cream px-3 py-2 text-base text-carbon transition-colors outline-none placeholder:text-carbon/50 focus-visible:border-carbon focus-visible:ring-2 focus-visible:ring-carbon/20 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-antojo",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
