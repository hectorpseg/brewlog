import type { ShareCardData } from "@/lib/domain/share-card";

// ponytail: dependency-free Canvas 2D renderer. Draws from ShareCardData
// directly (no DOM screenshot lib). BrewLog tokens inlined so the PNG
// matches the app: paper #faf7f1, card #fff, ink #1c1917, ember #b3401f.

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1350;

const PAPER = "#faf7f1";
const CARD = "#ffffff";
const INK = "#1c1917";
const INK2 = "#57534e";
const LINE = "#e7e0d3";
const EMBER = "#b3401f";

function wrapLines(ctx: CanvasRenderingContext2D, s: string, maxWidth: number, maxLines: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : `${cur} ${w}`;
    if (ctx.measureText(next).width <= maxWidth || cur === "") cur = next;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (cur !== "") lines.push(cur);
  // Overflow remainder folds into the last line with an ellipsis.
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawShareCard(ctx: CanvasRenderingContext2D, card: ShareCardData) {
  const W = SHARE_CARD_WIDTH;
  const H = SHARE_CARD_HEIGHT;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Ember top rule, the BrewLog notebook accent.
  ctx.fillStyle = EMBER;
  ctx.fillRect(0, 0, W, 16);

  // Brand.
  ctx.fillStyle = INK2;
  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText("BREWLOG", 96, 130);

  // Coffee identity, up to 3 wrapped lines.
  ctx.fillStyle = INK;
  ctx.font = "64px Georgia, serif";
  const nameLines = wrapLines(ctx, card.coffeeName, W - 192, 3);
  nameLines.forEach((line, i) => ctx.fillText(line, 96, 230 + i * 84));
  let y = 230 + (nameLines.length - 1) * 84 + 60;

  // Ratio hero.
  if (card.ratio) {
    ctx.fillStyle = EMBER;
    ctx.font = "700 120px system-ui, sans-serif";
    ctx.fillText(card.ratio, 96, y + 90);
    y += 150;
  }

  // Recipe rows.
  ctx.fillStyle = INK;
  ctx.font = "46px system-ui, sans-serif";
  const rows = card.recipeLines.slice(0, 8);
  for (const row of rows) {
    const clipped = row.length > 42 ? `${row.slice(0, 41).trimEnd()}…` : row;
    ctx.fillText(clipped, 96, y + 50);
    y += 72;
  }

  // Score, omitted entirely when null (never faked).
  if (card.scoreLabel != null) {
    y += 30;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, y);
    ctx.lineTo(W - 96, y);
    ctx.stroke();
    y += 90;
    ctx.fillStyle = EMBER;
    ctx.font = "700 96px system-ui, sans-serif";
    ctx.fillText(`★ ${card.scoreLabel}`, 96, y);
    ctx.fillStyle = INK2;
    ctx.font = "44px system-ui, sans-serif";
    ctx.fillText("/ 5", 96 + ctx.measureText(`★ ${card.scoreLabel} `).width, y);
    y += 40;
  }

  // Footer card.
  roundRect(ctx, 96, H - 220, W - 192, 124, 24);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = INK2;
  ctx.font = "40px system-ui, sans-serif";
  ctx.fillText("Brewed and logged with BrewLog", 136, H - 142);
}

// Renders the card to a PNG blob. Browser only (needs document/canvas).
export function renderShareCardPng(card: ShareCardData): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_CARD_WIDTH;
  canvas.height = SHARE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas 2D is not available"));
  drawShareCard(ctx, card);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png");
  });
}

// --- Share / download / clipboard helpers (capability-detected) ---

export function canNativeShareImage(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (typeof nav.canShare !== "function") return false;
  try {
    const probe = new File([""], "probe.png", { type: "image/png" });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

// Native share with the PNG attached. Returns "shared", or "unsupported"
// when the browser cannot share files (caller falls back to download).
export async function nativeSharePng(blob: Blob, filename: string, text: string): Promise<"shared" | "unsupported"> {
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: ShareData) => Promise<void> };
  const file = new File([blob], filename, { type: "image/png" });
  if (typeof nav.share !== "function") return "unsupported";
  if (typeof nav.canShare === "function") {
    try {
      if (!nav.canShare({ files: [file] })) return "unsupported";
    } catch {
      return "unsupported";
    }
  }
  try {
    await nav.share({ files: [file], title: "BrewLog brew", text });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "shared"; // user dismissed, not an error
    throw e;
  }
  return "shared";
}

export function downloadPng(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Clipboard with legacy textarea fallback for non-secure contexts.
export async function copyShareText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
