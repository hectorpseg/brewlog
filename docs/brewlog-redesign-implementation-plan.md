# BrewLog Redesign Implementation Roadmap

Source of truth: `/docs/brewlog-redesign-spec.md`. This roadmap is file-aware and
implementation-oriented. It changes presentation and a few client behaviors only:
no new routes, entities, data-model changes, design system, theme file, motion
library, icon library, or shared mega-form.

Conventions used below:
- **Visual** = classes/markup only, no logic change.
- **Behavior** = client state, defaults, or interaction change.
- **Shared** = touches a component used by more than one screen.

Run all Node commands as `source ~/.nvm/nvm.sh && nvm use 22`.

---

## Phase 0 — Preparation / baseline

- Goal: capture a green baseline before touching anything.
- Files: none.
- Steps:
  - `pnpm test` (vitest) — record pass/fail.
  - `pnpm typecheck` (`tsc --noEmit`) — record pass/fail.
  - Optional: `pnpm e2e` with `E2E_EMAIL`/`E2E_PASSWORD` set; without them the
    credential-gated specs skip and the rest still validate routing/overflow.
- Acceptance: baseline known. Do not start Phase 1 if typecheck is already red.
- Not to change: nothing.

---

## Phase 1 — Tokens and color cleanup

- Goal: lock the type/color primitives in `globals.css`; remove the two off-system
  colors the spec calls out.
- Files:
  - `src/app/globals.css` (Visual)
  - `src/app/layout.tsx` (Visual)
  - `src/components/save-state.tsx` (Visual)
  - `src/components/section-nav.tsx` (Visual — disclaimer only)
- Changes:
  - `globals.css`: add `--font-text` (text face), keep `--font-display: Fraunces`,
    add `--radius: 10px` and `--dur: 150ms` tokens for reference, remove
    `--color-info-soft`. Keep the three ink levels. Do not introduce a theme file.
  - `src/app/layout.tsx`: load the text face via `next/font` (400/600, latin) and
    apply it to `<body>`; keep `max-w-md`, `min-h-dvh`, `bg-paper text-ink`, and
    the Fraunces display variable. Update `themeColor` only if it changes.
  - `save-state.tsx`: replace `saved: "bg-green-700"` with an ink/neutral dot so
    "Saved" is ink text, not a new color. Keep the ember dot for saving/error and
    the existing persist/retry semantics.
  - `section-nav.tsx` `TastingDisclaimer`: drop `bg-info-soft`; render as plain
    `text-ink2` guidance (spec: disclaimer is plain ink2 text inside Tasting).
- Reuse: existing `@theme` block, existing Fraunces variable, existing dot map.
- Dependencies: none.
- Tests: `pnpm typecheck`; `pnpm test` (visual only; unit tests unaffected).
- Playwright: none required; `pnpm e2e` responsive spec should stay green.
- Acceptance:
  - `info-soft` and `green-700` no longer appear anywhere (`grep`).
  - Body uses the text face; Fraunces still renders headings/names.
  - No layout shift; `max-w-md` shell unchanged.
- Not to change: `--color-paper/card/ink/ink2/ink3/line/ember`, `max-w-md`,
  `min-h-dvh`, focus ring, `.tnum`, `.select-field`, date-input rules.

---

## Phase 2 — Stage pattern and brew section rules

- Goal: one shared stage disclosure for both brew forms; sections closed by
  default except the working stage; Expected folded into Tasting.
- Files:
  - `src/components/section-nav.tsx` (Shared — add the stage component)
  - `src/components/brew-form.tsx` (Behavior/Shared)
  - `src/components/brew-editor.tsx` (Behavior/Shared)
