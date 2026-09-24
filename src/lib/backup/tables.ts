// ponytail: backup/export table inventory, derived from supabase/migrations/*.
// Column lists are explicit (never SELECT * into SQL) so output is stable and
// reviewable. Order is FK-safe for a future importer: parents before children.

export type TableSpec = {
  key: string;
  table: string;
  columns: string[];
};

export const BACKUP_TABLES: TableSpec[] = [
  {
    key: "competitionSettings",
    table: "competition_settings",
    columns: ["id", "user_id", "name", "min_final_beverage_g", "created_at", "updated_at"],
  },
  {
    key: "sessions",
    table: "sessions",
    columns: ["id", "user_id", "title", "notes", "created_at", "updated_at"],
  },
  {
    key: "coffees",
    table: "coffees",
    columns: [
      "id", "user_id", "name", "origin", "process", "variety", "producer",
      "country", "region", "farm", "altitude", "roast_date", "received_date",
      "initial_weight_g", "remaining_weight_g", "notes", "created_at", "updated_at",
    ],
  },
  {
    key: "brews",
    table: "brews",
    columns: [
      "id", "user_id", "coffee_id", "session_id", "dose_g", "water_g", "temp_c",
      "grind_clicks", "grinder", "dripper", "filter", "water_source", "pour_count",
      "total_time_sec", "final_beverage_g", "notes", "brewed_at", "created_at", "updated_at",
    ],
  },
  {
    key: "observations",
    table: "observations",
    columns: [
      "id", "user_id", "brew_id", "acidity", "sweetness", "body", "clarity",
      "bitterness", "astringency", "intensity", "balance", "finish",
      "hot_notes", "warm_notes", "cold_notes", "freeform_notes", "created_at", "updated_at",
    ],
  },
  {
    key: "tastings",
    table: "tastings",
    columns: [
      "id", "user_id", "brew_id", "stage", "attribute", "value", "created_at", "updated_at",
    ],
  },
  {
    key: "experiments",
    table: "experiments",
    columns: [
      "id", "user_id", "brew_id", "session_id", "hypothesis", "changed_variables",
      "expected_result", "actual_result", "conclusion", "next_question",
      "created_at", "updated_at",
    ],
  },
  {
    key: "cuppings",
    table: "cuppings",
    columns: [
      "id", "user_id", "coffee_id", "cupped_at", "dose_g", "water_g", "grind",
      "grinder", "grind_clicks", "notes", "hot_notes", "warm_notes", "cold_notes",
      "created_at", "updated_at",
    ],
  },
];

export type Row = Record<string, unknown>;
export type TableRows = Record<string, Row[]>;
