# BrewLog — Design Brief (V0 audit + direction)

Status: brief only. No application code was changed to produce this document.

## 0. The 8-line brief

```
Purpose:    Log a brew in under 30 seconds, mid-ritual, and see what changed since last time.
Audience:   One person, standing in a kitchen, iPhone in one hand, kettle in the other.
Tone:       Cupping-table lab notebook — warm paper, ink, one ember accent.
Reference:  A Moleskine lab book crossed with a Japanese kissaten menu.
Palette:    Warm paper base, brown-black ink, one ember accent for "what changed".
Type:       Fraunces (display numerals + headings) / system sans (body, native feel).
Memorable:  The ratio set huge on every brew card — "1:15" is the logo of each entry.
Restraint:  No gradients. No shadows. No dashboard chrome. No stats tiles. No emoji-as-icon.
```

## 1. Visual direction

**Cupping-table lab notebook.** The interface should feel like paper that happens to
sync, not software that happens to mention coffee. Flat surfaces separated by rules
and space (never shadows), ink-on-paper contrast, and exactly one accent color whose
job is semantic: ember marks *what changed* — the changed variable in a form, the
diff row in compare, the dot on an unsynced draft. If ember appears anywhere else,
it is a bug.

## 2. Typography

- Display: **Fraunces** (serif, has opinions, great numerals) — brew ratios, brew
  numbers (`#08`), page titles. One ratio scale, major third (1.25).
- Text: **system sans** (`-apple-system`) — native iPhone feel, zero download, correct
  CJK/dynamic-type behavior. Never as display.
- Measurements always `font-variant-numeric: tabular-nums` so `15 / 225` never jitters.
- Sentence case everywhere. Three weights max (400 / 500 / 600).

## 3. Color palette

| Token     | Value     | Use                          |
|-----------|-----------|------------------------------|
| `--paper` | `#faf7f1` | page base (warm, not gray)   |
| `--card`  | `#ffffff` | raised surfaces              |
| `--ink`   | `#1c1917` | primary text (warm black)    |
| `--ink-2` | `#57534e` | secondary                    |
| `--ink-3` | `#a8a29e` | meta only                    |
| `--line`  | `#e7e0d3` | rules, borders               |
| `--ember` | `#b3401f` | **changed / unsynced / primary action. <10% of surface.** |

Dark mode: V0 ships light-only and says so. (Today the code *declares* dark vars
but renders fixed zinc — that half-state must go: either commit or remove.)

## 4. Spacing / layout system

- One column, `max-w-md`, phone-first. (The centered column is correct here — this
  *is* a phone app, not a marketing page.)
- Space scale `4 / 8 / 12 / 16 / 24 / 32`. Gaps within a group: 8–12. Between
  groups: 24. No value in between, ever.
- One radius: `10px` surfaces; pill reserved for status badges only.
- Bottom nav reserves `env(safe-area-inset-bottom)`; primary `+ Brew` stays in
  thumb reach; destructive actions never adjacent to it.

## 5. Component principles

- Every interactive element gets rest / hover / active (real press transform) /
  `focus-visible` (ember outline, never suppressed) / disabled / busy states.
- Cards are flat (`1px var(--line)`, no shadow). Before adding a card, try doubling
  the gap — most grouping needs are spacing problems.
- Buttons name the action: "Save brew", "Copy as next brew". Never Submit/OK.
- Form controls: labels above inputs, always visible; one column; the rarer case
  marked (most brew fields optional → mark the two required with `*`, as today).
- Native controls over custom: `<select>` for sensory levels and `<details>` for
  disclosure are correct — keep them, style them, don't rebuild them.

## 6. Navigation model

Flat, three destinations + one action: Coffees / Brews / Sessions / `+ Brew`.
Brew detail is the hub (recipe → observations → experiment → copy-as-next).
Compare is always addressed by URL (`?a=&b=`) so back/refresh/share behave.
Missing today and required: **active-section indication** (user must know where
they are), and deep links must survive auth (login → return to target, not home).

## 7. Mobile interaction principles

- Targets ≥ 44px, 8px gaps; nothing hover-only; every gesture has a visible
  equivalent (no swipe-only delete, ever).
- Right `inputmode` per field (already done — keep); numeric fields stay
  `type="number"` + `inputmode` for spinners-free entry where appropriate.
