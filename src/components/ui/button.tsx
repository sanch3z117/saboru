import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap transition-[filter,transform,box-shadow,background-color] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-pill border-2 border-carbon bg-antojo text-carbon shadow-hard-sm hover:brightness-95 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary:
          "rounded-pill border-2 border-carbon bg-cream text-carbon hover:bg-campus/30 active:translate-y-px",
        outline:
          "rounded-card border-2 border-carbon bg-transparent text-carbon hover:bg-campus/25",
        ghost: "rounded-card text-carbon hover:bg-carbon/5",
        link: "rounded-none text-carbon underline underline-offset-4 hover:no-underline",
      },
      size: {
        default: "h-11 px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 px-4 has-[>svg]:px-3",
        lg: "h-12 px-6 has-[>svg]:px-5",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo (por ejemplo un `<Link>`) con los estilos del botón. */
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
