"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { nativeShareText, copyShareText } from "@/lib/share/share-card";
import { CopySummaryButton } from "./copy-summary";

type Status = "idle" | "shared" | "copied" | "failed";

const STATUS_DELAY_MS = 2500;

// Share for the comparison summary: native share sheet when the browser has
// one, clipboard copy otherwise; "Copy summary" stays as the clipboard-only
// action. Text is computed on the server — this component only routes it.
export function CompareShareActions({ text }: { text: string }) {
  const t = useT();
  const [status, setStatus] = useState<Status>("idle");
  function done(next: Status) {
    setStatus(next);
    setTimeout(() => setStatus("idle"), STATUS_DELAY_MS);
  }
  async function share() {
    const result = await nativeShareText(t("nav.compare"), text);
    if (result === "shared") {
      done("shared");
      return;
    }
    // No share sheet available: clipboard is the fallback.
    done((await copyShareText(text)) ? "copied" : "failed");
  }
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={share}
        className="flex min-h-11 items-center gap-1 text-sm font-medium text-ember hover:underline"
      >
        <Share2 size={15} aria-hidden />
        {status === "shared" ? t("share.status.shared") : status === "copied" ? t("share.status.copied") : status === "failed" ? t("share.status.copyFailed") : t("share.button.share")}
      </button>
      <CopySummaryButton text={text} />
    </div>
  );
}
