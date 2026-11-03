"use client";

import { useEffect } from "react";

import { cleanupLocalUserData } from "@/lib/offline/cleanup";
import { createClient } from "@/lib/supabase/browser";

/**
 * Red de seguridad: al llegar a /login sin sesión (por ejemplo tras el cierre
 * desde la server action) se borran los datos privados que hayan quedado.
 */
export function SessionCleanup() {
  useEffect(() => {
    let cancelled = false;

    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!cancelled && !data.session) {
          void cleanupLocalUserData();
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
