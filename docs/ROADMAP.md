# BrewLog Product Roadmap

This document is the **source of truth for product direction**. Architecture/codebase
documents remain the source of truth for how the current software is implemented.

- ROADMAP → What are we building and why? (this document)
- AGENTS.md / README.md → Where is everything, how should changes be implemented?
- `docs/BUSINESS_RULES.md`, `docs/DESIGN_BRIEF.md` → Conventions and current design rules

---

## 1. Product Vision

BrewLog is a personal coffee-brewing journal and knowledge base. Private, mobile-first, experiment-oriented.

The long-term loop:

```
BREW
 ↓
RECORD WITH MINIMAL FRICTION
 ↓
REFLECT ON RESULT
 ↓
CAPTURE LEARNING
 ↓
BUILD PERSONAL KNOWLEDGE
 ↓
USE THAT KNOWLEDGE ON THE NEXT BREW
```

Core product principle:

> Record what matters, infer/reuse what is already known, and make reflection effortless.

This loop has distinct stages: recording a brew (data capture), reflecting on it
(observation/sensory feedback), capturing learning (conclusions worth keeping),
building personal knowledge (accumulated, structured history), and using that
knowledge on future brews (inheritance, defaults, context on the next record).

**AI is a future analytical layer over accumulated user data, NOT the core
product.** BrewLog must remain fully useful without AI (see Phase G).

---

## 2. Current State

### Visual redesign — COMPLETE

Phases 1–13 of the visual redesign are complete and approved. Details live in
`docs/brewlog-redesign-spec.md` / `docs/brewlog-redesign-implementation-plan.md`.

> **The visual system is considered coherent. Do not reopen the visual redesign
> unless an actual bug or concrete inconsistency appears during normal product
> development. Do not start another broad "polish" phase.**

Current implementation (V0) supports: coffee records, brew records with
observations and pours, cuppings with tastings, sessions, brew compare, sharing
(experimental), autosave/offline drafts, PWA scaffolding, backup/export.
The New Brew workflow is the large `brew-form.tsx` described below — recording
works but is perceived as high-friction, which motivates Phase A.

---

## 3. Current Priority

### CURRENT PRIORITY: PHASE A — REDESIGN THE BREW RECORDING MODEL

Phase A comes **BEFORE** implementing the new Brew form. The purpose is to define
the mental model and information architecture first: what a brew record *is*,
not what the next screen looks like.

The system needs to determine:

- Required vs optional information
- Information inherited from previous brews
- Information automatically populated from Coffee/Gear
- Information relevant before brewing
- Information relevant during brewing
- Information relevant after brewing
- Information that can be added later
- Information that should never be requested unless explicitly wanted

Core conceptual flow:

```
COFFEE → RECIPE → BREW → RESULT → LEARNING
```

> Every step should answer one simple question.

This is conceptual direction, **NOT a finalized UI specification** — it does not
imply five screens or any particular component structure.

---

## 4. Roadmap

Definitions: **Priority** = order of importance; **Status** = where work currently
stands. Mandatory/optional/conditional is noted per phase.

### Phase A — Redesign the Brew recording model

- Status: **CURRENT** (next major product phase)
- Priority: HIGHEST · Mandatory
- Goal: Define the mental model of recording a brew before any new form is built.
- Why it matters: The current New Brew form is too large and feels like a
  database form. Without an information-architecture decision, a rebuilt form
  repeats the same problem.
- Constraints: Conceptual only — no implementation until the model is clear.
  See §3 for the questions to answer.
- Dependencies: None (unblocks Phase B).
- Outcomes: A documented brew-recording information architecture.

#### Current implementation context

- Current form/UI: `src/components/brew-form.tsx`, `src/components/brew-editor.tsx`, `src/components/pour-editor.tsx`, `src/app/brews/new/page.tsx`
- Data model: `src/lib/validation/schemas.ts`, `supabase/migrations/0001_schema.sql` (and later brew migrations)
- Reads/writes: `src/lib/db/queries.ts`, `src/lib/db/brew-update.ts`, `src/app/actions.ts`
- Copy/inheritance today: `src/lib/domain/recipe-start.ts`, `src/lib/domain/quick-actions.ts`

