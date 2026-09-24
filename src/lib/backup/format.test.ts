import { describe, expect, it, vi } from "vitest";
import { BACKUP_TABLES, type TableRows } from "@/lib/backup/tables";
import { countRows, fetchAllUserRows } from "@/lib/backup/fetch";
import {
  backupFilename,
  buildEnvelope,
  buildSqlBackup,
  exportFilename,
  findSecretKeys,
  timestampStamp,
} from "@/lib/backup/format";

const userId = "11111111-1111-1111-1111-111111111111";
const coffeeId = "22222222-2222-2222-2222-222222222222";
const brewId = "33333333-3333-3333-3333-333333333333";

function fixture(): TableRows {
  return {
    competitionSettings: [
      { id: "s0", user_id: userId, name: "Current competition", min_final_beverage_g: 150, created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z" },
    ],
    sessions: [],
    coffees: [
      { id: coffeeId, user_id: userId, name: "O'Brien Reserve", origin: null, process: "Washed", roast_date: null, received_date: "2026-09-10", initial_weight_g: 200, remaining_weight_g: 185.5, notes: null, created_at: "2026-09-10T00:00:00.000Z", updated_at: "2026-09-10T00:00:00.000Z" },
    ],
    brews: [
      { id: brewId, user_id: userId, coffee_id: coffeeId, session_id: null, dose_g: 15, water_g: 250, temp_c: 92, grind_clicks: 70, grinder: null, dripper: null, filter: null, water_source: null, pour_count: null, total_time_sec: null, final_beverage_g: null, notes: null, brewed_at: "2026-09-20T12:00:00.000Z", created_at: "2026-09-20T12:00:00.000Z", updated_at: "2026-09-20T12:00:00.000Z" },
    ],
    observations: [
      { id: "o1", user_id: userId, brew_id: brewId, acidity: "bright", sweetness: null, body: null, clarity: null, bitterness: null, astringency: null, intensity: null, balance: null, finish: null, hot_notes: null, warm_notes: null, cold_notes: null, freeform_notes: null, created_at: "2026-09-20T12:00:00.000Z", updated_at: "2026-09-20T12:00:00.000Z" },
    ],
    experiments: [],
    cuppings: [],
    tastings: [],
  };
}

describe("export envelope", () => {
  it("is versioned and preserves ids, keys, nulls, and numbers", () => {
    const env = buildEnvelope(fixture(), userId, "2026-09-22T18:30:00.000Z");
    expect(env.format).toBe("brewlog-export");
    expect(env.version).toBe(1);
    expect(env.exportedBy.userId).toBe(userId);
    expect(env.counts.coffees).toBe(1);
    expect(env.counts.sessions).toBe(0);
    const coffee = env.data.coffees[0];
    expect(coffee.id).toBe(coffeeId);
    expect(coffee.user_id).toBe(userId);
    expect(coffee.origin).toBeNull();
    expect(coffee.remaining_weight_g).toBe(185.5);
    expect(env.data.observations[0].brew_id).toBe(brewId);
    expect(JSON.parse(JSON.stringify(env))).toEqual(env);
  });
  it("represents every user-owned entity", () => {
    const keys = Object.keys(buildEnvelope(fixture(), userId, "x").data).sort();
    expect(keys).toEqual(
      ["brews", "coffees", "competitionSettings", "cuppings", "experiments", "observations", "sessions", "tastings"].sort(),
    );
    expect(BACKUP_TABLES.map((t) => t.key).sort()).toEqual(keys);
  });
});

describe("secret scan", () => {
  it("passes user rows and flags credential-like keys", () => {
    expect(findSecretKeys(fixture())).toEqual([]);
    expect(findSecretKeys({ password: "x" })).toEqual(["$.password"]);
    expect(findSecretKeys({ nested: { api_key: "x" } })).toEqual(["$.nested.api_key"]);
    expect(findSecretKeys({ user_id: userId })).toEqual([]);
  });
});

describe("sql backup", () => {
  it("emits a transaction with FK-safe order, escaped strings, nulls, and raw numbers", () => {
    const sql = buildSqlBackup(fixture(), { exportedAt: "2026-09-22T18:30:00.000Z", userId });
    expect(sql.startsWith("-- BrewLog")).toBe(true);
    expect(sql).toContain("BEGIN;");
    expect(sql.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(sql.indexOf('"competition_settings"')).toBeLessThan(sql.indexOf('"coffees"'));
    expect(sql.indexOf('"coffees"')).toBeLessThan(sql.indexOf('"brews"'));
    expect(sql.indexOf('"brews"')).toBeLessThan(sql.indexOf('"observations"'));
    expect(sql).toContain("O''Brien Reserve");
    expect(sql).toContain("185.5");
    expect(sql).toContain("NULL");
    expect(sql).toContain(coffeeId);
    expect(sql).toContain("-- sessions: 0 rows");
  });
});

describe("filenames", () => {
  it("uses timestamped, colon-free names", () => {
    const d = new Date("2026-09-22T18:30:00.000Z");
    expect(timestampStamp(d)).toBe("2026-09-22T18-30-00");
    expect(backupFilename(d)).toBe("backups/brewlog-2026-09-22T18-30-00.sql");
    expect(exportFilename(d)).toBe("exports/brewlog-2026-09-22T18-30-00.json");
  });
});

describe("fetchAllUserRows", () => {
  function mockDb(rows: TableRows, failOn?: string) {
    return {
      from: (table: string) => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockResolvedValue(
            table === failOn
              ? { data: null, error: { message: "boom" } }
              : { data: rows[table] ?? [], error: null },
          ),
        })),
      }),
    };
  }
  it("reads every table in order and returns rows keyed by entity", async () => {
    const byTable: TableRows = {};
    for (const t of BACKUP_TABLES) byTable[t.table] = [];
    byTable["coffees"] = fixture().coffees;
    const out = await fetchAllUserRows(mockDb(byTable) as never);
    expect(out.coffees).toHaveLength(1);
    expect(countRows(out).brews).toBe(0);
  });
  it("fails the whole export when any table errors (no partial files)", async () => {
    await expect(fetchAllUserRows(mockDb({}, "brews") as never)).rejects.toThrow("brews");
  });
});
