# BrewLog — V0

Private, mobile-first brew journal for coffee experimentation. PWA-ready, autosaving, Supabase-backed.

## Quickstart

1. `pnpm install`
2. Create a Supabase project → copy URL + `anon` key → `.env.local` (see `.env.example`)
3. Supabase SQL editor → run migrations in order: `0001_schema.sql`, `0002_competition_settings.sql`, `0003_brewed_at.sql` (0003 backfills `brewed_at` from `created_at`; existing data is preserved)
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

## Request & caching strategy

`fetch once → local state → targeted mutation → targeted invalidation`.
No client component fetches reference data; pages load it once server-side and
pass it as props. Typing never triggers a query: the autosave hook syncs only
when serialized form content actually changes (debounced), and the new-brew
form syncs nothing at all until submit. Mutations carry no `revalidatePath`
except submit-type actions, which invalidate only the affected list. No global
store, no blind refetching.

Dev instrumentation: `src/instrumentation.ts` patches server `fetch` and the
`sb:` badge (top-right, dev only) patches client `fetch`, counting Supabase
requests per session — `[supabase:server] #N OP kind table · route` in the
console (e.g. `#2 GET read brews · /brews/abc`). Tap the badge to print the
per-interaction breakdown and reset. A healthy session: opening a brew costs
its reads once (brew + observations + sessions + auth) and then zero while
idle; one edit burst costs one UPDATE; rapid 70→71→72→73 collapses to one
UPDATE with the final value; navigation reads only the target route; refresh
repeats the open cost once. Anything repeating on a fixed cadence is a loop —
check the log's operation column first.

## Single-user auth

Public signup is removed from the UI by design. To close it server-side as
well: Supabase dashboard → Authentication → Providers → Email → turn OFF
"Allow new users to sign up". Existing users (including dev accounts) keep
working; only new self-registration stops. No keys or credentials involved.

## Product rules (V0)

- Observation ≠ diagnosis: the app never labels "acidic" as "underextracted".
- Unknown coffee metadata stays unknown; competition values are defaults, not rules.
- Autosave: immediate local draft (`localStorage` behind async `DraftStore`, IndexedDB-ready) + debounced server sync + visible save state. The server record is authoritative: a draft restores only when newer than the server row, otherwise it is dropped.
- Copy-previous-brew is the primary fast path; inventory decrement is approximate and advisory.
