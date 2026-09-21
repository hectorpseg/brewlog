// ponytail: one tiny scheduler so debounce behavior is unit-testable without
// hook-testing libraries. Exactly one timer exists at a time; rapid pushes
// collapse into a single fire with the latest value.

export type Saver<T> = {
  push: (value: T) => void;
  cancel: () => void;
};

export function createSaver<T>(delayMs: number, fn: (value: T) => void): Saver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: T | undefined = undefined;
  return {
    push(value: T) {
      latest = value;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(latest as T);
      }, delayMs);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
