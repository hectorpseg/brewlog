import { mkdirSync, writeFileSync } from "node:fs";
import { backupFilename, buildSqlBackup, findSecretKeys } from "../src/lib/backup/format";
import { countRows } from "../src/lib/backup/fetch";
import { loadEnvFiles, resolveConfig, signInUser } from "./brewlog-common";

// pnpm brewlog:backup — data-only SQL backup of the caller's own rows
// (schema lives in supabase/migrations/*). Read-only against the database;
// the file is built fully in memory and written once.
async function main(): Promise<void> {
  const { fetchAllUserRows } = await import("../src/lib/backup/fetch");
  const config = resolveConfig(process.env, loadEnvFiles());
  const { supabase, userId } = await signInUser(config);
  try {
    const rows = await fetchAllUserRows(supabase as never);
    const leaked = findSecretKeys(rows);
    if (leaked.length > 0) throw new Error(`refusing to write backup containing secret-like keys: ${leaked.join(", ")}`);
    const exportedAt = new Date().toISOString();
    const sql = buildSqlBackup(rows, { exportedAt, userId });
    if (!sql.includes("INSERT INTO") && Object.values(rows).some((r) => r.length > 0)) {
      throw new Error("generated backup contains no statements despite non-empty data");
    }
    const path = backupFilename();
    mkdirSync("backups", { recursive: true });
    writeFileSync(path, sql);
    const counts = countRows(rows);
    console.log(`Backup written to ${path}`);
    for (const [k, n] of Object.entries(counts)) console.log(`- ${k}: ${n}`);
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
}

main().catch((e: unknown) => {
  console.error(`brewlog:backup failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
