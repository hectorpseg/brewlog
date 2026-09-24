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

  it("serializes overlapping runs so an older save never lands last", async () => {
    const seen: number[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const fn = vi.fn((v: number) => {
      calls += 1;
      seen.push(v);
      return calls === 1 ? gate : Promise.resolve();
    });
    const saver = createSaver<number>(900, fn);
    saver.push(1);
    await vi.advanceTimersByTimeAsync(900);
    expect(fn).toHaveBeenCalledTimes(1);
    // rapid edits while the first save is still flying: no second fire yet
    saver.push(2);
    saver.push(3);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
    // releasing the first save runs exactly one follow-up with the newest value
    release();
    await gate;
    await Promise.resolve();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    expect(seen).toEqual([1, 3]);
  });

  it("flush runs immediately when idle", () => {
    const fn = vi.fn(() => Promise.resolve());
    const saver = createSaver<number>(900, fn);
    saver.flush(5);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(5);
  });

  it("flush behind a running save queues one run with the newest value", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const fn = vi.fn(() => {
      calls += 1;
      return calls === 1 ? gate : Promise.resolve();
    });
    const saver = createSaver<number>(900, fn);
    saver.push(1);
    await vi.advanceTimersByTimeAsync(900);
    // retry tap mid-flight, then even newer typing: the follow-up run must
    // send the newest value, never the stale tap-time snapshot
    saver.flush(7);
    saver.push(8);
    release();
    await gate;
    await Promise.resolve();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(8);
  });

  it("cancel drops a queued follow-up without killing the running save", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let calls = 0;
    const fn = vi.fn(() => {
      calls += 1;
      return calls === 1 ? gate : Promise.resolve();
    });
    const saver = createSaver<number>(900, fn);
    saver.push(1);
    await vi.advanceTimersByTimeAsync(900);
    saver.push(2);
    saver.cancel();
    release();
    await gate;
    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
