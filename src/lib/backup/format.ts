import { BACKUP_TABLES, type Row, type TableRows } from "./tables";
import { countRows } from "./fetch";

export type ExportEnvelope = {
  format: string;
  version: number;
  exportedAt: string;
  exportedBy: { userId: string };
  counts: Record<string, number>;
  data: TableRows;
};

// brewlog-2026-09-22T18-30-00 — UTC ISO with colons dashed for file safety.
export function timestampStamp(d = new Date()): string {
  return d.toISOString().slice(0, 19).replaceAll(":", "-");
}

export function backupFilename(d = new Date()): string {
  return `backups/brewlog-${timestampStamp(d)}.sql`;
}

export function exportFilename(d = new Date()): string {
  return `exports/brewlog-${timestampStamp(d)}.json`;
}

export function buildEnvelope(rows: TableRows, userId: string, exportedAt: string): ExportEnvelope {
  return {
    format: "brewlog-export",
    version: 1,
    exportedAt,
    exportedBy: { userId },
    counts: countRows(rows),
    data: rows,
  };
}

// Runtime leak guard: row data must never contain credentials. user_id is
// expected and allowed; anything password/token/secret/key-like fails closed.
const SECRET_KEY = /(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key)/i;

export function findSecretKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => findSecretKeys(v, `${path}[${i}]`));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
      SECRET_KEY.test(k) ? [`${path}.${k}`] : findSecretKeys(v, `${path}.${k}`),
    );
  }
  return [];
}

function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return `'${String(v).replaceAll("'", "''")}'`;
}

// Data-only SQL dump: explicit INSERTs with original ids/keys/timestamps, in
// FK-safe table order inside one transaction. Schema comes from
// supabase/migrations/* — apply those first, then run this file.
export function buildSqlBackup(rows: TableRows, meta: { exportedAt: string; userId: string }): string {
  const counts = countRows(rows);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const lines: string[] = [
    "-- BrewLog data backup (data only).",
    "-- Restore: apply supabase/migrations/* on an empty database, then run this file.",
    `-- exported_at: ${meta.exportedAt}`,
    `-- exported_by user_id: ${meta.userId}`,
    `-- rows: ${total}`,
    "BEGIN;",
  ];
  for (const spec of BACKUP_TABLES) {
    const tableRows = rows[spec.key] ?? [];
    if (tableRows.length === 0) {
      lines.push(`-- ${spec.table}: 0 rows`);
      continue;
    }
    const cols = spec.columns.map((c) => `"${c}"`).join(", ");
    for (let i = 0; i < tableRows.length; i += 500) {
      const chunk = tableRows.slice(i, i + 500);
      const values = chunk
        .map((r: Row) => `(${spec.columns.map((c) => sqlLiteral(r[c])).join(", ")})`)
        .join(",\n  ");
      lines.push(`INSERT INTO public."${spec.table}" (${cols}) VALUES\n  ${values};`);
    }
  }
  lines.push("COMMIT;");
  return lines.join("\n") + "\n";
}
