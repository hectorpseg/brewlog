import { BACKUP_TABLES, type Row, type TableRows } from "./tables";

export const EXPORT_FORMAT = "brewlog-export";
export const EXPORT_VERSION = 1;

// Minimal query surface so tests can inject a mock; the real supabase-js
// client is cast to this at the call site. Reads pass through RLS.
export interface BackupDb {
  from(table: string): {
    select(columns: string): {
      order(column: string, options: { ascending: boolean }): {
        order(column: string, options: { ascending: boolean }): Promise<{
          data: Row[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

// Read-only: one ordered scan per table, no writes. Any single failure aborts
// the whole export so a partial file is never produced.
export async function fetchAllUserRows(db: BackupDb): Promise<TableRows> {
  const out: TableRows = {};
  for (const spec of BACKUP_TABLES) {
    const { data, error } = await db
      .from(spec.table)
      .select("*")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw new Error(`export failed on ${spec.table}: ${error.message}`);
    out[spec.key] = (data ?? []) as Row[];
  }
  return out;
}

export function countRows(rows: TableRows): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const spec of BACKUP_TABLES) counts[spec.key] = rows[spec.key]?.length ?? 0;
  return counts;
}
