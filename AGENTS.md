# BrewLog - Agent Instructions

## Operating rules
- Work only on the requested task. Keep changes tightly scoped.
- Inspect only files directly relevant to the task and their immediate dependencies. Expand investigation only when the implementation shows it is necessary.
- Do not perform broad repository exploration by default.
- Do not inspect system directories (`/tmp`, `/etc`, home directories), unrelated projects, or create isolated copies/alternate environments.
- Do not install dependencies unless required by the task and explicitly approved.
- For straightforward tasks, identify the relevant files and implement directly. Do not create elaborate TODO plans for small tasks.
- For larger tasks, use a short plan covering only necessary work.
- If requirements are genuinely ambiguous and affect implementation, ask before guessing.
- Do not invent requirements or expand scope.
- Reuse existing patterns/components. Avoid speculative abstractions, one-off systems, unrelated refactors, and new infrastructure.
- Preserve existing behavior unless the task explicitly changes it.

### Testing
Automated testing is the agent's responsibility. Manual/visual testing is the human's responsibility.
- Do NOT take screenshots or perform manual UI/visual verification unless explicitly requested.
- Run only checks relevant to the change:
  - Domain/logic: relevant unit tests.
  - TypeScript/API/forms: relevant tests + typecheck.
  - UI-only: relevant typecheck/lint when useful.
  - Database/migration: relevant tests + typecheck and migration validation.
  - Substantial cross-cutting feature: tests + typecheck + lint + production build when warranted.
- Do not run a production build after every small change.
- Do not repeatedly run unchanged checks.
- Never modify production data for testing unless explicitly requested.

### Git
- Read-only git commands are allowed when useful.
- Do not commit, push, merge, rebase, reset, delete branches, or create PRs unless explicitly requested.

### Completion
Briefly report: what changed, automated checks/results, anything the human should manually verify, and unresolved issues/assumptions. Do not create `output.txt` unless explicitly requested.

## Product roadmap

`docs/ROADMAP.md` is the product-direction source of truth (current phase,
phases A–O, product principles). Read it before proposing major product work;
its status labels override any assumptions about what to build next.

## Project

BrewLog is a private, mobile-first brew journal for coffee experimentation. It records brews, observations, sessions, cuppings and experiments, compares brews, helps avoid redundant experiments, and helps progressively converge on recipes.

It is an experimental brew journal, not a generic coffee recipe generator or social app. Do not add social, recommendation, or AI-coach behavior unless explicitly requested.

### V0 scope
Focus on authentication, coffee records, brew records, sessions, observations, experiments, autosave, offline/local drafts, mobile-first UX, brew history, and copying previous brews.

Do not implement unless explicitly requested: AI coach/LLM features, Whisper, WebGPU speech recognition, WebMCP, AI recommendations, advanced charts, social features, multi-user sharing, notifications, subscriptions, gamification, or espresso support.

## Stack
- Next.js 16 App Router + React 19 + TypeScript
- Supabase (Postgres + RLS)
- Zod + React Hook Form
- Tailwind v4 tokens
- pnpm
 - Node 22 (nvm default — no version switching needed)

## Project map
- Routes/pages: `src/app/`
- Server mutations: `src/app/actions.ts`
- Server reads: `src/lib/db/queries.ts`
- Brew update mapping: `src/lib/db/brew-update.ts`
- Domain logic: `src/lib/domain/*.ts`
- Shared components: `src/components/`
- Base controls: `src/components/ui/controls.tsx`
- List URL state: `src/lib/lists/params.ts`
- Local list prefs: `src/lib/lists/prefs.ts`
- Drafts/autosave: `src/lib/drafts/`
- Supabase clients: `src/lib/supabase/` (`server.ts`, `client.ts`, `require-user.ts`)
- Migrations: `supabase/migrations/`
- Unit tests: colocated `*.test.ts`, `pnpm test`
- E2E: `e2e/`, `pnpm e2e`

### Main routes
`/brews`, `/brews/[id]`, `/brews/new`, `/coffees`, `/coffees/[id]`, `/coffees/new`, `/sessions`, `/sessions/[id]`, `/sessions/new`, `/cuppings`, `/cuppings/[id]`, `/cuppings/new`, `/brews/compare`, `/more`, `/account`, `/login`, `/forgot-password`, `/update-password`.

`/brews/compare` uses `src/app/brews/compare/page.tsx` and `src/components/compare-shell.tsx`.

## Existing architecture - reuse it

