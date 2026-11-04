import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-pill font-semibold whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        campus: "bg-campus text-carbon",
        verified: "bg-verified-soft text-verified-ink",
        outline: "border border-carbon/30 bg-transparent text-carbon",
        carbon: "bg-carbon text-cream",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] leading-4",
        default: "px-2.5 py-1 text-xs leading-4",
      },
    },
    defaultVariants: {
      tone: "campus",
      size: "default",
    },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
