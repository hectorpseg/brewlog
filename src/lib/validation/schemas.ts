import { z } from "zod";
import { isFutureDateString } from "@/lib/domain/brew-date";
import { TASTING_MAX, TASTING_MIN, normalizeAttribute } from "@/lib/domain/tastings";
import { POUR_PATTERNS } from "@/lib/domain/pours";

// ponytail: form fields arrive as "" when cleared. Without this, coerce turns
// "" into 0/NaN and every *optional* numeric behaves as required-or-crashing.
// Empty always means "unknown", per product rules.
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optNum = (schema: z.ZodTypeAny) => z.preprocess(emptyToUndefined, schema.nullish());

// Historical logging never records future dates. Non-date free text (e.g. an
// old received-date note) passes through; ISO days must not be in the future.

// Unknown stays unknown: everything optional except identifiers.
export const coffeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  origin: z.string().max(120).nullish(),
  process: z.string().max(120).nullish(),
  variety: z.string().max(120).nullish(),
  producer: z.string().max(120).nullish(),
  country: z.string().max(120).nullish(),
  region: z.string().max(120).nullish(),
  farm: z.string().max(120).nullish(),
  altitude: z.string().max(120).nullish(),
  roastDate: z.string().max(20).nullish(),
  receivedDate: z.preprocess(emptyToUndefined, z.string().max(20).refine((s) => !isFutureDateString(s), "Received date cannot be in the future").nullish()),
  initialWeightG: optNum(z.coerce.number().positive().max(5000)),
  remainingWeightG: optNum(z.coerce.number().min(0).max(5000)),
  notes: z.string().max(2000).nullish(),
});
export type CoffeeInput = z.infer<typeof coffeeSchema>;

const sensory = z.string().max(40).nullish();

export const brewSchema = z.object({
  coffeeId: z.string().uuid("Pick a coffee"),
  doseG: z.coerce.number().positive().max(200),
  waterG: z.coerce.number().positive().max(2000),
  // preparation date, distinct from created_at: "2026-09-21" from <input type="date">
  brewedAt: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid brew date").refine((s) => !isFutureDateString(s), "Brew date cannot be in the future").nullish()),
  tempC: optNum(z.coerce.number().min(50).max(100)),
  grindClicks: optNum(z.coerce.number().int().min(0).max(300)),
  grinder: z.string().max(80).nullish(),
  dripper: z.string().max(80).nullish(),
  filter: z.string().max(80).nullish(),
  waterSource: z.string().max(80).nullish(),
  pourCount: optNum(z.coerce.number().int().min(1).max(20)),
  totalTimeSec: optNum(z.coerce.number().int().min(0).max(3600)),
  finalBeverageG: optNum(z.coerce.number().positive().max(2000)),
  notes: z.string().max(2000).nullish(),
});
export type BrewInput = z.infer<typeof brewSchema>;

// New-brew form = recipe + optional session + first tasting notes.
// Notes ride along at creation so final beverage and tasting live in the
// result stage; the action persists them as an observation row. Structured
// tasting rides as a JSON string of draft rows (same shape the editor
// autosaves); the action keeps only complete entries.
export const newBrewFormSchema = brewSchema
  .omit({ totalTimeSec: true })
  .extend({
    sessionId: z.preprocess(emptyToUndefined, z.string().uuid().nullish()),
    // brew time is entered as minutes + seconds, stored as total seconds
    brewTimeMin: optNum(z.coerce.number().int().min(0).max(600)),
    brewTimeSec: optNum(z.coerce.number().int().min(0).max(59)),
    tastings: z.string().max(8000).nullish(),
    // structured pours ride as a JSON string of draft rows (same shape the
    // editor autosaves); the action keeps only complete entries.
    pours: z.string().max(8000).nullish(),
    hotNotes: z.string().max(1000).nullish(),
    warmNotes: z.string().max(1000).nullish(),
    coldNotes: z.string().max(1000).nullish(),
    freeformNotes: z.string().max(2000).nullish(),
  });
export type NewBrewFormInput = z.infer<typeof newBrewFormSchema>;

export const observationSchema = z.object({
  brewId: z.string().uuid(),
  acidity: sensory,
  sweetness: sensory,
  body: sensory,
  clarity: sensory,
  bitterness: sensory,
  astringency: sensory,
  intensity: sensory,
  balance: sensory,
  finish: sensory,
  hotNotes: z.string().max(1000).nullish(),
  warmNotes: z.string().max(1000).nullish(),
  coldNotes: z.string().max(1000).nullish(),
  freeformNotes: z.string().max(2000).nullish(),
});
export type ObservationInput = z.infer<typeof observationSchema>;