### Shared UI
Prefer existing components over one-off equivalents:
- `list-controls.tsx`: list search/sort/filter components and list wrappers.
- `entity-card.tsx`: `EntityCard`, `EntityDisclosure`, `CollectionAction`.
- `brew-card.tsx`: canonical compact brew row/card.
- `coffee-card.tsx`, `cupping-card.tsx`
- `section-nav.tsx`: brew detail scroll-spy + `TastingDisclaimer`.
- `favorite-button.tsx`
- `save-state.tsx`, `save-button.tsx`
- `search-field.tsx`
- `recently-viewed.tsx`
- `quick-actions.tsx`
- `ui/controls.tsx`: `Input`, `Select`, `Button`, `Label`, `Card`, `Pill`
- `states.tsx`: empty/loading states

### Data flow
- Reads live in `lib/db/queries.ts`.
- Mutations live in `src/app/actions.ts`.
- Both go through RLS.
- Never accept a client-supplied `user_id`.
- Revalidate affected paths after mutations.

### Lists
- Search/filter/sort are server-side.
- Search typing only debounces a URL change.
- The URL is the source of truth for list state.
- Parse with `parse*Params`; serialize with `listHref`/`toQuery`.
- Unknown values degrade to defaults.
- `listBrewsPage`, `listCoffeesPage`, `listSessionsPage`, and `listCuppingsPage` read their flat `*_list` views.
- `search_blob` is server-only and must be stripped before rows reach components.
- Sessions render outside `ListNavProvider` and use a plain `router.replace` fallback.

### Domain code
Important existing modules:
- `brew-status.ts`, `brew-date.ts`, `ratio.ts`, `brew-time.ts`, `pours.ts`, `tastings.ts`, `coffee-meta.ts`
- `brew-score.ts`: mean of entered tastings / 2; never fabricate a score.
- `recipe-start.ts`: `recipeStartingValues`, `formInitKey`.
- `quick-actions.ts`
- `recent-views.ts`: pure shaping; persistence is in `recordRecentView`/`listRecentViews`.

Do not duplicate domain/DB behavior in UI components.

## Product and domain rules

### UX
The user is usually preparing/tasting coffee. Minimize typing. Prefer defaults, copying previous brews, compact controls, progressive disclosure, quick sensory inputs, and free-form notes.

Long forms MUST autosave. Never make the user fear losing a brew log.

### Autosave
Forms must:
1. Persist draft state locally immediately.
2. Sync to the server with debounce.
3. Display save state.
4. Recover from network failure.
5. Restore drafts after reload.

Never depend exclusively on server writes or add a server write per field change. Existing implementation: `lib/drafts/useAutosave.ts`.

### Data integrity
Database records are facts. Keep these concepts separate:
- Observation: `"acidic"`
- Interpretation: `"underextracted"`
- Hypothesis: `"probably underextracted"`

Unknown values remain unknown. Never fabricate coffee metadata or historical data.

### Experiment methodology
The user prefers controlled experiments:
`Observation → hypothesis → variable change → expected result → brew → observation → conclusion → next question`

A brew should make it possible to understand what changed from the previous brew. Do not encourage changing many variables simultaneously unless explicitly requested.

### Competition context
Current Origami competition defaults/templates include 200 g practice coffee, same coffee for practice/competition, minimum 150 ml final beverage, participant-provided water, and sensory evaluation of flavor, acidity, balance, body, sweetness, residual and consistency over time.

These are competition-specific defaults/templates, not universal coffee rules.

## Domain modeling restraint
Prefer the smallest domain model that accurately supports the current workflow.
- Prefer fields/values over new entities.
- Create a first-class entity only when it has its own lifecycle, independent browsing/editing, or meaningful relationships that cannot naturally be represented as fields.
- Do not normalize hypothetical future requirements.
- Do not create CRUD screens merely because something can be a table.
- Repeated values are not automatically entities.
- Equipment remains fields on Brew unless a concrete requirement proves independent lifecycle/relationships are needed.

Do NOT create Dripper, Grinder, Filter, WaterProfile, or generic Method entities for the current product. A Session may contain equipment/method context in notes or existing Brew fields, but equipment is not independently managed as a Session resource.

When proposing a new entity, identify the independent lifecycle, browsing/editing need, or relationship that requires it. If none exists, keep it as a field.

## UI design system

`/brews` and `/coffees` are canonical visual references. Follow existing patterns in `brew-card.tsx`, `list-controls.tsx`, and `globals.css`.

### Typography
- Fraunces / `font-display`: page headings and entity names on cards only.
- Sans-serif: all other UI.
- Page heading: `text-2xl`; card names: `text-base`; metadata: `text-xs`/`text-[11px]`.
- Section labels: `text-[11px] font-medium tracking-wide text-ink3 uppercase`.
- Do not enlarge individual recipe values beyond the existing hierarchy.

