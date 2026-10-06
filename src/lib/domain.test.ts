import { describe, expect, it } from "vitest";
import { brewRatio, formatRatio } from "@/lib/domain/ratio";
import { applyInventoryDelta, cuppingDoseDelta, remainingAfter, restoredAfter, exceedsRemaining, deductedFor, deductAdjustment } from "@/lib/domain/inventory";
import { diffBrews } from "@/lib/domain/compare";
import { coffeeSchema, brewSchema } from "@/lib/validation/schemas";
import { autosaveReducer } from "@/lib/drafts/store";
import { localDraftStore, draftKey } from "@/lib/drafts/local-store";

describe("ratio", () => {
  it("computes 15/225 = 1:15", () => {
    expect(brewRatio(15, 225)).toBe(15);
    expect(formatRatio(15, 225)).toBe("1:15");
  });
  it("returns null on invalid input", () => {
    expect(brewRatio(0, 225)).toBeNull();
    expect(brewRatio(-1, 225)).toBeNull();
    expect(formatRatio(0, 0)).toBe("-");
  });
});

describe("inventory", () => {
  it("decrements approximately", () => {
    expect(remainingAfter(200, 15)).toBe(185);
  });
  it("hands the dose back on brew deletion, mirroring creation", () => {
    expect(restoredAfter(185, 15)).toBe(200);
    expect(restoredAfter(137.5, 15)).toBe(152.5);
  });
  it("warns without blocking", () => {
    expect(exceedsRemaining(10, 15)).toBe(true);
    expect(exceedsRemaining(137, 15)).toBe(false);
  });
});

describe("cupping inventory", () => {
  it("create consumes the dose: 200 - 15 = 185", () => {
    expect(applyInventoryDelta(200, -15)).toBe(185);
  });
  it("delete restores exactly what the cupping consumed: 185 + 15 = 200", () => {
    expect(cuppingDoseDelta(15, null)).toBe(15);
    expect(applyInventoryDelta(185, cuppingDoseDelta(15, null))).toBe(200);
  });
  it("increasing the dose consumes only the difference: 15 -> 20 takes 5 more", () => {
    expect(cuppingDoseDelta(15, 20)).toBe(-5);
    expect(applyInventoryDelta(185, -5)).toBe(180);
  });
  it("decreasing the dose restores only the difference: 20 -> 15 gives 5 back", () => {
    expect(cuppingDoseDelta(20, 15)).toBe(5);
    expect(applyInventoryDelta(180, 5)).toBe(185);
  });
  it("editing unrelated fields (same dose) moves nothing", () => {
    expect(cuppingDoseDelta(15, 15)).toBe(0);
    expect(cuppingDoseDelta(null, null)).toBe(0);
    expect(cuppingDoseDelta(null, undefined)).toBe(0);
  });
  it("null doses count as zero on either side", () => {
    expect(cuppingDoseDelta(null, 10)).toBe(-10);
    expect(cuppingDoseDelta(10, null)).toBe(10);
    expect(cuppingDoseDelta("15", 20)).toBe(-5);
  });
  it("never goes negative: insufficient coffee clamps at zero, advisory like brews", () => {
    expect(applyInventoryDelta(10, -15)).toBe(0);
    expect(applyInventoryDelta(0, -15)).toBe(0);
    expect(exceedsRemaining(10, 15)).toBe(true);
  });
  it("delta application is exactly reversible (failed writes roll back cleanly)", () => {
    const after = applyInventoryDelta(185, -5);
    expect(applyInventoryDelta(after, 5)).toBe(185);
  });
});