### Phase B — Multi-step / low-friction brew record

- Status: **NEXT** (next implementation phase, after Phase A)
- Priority: HIGHEST · Mandatory
- Goal: Make recording a brew faster and mentally easier than filling out the
  current form. Flow: Coffee → Recipe → Brew → Result → Learning.
- Prioritize: previous-brew inheritance, remembered defaults, existing Coffee
  data, existing Gear data, reusable configurations, optional fields,
  progressive disclosure, incomplete records that can be completed later.
- Constraints: Does NOT require exactly five screens; the goal is reduced
  cognitive and data-entry load. Preserve existing data-model compatibility;
  do not casually break historical Brew records.
- Dependencies: Phase A.
- Outcomes: A measurably lower-friction brew recording experience.

#### Current implementation context

- Autosave/drafts: `src/lib/drafts/` (`useAutosave.ts`, `store.ts`, `local-store.ts`)
- Form remount discipline on copy/coffee change: `formInitKey` in `src/lib/domain/recipe-start.ts`
- Server-side search/browse: `src/lib/lists/params.ts`, `src/lib/db/queries.ts`

### Phase C — Gear registry

- Status: **PLANNED**
- Priority: HIGH · Mandatory
- Goal: A personal Gear registry so the user does not repeatedly type equipment.
  Potential categories: brewers, grinders, kettles, scales, filters, water,
  other brewing equipment.
- Dependencies: Phase B (recording model should define how gear plugs in).
- Constraints: Gear should have reusable identity, not free-text repetition.

#### Current implementation context

- Equipment currently exists as free-text fields on brew (grinder, dripper,
  filter) — `supabase/migrations/0001_schema.sql`; no gear entity exists.
- `docs/BUSINESS_RULES.md` documents the current fields-on-brew stance.

### Phase C.1 — Gear presets / configurations

- Status: **CONDITIONAL**
- Goal: Reusable equipment setups (e.g. "Deep27 setup": Deep27 + Cafec Abaca +
  K-Ultra + Fish Pro X). BrewLog should remember the user's normal equipment.
- Only implement if it materially reduces friction. Depends on Phase C.

> No significant implementation identified yet.

### Phase D — Speech-to-text

- Status: **PLANNED**
- Priority: HIGH · Planned
- Goal: Speech as a major low-friction input for brew result, tasting notes,
  free-form observations, learnings, quick notes, cupping notes.
- Constraints: Voice reduces friction, not a new workflow. Natural speech
  produces editable text; do not force speech into predefined fields unless useful.
- Dependencies: None hard, but most valuable after Phase B/C.

> No significant implementation identified yet.

### Phase E — Learnings

- Status: **PLANNED**
- Priority: HIGH · Planned
- Goal: Learnings as a first-class concept — something discovered or worth
  remembering ("This coffee gets bitter when I push the final pour too far"),
  with possible next actions (grind coarser, stop pour around 220g).
- Sources: manual input, brew results, tasting notes, repeated observations,
  explicit conclusions. Eventually associated with coffee, method, gear,
  recipe, multiple brews.
- Constraints: NOT another generic notes field. Design the data model before
  implementing.
- Dependencies: None hard; most valuable after B/D.

> No significant implementation identified yet.

### Phase F — Personal brewing knowledge

- Status: **LATER**
- Priority: MEDIUM/HIGH · Conditional
- Goal: Use accumulated structured history and Learnings for coffee-level,
  gear-level, recipe-level knowledge. The system should surface useful
  knowledge rather than forcing users to fish through old records.
- Principle: Historical brewing data should become increasingly useful over time.
- Dependencies: Phase E (and substance from B–D).

> No significant implementation identified yet.

### Phase G — AI analysis

- Status: **LATER**
- Priority: LATER · Conditional
- Goal: AI analysis **AFTER** sufficient useful user-generated data exists:
  pattern detection, diagnosis, experiment suggestions grounded in real history.
- Constraints: Recommendations must explain WHY, avoid false certainty, remain
  optional. BrewLog stays useful without AI. No AI tasting-note generation; AI
  is not the centerpiece of the product.