- Changes:
  - `section-nav.tsx`: add one reusable `<details>` stage wrapper (working name
    `StageSection`) that renders `summary` = section name + a one-line fact and
    the section body. Use it in both forms. Keep `SectionNav` (scroll-spy) as-is
    but update its item list.
  - Apply the spec table exactly:
    - Recipe: summary `{dose} g → {water} g · {ratio}`; open on new brew and on
      detail when lifecycle is `in-progress`; contains coffee, beans switch, dose,
      water, grind, temp, time, date, session.
    - Equipment: summary `Grinder · dripper · filter` or `No equipment`; never
      default open.
    - Pours: summary `{n} pours · {poured} g` or `No pours`; never default open.
    - Result: summary yield/TDS if present else `No result`; never default open.
    - Tasting: summary `Tasted`/`Not tasted`; open on detail when lifecycle is
      `brewed`.
  - Remove the standalone Expected card in `brew-form.tsx`. Move the expected
    textarea into the Tasting stage, first, keeping `id="sec-expected"` so existing
    hashes still resolve.
  - Update `SectionNav` items to: Recipe, Equipment, Pours, Result, Tasting (drop
    Expected as a tab).
  - Do not render an open blank form for a stage with no rows; keep the existing
    empty line for Tasting stages.
  - Keep expected text and tasted notes as separate fields; do not merge.
  - Keep required marks (coffee, dose, water) on create only.
- Reuse: existing `Card`, `Label`, `FieldError`, `PourEditor`, `TastingEditor`,
  `poly` existing `inherited`/`inh()` copy tint in `brew-form.tsx`.
- Dependencies: Phase 1 tokens (for the Tasting disclaimer styling).
- Tests:
  - `pnpm typecheck`.
  - `pnpm test` (domain tests for pours/tastings should be unaffected).
  - Manual/behavioral: confirm `onRestored` still resets form values.
- Playwright: **deferred** — the mobile specs currently open Pours/Tasting
  controls that will now be collapsed; fix those in Phase 4/Verification, see
  "Conflicts".
- Acceptance:
  - Both forms use the shared stage wrapper; summaries render real data.
  - New brew opens Recipe only; brew detail opens Recipe (`in-progress`) or
    Tasting (`brewed`) only; Equipment/Pours never auto-open.
  - Expected lives inside Tasting and `#sec-expected` still works.
- Not to change: form validation, autosave wiring, copy tint logic, `formInitKey`,
  tasting vocabulary/stages, pour parsing.

---

## Phase 3 — /brews/[id] header and /brews/new density

- Goal: brew detail reads as a record, not an editor; new-brew density drops to a
  single continue teaser plus the form.
- Files:
  - `src/app/brews/[id]/page.tsx` (Visual/Behavior)
  - `src/app/brews/new/page.tsx` (Visual/Behavior)
  - `src/components/brew-form.tsx` (Behavior — draft-restored line only)
- Changes:
  - `/brews/[id]` header:
    - Text-only entry header. Coffee name linked, date/measure line, ratio at
      `text-3xl` Fraunces, one meta line.
    - Omit missing values; never print `?` in the header (current code prints
      `?` for temp/grind/filter). Print lifecycle; score only when
      `brewFinalScore` returns a number; session link or existing no-session
      warning.
    - Section nav stays sticky and short; `SaveStateBadge` should sit on the right
      of that row (see ambiguity A1). Primary "New from this" moves below the
      stages; Compare / Share / Copy summary / Favorite / Delete stay secondary,
      Delete visually separated.
  - `/brews/new`:
    - Replace hardcoded `New brew` with a translated key.
    - Replace the `Card` continue teaser with one text line
      `Last brew · {name} · {ratio}` plus a primary Continue link. Keep the fresh
      form underneath so starting over is scroll, not a second equal button.
    - Show a one-line `Draft restored` notice when `useAutosave` `onRestored`
      fires in `brew-form.tsx`. No save badge (no server row). 4h draft expiry
      unchanged.
- Reuse: `formInitKey`, `latestBrew`/`latestBrewForCoffee`, `formatRatio`,
  `actualWaterG`/`pouredTotalG`, existing dictionaries, `SaveStateBadge`.
- Dependencies: Phase 2 stage rules (open Recipe on new brew).
- Tests: `pnpm typecheck`; `pnpm test` (draft restore tests in
  `src/lib/drafts/restore.test.ts` must stay green).
- Playwright: extend `e2e/brew-flow.spec.ts` heading assertion only if the English
  title text changes; keep the English dictionary value `New brew` so the existing
  `getByRole("heading", { name: "New brew" })` still passes (see ambiguity A5).
- Acceptance:
  - Header no longer contains inputs or `?` placeholders.
  - New-brew title is translated (es/en); draft restore shows one line.
  - Continue teaser is one line + primary link; no duplicate primary action.
- Not to change: `BrewEditor` autosave/sync logic, share card data, delete copy,
  the `?brew=&copy=` and `?coffee=&copy=` URL contract.

