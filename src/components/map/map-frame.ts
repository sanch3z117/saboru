import { MAP_HEIGHT_CLASS } from "@/lib/map/config";
import { cn } from "@/lib/utils";

export const MAP_FRAME_CLASS = cn(
  "relative w-full overflow-hidden rounded-card border-2 border-carbon bg-cream",
  MAP_HEIGHT_CLASS,
);
