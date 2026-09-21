"use client";
import type { DraftStore } from "./store";

export type DraftMeta<T> = { value: T; savedAt: number };

function safeLS(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const localDraftStore: DraftStore = {
  async load<T>(key: string): Promise<T | null> {
    return (await loadDraftWithMeta<T>(key))?.value ?? null;
  },
  async save<T>(key: string, value: T): Promise<void> {
    safeLS()?.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  },
  async clear(key: string): Promise<void> {
    safeLS()?.removeItem(key);
  },
};

export async function loadDraftWithMeta<T>(key: string): Promise<DraftMeta<T> | null> {
  const ls = safeLS();
  if (!ls) return null;
  const raw = ls.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DraftMeta<T>;
    if (parsed == null || typeof parsed !== "object" || !("value" in parsed)) return null;
    return { value: parsed.value, savedAt: Number(parsed.savedAt) || 0 };
  } catch {
    return null;
  }
}

// Server record is authoritative once synchronized: restore a local draft
// only when it is strictly newer than the server row. Malformed or missing
// server timestamps resolve in favor of the server (return false).
export function shouldRestoreDraft(draftSavedAtMs: number, serverUpdatedAtIso?: string | null): boolean {
  if (serverUpdatedAtIso == null || serverUpdatedAtIso === "") return true;
  const serverMs = Date.parse(serverUpdatedAtIso);
  if (!Number.isFinite(draftSavedAtMs) || !Number.isFinite(serverMs)) return false;
  return draftSavedAtMs > serverMs;
}

export function draftKey(userId: string, form: string, id: string): string {
  return `brewlog:${form}:${userId}:${id}`;
}
