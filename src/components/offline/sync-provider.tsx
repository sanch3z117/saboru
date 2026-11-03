"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { countOutbox } from "@/lib/offline/outbox";
import { backoffDelayMs, syncOutbox } from "@/lib/offline/sync";
import { reviewErrorMessage, type ReviewErrorCode } from "@/lib/reviews/errors";
import { createClient } from "@/lib/supabase/browser";

type SyncView = {
  pending: number;
  rejected: number;
  rejectedCode: string | null;
  syncing: boolean;
  message: string | null;
  online: boolean;
};

const initialState: SyncView = {
  pending: 0,
  rejected: 0,
  rejectedCode: null,
  syncing: false,
  message: null,
  online: true,
};

export function SyncProvider() {
  const [view, setView] = useState<SyncView>(initialState);
  const userIdRef = useRef<string | null>(null);
  const attemptsRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);

  const refreshCounts = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;

    try {
      const counts = await countOutbox(userId);
      setView((current) => ({
        ...current,
        pending: counts.pending,
        rejected: counts.rejected,
        rejectedCode: counts.rejectedCode ?? current.rejectedCode,
      }));
    } catch {
      // IndexedDB puede fallar; el servidor sigue siendo la barrera.
    }
  }, []);

  const run = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId || navigator.onLine === false) return;

    setView((current) => ({ ...current, syncing: true, message: null }));

    const outcome = await syncOutbox(userId);
    await refreshCounts();

    if (outcome.status === "unauthorized") {
      setView((current) => ({
        ...current,
        syncing: false,
        message: "Inicia sesión para enviar lo pendiente.",
      }));
      return;
    }

    if (outcome.status === "error" || outcome.status === "offline") {
      attemptsRef.current += 1;
      if (attemptsRef.current <= 5) {
        if (retryTimerRef.current) {
          window.clearTimeout(retryTimerRef.current);
        }
        retryTimerRef.current = window.setTimeout(
          () => {
            void run();
          },
          backoffDelayMs(attemptsRef.current - 1),
        );
      }
      setView((current) => ({ ...current, syncing: false }));
      return;
    }

    attemptsRef.current = 0;

    if (outcome.status === "ok" && outcome.rejected) {
      setView((current) => ({
        ...current,
        syncing: false,
        rejectedCode: outcome.rejectedCode ?? "invalid",
      }));
      return;
    }

    if (outcome.status === "ok" && outcome.sent) {
      setView((current) => ({
        ...current,
        syncing: false,
        message: "Todo enviado.",
        rejectedCode: null,
      }));
      if (messageTimerRef.current) {
        window.clearTimeout(messageTimerRef.current);
      }
      messageTimerRef.current = window.setTimeout(() => {
        setView((current) => ({ ...current, message: null }));
      }, 5000);
      return;
    }

    setView((current) => ({ ...current, syncing: false }));
  }, [refreshCounts]);

  useEffect(() => {
    let cancelled = false;

    void createClient()
      .auth.getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        userIdRef.current = data.session?.user.id ?? null;
        await refreshCounts();
        if (userIdRef.current && navigator.onLine !== false) {
          void run();
        }
      });

    const handleOnline = () => {
      setView((current) => ({ ...current, online: true }));
      void run();
    };
    const handleOffline = () => {
      setView((current) => ({ ...current, online: false }));
    };
    const handleVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        navigator.onLine !== false
      ) {
        void run();
      }
    };
    const handleOutboxChanged = () => {
      void refreshCounts();
      if (navigator.onLine !== false) {
        void run();
      }
    };

    setView((current) => ({
      ...current,
      online: navigator.onLine !== false,
    }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("saboru:outbox-changed", handleOutboxChanged);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("saboru:outbox-changed", handleOutboxChanged);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshCounts, run]);

  const rejectedMessage = view.rejectedCode
    ? reviewErrorMessage(view.rejectedCode as ReviewErrorCode)
    : "Revisa la operación.";

  let text = "";
  if (!view.online) {
    text =
      view.pending > 0
        ? `Sin conexión. ${view.pending} envío${view.pending === 1 ? "" : "s"} pendiente${view.pending === 1 ? "" : "s"}.`
        : "Sin conexión.";
  } else if (view.syncing) {
    text = "Sincronizando…";
  } else if (view.rejected > 0) {
    text = `${view.rejected} envío${view.rejected === 1 ? "" : "s"} rechazado${view.rejected === 1 ? "" : "s"}: ${rejectedMessage}`;
  } else if (view.pending > 0) {
    text = `${view.pending} envío${view.pending === 1 ? "" : "s"} pendiente${view.pending === 1 ? "" : "s"}.`;
  } else if (view.message) {
    text = view.message;
  }

  if (!text) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-carbon bg-cream px-4 py-2"
    >
      <p className="mx-auto max-w-5xl text-sm font-medium text-carbon">
        {text}
      </p>
    </div>
  );
}
