import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-pill border-2 px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-[background-color,box-shadow,color,transform] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral:
          "border-carbon bg-cream text-carbon hover:bg-campus/35 active:translate-y-px",
        active:
          "border-carbon bg-campus text-carbon shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        quiet:
          "border-carbon/25 bg-transparent text-carbon/70 hover:border-carbon hover:text-carbon",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type ChipProps = ComponentProps<"span"> &
  VariantProps<typeof chipVariants> & {
    asChild?: boolean;
  };

function Chip({ className, tone, asChild = false, ...props }: ChipProps) {
  const Component = asChild ? Slot : "span";

  return (
    <Component
      data-slot="chip"
      className={cn(chipVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Chip, chipVariants, type ChipProps };
