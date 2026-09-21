// ponytail: total_time_sec stays the stored integer; minutes/seconds is UI-only.
export function splitSeconds(total?: number | null): { minutes?: number; seconds?: number } {
  if (total == null || !Number.isFinite(total) || total < 0) return {};
  const t = Math.floor(total);
  return { minutes: Math.floor(t / 60), seconds: t % 60 };
}

export function toSeconds(minutes?: number | null, seconds?: number | null): number | undefined {
  const m = minutes ?? 0;
  const s = seconds ?? 0;
  if ((minutes == null || minutes === undefined) && (seconds == null || seconds === undefined)) return undefined;
  if (!Number.isFinite(m) || !Number.isFinite(s) || m < 0 || s < 0) return undefined;
  return Math.floor(m) * 60 + Math.min(59, Math.floor(s));
}

// Natural display: 150 → "2:30", 45 → "0:45". Null when nothing recorded.
export function formatDuration(total?: number | null): string | null {
  if (total == null || !Number.isFinite(total) || total < 0) return null;
  const t = Math.floor(total);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