- Keyboard must never strand content: bottom nav + save bar account for keyboard
  height and `100dvh`, not `100vh`.
- Acknowledge taps <100ms (press state); autosave badge is the latency UI —
  no spinners over content the user already sees.

## 8. Empty / loading / error / offline states

| State | Rule | V0 gap to close |
|---|---|---|
| First-use empty | Teach + primary action. "No coffees yet — log your first bag." + button. | Today: "No brews yet." with no action. |
| No-results / filtered | Echo the filter, offer clear. | Not present (no filters yet — keep the pattern ready). |
| Cleared / done | Acknowledge success, not absence. | n/a yet. |
| Loading first | Skeleton matching card layout, delayed ~200ms. | Today: blank page (server components, no suspense boundary). |
| Refresh | Keep old data, subtle indicator. Never blank. | Same gap. |
| Partial | Show what loaded, mark the rest, retry per part. | Partially present (brew-without-observation renders — good, keep). |
| Recoverable error | What happened + why + retry control. | Save badge says "retrying" but retry only happens on next keystroke — needs an explicit Retry tap. |
| Permanent (404) | Plain words + nearest useful destination. | `notFound()` default — needs a designed 404 with "Back to brews". |
| Offline | "Saved locally" + what queues. | Badge copy exists — needs queue honesty: *what* is queued (badge only shows state, not scope). |
| Draft conflict | Server newer than draft → explicit choice, never silent overwrite. | Logic documented, UI not built. |

## 9. Brew-entry UX decisions (locked)

1. **Copy-previous is the homepage of brewing.** `+ Brew` with no context starts
   from competition defaults; from a coffee page it offers "copy last brew" first.
   New-brew-from-scratch is the secondary path, not the default.
2. **One screen, three disclosure levels:** Recipe (open) → Equipment (open, it's
   one tap to verify) → Result & notes (closed until tasting). Never a wizard —
   wizards punish the expert performing a ritual.
3. **Ratio is computed, never typed**, and set large at the top of the form and
   every card. Dose/water are the inputs; `1:15` is the identity.
4. **Sensory selects stay selects** (low → high, plus `—`). No sliders: sliders
   demand fine motor control with wet hands and imply false precision. Tasting
   happens hot → warm → cold, so the three note fields stay in that order.
5. **Observation and diagnosis never share a control.** No field may map "acidic"
   to "underextracted" — the one-variable experiment form is where interpretation
   lives, explicitly labeled as hypothesis.
6. **Save model is honest:** recipe fields autosave silently (badge), observations
   save on explicit tap (tasting is deliberate — an explicit save matches the
   mental model). The current mix is right; the copy must explain it once.
7. **Inventory is advisory.** "Exceeds remaining" warns inline, never blocks.
   Approximate language (`~137 g`) everywhere.

## 10. What makes this not a SaaS dashboard

- No sidebar, no stats tiles, no charts, no "insights" — the product's thesis is
  *what changed*, and compare is the only analytic surface.
- Content decides structure: brew cards lead with the ratio numeral, not a grid
  of equal tiles; history reads like notebook pages, not a data table.
- The memorable moment: **the ratio as hero numeral + ember diff rows.** A
  stranger glancing at a screenshot should say "lab notebook for coffee", never
  "dashboard".
- Restraint enforced: gradients, shadows, hero sections, feature-card grids,
  gray-on-white body text, and emoji-as-icon (the `⚠` in the brew form goes)
  are all out — by name, in review.

## Appendix — token block (starting point for implementation)

```css
:root {
  --font-display: "Fraunces", Georgia, serif;
  --font-text: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
  --step--1: 0.8rem; --step-0: 1rem; --step-1: 1.25rem;
  --step-2: 1.563rem; --step-3: 1.953rem;
  --space-2xs: 0.25rem; --space-xs: 0.5rem; --space-s: 0.75rem;
  --space-m: 1rem; --space-l: 1.5rem; --space-xl: 2rem;
  --paper: #faf7f1; --card: #ffffff;
  --ink: #1c1917; --ink-2: #57534e; --ink-3: #a8a29e; --line: #e7e0d3;
  --ember: #b3401f;
  --radius: 10px;
  --dur-fast: 120ms; --dur: 220ms;
  --ease: cubic-bezier(0.2, 0, 0, 1);
}
```
