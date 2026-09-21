"use client";
import type { DraftStore } from "./store";

function safeLS(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export const localDraftStore: DraftStore = {
  async load<T>(key: string): Promise<T | null> {
    const ls = safeLS();
    if (!ls) return null;
    const raw = ls.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { value: T };
      return parsed.value ?? null;
    } catch {
      return null;
    }
  },
  async save<T>(key: string, value: T): Promise<void> {
    safeLS()?.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  },
  async clear(key: string): Promise<void> {
    safeLS()?.removeItem(key);
  },
};

export function draftKey(userId: string, form: string, id: string): string {
  return `brewlog:${form}:${userId}:${id}`;
}
