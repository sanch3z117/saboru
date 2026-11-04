import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "error";

const tones: Record<AlertTone, { className: string; icon: LucideIcon }> = {
  info: {
    className: "border-carbon bg-cream text-carbon",
    icon: Info,
  },
  success: {
    className: "border-verified-ink/35 bg-verified-soft text-verified-ink",
    icon: CircleCheck,
  },
  warning: {
    className: "border-carbon bg-campus text-carbon",
    icon: TriangleAlert,
  },
  error: {
    className: "border-antojo bg-cream text-carbon",
    icon: CircleAlert,
  },
};

type AlertProps = Omit<ComponentProps<"div">, "title"> & {
  tone?: AlertTone;
  title?: ReactNode;
};

function Alert({
  tone = "info",
  title,
  className,
  children,
  role,
  ...props
}: AlertProps) {
  const { className: toneClass, icon: Icon } = tones[tone];

  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={
        role ?? (tone === "error" || tone === "warning" ? "alert" : "status")
      }
      className={cn(
        "flex items-start gap-3 rounded-card border-2 px-4 py-3 text-sm leading-relaxed",
        toneClass,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
    </div>
  );
}

export { Alert, type AlertProps, type AlertTone };
