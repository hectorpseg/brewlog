import { z } from "zod";

// Unknown stays unknown: everything optional except identifiers.
export const coffeeSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  origin: z.string().max(120).nullish(),
  process: z.string().max(120).nullish(),
  roastDate: z.string().max(20).nullish(),
  receivedDate: z.string().max(20).nullish(),
  initialWeightG: z.coerce.number().positive().max(5000).nullish(),
  remainingWeightG: z.coerce.number().min(0).max(5000).nullish(),
  notes: z.string().max(2000).nullish(),
});
export type CoffeeInput = z.infer<typeof coffeeSchema>;

const sensory = z.string().max(40).nullish();

export const brewSchema = z.object({
  coffeeId: z.string().uuid("Pick a coffee"),
  doseG: z.coerce.number().positive().max(200),
  waterG: z.coerce.number().positive().max(2000),
  tempC: z.coerce.number().min(50).max(100).nullish(),
  grindClicks: z.coerce.number().int().min(0).max(300).nullish(),
  grinder: z.string().max(80).nullish(),
  dripper: z.string().max(80).nullish(),
  filter: z.string().max(80).nullish(),
  waterSource: z.string().max(80).nullish(),
  pourCount: z.coerce.number().int().min(1).max(20).nullish(),
  totalTimeSec: z.coerce.number().int().min(0).max(3600).nullish(),
  finalBeverageG: z.coerce.number().positive().max(2000).nullish(),
  notes: z.string().max(2000).nullish(),
});
export type BrewInput = z.infer<typeof brewSchema>;

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
  hypothesis: z.string().max(1000).nullish(),
  changedVariables: z.string().max(1000).nullish(),
  expectedResult: z.string().max(1000).nullish(),
  actualResult: z.string().max(1000).nullish(),
  conclusion: z.string().max(1000).nullish(),
  nextQuestion: z.string().max(1000).nullish(),
});
export type ExperimentInput = z.infer<typeof experimentSchema>;

export const sessionSchema = z.object({
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).nullish(),
});
export type SessionInput = z.infer<typeof sessionSchema>;
