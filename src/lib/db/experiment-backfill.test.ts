import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Guards the Wave 4 follow-up backfill migration as a static artifact: it may
// only ever INSERT junction rows for explicit legacy links. It must never
// UPDATE/DELETE experiments or brews, never fabricate links, and must carry
// the ownership predicate plus idempotent conflict handling. (Execution
// itself is proven by the live preview counts in the wave report.)
const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0010_experiment_brews_backfill.sql"),
  "utf8",
);
const lower = sql.toLowerCase();

describe("0010 experiment_brews backfill", () => {
  it("inserts only into the junction table", () => {
    expect(lower).toContain("insert into public.experiment_brews");
    expect(lower).toMatch(/select\s+e\.id,\s*e\.brew_id,\s*e\.user_id/);
  });
  it("migrates only explicit legacy links with matching brew ownership", () => {
    expect(lower).toContain("where e.brew_id is not null");
    expect(lower).toContain("b.id = e.brew_id");
    expect(lower).toContain("b.user_id = e.user_id");
  });
  it("is idempotent and never touches existing rows", () => {
    expect(lower).toContain("on conflict (experiment_id, brew_id) do nothing");
    expect(lower).not.toMatch(/\bupdate\s+public\./);
    expect(lower).not.toMatch(/\bdelete\s+from\s+public\./);
    expect(lower).not.toContain("brew_id = null");
    expect(lower).not.toContain("brew_id=null");
  });
});
