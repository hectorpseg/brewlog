import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createSaver } from "@/lib/drafts/debounce";

describe("createSaver", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("collapses rapid repeated changes into ONE fire with the final value", () => {
    const fn = vi.fn();
    const saver = createSaver<number>(900, fn);
    // 70 → 71 → 72 → 73 clicks within the debounce window
    saver.push(70);
    vi.advanceTimersByTime(200);
    saver.push(71);
    vi.advanceTimersByTime(200);
    saver.push(72);
    vi.advanceTimersByTime(200);
    saver.push(73);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(900);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(73);
  });

  it("fires again for a later, separate change", () => {
    const fn = vi.fn();
    const saver = createSaver<number>(900, fn);
    saver.push(70);
    vi.advanceTimersByTime(900);
    expect(fn).toHaveBeenCalledTimes(1);
    saver.push(71);
    vi.advanceTimersByTime(900);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(71);
  });

  it("cancel prevents the pending fire (unmount safety)", () => {
    const fn = vi.fn();
    const saver = createSaver<number>(900, fn);
    saver.push(70);
    saver.cancel();
    vi.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
  });
});