- Dependencies: Phases E/F.

> No significant implementation identified yet.

### Phase H — Share

- Status: **LATER**
- Priority: MEDIUM · Conditional
- Goal: Complete/harden sharing after the core recording workflow is stable:
  share brew, share cupping where appropriate, public/shared representation,
  copy/share actions, deleted/unavailable states, localization, mobile behavior.
- Constraints: Sharing should reflect the new simplified Brew record; do not
  let the current form structure dictate the future sharing model.
- Dependencies: Phase B (and ideally A-model recording).

#### Current implementation context

- Existing share scaffolding: `src/components/share-card.tsx`,
  `src/components/compare-share.tsx`, `src/lib/share/share-card.ts`,
  `src/lib/domain/share-card.ts` — experimental, will likely be reshaped.

### Phase I — Workflow hardening

- Status: **PLANNED**
- Priority: After major new workflow exists · Mandatory
- Goal: Test real end-to-end usage — see detailed checklist below.

#### Current implementation context

- Brew workflow: `src/app/brews/`, `src/lib/domain/quick-actions.ts` (Brew Again / copy), `src/lib/domain/brew-diff.ts`
- Cupping workflow: `src/app/cuppings/`
- Sessions workflow: `src/app/sessions/`, `src/lib/domain/sessions.ts`

### Phase J — Data / edge-case hardening

- Status: **PLANNED**
- Priority: After workflow hardening · Mandatory
- Goal: Test messy real-world data: deleted coffee referenced by old
  brew/session/cupping, missing optional fields, stale relationships, copied
  records with deleted relationships, long coffee names, zero pours, incomplete
  brews/cuppings, older records missing newer fields, null relationships.
- Constraints: Confirm an edge case can actually occur before adding
  complexity; do not fix hypothetical problems blindly.

> Partial coverage exists in `src/lib/domain/deletion.ts` and seed tests
> (`src/lib/seed/`), but no dedicated hardening pass has been done.

### Phase K — Mobile / PWA hardening

- Status: **PLANNED**
- Goal: Functional/device hardening (iOS Safari, Android Chrome, keyboard,
  date inputs, safe areas, fixed elements, PWA install, back behavior,
  poor-network behavior, form persistence). **Not** another visual redesign.

#### Current implementation context

- PWA manifest: `src/app/manifest.ts`, `src/lib/pwa-launch.ts`, `src/components/launch-splash.tsx`
- Offline drafts: `src/lib/drafts/`

### Phase L — Targeted testing

- Status: **PLANNED**
- Goal: Increase coverage around important business logic: brew creation,
  copying/inheritance, gear selection, learnings, filtering/sorting, Brew Score,
  sessions, cuppings, share, auth edge cases, speech-to-text where testable.
- Constraints: Prioritize high-risk user workflows; do not chase 100% coverage.

#### Current implementation context

- Colocated unit tests (`*.test.ts`, `pnpm test`), e2e in `e2e/` (`pnpm e2e`).
- Score logic: `src/lib/domain/brew-score.test.ts`; sessions: `sessions.test.ts`.

### Phase M — Developer / LLM documentation

- Status: **PLANNED**
- Goal: Documentation for navigation without grep archaeology — potential
  `docs/architecture.md`, `app-map.md`, `data-model.md`, `routes.md`,
  `components.md`, `workflows.md`, `i18n.md`, `styling.md`, `testing.md`,
  `development.md`. Most important: an **App Map** (per route: entry point,
  main components, state/hooks, data dependencies) and a **Change Map**
  ("if you need to change X, inspect Y first").
- Constraints: Optimize for LLM navigation.

> Significant parts exist already as AGENTS.md + README.md; a structured App
> Map / Change Map does not exist yet.

### Phase N — Technical cleanup

- Status: **LATER**
- Goal: Dead code, unused components, obsolete comments, stale design remnants,
  duplicated logic, dependency/migration cleanup, perf, lint/type issues.
- Constraints: Only after product workflows are stable; no broad cleanup during
  feature development unless directly useful.

### Phase O — Production readiness

