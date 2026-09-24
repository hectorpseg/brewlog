"use client";
import { useEffect, useReducer, useRef } from "react";
import { autosaveReducer, type DraftStore, type SaveState } from "@/lib/drafts/store";
import { localDraftStore as defaultStore, loadDraftWithMeta, shouldRestoreDraft } from "@/lib/drafts/local-store";
import { createSaver, type Saver } from "@/lib/drafts/debounce";

type Opts<T> = {
  key: string;
  value: T;
  // ponytail: caller passes the server sync; hook owns timing only
  sync: (value: T) => Promise<void>;
  store?: DraftStore;
  debounceMs?: number;
  // server timestamp the draft is weighed against; omitted = nothing to weigh (new record)
  serverUpdatedAt?: string | null;
  onRestored?: (v: T) => void;
};

export function useAutosave<T extends Record<string, unknown>>({
  key,
  value,
  sync,
  store = defaultStore,
  debounceMs = 900,
  serverUpdatedAt,
  onRestored,
}: Opts<T>) {
  // ponytail: idle means saved. "editing" is entered only by an actual change,
  // never by mounting an editable page.
  const [state, dispatch] = useReducer(autosaveReducer, "saved" as SaveState);
  const syncRef = useRef(sync);
  const valueRef = useRef(value);
  const restored = useRef(false);
  const onRestoredRef = useRef(onRestored);
  // ponytail: JSON gate — form.watch() and setState mint new identities every
  // render (including renders caused by our own dispatches). Unrelated renders
  // must not reschedule persistence.
  const snapshot = JSON.stringify(value);
  const prevSnapshot = useRef<string | null>(null);
  const serverStampRef = useRef(serverUpdatedAt);
  const saverRef = useRef<Saver<T> | null>(null);
  // ponytail: exactly one scheduler per hook instance; created in an effect so
  // no ref is touched during render (StrictMode-safe: setup/cleanup is idempotent).
  // The fire returns the sync promise so the saver can serialize runs: a slow
  // save never overlaps a newer one, and older full-state snapshots can never
  // resolve last and clobber newer edits.
  useEffect(() => {
    const saver = createSaver<T>(debounceMs, (snapshotValue) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      dispatch({ type: "SYNC_START" });
      return syncRef.current(snapshotValue).then(
        () => dispatch({ type: "SYNC_OK" }),
        () => dispatch({ type: "SYNC_FAIL" }),
      );
    });
    saverRef.current = saver;
    return () => {
      saver.cancel();
      saverRef.current = null;
    };
  }, [debounceMs]);

  useEffect(() => {
    syncRef.current = sync;
    valueRef.current = value;
    onRestoredRef.current = onRestored;
    serverStampRef.current = serverUpdatedAt;
  });

  // restore once, and only when the draft is newer than the server row
  useEffect(() => {
    if (restored.current || !key) return;
    restored.current = true;
    loadDraftWithMeta<T>(key).then((draft) => {
      if (!draft) return;
      if (shouldRestoreDraft(draft.savedAt, serverStampRef.current)) {
        onRestoredRef.current?.(draft.value);
      } else {
        // stale draft would clobber fresh server state — drop it
        store.clear(key);
      }
    });
  }, [key, store]);

  // Local UI state updates freely; only persistence is debounced. First mount
  // records the baseline and does nothing — opening a form is not an edit.
  useEffect(() => {
    if (!key) return;
    if (prevSnapshot.current === null) {
      prevSnapshot.current = snapshot;
      return;
    }
    if (snapshot === prevSnapshot.current) return;
    prevSnapshot.current = snapshot;
    dispatch({ type: "CHANGE" });
    const parsed = JSON.parse(snapshot) as T;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    store.save(key, parsed).then(() => {
      dispatch({ type: "LOCAL_SAVED", offline });
    });
    saverRef.current?.push(parsed);
    return () => {
      saverRef.current?.cancel();
    };
  }, [key, snapshot, store]);

  // Explicit retry for the error badge. Goes through the same serialized
  // scheduler instead of invoking sync directly, so a tap can never overlap
  // an in-flight save or write a superseded snapshot: flush always sends the
  // newest known value, now when idle or right after the running save.
  function retry() {
    dispatch({ type: "SYNC_START" });
    saverRef.current?.flush(valueRef.current);
  }

  return { state, dispatch, retry };
}
