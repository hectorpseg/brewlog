import { describe, expect, it } from "vitest";
import { coffeeSchema } from "@/lib/validation/schemas";
import { coffeeDetailLine, coffeeMetaLine } from "@/lib/domain/coffee-meta";
import { matchCoffee } from "@/lib/domain/search";
import { BACKUP_TABLES } from "@/lib/backup/tables";
import { buildSqlBackup } from "@/lib/backup/format";

const META = {
  variety: "Gesha",
  producer: "La Palma",
  country: "Colombia",
  region: "Huila",
  farm: "El Mirador",
  altitude: "1800-2000 masl",
};

describe("coffee metadata schema", () => {
  it("creates with metadata", () => {
    const r = coffeeSchema.safeParse({ name: "Comp lot", ...META });
    expect(r.success).toBe(true);
  });
  it("edits metadata: all fields optional, absent stays unknown", () => {
    expect(coffeeSchema.safeParse({ name: "X" }).success).toBe(true);
    // Forms convert "" to undefined via nullish() before parsing; the schema
    // keeps absent metadata unknown like the existing origin/process fields.
    const r = coffeeSchema.safeParse({ name: "X", variety: undefined, altitude: undefined });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.variety).toBeUndefined();
      expect(r.data.altitude).toBeUndefined();
    }
  });
  it("rejects overlong metadata", () => {
    expect(coffeeSchema.safeParse({ name: "X", variety: "v".repeat(121) }).success).toBe(false);
  });
});

describe("coffee metadata rendering", () => {
  it("missing metadata renders exactly the legacy lines", () => {
    expect(coffeeMetaLine({})).toBe("origin/process unknown");
    expect(coffeeMetaLine({ origin: null, process: null })).toBe("origin/process unknown");
    expect(coffeeDetailLine({})).toBeNull();
    expect(coffeeDetailLine({ variety: null, producer: "", country: null, region: "", farm: null, altitude: "" })).toBeNull();
  });
  it("populated metadata renders the detail line", () => {
    expect(coffeeMetaLine({ origin: "Colombia", process: "Washed" })).toBe("Colombia · Washed");
    expect(coffeeDetailLine(META)).toBe("Gesha · La Palma · Colombia · Huila · El Mirador · 1800-2000 masl");
    expect(coffeeDetailLine({ variety: "Gesha" })).toBe("Gesha");
  });
});

describe("coffee metadata search", () => {
  it("matches new fields", () => {
    expect(matchCoffee({ name: "Lot", ...META }, "gesha")).toBe(true);
    expect(matchCoffee({ name: "Lot", ...META }, "mirador")).toBe(true);
    expect(matchCoffee({ name: "Lot", ...META }, "huila")).toBe(true);
    expect(matchCoffee({ name: "Lot", ...META }, "1800")).toBe(true);
    expect(matchCoffee({ name: "Lot", ...META }, "kenya")).toBe(false);
  });
  it("legacy rows still match name/origin/process", () => {
    expect(matchCoffee({ name: "La Palma", origin: "Colombia", process: "Washed" }, "washed")).toBe(true);
  });
});

describe("coffee metadata export compatibility", () => {
  it("backup columns include the new fields", () => {
    const spec = BACKUP_TABLES.find((t) => t.key === "coffees");
    expect(spec?.columns).toContain("variety");
    expect(spec?.columns).toContain("producer");
    expect(spec?.columns).toContain("country");
    expect(spec?.columns).toContain("region");
    expect(spec?.columns).toContain("farm");
    expect(spec?.columns).toContain("altitude");
  });
  it("legacy rows without metadata export as NULL and stay import-compatible", () => {
    const rows = {
      competitionSettings: [],
      sessions: [],
      coffees: [
        { id: "c1", user_id: "u1", name: "Old lot", origin: null, process: "Washed", roast_date: null, received_date: null, initial_weight_g: 200, remaining_weight_g: 185, notes: null, created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z" },
      ],
      brews: [],
      observations: [],
      tastings: [],
      experiments: [],
      cuppings: [],
    };
    const sql = buildSqlBackup(rows, { exportedAt: "2026-09-22T18:30:00.000Z", userId: "u1" });
    expect(sql).toContain('"variety"');
    expect(sql).toContain("Old lot");
    expect(sql).toContain("NULL");
  });
  it("populated metadata persists through the SQL backup", () => {
    const rows = {
      competitionSettings: [],
      sessions: [],
      coffees: [
        { id: "c1", user_id: "u1", name: "New lot", origin: "Colombia", process: "Washed", ...META, roast_date: null, received_date: null, initial_weight_g: 200, remaining_weight_g: 185, notes: null, created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z" },
      ],
      brews: [],
      observations: [],
      tastings: [],
      experiments: [],
      cuppings: [],
    };
    const sql = buildSqlBackup(rows, { exportedAt: "2026-09-22T18:30:00.000Z", userId: "u1" });
    expect(sql).toContain("Gesha");
    expect(sql).toContain("El Mirador");
  });
});
