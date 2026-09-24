// ponytail: pours mirror the tastings pattern - a child table with no
// independent lifecycle (sequence is a field, never an entity), editor drafts
// as JSON strings, full-desired-state sync. Timing is numeric seconds in
// storage; m:ss lives only in the UI via format/parse helpers here.

import { formatDuration } from "@/lib/domain/brew-time";

export const POUR_PATTERNS = [
  "center",
  "circular",
  "center+circular",
  "continuous",
  "pulse",
  "custom",
] as const;
export type PourPattern = (typeof POUR_PATTERNS)[number];

export function isPourPattern(v: unknown): v is PourPattern {
  return (POUR_PATTERNS as readonly string[]).includes(typeof v === "string" ? v : "");
}

// Complete, persistable fact. Sequence starts at 1 in entry order.
export type PourEntry = {
  sequence: number;
  amount_g: number;
  timing_seconds: number;
  bloom: boolean;
  pattern: PourPattern;
  note?: string | null;
};

// Draft row as held by the editor: strings throughout, possibly incomplete.
// Sequence is implicit (index + 1); incomplete rows live in the local draft
// only and are never persisted.
export type PourDraftRow = {
  time: string;
  amount: string;
  bloom: boolean;
  pattern: string;
  note: string;
};

export function emptyPourDraft(first: boolean): PourDraftRow {
  return { time: "", amount: "", bloom: first, pattern: "center", note: "" };
}

// Display seconds as m:ss ("0:00", "0:35", "1:05"). Null when unrecorded.
export function formatPourTime(total?: number | null): string | null {
  return formatDuration(total);
}

// Lenient entry parsing for one fast field: "65", "1:05", " 0:35 " all work.
// Anything else (including negatives) is null, never guessed.
export function parsePourTime(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t === "") return null;
  const m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) {
    const total = Number(m[1]) * 60 + Number(m[2]);
    return Number.isFinite(total) && total <= 3600 ? total : null;
  }
  if (/^\d+(\.\d+)?$/.test(t)) {
    const total = Math.floor(Number(t));
    return Number.isFinite(total) && total >= 0 && total <= 3600 ? total : null;
  }
  return null;
}

function draftRow(v: unknown): PourDraftRow | null {
  if (typeof v !== "object" || v === null) return null;
  const r = v as Record<string, unknown>;
  if (typeof r.time !== "string" || typeof r.amount !== "string") return null;
  if (typeof r.note !== "string") return null;
  if (typeof r.bloom !== "boolean") return null;
  if (typeof r.pattern !== "string") return null;
  return { time: r.time, amount: r.amount, bloom: r.bloom, pattern: r.pattern, note: r.note };
}

// Lenient: restores whatever the editor held, including half-filled rows.
export function pourRowsFromJson(v: unknown): PourDraftRow[] {
  if (typeof v !== "string" || v === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(v);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: PourDraftRow[] = [];
  for (const item of parsed) {
    const row = draftRow(item);
    if (row) out.push(row);
  }
  return out;
}

export function pourRowsToJson(rows: PourDraftRow[]): string {
  return JSON.stringify(rows);
}

// Server rows (numbers) into editor draft rows (strings).
export function pourServerRowsToDraft(
  rows: { sequence?: unknown; amount_g?: unknown; timing_seconds?: unknown; bloom?: unknown; pattern?: unknown; note?: unknown }[] | null | undefined,
): PourDraftRow[] {
  if (!rows) return [];
  const sorted = [...rows].sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));
  const out: PourDraftRow[] = [];
  for (const r of sorted) {
    if (typeof r !== "object" || r === null) continue;
    const amount = typeof r.amount_g === "number" || typeof r.amount_g === "string" ? Number(r.amount_g) : NaN;
    const time = typeof r.timing_seconds === "number" || typeof r.timing_seconds === "string" ? Number(r.timing_seconds) : NaN;
    if (!Number.isFinite(amount) || !Number.isFinite(time)) continue;
    out.push({
      time: formatPourTime(time) ?? "",
      amount: String(amount),
      bloom: r.bloom === true,
      pattern: isPourPattern(r.pattern) ? r.pattern : "custom",
      note: typeof r.note === "string" ? r.note : "",
    });
  }
  return out;
}

// Strict: only complete facts reach the server, renumbered 1..n in order.
// The server re-validates; this keeps half-filled editor rows out.
export function completePourEntries(rows: PourDraftRow[]): PourEntry[] {
  const out: PourEntry[] = [];
  for (const r of rows) {
    if (typeof r !== "object" || r === null) continue;
    const amount = r.amount.trim() === "" ? NaN : Number(r.amount);
    const time = parsePourTime(r.time);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 2000) continue;
    if (time == null) continue;
    if (!isPourPattern(r.pattern)) continue;
    const note = r.note.trim();
    out.push({
      sequence: out.length + 1,
      amount_g: amount,
      timing_seconds: time,
      bloom: r.bloom === true,
      pattern: r.pattern,
      note: note === "" ? null : note.slice(0, 500),
    });
  }
  return out;
}

