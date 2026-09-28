"use client";
import { useState } from "react";
import type { ShareCardData } from "@/lib/domain/share-card";
import { formatShareCardText, shareCardFilename } from "@/lib/domain/share-card";
import {
  canNativeShareImage,
  copyShareText,
  downloadPng,
  nativeSharePng,
  renderShareCardPng,
} from "@/lib/share/share-card";

// Visual preview mirroring the PNG layout: paper bg, ember rule, serif
// coffee name, ratio hero, recipe rows, optional score, brand footer.
export function ShareCardPreview({ card }: { card: ShareCardData }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-paper">
      <div className="h-1.5 bg-ember" />
      <div className="flex flex-col gap-2 p-4">
        <p className="text-xs font-semibold tracking-widest text-ink2">BREWLOG</p>
        <p className="break-words font-display text-2xl leading-tight">{card.coffeeName}</p>
        {card.ratio ? <p className="tnum text-4xl font-bold text-ember">{card.ratio}</p> : null}
        {card.recipeLines.length > 0 ? (
          <ul className="tnum flex flex-col gap-0.5 text-sm">
            {card.recipeLines.slice(0, 8).map((line) => (
              <li key={line} className="truncate">
                {line}
              </li>
            ))}
          </ul>
        ) : null}
        {card.scoreLabel != null ? (
          <p className="tnum border-t border-line pt-2 text-2xl font-bold text-ember">
            ★ {card.scoreLabel} <span className="text-sm font-normal text-ink2">/ 5</span>
          </p>
        ) : null}
        <p className="text-xs text-ink2">Brewed and logged with BrewLog</p>
      </div>
    </div>
  );
}

type Status = "idle" | "working" | "shared" | "downloaded" | "copied" | "copy-failed" | "failed";

// Reusable actions: native share when supported, PNG download fallback,
// clipboard text fallback. Unsupported APIs degrade to the next option.
export function ShareCardButtons({ card }: { card: ShareCardData }) {
  const [status, setStatus] = useState<Status>("idle");
  // Lazy initializer (no effect): server renders false, client evaluates
  // capability on first render. canNativeShareImage guards SSR itself.
  const [nativeOk] = useState(() => canNativeShareImage());
  const text = formatShareCardText(card);
  const filename = shareCardFilename(card.coffeeName);

  function done(s: Status) {
    setStatus(s);
    setTimeout(() => setStatus("idle"), 2500);
  }

  async function share() {
    setStatus("working");
    try {
      const blob = await renderShareCardPng(card);
      const result = await nativeSharePng(blob, filename, text);
      if (result === "shared") {
        done("shared");
        return;
      }
      downloadPng(blob, filename);
      done("downloaded");
    } catch {
      done("failed");
    }
  }

  async function download() {
    setStatus("working");
    try {
      downloadPng(await renderShareCardPng(card), filename);
      done("downloaded");
    } catch {
      done("failed");
    }
  }

  async function copy() {
    done((await copyShareText(text)) ? "copied" : "copy-failed");
  }

  const label =
    status === "shared" ? "Shared"
    : status === "downloaded" ? "Downloaded"
    : status === "copied" ? "Copied"
    : status === "copy-failed" ? "Copy failed"
    : status === "failed" ? "Failed, try download"
    : status === "working" ? "Working…"
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nativeOk ? (
        <button
          type="button"
          onClick={share}
          disabled={status === "working"}
          className="min-h-11 rounded-[10px] bg-ember px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Share image
        </button>
      ) : null}
      <button
        type="button"
        onClick={download}
        disabled={status === "working"}
        className="min-h-11 rounded-[10px] border border-line bg-card px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Download PNG
      </button>
      <button
        type="button"
        onClick={copy}
        className="min-h-11 px-2 py-2 text-sm font-medium text-ember hover:underline"
      >
        Copy text
      </button>
      {label ? (
        <span role="status" className="text-sm text-ink2">
          {label}
        </span>
      ) : null}
    </div>
  );
}
