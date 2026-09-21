# BrewLog — V0 Implementation Plan

## Goal

Build a small, production-quality personal brew logging PWA.

The V0 must be usable from an iPhone and must make logging experiments significantly easier than using a document.

Do not implement future AI/speech features yet.

---

# Phase 0 — Project foundation

## Tasks

- Initialize Next.js + TypeScript
- Configure Tailwind
- Configure shadcn/ui
- Configure ESLint
- Configure Vitest
- Configure Playwright
- Configure environment validation
- Configure Supabase clients
- Create `.env.example`
- Create README
- Establish directory structure

Suggested:

```text
src/
  app/
  components/
  features/
    coffees/
    sessions/
    brews/
    observations/
    experiments/
  lib/
    supabase/
    validation/
    domain/
    persistence/
  types/

Do not over-abstract.

Phase 1 — Supabase + Auth
Tasks

Create:

user authentication
login
logout
authenticated route protection

Database:

coffees
sessions
brews
observations
experiments

All user-owned records must have ownership enforced with RLS.

Acceptance criteria
unauthenticated user cannot access application data
authenticated user can access own records
user cannot query another user's records
service-role key never reaches browser
Phase 2 — Coffee management
UI

Coffee list:

Competition Coffee
137 g remaining

Phase 1 Ethiopia
...

Create coffee.

Edit coffee.

View coffee.

Track approximate remaining weight.

Acceptance criteria
coffee can be created
coffee can be edited
coffee belongs to current user
metadata can remain unknown
no required fields beyond what is necessary
Phase 3 — Brew creation
Core workflow

Home
→ Select coffee
→ New Brew
→ choose "copy previous brew" or start from defaults
→ edit recipe
→ save

Default competition template
15 g
225 g
92 C
70 clicks
Origami Air S
Cafec Abaca
Scala
4 pours

These are editable defaults.

Form sections
Recipe
coffee
dose
water
ratio
temperature
grind
Equipment
grinder
dripper
filter
water
Pouring
count
optional structured pour notes
Result
final beverage volume/weight
total time
Notes
freeform notes
Phase 4 — Autosave

This is a high-priority V0 feature.

Local draft

Use IndexedDB.

Each form should have a draft key.

Example:

brew-draft:{userId}:{brewId}

or equivalent stable identifier.

Synchronization

Debounce server writes.

Do not issue a server request for every keystroke.

Suggested behavior:

immediate local write
server sync after short idle period
explicit save on navigation/submit
retry failed synchronization
UI

Display:

Saving...
Saved
Offline — saved locally
Sync failed — retrying
Recovery

Reload page.

Restore draft.

If server has newer state, reconcile explicitly.

Do not silently overwrite newer server data.

Phase 5 — Observation logging

Add sensory fields:

acidity
sweetness
body
clarity
bitterness
astringency
intensity
balance
finish

Use compact mobile controls.

Do not force numerical scoring unless useful.

Qualitative options may be preferable.

Add:

hot notes
warm notes
cold notes
freeform notes

Allow partial completion.

Phase 6 — Experiment logging

Add:

Hypothesis
Changed variables
Expected result
Actual result
Conclusion
Next question

Allow experiment to reference a brew.

Example:

Brew #8

Hypothesis:
The cup needs more concentration.

Changed:
Ratio 1:15 → 1:14

Expected:
More intensity while keeping extraction similar.

Conclusion:
...
Phase 7 — Brew history

Create mobile-friendly history.

Each brew card should show:

#08
15g / 225g
92C / 68 clicks
Abaca / Scala

Sweetness: high
Acidity: medium
Body: medium

2:42

[View]

Tap opens full brew.

Allow comparison between two brews.

Comparison should emphasize:

What changed?
What stayed the same?
What did the user observe?

Do not implement advanced analytics yet.

Phase 8 — Inventory

Every brew consumes coffee.

When brew is saved:

remaining_weight -= dose

Do not attempt laboratory-level precision.

Allow manual correction.

Show:

~137 g remaining

Use approximate language if appropriate.

Warn if planned dose exceeds remaining coffee.

Do not prevent the user from recording it.

Phase 9 — Mobile/PWA polish

Installable PWA.

Optimize for iPhone Safari.

Requirements:

responsive
touch friendly
no horizontal scrolling
large primary actions
comfortable keyboard behavior
preserve drafts when keyboard/navigation causes layout changes

Primary action should be easy to reach:

+ Brew
+ Cupping
Phase 10 — Testing
Unit

Test:

ratio calculation
coffee inventory calculation
validation schemas
draft serialization
autosave state machine
E2E

At minimum:

Test 1

Login
→ create coffee
→ create brew
→ save
→ reload
→ verify brew

Test 2

Create long brew form
→ enter fields
→ reload before explicit submit
→ draft survives

Test 3

Create brew
→ change recipe
→ verify server persistence

Test 4

Two users
→ verify data isolation

Phase 11 — V0 acceptance test

V0 is complete when the user can:

Open BrewLog on iPhone.
Authenticate.
Create a coffee.
Start a brew.
Copy the previous brew.
Modify only the variables that changed.
Record recipe data.
Record sensory observations.
Leave and return to the form without losing data.
Lose network temporarily without losing the draft.
Save the brew.
View previous brews.
Compare two brews.
See remaining coffee.
Record an experiment associated with a brew.

If these work smoothly, stop.

Do not continue building AI.

Post-V0 roadmap
V1 — One-shot voice

Architecture:

Microphone
→ local Whisper/WebGPU
→ transcript
→ structured extraction
→ validation
→ user review
→ save

No field-by-field dictation.

The user speaks naturally.

Do not persist raw audio by default.

V2 — AI experiment coach

Use a small LLM.

Inputs:

brew history
experiment history
coffee metadata
business rules
current brew

Outputs:

observations
warnings
redundant experiment warnings
possible next experiment
expected result
confidence
rationale

AI output must remain advisory.

V3 — Exploration map

Visualize tested space:

grind
ratio
temperature
filter
water/minerals

Identify:

explored regions
repeated tests
untested combinations
successful recipes
V4 — Competition mode

A dedicated competition coffee workspace.

Features could include:

remaining coffee
final candidate recipe
preparation checklist
MEP checklist
5-minute preparation reference
equipment checklist
water validation reminder
final recipe lock

Competition mode should remain separate from general brew logging.

Architectural constraints for future phases

Do not build V0 in a way that makes these future capabilities difficult.

The domain model should allow:

voice extraction
AI analysis
experiment comparison
multiple coffees
multiple sessions
multiple recipes
future sharing

But do not implement those systems prematurely.

The database is the source of truth.

Rules are deterministic where possible.

AI is an interpretation layer.

User decisions remain authoritative.