---

## Phase 4 — List chrome, filter disclosure, pending dimming, cards

- Goal: collapse list chrome behind one disclosure, dim instead of blank on
  pending, and tighten all four card types.
- Files:
  - `src/components/list-controls.tsx` (Shared/Behavior)
  - `src/components/brew-card.tsx` (Behavior/Visual)
  - `src/components/coffee-card.tsx` (Visual)
  - `src/components/cupping-card.tsx` (Behavior — uses `useListNav`)
  - `src/app/brews/page.tsx` (Visual/Behavior)
  - `src/app/coffees/page.tsx` (Visual)
  - `src/app/cuppings/page.tsx` (Visual)
  - `src/app/sessions/page.tsx` (Visual)
- Changes:
  - `list-controls.tsx`:
    - Make the visible search label `sr-only` (placeholder stays the hint) in
      `ListSearchBox`. Keep the `id`/label association for a11y and the debounce.
    - Wrap sort + filters in one closed disclosure for lists that render both
      (brews, sessions). Summary `Filter`, plus active count when a filter or
      non-default sort is on. Keep pills optimistic and URL-backed.
    - `BrewList` / `CoffeeList` / `CuppingList`: when `isPending` **and rows
      already exist**, keep rows mounted and dim them (`opacity-60`,
      `aria-busy`); only show the skeleton when there are no rows / first render.
    - Do not change param names or `listHref`/`parse*Params`.
  - `brew-card.tsx`: move labeled Favorite + Continue to the name row (not a
    footer rule); ensure actions stay `z-10` above the stretched link; keep
    lifecycle and finite score.
  - `coffee-card.tsx`: keep "Brew again" labeled and `min-h-11`; row uses the
    shared row tokens.
  - `cupping-card.tsx`: keep dim-on-pending behavior consistent with the others.
  - `/brews`: Compare becomes a text button in the header when `rows.length >= 2`
    (existing `?a=&b=` of first two rows); remove the stray bottom link; keep
    RecentlyViewed as one horizontal strip under the title (already hidden when
    empty). Ensure first card starts within the initial viewport when there is no
    recent strip.
  - `/coffees`, `/cuppings`: move sort into the shared disclosure (coffees keep
    two sorts: recent, name); keep header Add as the only ember on the page.
  - `/sessions`: same disclosure; note it renders outside `ListNavProvider`
    (fallback `router.replace` is intentional) so the disclosure must not require
    the provider.
- Reuse: `ListSearchBox`, `ListSortPills`, `BrewFilterBar`, `FilterChips`,
  `NoListMatches`, `EmptyState`, `ErrorState`, existing skeletons, `EntityCard`.
- Dependencies: Phase 1 tokens.
- Tests: `pnpm typecheck`; `pnpm test` (`src/lib/lists/params.test.ts` and
  `prefs.test.ts` must stay green — no param changes).
- Playwright:
  - `e2e/lists-gating.spec.ts` must stay green (URL contract unchanged).
  - Add a small mobile assertion that filter/sort pills are not visible until the
    Filter disclosure is opened (see Verification).
- Acceptance:
  - Search label visually hidden but accessible.
  - No skeleton over already-rendered rows during filter/sort navigation.
  - Cards show name → measure → one meta line; actions labeled and tappable.
- Not to change: server-side list state, `search_blob` stripping, optimistic
  revert behavior, `NoListMatches` copy, pagination `Show more`.

---

## Phase 5 — Coffee detail disclosure flip

- Goal: show the brew history first; make editing the exception.
- Files:
  - `src/app/coffees/[id]/page.tsx` (Behavior/Visual)
  - `src/components/coffee-editor.tsx` (Behavior/Visual)
- Changes:
  - `/coffees/[id]`: brew history disclosure becomes open by default; cuppings
    disclosure closed unless it is the only content; wrap `CoffeeEditor` in a
    closed "Edit coffee" disclosure (`id="sec-edit"` or similar) and keep Delete
    inside that disclosure, not next to Brew again. Header keeps name, origin/
    process, remaining, received; unknown stays unknown.
  - `coffee-editor.tsx`: no longer the always-open form; when placed inside the
    edit disclosure it keeps the same fields and `updateCoffee` action.
