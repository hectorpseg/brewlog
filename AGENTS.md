# BrewLog — Engineering Rules

## Product principle

BrewLog is an experimental brew journal, not a generic coffee recipe generator.

The application exists to help the user:
- record experiments
- preserve observations
- compare brews
- avoid redundant experiments
- progressively converge on a recipe

Do not turn it into a generic coffee social app unless explicitly requested.

---

## V0 scope

V0 focuses on:

- authentication
- coffee records
- brew records
- sessions
- observations
- experiments
- autosave
- offline/local drafts
- mobile-first UX
- brew history
- copy previous brew

Do NOT implement in V0:

- AI coach
- AI/LLM features
- Whisper
- WebGPU speech recognition
- WebMCP
- AI recommendations
- advanced charts
- social features
- multi-user sharing
- notifications
- subscriptions
- gamification
- espresso support

Architecture may anticipate these features, but implementation should not.

---

## User experience

The user is usually preparing and tasting coffee.

Minimize typing.

Prefer:
- defaults
- copying previous brews
- compact controls
- progressive disclosure
- quick sensory inputs
- free-form notes

Long forms MUST autosave.

Never make the user fear losing a brew log.

---

## Autosave

Autosave is a product requirement, not an enhancement.

Forms must:

1. persist draft state locally immediately
2. synchronize to the server with debounce
3. display save state
4. recover from network failure
5. restore drafts after reload

Never depend exclusively on server writes.

Never make a user wait for a server response after every field change.

---

## Data integrity

Database records are facts.

Do not silently infer facts.

Examples:

"acidic" is an observation.

"underextracted" is an interpretation.

"probably underextracted" is a hypothesis.

Keep these concepts separate.

Unknown values must remain unknown.

Do not fabricate coffee metadata.

---

## Experiment methodology

The user prefers controlled experiments.

The product should support:

Observation
→ hypothesis
→ variable change
→ expected result
→ brew
→ observation
→ conclusion
→ next question

A brew should make it possible to understand what changed from the previous brew.

Do not encourage changing many variables simultaneously.

---

## Competition context

The current Origami competition workflow includes:

- 200 g practice coffee
- same coffee used for practice and competition
- minimum 150 ml final beverage
- participant may bring own water
- sensory evaluation includes flavor, acidity, balance, body, sweetness, residual and consistency over time

Competition-specific values are defaults/templates.

Never assume they are universal coffee rules.

---

## Security

All user-owned database tables must use Row Level Security.

Never trust:
- client user IDs
- client ownership claims
- client authorization fields

Never expose:
- Supabase service-role keys
- AI provider API keys
- server secrets

Do not store raw audio in V0 unless explicitly required.

Do not add third-party analytics without explicit product approval.

---

## Architecture

Prefer simple architecture.

Use:
- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Zod
- React Hook Form

Avoid unnecessary:
- microservices
- queues
- Redis
- Kubernetes
- GraphQL
- vector databases

Prefer boring, explicit code.

---

## Code quality

Prefer:
- small components
- typed domain models
- explicit validation
- server-side authorization
- reusable form components
- pure domain utilities
- meaningful names

Avoid:
- giant components
- duplicated validation
- hidden side effects
- premature abstractions
- clever code

---

## Future AI architecture

Future AI should be treated as:

Database = facts
Rules = methodology
LLM = interpretation

The LLM should not become the source of truth.

AI must never silently modify saved brew data.

AI suggestions must remain suggestions.

The user always has final control.

---

## Before implementing a feature

Ask:

1. Does this improve brew logging?
2. Does it reduce friction?
3. Does it improve experimental reasoning?
4. Does it preserve data integrity?
5. Does it belong in the current phase?

If not, do not implement it.

---

## Domain Modeling Restraint

- Prefer a field/value over creating a new database entity.
- Extract a concept into a first-class entity only when it has its own lifecycle, is independently browsed/edited, or has meaningful relationships that cannot be represented naturally as fields.
- Do not normalize hypothetical future requirements.
- Do not create CRUD screens merely because something can be modeled as a table.
- Repeated values are not automatically entities.
- Equipment such as drippers, grinders, filters, and water should remain fields on Brew unless a concrete product requirement later proves that they need independent lifecycle/relationships.
- Do NOT create a Dripper entity.
- Do NOT create Grinder, Filter, WaterProfile, or generic Method entities for the current product scope.
- A Session may contain contextual information about equipment/method in notes or existing Brew fields, but equipment is not managed as independent Session resources.
- Prefer the smallest domain model that accurately supports the current brewing workflow.
- When a new entity is proposed, first explain what independent lifecycle, browsing/editing need, or relationship requires it. If none exists, keep it as a field.

The product should feel like a focused personal coffee notebook, not an enterprise inventory or workflow management system.

---

## Modal Restraint

Avoid modal dialogs by default.

Prefer:
- inline confirmation
- inline validation
- contextual feedback
- undo where safe

Use explicit confirmation for genuinely destructive operations when needed.

Never use browser alert/confirm dialogs.

The app should feel like a notebook, not a sequence of popups.

---

## Environment

Always run Node.js commands in this project with Node 22 via nvm (`source ~/.nvm/nvm.sh && nvm use 22`). The default system Node (18) cannot build Next.js here.

---

## Before making changes

BrewLog has real production data. Before changing anything, inspect the current schema, migrations, TypeScript types, server actions, data-access functions, and existing UI implementation.

Do not assume architecture described in older prompts is still accurate. Inspect the current code first.

---

## Database changes

Additive and backward-compatible only.

- Never drop production data.
- Never use db reset.
- Never delete or rewrite historical records to fit a new model.
- Use migrations for schema changes.
- Preserve existing relationships and foreign keys.
- Existing records must remain readable.
- New records use the new structure.
- Never invent historical data.
- Never touch production data for testing unless explicitly requested.

---

## Replacing a model or UI

- Preserve the old database data.
- Remove obsolete UI only when the new model covers the intended workflow.
- Do not silently discard information.
- Do not maintain two competing active UI models just for backward compatibility.

---

## Quality and reporting

After a change, run tests, typecheck, lint, and production build.

Report exactly what changed, the migration impact, and backward-compatibility behavior.

Keep changes tightly scoped:
- no unrelated page redesigns
- no speculative architecture
- no generic frameworks where a small BrewLog-specific abstraction is enough
- no entities added merely because they might be useful someday

---

## Debugging

When something "does not work":

1. Identify the exact screen, action, and observed behavior first. Ask if unclear.
2. Verify the suspect code is actually loaded where it is tested (dev server freshness, deployment state) before changing it.
3. Trace the data flow and fix the cause, not the symptom.
4. No git operations unless explicitly requested.

---

## Agent workflow

After completing a task, write the final report to `output.txt` in the project root (overwrite).

---

## Typography

Never use em dashes (—). Prefer a normal hyphen (-), parentheses, commas, or separate sentences.

## Branch workflow

- Only `staging` may be merged into `master` directly.
- All other branches (feature, fix, performance, etc.) must be merged into `staging` first, then a staging‑to‑master merge/PR promotes changes to production.
- Do not push directly to `master`; all changes flow through the staging branch.
- PRs targeting `staging` are reviewed and merged normally; once on staging, a separate staging→master PR/Promotes the changes upward.

This ensures a single source of truth for what reaches production and keeps master stable between staging releases.
