"use client";
import { useState } from "react";

// Compact text action: copies the canonical brew summary for pasting into
// a chat or notebook. Clipboard-only, no fallback chrome — modern mobile
// browsers support it; a failure simply leaves the label unchanged.
export function CopySummaryButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-11 text-sm font-medium text-ember hover:underline"
    >
      {copied ? "Copied" : "Copy summary"}
    </button>
  );
}
