import { describe, expect, it } from "vitest";
import { excludeSessionBrews, formatCandidateLabel } from "@/lib/domain/sessions";

describe("excludeSessionBrews", () => {
  it("keeps every brew not already in the session", () => {
    const all = [
      { id: "a", session_id: "s1" },
      { id: "b", session_id: null },
      { id: "c", session_id: "s2" },
    ];
    expect(excludeSessionBrews(all, "s1").map((b) => b.id)).toEqual(["b", "c"]);
  });

  it("keeps unassigned brews and everything when the session is empty", () => {
    const all = [
      { id: "a", session_id: null },
      { id: "b", session_id: null },
    ];
    expect(excludeSessionBrews(all, "s9")).toHaveLength(2);
  });
});

describe("formatCandidateLabel", () => {
  it("renders dose/water/temp/grind compactly", () => {
    expect(
      formatCandidateLabel({ dose_g: 15, water_g: 250, temp_c: 92, grind_clicks: 70 }),
    ).toBe("15g / 250g · 92°C · 70 clicks");
  });

  it("marks unknown values instead of dropping the row", () => {
    expect(
      formatCandidateLabel({ dose_g: 15, water_g: 250, temp_c: null, grind_clicks: null }),
    ).toBe("15g / 250g · ?°C · ? clicks");
  });
});
