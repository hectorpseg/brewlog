import { describe, expect, it } from "vitest";
import { toBrewUpdateRow } from "@/lib/db/brew-update";

describe("toBrewUpdateRow", () => {
  it("maps form keys to columns and skips empty values", () => {
    expect(toBrewUpdateRow({ grindClicks: "68", tempC: "", notes: "hi" })).toEqual({
      grind_clicks: "68",
      notes: "hi",
    });
  });

  it("assigns and clears the session association", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    expect(toBrewUpdateRow({ sessionId: id }).session_id).toBe(id);
    expect(toBrewUpdateRow({ sessionId: "" }).session_id).toBeNull();
  });

  it("ignores unknown keys and yields an empty row when nothing changed", () => {
    expect(toBrewUpdateRow({ hotNotes: "x", doseG: undefined })).toEqual({});
  });

  it("maps a valid brew date to noon UTC and skips the column otherwise", () => {
    expect(toBrewUpdateRow({ brewedAt: "2026-09-21" })).toEqual({
      brewed_at: "2026-09-21T12:00:00.000Z",
    });
    expect(toBrewUpdateRow({ brewedAt: "" })).toEqual({});
    expect(toBrewUpdateRow({ brewedAt: "yesterday" })).toEqual({});
  });
});