- Status: **LATER**
- Goal: Production environment, Supabase policy/security review, migrations,
  backups, auth flows, error handling, PWA metadata/icons, production build,
  smoke tests, optional monitoring, final documentation.
- Dependencies: All prior phases.

#### Current implementation context

- Backup/export already exist: `src/lib/backup/`, `pnpm brewlog:backup` /
  `pnpm brewlog:export` (see README). Recovery path documented in README.

### → SHIP BREWLOG

---

## 5. Roadmap Dependency Graph

```
A → B → C → C.1 → D → E → F → G → H → I → J → K → L → M → N → O → SHIP
   CURRENT   NEXT          PLANNED                LATER
```

The conceptual chain this expresses:

```
Brew recording model
 ↓
Low-friction recording
 ↓
Reusable gear/context
 ↓
Low-friction reflection
 ↓
Learnings
 ↓
Accumulated personal knowledge
 ↓
AI analysis
```

This chain matters more than any individual phase: each step exists to make the
next step's data richer and cheaper to produce. Implementation details can
change as the product is validated, but the conceptual order holds.

---

## 6. Product Principles

Treat these as **constraints** on future product and implementation decisions:

1. Minimize manual data entry.
2. Reuse information BrewLog already knows.
3. A brew record should feel like a mental map, not a database form.
4. Every interaction should have a clear purpose.
5. Optional information should remain optional.
6. Let users record incomplete information and complete it later.
7. Speech should make reflection dramatically easier.
8. Learnings are more valuable than generic notes.
9. AI should analyze the user's accumulated brewing history.
10. AI should not be required for BrewLog to be useful.
11. Historical data should become increasingly useful over time.
12. The product should help the user make the NEXT brew better.
13. Do not redesign screens without a concrete user problem.
14. Do not invent data or metadata.
15. Prefer small, reversible implementation phases.
16. Validate each phase before moving to the next.

---

## Where to look when working on the roadmap

| Product area | Start here | Related docs |
|---|---|---|
| Brew recording | `src/components/brew-form.tsx`, `src/app/brews/new/page.tsx` | `src/lib/domain/recipe-start.ts`, `docs/BUSINESS_RULES.md` |
| Gear | `supabase/migrations/0001_schema.sql` (grinder/dripper/filter fields) | `docs/BUSINESS_RULES.md` |
| Learnings | — (none yet; Phase E) | `docs/BUSINESS_RULES.md` (observation ≠ diagnosis) |
| Cuppings | `src/app/cuppings/`, `src/components/cupping-card.tsx`, `src/components/cupping-editor.tsx` | `src/lib/domain/cupping-summary.ts` |
| Sessions | `src/app/sessions/`, `src/lib/domain/sessions.ts` | `AGENTS.md` (list-state notes) |
| Sharing | `src/components/share-card.tsx`, `src/lib/share/share-card.ts` | `docs/BUSINESS_RULES.md` |
| Autosave / drafts | `src/lib/drafts/useAutosave.ts` | `README.md` |
| Visual system (frozen) | `src/app/globals.css`, `docs/DESIGN_BRIEF.md` | `docs/brewlog-redesign-spec.md` |

Update this table as implementation progresses. Only paths that actually exist
are listed.

---

## LLM working rules

1. Read `docs/ROADMAP.md` before proposing major product work.
2. Determine the current roadmap phase before implementing a new feature.
3. Do not skip ahead simply because a later feature is technically easier.
4. Respect the product principles (§6).
5. Validate earlier phases before building dependent phases.
6. Prefer small, reversible implementation phases.
7. Do not reopen completed visual redesign work without a concrete problem.
8. Do not invent product requirements to fill gaps.
9. When a phase requires product/UX decisions, stop and surface those decisions
   rather than silently implementing assumptions.
10. Keep roadmap status updated when phases materially progress.

---

## Maintenance

- `docs/ROADMAP.md` is the product roadmap source of truth. Update status as
  work progresses; accurately mark completed work.
- Do not rewrite history unnecessarily; record direction changes explicitly
  rather than leaving contradictory requirements elsewhere.
- Do not turn the roadmap into a technical dump — keep implementation details
  in architecture/codebase documentation (AGENTS.md, `docs/`).