- Reuse: `EntityDisclosure`, `CollectionAction`, `BrewHistoryRow`, `DeleteButton`,
  `EmptyState`.
- Dependencies: Phase 2 (accordion conventions), Phase 4 (row tokens).
- Tests: `pnpm typecheck`; `pnpm test` (`coffee-meta`, `cupping-summary` tests
  unaffected).
- Playwright: **required change** — `e2e/brew-flow.spec.ts` currently asserts the
  coffee detail is the open form (see Conflicts). Update it to expand the Edit
  disclosure before asserting "Save coffee".
- Acceptance:
  - Opening a coffee shows brew history without an extra tap.
  - The edit form is closed until requested; Delete is inside it.
- Not to change: coffee fields, `updateCoffee` action, cupping editing behavior,
  Brew again href logic.

---

## Phase 6 — Bottom navigation and More page

- Goal: separate the Log action from the tab row; make More a plain list.
- Files:
  - `src/components/bottom-nav.tsx` (Visual)
  - `src/app/more/page.tsx` (Visual)
- Changes:
  - `bottom-nav.tsx`: give the Log link horizontal margin so it is not flush
    against Cuppings; keep it in the bar (no FAB, no fixed second bar), keep
    `min-h-11`, `aria-current` on the active tab, safe-area padding, and the
    existing label string (`nav.newBrew`). Hidden on public paths as now.
  - `more/page.tsx`: replace the three cards with a `divide-y border-line` list;
    each row is the whole link with icon + label + one-line body, `min-h-11`,
    `active:scale-[0.99]`.
- Reuse: `PRIMARY_TABS`, `MORE_LINKS`, Lucide icons.
- Dependencies: Phase 1 tokens.
- Tests: `pnpm test` — `src/lib/navigation.test.ts` must stay green (no
  destination changes).
- Playwright: none specific; responsive spec stays green.
- Acceptance: Log is visually distinct but still a bar item; More has no card per
  row.
- Not to change: tab set, `MORE_LINKS`, public-path hiding, safest-area padding.

---

## Phase 7 — Dictionary strings and compare empty state

- Goal: remove hardcoded English and add the new UI strings in both locales.
- Files:
  - `src/lib/i18n/dictionaries.ts` (Shared)
  - `src/app/brews/compare/page.tsx` (Visual/Behavior)
