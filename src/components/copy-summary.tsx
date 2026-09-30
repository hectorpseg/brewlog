"use client";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";

// Compact text action: copies the canonical summary for pasting into a chat
// or notebook. Clipboard-only, no fallback chrome - modern mobile browsers
// support it; a failure reads "Copy failed" briefly instead of silently
// pretending it worked.
export function CopySummaryButton({ text }: { text: string }) {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 2500);
      return;
    }
    setStatus("copied");
    setTimeout(() => setStatus("idle"), 2500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-11 text-sm font-medium text-ember hover:underline"
    >
      {status === "copied" ? t("share.status.copied") : status === "failed" ? t("share.status.copyFailed") : t("copy.summary")}
    </button>
  );
}