export const experimentSchema = z.object({
  brewId: z.string().uuid().nullish(),
  sessionId: z.string().uuid().nullish(),
  title: z.string().max(120).nullish(),
  status: z.enum(["planned", "in_progress", "evaluated"]).nullish(),
  hypothesis: z.string().max(1000).nullish(),
  changedVariables: z.string().max(1000).nullish(),
  expectedResult: z.string().max(1000).nullish(),
  actualResult: z.string().max(1000).nullish(),
  conclusion: z.string().max(1000).nullish(),
  nextQuestion: z.string().max(1000).nullish(),
  notes: z.string().max(2000).nullish(),
});
export type ExperimentInput = z.infer<typeof experimentSchema>;

export const sessionSchema = z.object({
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).nullish(),
});
export type SessionInput = z.infer<typeof sessionSchema>;

// Competition target. One row per user; absent row = code default (150 g).
// Configurable per competition, never a universal coffee rule.
export const DEFAULT_MIN_BEVERAGE_G = 150;

export const competitionSettingsSchema = z.object({
  name: z.string().min(1).max(120).nullish(),
  minFinalBeverageG: optNum(z.coerce.number().positive().max(2000)),
});
export type CompetitionSettingsInput = z.infer<typeof competitionSettingsSchema>;

// Minimal cupping: dated tasting of a coffee. Grinder + clicks are plain
// fields (never entities), mirroring Brew; legacy free-text `grind` stays
// readable for old rows. Sensory rides on hot/warm/cold + notes.
export const cuppingSchema = z.object({
  coffeeId: z.string().uuid(),
  cuppedAt: z.preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date").refine((s) => !isFutureDateString(s), "Cupping date cannot be in the future").nullish()),
  doseG: optNum(z.coerce.number().positive().max(200)),
  waterG: optNum(z.coerce.number().positive().max(2000)),
  grind: z.string().max(80).nullish(),
  grinder: z.string().max(80).nullish(),
  grindClicks: optNum(z.coerce.number().int().min(0).max(300)),
  notes: z.string().max(2000).nullish(),
  hotNotes: z.string().max(1000).nullish(),
  warmNotes: z.string().max(1000).nullish(),
  coldNotes: z.string().max(1000).nullish(),
});
export type CuppingInput = z.infer<typeof cuppingSchema>;

// Structured tasting: one (stage, attribute, value) fact on a plain bounded
// scale. Attribute names normalize (trim + lowercase) so " Acidity " cannot
// duplicate "acidity" under the unique key; overlong names fail instead of
// truncating. The scale is intentionally NOT an official SCA score.
export const tastingEntrySchema = z.object({
  stage: z.enum(["hot", "warm", "cold"]),
  attribute: z.preprocess(normalizeAttribute, z.string().min(1, "Name the attribute").max(40)),
  value: z.coerce.number().min(TASTING_MIN).max(TASTING_MAX),
});
export type TastingEntryInput = z.infer<typeof tastingEntrySchema>;

// Full desired state per brew (autosave reconciles deletions against it).
export const tastingsPayloadSchema = z.array(tastingEntrySchema).max(60);
export type TastingsPayloadInput = z.infer<typeof tastingsPayloadSchema>;

// Structured pour: one timed water addition in a brew. Timing is numeric
// seconds (the UI renders m:ss); pattern is a fixed set; note stays optional.
export const pourEntrySchema = z.object({
  sequence: z.coerce.number().int().min(1).max(20),
  amount_g: z.coerce.number().positive().max(2000),
  timing_seconds: z.coerce.number().int().min(0).max(3600),
  bloom: z.preprocess(
    (v) => (v === "true" ? true : v === "false" ? false : v),
    z.boolean(),
  ),
  pattern: z.enum(POUR_PATTERNS),
  note: z.string().max(500).nullish(),
});
export type PourEntryInput = z.infer<typeof pourEntrySchema>;

// Full desired state per brew (autosave reconciles deletions against it).
export const poursPayloadSchema = z.array(pourEntrySchema).max(20);
export type PoursPayloadInput = z.infer<typeof poursPayloadSchema>;