- Changes:
  - Add keys (en + es; the `Record` forces Spanish parity):
    - new-brew page title (keep English value `New brew`).
    - `Draft restored` line.
    - any "Edit coffee" disclosure label used in Phase 5.
    - compare empty state title/body/back label.
  - Replace hardcoded strings in `/brews/compare` ("Need two brews", "Log at
    least two brews before comparing.", "Back to brews") with dictionary lookups
    via `getT`, and route the missing-brew case through `ErrorState`.
  - Reuse existing keys where possible (`coffee.editor.brewAgain`,
    `coffee.cuppings.*`, `save.*`); do not duplicate.
- Dependencies: Phases 3–5 (keys are consumed there). Doing this last avoids
  churn, but the consuming phases must not hardcode in the meantime.
- Tests: `pnpm typecheck` (dictionary completeness is type-enforced).
- Playwright: `e2e/lists-gating.spec.ts` and `brew-flow.spec.ts` should stay green.
- Acceptance: no hardcoded user-facing English remains in the touched screens;
  en/es both compile.
- Not to change: existing key names, stored-data non-translation rule.

---

## Verification

- Unit tests: `pnpm test`.
  - Expected unaffected: `src/lib/lists/params.test.ts`,
    `src/lib/lists/prefs.test.ts`, `src/lib/navigation.test.ts`,
    `src/lib/domain/*.test.ts`, `src/lib/drafts/restore.test.ts`.
  - Add only if a non-trivial helper is extracted (e.g., a stage-summary
    formatter) — keep it one small `*.test.ts`, no frameworks.
- Typecheck: `pnpm typecheck`.
- Lint: `pnpm lint` (run at least once after Phase 4/5 where classes change most).
- Playwright mobile flows (`pnpm e2e`, iPhone 13, 390×844):
  1. Login → `/brews`: search visible, filter pills hidden until Filter opened;
     no horizontal overflow.
  2. `/brews/new`: Recipe stage open by default; Equipment/Pours/Result/Tasting
     closed until expanded; add a pour after expanding Pours; add a tasting
     attribute after expanding Tasting; assert 44px touch targets.
  3. `/brews/new` reload within the draft window: `Draft restored` line appears.
  4. `/coffees/[id]`: brew history visible; Edit disclosure expands to the coffee
     form; Save coffee works.
  5. Responsive guard at 375/390/430 with no horizontal overflow.
- Do not run Playwright against production data; the specs are read-only or use a
  dev user, and must remain so.

---

## Dependencies / risks

Dependency chain:
- Phase 1 (tokens) → everything visual.
- Phase 2 (stage pattern) → Phase 3 (open-stage defaults, Expected relocation).
- Phase 4 (row tokens + pending behavior) → Phase 5 (reuses rows/disclosures).
- Phase 7 (strings) last; phases 3–5 must reference keys, not literals.

Conflicts to resolve before/while implementing (flagging, not silently fixing):

- **A1 — `SaveStateBadge` placement vs component boundary.** The spec wants the
  badge on the sticky section-nav row on `/brews/[id]`, but `SectionNav` is
  rendered by the server page while the badge's `useAutosave` state lives inside
  the client `BrewEditor`. Resolve by rendering `SectionNav` inside `BrewEditor`
  for the detail case, or by lifting the badge state. Do not add a context/store.
- **A2 — Coffee detail edit gate contradicts current design and tests.**
  `src/components/coffee-editor.tsx` explicitly documents "no edit gate", and
  `e2e/brew-flow.spec.ts` asserts the coffee form is open with no Edit button.
  Phase 5 intentionally reverses this. The e2e test **must** be updated; otherwise
  the suite goes red.
- **A3 — Collapsed stages break existing mobile e2e.** `e2e/mobile-inputs.spec.ts`
  clicks `Add pour` and `+ Add attribute` on `/brews/new` without expanding a
  stage. After Phase 2 those controls are inside closed disclosures. Expand Pours
  / Tasting in the test before interacting.
- **A4 — Sessions list is outside `ListNavProvider`.** The shared Filter
  disclosure and pending dimming must work via the `useListNav` fallback; do not
  wrap sessions in the provider (it is intentional per project rules).
- **A5 — English values are load-bearing in tests.** `brew-flow.spec.ts` matches
  the heading text `New brew` and coffee detail link names. Keep the English
  dictionary values stable; translate only the key usage, not the English copy,
  unless the test is updated in the same phase.
- **A6 — "Log" vs existing label.** The spec calls the bar action "Log" but says
  to use the existing string. Keep `nav.newBrew` ("Brew") — do not add a new
  label or rename the key.
- **A7 — More page missing from the Kimi TODO.** The spec has a More section
  (plain list, no cards). It is folded into Phase 6 here; do not drop it.
- **A8 — New-brew draft cue location.** `brew-form.tsx` currently shows no save
  badge by design. Add only the one-line `Draft restored` cue; do not add a
  persistent save badge (there is no server row).

---

## Explicitly out of scope

- A wizard, home dashboard, compare multi-select, or a shared create/edit
  mega-form.
- New entities (Dripper, Grinder, Filter, WaterProfile, Method), new routes, or
  backend/data-model/migration changes.
- A design system, theme file, motion library, new icon library, or wider
  desktop layout.
- Restyling the session form, cupping form/editor, account, or login screens
  (only the shared list chrome and type rules apply).
- Changing autosave, RLS, query/mutation contracts, URL param names, or list
  server-side behavior.
- Dark mode, notifications, analytics, or any social/AI feature.

---

## Recommended execution order

1. Phase 0 — Preparation / baseline
2. Phase 1 — Tokens and color cleanup
3. Phase 2 — Stage pattern and brew section rules
4. Phase 3 — /brews/[id] header and /brews/new density
5. Phase 4 — List chrome, filter disclosure, pending dimming, cards
6. Phase 5 — Coffee detail disclosure flip
7. Phase 6 — Bottom navigation and More page
8. Phase 7 — Dictionary strings and compare empty state
9. Verification — unit tests, typecheck, lint, Playwright mobile flows

Phases 1 and 2 are hard prerequisites. Phases 3–6 are largely independent after
Phase 2 and can be reordered if needed; Phase 7 must follow all string-consuming
phases.