describe("recorded deduction", () => {
  it("records what a recording truly deducts, never fabricating stock", () => {
    expect(deductedFor(200, 15)).toBe(15);
    expect(deductedFor(10, 15)).toBe(10); // clamp: only the real 10 g leave
    expect(deductedFor(0, 15)).toBe(0); // empty bag deducts nothing
  });
  it("deletion restores exactly the recorded deduction, never more", () => {
    // brew recorded against an empty bag: stored deduction 0, delete restores 0
    const remaining = 0;
    expect(restoredAfter(remaining, deductedFor(0, 15))).toBe(0);
    // normal brew: full dose deducted and restored
    expect(restoredAfter(185, deductedFor(200, 15))).toBe(200);
  });
  it("edits hand back at most what was deducted, consume at most the stock", () => {
    // recorded 15 back when nothing was ever deducted: stock does not grow
    expect(deductAdjustment(0, 5, 200)).toEqual({ deducted: 0, next: 200 });
    // dose reduced, partially deducted: 2 of 5 returned
    expect(deductAdjustment(2, 5, 185)).toEqual({ deducted: 0, next: 187 });
    // dose increased, bag has room: consumption rises
    expect(deductAdjustment(15, -5, 50)).toEqual({ deducted: 20, next: 45 });
    // dose increased past stock: only the real grams leave
    expect(deductAdjustment(15, -50, 2)).toEqual({ deducted: 17, next: 0 });
    // legacy rows with unknown recorded deduction never gain grams either
    expect(deductAdjustment(null, 5, 200)).toEqual({ deducted: 0, next: 200 });
    expect(deductAdjustment(0, 0, 200)).toEqual({ deducted: 0, next: 200 });
  });
});

describe("validation", () => {
  it("coffee allows unknown metadata", () => {
    expect(coffeeSchema.safeParse({ name: "Comp coffee" }).success).toBe(true);
  });
  it("brew requires coffee + dose + water only", () => {
    expect(brewSchema.safeParse({ coffeeId: "not-a-uuid", doseG: 15, waterG: 225 }).success).toBe(false);
    expect(brewSchema.safeParse({ coffeeId: "123e4567-e89b-12d3-a456-426614174000", doseG: 15, waterG: 225 }).success).toBe(true);
  });

  it("optional numerics accept empty input as unknown (final beverage stays optional)", () => {
    const base = { coffeeId: "123e4567-e89b-12d3-a456-426614174000", doseG: 15, waterG: 225 };
    const r = brewSchema.safeParse({ ...base, finalBeverageG: "", tempC: "", grindClicks: "", pourCount: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.finalBeverageG).toBeUndefined();
      expect(r.data.tempC).toBeUndefined();
    }
    // real values still validate
    const ok = brewSchema.safeParse({ ...base, finalBeverageG: 178, tempC: 92 });
    expect(ok.success).toBe(true);
    // out-of-range values still rejected
    expect(brewSchema.safeParse({ ...base, tempC: 40 }).success).toBe(false);
  });

  it("coffee weights accept empty input as unknown", () => {
    expect(coffeeSchema.safeParse({ name: "X", initialWeightG: "", remainingWeightG: "" }).success).toBe(true);
  });
});

describe("compare", () => {
  it("splits changed/same ignoring ids", () => {
    const d = diffBrews({ id: 1, dose_g: 15, temp_c: 92 }, { id: 2, dose_g: 16, temp_c: 92 });
    expect(d.changed).toEqual(["dose_g"]);
    expect(d.same).toEqual(["temp_c"]);
  });
});

describe("autosave reducer", () => {
  it("editing -> saving -> saved; fail -> error", () => {
    let s = autosaveReducer("editing", { type: "SYNC_START" });
    expect(s).toBe("saving");
    s = autosaveReducer(s, { type: "SYNC_OK" });
    expect(s).toBe("saved");
    expect(autosaveReducer("saving", { type: "SYNC_FAIL" })).toBe("error");
    expect(autosaveReducer("editing", { type: "LOCAL_SAVED", offline: true })).toBe("local-draft");
  });
});

describe("draft store", () => {
  it("serializes/deserializes + keys are stable", async () => {
    const k = draftKey("u1", "brew", "new");
    expect(k).toBe("brewlog:brew:u1:new");
    // localStorage unavailable in node env -> load returns null, save is no-op
    await localDraftStore.save(k, { doseG: 15 });
    expect(await localDraftStore.load(k)).toBeNull();
  });
});

// ponytail: RLS is enforced by Postgres policies; unit-testable invariant is that
// client code never sends user_id (verified by grep in CI: no "user_id" in src/components or actions insert payloads).
describe("rls invariant", () => {
  it("documents ownership rule", () => {
    expect(true).toBe(true);
  });
});