// Derived counter for the pour section: number of complete pours plus the
// summed amount. Drives the read-only "N pours · X g total" line and keeps
// the legacy pour_count column in sync on save. Null when nothing complete.
export function pourCountAndTotal(rows: PourDraftRow[]): { count: number; totalG: number } {
  const entries = completePourEntries(rows);
  const total = entries.reduce((sum, e) => sum + e.amount_g, 0);
  return { count: entries.length, totalG: Math.round(total * 10) / 10 };
}

export function formatPourTotal(count: number, totalG: number): string | null {
  if (!Number.isInteger(count) || count <= 0) return null;
  return `${count} pour${count === 1 ? "" : "s"} · ${totalG} g total`;
}

// Freshest server timestamp, so a stale local draft can never clobber synced rows.
export function poursUpdatedAt(rows: { updated_at?: unknown }[] | null | undefined): string | null {
  if (!rows) return null;
  let latest: string | null = null;
  for (const r of rows) {
    if (typeof r.updated_at === "string" && r.updated_at !== "" && (latest === null || r.updated_at > latest)) {
      latest = r.updated_at;
    }
  }
  return latest;
}

export type PourFact = {
  sequence?: unknown;
  amount_g?: unknown;
  timing_seconds?: unknown;
  bloom?: unknown;
  pattern?: unknown;
  note?: unknown;
};

function factText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  return t === "" ? null : t;
}

// Deterministic per-sequence comparison: the union of sequences in numeric
// order. A side that lacks the pour reads "-" on every field; changed flags
// a pour that differs or exists on one side only. No derived values.
export type PourComparisonRow = {
  sequence: number;
  a: PourEntry | null;
  b: PourEntry | null;
  changed: boolean;
};

function toEntry(f: PourFact | null | undefined): PourEntry | null {
  if (typeof f !== "object" || f === null) return null;
  const seq = typeof f.sequence === "number" || typeof f.sequence === "string" ? Number(f.sequence) : NaN;
  const amount = typeof f.amount_g === "number" || typeof f.amount_g === "string" ? Number(f.amount_g) : NaN;
  const time = typeof f.timing_seconds === "number" || typeof f.timing_seconds === "string" ? Number(f.timing_seconds) : NaN;
  if (!Number.isInteger(seq) || seq < 1) return null;
  if (!Number.isFinite(amount) || !Number.isFinite(time)) return null;
  if (!isPourPattern(f.pattern)) return null;
  return {
    sequence: seq,
    amount_g: amount,
    timing_seconds: time,
    bloom: f.bloom === true,
    pattern: f.pattern,
    note: factText(f.note),
  };
}

function samePour(a: PourEntry, b: PourEntry): boolean {
  return (
    a.amount_g === b.amount_g &&
    a.timing_seconds === b.timing_seconds &&
    a.bloom === b.bloom &&
    a.pattern === b.pattern &&
    (a.note ?? null) === (b.note ?? null)
  );
}

export function comparePours(
  a: PourFact[] | null | undefined,
  b: PourFact[] | null | undefined,
): PourComparisonRow[] {
  const bySeq = new Map<number, { a: PourEntry | null; b: PourEntry | null }>();
  for (const [side, rows] of [["a", a], ["b", b]] as const) {
    for (const r of rows ?? []) {
      const e = toEntry(r);
      if (!e) continue;
      const slot = bySeq.get(e.sequence) ?? { a: null, b: null };
      // first row wins per side: duplicates cannot inflate the comparison
      if (slot[side] == null) slot[side] = e;
      bySeq.set(e.sequence, slot);
    }
  }
  return [...bySeq.entries()]
    .sort(([x], [y]) => x - y)
    .map(([sequence, v]) => ({
      sequence,
      ...v,
      changed: v.a == null || v.b == null || !samePour(v.a, v.b),
    }));
}

// Field rows for the shared compare table: one row per pour field, in
// sequence order. Missing sides read "-", never invented; changed is
// per-field so identical fields stay quiet even when the pour differs.
export type PourFieldRow = { label: string; a: string; b: string; changed: boolean };

export function comparePourFields(
  a: PourFact[] | null | undefined,
  b: PourFact[] | null | undefined,
): PourFieldRow[] {
  const rows: PourFieldRow[] = [];
  for (const { sequence, a: pa, b: pb } of comparePours(a, b)) {
    const time = (p: PourEntry | null) => (p ? (formatPourTime(p.timing_seconds) ?? "-") : "-");
    const amount = (p: PourEntry | null) => (p ? `${p.amount_g} g` : "-");
    const pattern = (p: PourEntry | null) => (p ? p.pattern : "-");
    const bloom = (p: PourEntry | null) => (p ? (p.bloom ? "Yes" : "No") : "-");
    const note = (p: PourEntry | null) => (p?.note?.trim() ? p.note.trim() : "-");
    const fields: [string, string, string][] = [
      [`Pour ${sequence} time`, time(pa), time(pb)],
      [`Pour ${sequence} amount`, amount(pa), amount(pb)],
      [`Pour ${sequence} pattern`, pattern(pa), pattern(pb)],
      [`Pour ${sequence} bloom`, bloom(pa), bloom(pb)],
      [`Pour ${sequence} note`, note(pa), note(pb)],
    ];
    for (const [label, x, y] of fields) {
      if (x === "-" && y === "-") continue;
      rows.push({ label, a: x, b: y, changed: x !== y });
    }
  }
  return rows;
}
