// ponytail: async interface so localStorage can become IndexedDB without changing callers
export interface DraftStore {
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
  clear(key: string): Promise<void>;
}

export type SaveState = "editing" | "saving" | "saved" | "local-draft" | "error";

export type AutosaveEvent =
  | { type: "CHANGE" }
  | { type: "LOCAL_SAVED"; offline: boolean }
  | { type: "SYNC_START" }
  | { type: "SYNC_OK" }
  | { type: "SYNC_FAIL" };

// ponytail: pure reducer so the state machine is unit-testable without timers
export function autosaveReducer(state: SaveState, event: AutosaveEvent): SaveState {
  switch (event.type) {
    case "CHANGE":
      return state === "error" ? "error" : "editing";
    case "LOCAL_SAVED":
      return event.offline ? "local-draft" : state === "error" ? "error" : "editing";
    case "SYNC_START":
      return "saving";
    case "SYNC_OK":
      return "saved";
    case "SYNC_FAIL":
      return "error";
  }
}
