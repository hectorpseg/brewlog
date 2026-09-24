import { mkdirSync, writeFileSync } from "node:fs";
import { buildEnvelope, exportFilename, findSecretKeys } from "../src/lib/backup/format";
import { loadCliEnv, resolveConfig, signInUser } from "./brewlog-common";

// pnpm brewlog:export — portable versioned JSON of the caller's own rows.
// Read-only against the database; the file is built fully in memory and
// written once. JSON import is not implemented yet.
async function main(): Promise<void> {
  const { fetchAllUserRows } = await import("../src/lib/backup/fetch");
  loadCliEnv();
  const config = resolveConfig(process.env);
  const { supabase, userId } = await signInUser(config);
  try {
    const rows = await fetchAllUserRows(supabase as never);
    const exportedAt = new Date().toISOString();
    const envelope = buildEnvelope(rows, userId, exportedAt);
    const leaked = findSecretKeys(envelope);
    if (leaked.length > 0) throw new Error(`refusing to write export containing secret-like keys: ${leaked.join(", ")}`);
    const json = JSON.stringify(envelope, null, 2) + "\n";
    JSON.parse(json);
    const path = exportFilename();
    mkdirSync("exports", { recursive: true });
    writeFileSync(path, json);
    console.log(`Export written to ${path}`);
    for (const [k, n] of Object.entries(envelope.counts)) console.log(`- ${k}: ${n}`);
  } finally {
    await supabase.auth.signOut().catch(() => {});
  }
}

main().catch((e: unknown) => {
  console.error(`brewlog:export failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