### Color
Use `globals.css` `@theme` tokens, never raw hex:
`paper`, `card`, `ink`, `ink2`, `ink3`, `line`, `ember`, plus semantic status tokens `ok` (muted success dot) and `note` (warm guidance surface). Floating overlays use the `shadow-elev` token; nothing else casts a shadow.
`ember` is the deliberate accent for primary actions, active pills, focus rings and favorite/affordance highlights. Do not use it as decorative fill.

### Cards
Prefer `EntityCard` or:
`rounded-[10px] border border-line bg-card px-3 py-2`
Identity first, metadata below, no floating actions. Whole card is the navigation target; interactive actions sit above it at `z-10`. Chevron is the navigation affordance. Use subtle `active:scale-[0.99]` press feedback.

### Controls
Reuse `components/ui/controls.tsx`. Touch targets are 44px / `min-h-11`. Pills use `px-3 py-1.5 text-xs rounded-full`. Discrete choices use the existing compact pill pattern.

### Interaction/layout
- Transitions around 150ms; subtle scale/opacity only.
- Pending server work disables the conflicting control or uses dimming; use optimistic UI where appropriate.
- Loading uses existing list/provider skeletons, not new client fetching.
- Compact vertical rhythm: lists `gap-2`, sections `gap-4`.
- Mobile-first; horizontal strips use `.no-scrollbar`.
- No density preference toggles unless explicitly requested.
- Avoid modals by default; prefer inline confirmation/validation, contextual feedback, and undo where safe.
- Never use browser `alert()`/`confirm()`.
- If the user intentionally changes design direction, update these rules.

## Security
All user-owned database tables use RLS.

Never trust client user IDs, ownership claims, or authorization fields.

Never expose:
- Supabase service-role keys
- AI provider API keys
- Server secrets

Do not store raw audio in V0 unless explicitly required. Do not add third-party analytics without explicit product approval. Never give an agent access to secrets just to make a task easier.

## Database and migrations
Changes are additive and backward-compatible.
- Never drop production data.
- Never `db reset`.
- Never delete/rewrite historical records to fit a new model.
- Use migrations for schema changes.
- Preserve relationships and foreign keys.
- Existing records must remain readable.
- New records use the new structure.
- Never invent historical data.
- Never touch production data for testing unless explicitly requested.

When replacing a model/UI, preserve existing data; remove obsolete UI only when the new model covers the intended workflow; never silently discard information; do not maintain competing active UI models for hypothetical compatibility.

## Debugging
When something does not work:
1. Identify the exact screen, action, and observed behavior.
2. Verify the code being tested is actually loaded (dev server freshness/deployment state) before changing it.
3. Trace the data flow.
4. Fix the root cause, not the symptom.
5. Do not use git operations unless explicitly requested.

Do not repeatedly restart environments or create alternate copies when the existing project environment is sufficient.

## Feature decision rules
Before implementing a feature:
1. Does it improve brew logging?
2. Does it reduce friction?
3. Does it improve experimental reasoning?
4. Does it preserve data integrity?
5. Does it belong in the current phase?

If not, do not implement it unless explicitly requested.

## Future AI architecture
`Database = facts`, `Rules = methodology`, `LLM = interpretation`.

The LLM is not the source of truth. AI must never silently modify saved brew data. AI suggestions remain suggestions and the user retains final control. Do not implement future AI features in V0.

## Project-specific pitfalls
- React Hook Form ignores changed `defaultValues` on a mounted instance. Use `formInitKey` to remount the new-brew form when its copy/coffee source changes.
- `list-controls.tsx` is shared across brews, coffees, sessions and cuppings.
- `search_blob` is server-only.
- Autosave writes the local draft first and syncs with debounce.
- Keep observation, interpretation, hypothesis, and score separate.
- Migrations are additive/backward-compatible; never reset the DB or rewrite historical rows.
- Equipment stays on Brew; do not introduce equipment entities without a concrete product requirement.

## Branch workflow
- Only `staging` may be merged into `master` directly.
- Feature/fix/performance branches merge into `staging` first.
- A separate `staging` → `master` PR promotes changes to production.
- Do not push directly to `master`.
- PRs targeting `staging` are reviewed and merged normally.

## Final principle
BrewLog should feel like a focused personal coffee notebook.

Prefer small changes, explicit code, existing patterns, strong data integrity, minimal architecture, fast feedback, controlled experiments, and mobile-first UX.

Avoid broad exploration, speculative architecture, generic frameworks, one-off UI systems, unnecessary dependencies, unrelated refactors, hypothetical entities, and manual visual testing by the agent.
