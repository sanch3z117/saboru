"use client";

import { useEffect, useState } from "react";

import { ADMIN_NOTICES } from "@/lib/admin/notices";

const NOTICE_COOKIE = "saboru_admin_notice";
const ERROR_COOKIE = "saboru_admin_error";

function readCookie(name: string) {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : "";
}

function clearCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/admin`;
}

export function AdminNotice() {
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const notice = readCookie(NOTICE_COOKIE);
    const error = readCookie(ERROR_COOKIE);
    if (!notice && !error) return;

    let text = ADMIN_NOTICES[notice] ?? "";
    if (error) {
      try {
        text = decodeURIComponent(error);
      } catch {
        text = "No pudimos completar la acción.";
      }
    }

    if (text) {
      setMessage({ tone: error ? "error" : "success", text });
    }
    clearCookie(NOTICE_COOKIE);
    clearCookie(ERROR_COOKIE);
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div
      role={message.tone === "error" ? "alert" : "status"}
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm font-semibold ${
        message.tone === "error"
          ? "border-carbon bg-cream text-carbon"
          : "border-verified bg-verified-soft text-verified-ink"
      }`}
    >
      <span>{message.text}</span>
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="text-xs font-semibold underline underline-offset-4"
      >
        Cerrar
      </button>
    </div>
  );
}
