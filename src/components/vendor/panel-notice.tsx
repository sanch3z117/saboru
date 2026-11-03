"use client";

import { useEffect, useState } from "react";

import { PANEL_NOTICE_KEY } from "@/components/vendor/use-vendor-form-feedback";

export function PanelNotice() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem(PANEL_NOTICE_KEY);
    if (saved) {
      sessionStorage.removeItem(PANEL_NOTICE_KEY);
      setMessage(saved);
    }
  }, []);

  if (!message) {
    return null;
  }

  return (
    <p
      role="status"
      className="mb-6 border border-carbon bg-campus px-4 py-3 text-sm font-semibold text-carbon"
    >
      {message}
    </p>
  );
}
