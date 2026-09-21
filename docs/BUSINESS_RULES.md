# BrewLog — Business Rules & Workflows

## 1. Product purpose

BrewLog is a private experimental log for coffee brewing.

Its primary purpose is to help a user explore limited quantities of coffee systematically and retain useful knowledge between brews.

The application should help answer:

- What did I do?
- What changed?
- What did I observe?
- What do I think happened?
- What have I already tested?
- What should I consider testing next?

The app should not make the user dependent on an AI-generated recipe.

---

# 2. Core concepts

## Coffee

A physical coffee sample being explored.

A coffee may have incomplete metadata.

Unknown origin/process/etc. is valid.

A coffee has an approximate remaining quantity.

---

## Session

A group of related activity.

Examples:
- competition coffee cupping
- Phase 1 Origami exploration
- filter experiment session
- recipe validation session

---

## Brew

One preparation of a coffee.

A Brew contains the physical recipe and preparation conditions.

---

## Observation

What the user actually perceived or measured.

Examples:
- acidic
- sweet
- thin
- astringent
- drained quickly
- finished at 2:40
- sweetness decreased when cold

Observation must not automatically become diagnosis.

---

## Experiment

A deliberate test.

An experiment should answer a question.

It should identify:
- hypothesis
- changed variable(s)
- expected outcome
- actual outcome
- conclusion
- next question

---

# 3. Competition coffee workflow

The current competition provides approximately 200 g of practice coffee.

The practice coffee is the same coffee used for competition, including origin, process and roast date.

The competition requires at least 150 ml final beverage and evaluates sensory characteristics including flavor, acidity, balance, body, sweetness, residual and consistency over time.

The application should therefore support:
- limited inventory
- careful experiment planning
- temperature-stage observations
- final recipe validation

---

# 4. Exploration workflow

## Phase 1 — Learn the Origami

Use other coffees.

Purpose:
- understand K-Ultra grind ranges
- understand Origami Air S behavior
- establish standard pouring technique
- compare filters
- compare ratios
- compare temperatures
- explore water/mineral behavior
- measure drainage and final beverage volume

Do not spend competition coffee on generic equipment learning.

---

## Phase 2 — Explore the official coffee

### Step 1 — Cupping

Use approximately:
- 10 g coffee
- 200 g water
- 1:20
- ~92 C
- deliberate coarse cupping grind

Evaluate:
- aroma
- acidity
- sweetness
- body
- clarity
- intensity
- bitterness
- astringency
- dominant flavors
- temperature evolution
- apparent extraction difficulty

---

### Step 2 — Baseline brew

Default:

- 15 g
- 225 g water
- 1:15
- 92 C
- K-Ultra 70 clicks
- Origami Air S
- Cafec Abaca conical
- Scala water
- 4 standard pours

The baseline is a diagnostic point, not a presumed optimal recipe.

---

### Step 3 — Diagnose

Use:

Cupping
→ baseline
→ previous brews
→ flow behavior
→ hot/warm/cold sensory results

Separate:

Observation
→ Evidence
→ Hypothesis
→ Adjustment

---

# 5. Variable priority

General priority:

1. Grind
2. Ratio
3. Temperature
4. Filter
5. Water/minerals
6. Pour modifications

This is not absolute.

A strong diagnosis can justify skipping a level.

---

# 6. Variable rules

## Grind

Primary extraction adjustment.

Finer:
- potentially more extraction.

Coarser:
- potentially less extraction.

Do not interpret acidity alone as underextraction.

---

## Ratio

Primary concentration adjustment.

Shorter:
- more concentrated.

Longer:
- less concentrated.

Do not use ratio as a substitute for fixing poor extraction.

---

## Temperature

Secondary extraction-energy adjustment.

Higher:
- potentially more extraction.

Lower:
- potentially less extraction.

---

## Filter

Baseline:
- conical Abaca.

Wave is a secondary experiment.

Use when the filter's flow/extraction behavior appears to be limiting the desired result.

---

## Minerals

Baseline:
- unmineralized Scala.

Introduce after understanding the coffee with fixed water unless there is strong evidence that water is limiting extraction or structure.

Potential mineral comparison:
- none
- Vicuña
- Guanaco
- Alpaca
- Llama

---

## Pouring

Baseline:
- four pours
- stable height
- stable speed
- stable force
- stable pattern

Modify only with a specific hypothesis about agitation or flow.

---

# 7. Experimental discipline

Default:

**one variable per experiment.**

Maximum:

**two variables.**

Every experiment should state:

- what changed
- why
- what is expected
- what would confirm the hypothesis
- what would reject it

The application should warn when an experiment:
- repeats an already tested condition
- changes multiple variables unnecessarily
- tests a variable that has already been sufficiently explored
- consumes significant coffee without a clear question

Warnings are advisory.

The app must never prevent the user from proceeding.

---

# 8. Temperature evaluation

Important brews should be evaluated at:

1. hot
2. warm
3. cool

Record:
- what improves
- what disappears
- what becomes dominant
- whether structure remains
- whether sweetness survives
- whether acidity becomes disconnected
- whether bitterness/astringency emerges

---

# 9. Recipe candidate

A candidate recipe should aim for:

- pleasant extraction
- balance
- sweetness
- integrated acidity
- appropriate body
- appropriate clarity
- appropriate intensity
- minimum competition volume
- pleasant temperature evolution
- reproducibility
- low operational complexity

Once these are satisfied, exploration should shift toward micro-adjustments.

---

# 10. AI coach rules

Future AI should:

- read the experiment history
- identify repeated tests
- identify variables already explored
- distinguish observations from hypotheses
- suggest possible next experiments
- explain what question the experiment answers
- mention expected outcomes
- mention uncertainty

AI must not:
- prohibit experiments
- invent observations
- silently modify brew records
- present hypotheses as facts
- claim a universally correct recipe
- replace the user's sensory judgment

---

# 11. Voice workflow

Future voice logging:

1. User starts one recording.
2. User speaks naturally.
3. Speech-to-text produces transcript.
4. Structured extraction converts transcript into fields.
5. App shows extracted values.
6. User reviews/edits.
7. User confirms.
8. Brew is saved.

The user should not have to dictate one field at a time.

---

# 12. Autosave workflow

Any long form is a draft.

On input:

Local draft
→ immediate local persistence

Then:

Debounced server synchronization
→ Supabase

UI must show:
- Saving
- Saved
- Offline/local
- Sync error

The user should never lose a long brew log because of navigation or temporary connectivity.
