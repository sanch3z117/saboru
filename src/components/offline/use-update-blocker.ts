"use client";

import { useEffect } from "react";

import { beginUpdateBlock } from "@/lib/offline/update-guard";

/** Impide que la actualización del SW recargue mientras hay un envío. */
export function useUpdateBlocker(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    return beginUpdateBlock();
  }, [active]);
}
