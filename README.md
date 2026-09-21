# BrewLog — V0

Private, mobile-first brew journal for coffee experimentation. PWA-ready, autosaving, Supabase-backed.

## Quickstart

1. `pnpm install`
2. Create a Supabase project → copy URL + `anon` key → `.env.local` (see `.env.example`)
3. Supabase SQL editor → run `supabase/migrations/0001_schema.sql`
4. Auth → enable Email provider (disable "confirm email" for local dev)
5. `pnpm dev` → open `/login` → sign up → `/coffees`

Environment files (`.env`, `.env.local`, `.env.*.local`) are git-ignored and
never committed; `.env.example` is the tracked template with placeholders only.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm lint` · `pnpm typecheck` · `pnpm test` (vitest) · `pnpm e2e` (playwright)

## Manual Supabase setup still required

- Project creation, keys, email provider — all in dashboard (no CLI vendored in V0).
- RLS policies ship in the migration; verify unauthenticated reads return nothing.
- Never put `service-role` in `NEXT_PUBLIC_*` or commit `.env.local`.

## Development seed data

No `supabase/seed.sql` by design: the SQL editor and CLI run outside any auth
context (`auth.uid()` is NULL there), so seed rows could only be attributed to
you by hard-coding a user UUID. Instead, seeding goes through the app itself —
inserts run in your signed-in session, so RLS applies end-to-end exactly as in
production. No fake users, no credentials, no service-role key.

What you get (all prefixed `Seed · `): 4 coffees (competition lot with unknown
origin/process, Ethiopia washed, Colombia honey, Brazil beater with no brews),
2 sessions, 7 brews (grind/ratio/temp/filter/water variations), 5 observations
(2 brews deliberately unobserved), 4 experiments (incl. one confounded
two-variable trial and one session-level cupping note).

Run it:

1. `.env.local` → add `ALLOW_DEV_SEED=true` (never set this in production)
2. Restart `pnpm dev` (server actions read env at runtime start)
3. Sign in → `/coffees` → **Seed demo data**
4. Re-seed any time: it deletes only your `Seed · ` rows first, then inserts —
   running twice yields the same state, never duplicates. **Reset** deletes
   them without re-inserting. Your non-seed rows are never touched.

Tests: `src/lib/seed/demo-data.test.ts` covers FK integrity, recipe variation,
validation-shape conformance, empty/partial states, and observation-vs-diagnosis
vocabulary.

## Product rules (V0)

- Observation ≠ diagnosis: the app never labels "acidic" as "underextracted".
- Unknown coffee metadata stays unknown; competition values are defaults, not rules.
- Autosave: immediate local draft (`localStorage` behind async `DraftStore`, IndexedDB-ready) + debounced server sync + visible save state. Server wins on conflict, local kept under `:conflict`.
- Copy-previous-brew is the primary fast path; inventory decrement is approximate and advisory.
