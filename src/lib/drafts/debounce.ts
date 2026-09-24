// ponytail: one tiny scheduler so debounce behavior is unit-testable without
// hook-testing libraries. Exactly one timer exists at a time; rapid pushes
// collapse into a single fire with the latest value. Fires never overlap: a
// push that lands mid-flight only records the newest state for one immediate
// follow-up run, so an older full-state save can never resolve after (and
// clobber) a newer one.

export type Saver<T> = {
  push: (value: T) => void;
  // Explicit retry: run now when idle, or right after the in-flight save
  // when busy. Always sends the newest known value, never a stale one.
  flush: (value: T) => void;
  cancel: () => void;
};

export function createSaver<T>(delayMs: number, fn: (value: T) => Promise<unknown> | void): Saver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: T | undefined = undefined;
  let running = false;
  let queued = false;
  function fire() {
    timer = null;
    const value = latest as T;
    running = true;
    const done = () => {
      running = false;
      // Newer edits arrived mid-flight: run them now (no re-debounce, they
      // already waited). Order always matches recency, so the last write to
      // land is never older than what the user sees.
      if (queued) {
        queued = false;
        fire();
      }
    };
    try {
      const r = fn(value);
      if (r != null && typeof (r as Promise<unknown>).then === "function") {
        (r as Promise<unknown>).then(done, done);
      } else {
        done();
      }
    } catch {
      done();
    }
  }
  return {
    push(value: T) {
      latest = value;
      // An older save is still flying: don't overlap it, just remember the
      // newest state for the immediate follow-up run.
      if (running) {
        queued = true;
        return;
      }
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(fire, delayMs);
    },
    flush(value: T) {
      latest = value;
      if (running) {
        queued = true;
        return;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      fire();
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      // A dropped schedule must not resurrect: forget queued follow-ups. An
      // already-running save finishes (its write is real); the local draft
      // still holds anything newer, so nothing is lost.
      queued = false;
    },
  };
}
