"use client";
import { useEffect, useReducer, useRef } from "react";
import { autosaveReducer, type DraftStore, type SaveState } from "@/lib/drafts/store";
import { localDraftStore as defaultStore } from "@/lib/drafts/local-store";

type Opts<T> = {
  key: string;
  value: T;
  // ponytail: caller passes the server sync; hook owns timing only
  sync: (value: T) => Promise<void>;
  store?: DraftStore;
  debounceMs?: number;
  onRestored?: (v: T) => void;
};

export function useAutosave<T extends Record<string, unknown>>({
  key,
  value,
  sync,
  store = defaultStore,
  debounceMs = 900,
  onRestored,
}: Opts<T>) {
  const [state, dispatch] = useReducer(autosaveReducer, "editing" as SaveState);
  const syncRef = useRef(sync);
  const restored = useRef(false);
  const onRestoredRef = useRef(onRestored);

  useEffect(() => {
    syncRef.current = sync;
    onRestoredRef.current = onRestored;
  });

  // restore once
  useEffect(() => {
    if (restored.current || !key) return;
    restored.current = true;
    store.load<T>(key).then((draft) => {
      if (draft) onRestoredRef.current?.(draft);
    });
  }, [key, store]);

  // immediate local save + debounced server sync
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const snapshot = value;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    store.save(key, snapshot).then(() => {
      if (!cancelled) dispatch({ type: "LOCAL_SAVED", offline });
    });
    const t = setTimeout(async () => {
      if (offline) return;
      dispatch({ type: "SYNC_START" });
      try {
        await syncRef.current(snapshot);
        if (!cancelled) dispatch({ type: "SYNC_OK" });
      } catch {
        if (!cancelled) dispatch({ type: "SYNC_FAIL" });
      }
    }, debounceMs);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [key, value, store, debounceMs]);

  return { state, dispatch };
}
