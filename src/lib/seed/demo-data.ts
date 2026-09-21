// ponytail: plain data, no DB calls here — the server action owns inserts so RLS applies.
// Seed rows are identified by stable "Seed · " names, which makes seeding idempotent
// (delete-by-name then insert) without a schema change.

export const SEED_PREFIX = "Seed · ";

export const SENSORY_LEVELS = ["low", "med-low", "medium", "med-high", "high"] as const;
export type SensoryLevel = (typeof SENSORY_LEVELS)[number];

export type SeedCoffee = {
  slug: string;
  name: string;
  origin?: string;
  process?: string;
  roastDate?: string;
  receivedDate?: string;
  initialWeightG?: number;
  remainingWeightG?: number;
  notes?: string;
  daysAgo: number;
};

export type SeedSession = { slug: string; title: string; notes?: string; daysAgo: number };

export type SeedBrew = {
  slug: string;
  coffeeSlug: string;
  sessionSlug?: string;
  doseG: number;
  waterG: number;
  tempC?: number;
  grindClicks?: number;
  grinder?: string;
  dripper?: string;
  filter?: string;
  waterSource?: string;
  pourCount?: number;
  totalTimeSec?: number;
  finalBeverageG?: number;
  notes?: string;
  daysAgo: number;
};

export type SeedObservation = {
  brewSlug: string;
  acidity?: SensoryLevel;
  sweetness?: SensoryLevel;
  body?: SensoryLevel;
  clarity?: SensoryLevel;
  bitterness?: SensoryLevel;
  astringency?: SensoryLevel;
  intensity?: SensoryLevel;
  balance?: SensoryLevel;
  finish?: SensoryLevel;
  hotNotes?: string;
  warmNotes?: string;
  coldNotes?: string;
  freeformNotes?: string;
  daysAgo: number;
};

export type SeedExperiment = {
  brewSlug?: string;
  sessionSlug?: string;
  hypothesis?: string;
  changedVariables?: string;
  expectedResult?: string;
  actualResult?: string;
  conclusion?: string;
  nextQuestion?: string;
  daysAgo: number;
};

export const SEED_SESSIONS: SeedSession[] = [
  {
    slug: "phase1",
    title: `${SEED_PREFIX}Phase 1 Origami exploration`,
    notes: "K-Ultra grind range, Abaca vs Wave, stable 4-pour baseline. Beater coffee first.",
    daysAgo: 9,
  },
  {
    slug: "cupping",
    title: `${SEED_PREFIX}Official coffee cupping`,
    notes: "10 g / 200 g cupping of the practice lot. Aroma + temperature evolution.",
    daysAgo: 10,
  },
];

export const SEED_COFFEES: SeedCoffee[] = [
  {
    slug: "comp-lot",
    // ponytail: origin/process deliberately unknown, per product rules
    name: `${SEED_PREFIX}Competition Practice Lot`,
    receivedDate: "2026-09-08",
    initialWeightG: 200,
    remainingWeightG: 137,
    notes: "Practice lot = competition coffee. Origin, process and roast date unknown. Light-medium roast.",
    daysAgo: 10,
  },
  {
    slug: "guji",
    name: `${SEED_PREFIX}Ethiopia Guji`,
    origin: "Ethiopia · Guji",
    process: "Washed",
    roastDate: "2026-09-05",
    receivedDate: "2026-09-09",
    initialWeightG: 250,
    remainingWeightG: 190,
    notes: "Light roast. Floral, bergamot, black tea.",
    daysAgo: 9,
  },
  {
    slug: "huila",
    name: `${SEED_PREFIX}Colombia Huila Pink Bourbon`,
    origin: "Colombia · Huila",
    process: "Honey",
    roastDate: "2026-09-03",
    receivedDate: "2026-09-09",
    initialWeightG: 250,
    remainingWeightG: 228,
    notes: "Light-medium roast. Red fruit, panela, round body.",
    daysAgo: 9,
  },
  {
    slug: "brazil",
    name: `${SEED_PREFIX}Brazil Cerrado`,
    origin: "Brazil · Cerrado",
    process: "Natural",
    roastDate: "2026-08-28",
    receivedDate: "2026-09-02",
    initialWeightG: 500,
    remainingWeightG: 500,
    notes: "Phase-1 beater coffee for Origami technique. No brews logged yet.",
    daysAgo: 9,
  },
];

export const SEED_BREWS: SeedBrew[] = [
  {
    slug: "comp-baseline",
    coffeeSlug: "comp-lot",
    sessionSlug: "phase1",
    doseG: 15, waterG: 225, tempC: 92, grindClicks: 70,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala", pourCount: 4, totalTimeSec: 162, finalBeverageG: 178,
    notes: "Baseline diagnostic, not a presumed optimum. Drained evenly.",
    daysAgo: 9,
  },
  {
    slug: "comp-grind68",
    coffeeSlug: "comp-lot",
    sessionSlug: "phase1",
    doseG: 15, waterG: 225, tempC: 92, grindClicks: 68,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala", pourCount: 4, totalTimeSec: 155, finalBeverageG: 181,
    notes: "One variable only: grind 70 → 68.",
    daysAgo: 8,
  },
  {
    slug: "guji-baseline",
    coffeeSlug: "guji",
    sessionSlug: "phase1",
    doseG: 15, waterG: 225, tempC: 93, grindClicks: 66,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala", pourCount: 4, totalTimeSec: 158, finalBeverageG: 180,
    notes: "Washed coffee baseline. Faster drain than expected.",
    daysAgo: 7,
  },
  {
    slug: "comp-ratio14",
    coffeeSlug: "comp-lot",
    sessionSlug: "phase1",
    doseG: 16, waterG: 224, tempC: 92, grindClicks: 68,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala", pourCount: 4, totalTimeSec: 170, finalBeverageG: 172,
    notes: "Ratio 1:15 → 1:14 at the confirmed 68-click grind.",
    daysAgo: 6,
  },
  {
    slug: "comp-wave",
    coffeeSlug: "comp-lot",
    doseG: 15, waterG: 225, tempC: 93, grindClicks: 68,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Wave",
    waterSource: "Scala", pourCount: 4, totalTimeSec: 185, finalBeverageG: 176,
    notes: "Wave filter trial. Drawdown noticeably slower.",
    daysAgo: 4,
  },
  {
    slug: "guji-minerals",
    coffeeSlug: "guji",
    doseG: 15, waterG: 225, tempC: 93, grindClicks: 66,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala + Vicuña", pourCount: 4, totalTimeSec: 160, finalBeverageG: 179,
    notes: "Water comparison: mineralized vs plain Scala.",
    daysAgo: 3,
  },
  {
    slug: "huila-cool",
    coffeeSlug: "huila",
    doseG: 15, waterG: 225, tempC: 90, grindClicks: 72,
    grinder: "K-Ultra", dripper: "Origami Air S", filter: "Cafec Abaca",
    waterSource: "Scala", pourCount: 3, totalTimeSec: 150, finalBeverageG: 182,
    notes: "Coarser + cooler for the honey process. Not yet tasted properly.",
    daysAgo: 2,
  },
];

export const SEED_OBSERVATIONS: SeedObservation[] = [
  {
    brewSlug: "comp-baseline",
    acidity: "medium", sweetness: "med-low", body: "medium", clarity: "med-high",
    bitterness: "low", astringency: "low", intensity: "medium", balance: "medium", finish: "medium",
    hotNotes: "Bright, slightly sharp acidity. Sweetness hiding.",
    warmNotes: "Acidity integrates; panela sweetness appears.",
    coldNotes: "Sweetness fades a little; clean residual.",
    daysAgo: 9,
  },
  {
    brewSlug: "comp-grind68",
    acidity: "medium", sweetness: "medium", body: "med-high", clarity: "medium",
    bitterness: "low", astringency: "low", intensity: "med-high", balance: "med-high", finish: "med-high",
    hotNotes: "Rounder than baseline. Cocoa nib edge.",
    warmNotes: "Sweet spot: caramel, orange peel.",
    coldNotes: "Holds together well. Keep this grind.",
    daysAgo: 8,
  },
  {
    brewSlug: "comp-ratio14",
    acidity: "med-low", sweetness: "medium", body: "high", clarity: "med-low",
    bitterness: "med-high", astringency: "med-low", intensity: "high", balance: "med-low",
    hotNotes: "Dense and intense. Bitter edge on the finish.",
    warmNotes: "Bitterness lingers; sweetness cannot cover it.",
    coldNotes: "Heavy, drying. Reads as over-concentration; no extraction diagnosis recorded.",
    daysAgo: 6,
  },
  {
    brewSlug: "comp-wave",
    acidity: "med-low", sweetness: "medium", body: "med-high", clarity: "low",
    bitterness: "medium", astringency: "medium", intensity: "medium", balance: "med-low",
    hotNotes: "Muted aromatics vs Abaca. Slower drawdown visible.",
    warmNotes: "Texture pleasant but top notes missing.",
    coldNotes: "Flat. Confounded by the simultaneous temp change.",
    daysAgo: 4,
  },
  {
    brewSlug: "guji-minerals",
    acidity: "med-high", sweetness: "medium", body: "med-high", clarity: "medium",
    bitterness: "low", astringency: "low", intensity: "med-high", balance: "med-high",
    hotNotes: "Bergamot forward, rounder body than plain Scala.",
    warmNotes: "Black tea and apricot. Minerals added structure.",
    coldNotes: "Still sweet cold. Promising direction.",
    daysAgo: 3,
  },
];

export const SEED_EXPERIMENTS: SeedExperiment[] = [
  {
    brewSlug: "comp-grind68",
    hypothesis: "The baseline cup is slightly thin; a finer grind raises extraction without changing concentration.",
    changedVariables: "Grind 70 → 68 clicks (one variable).",
    expectedResult: "More sweetness and body, clarity roughly unchanged.",
    actualResult: "Sweetness and body up, finish longer. No added bitterness.",
    conclusion: "68 confirmed better than 70 for this lot. New baseline grind.",
    nextQuestion: "Does ratio 1:14 add intensity without the bitter edge?",
    daysAgo: 8,
  },
  {
    brewSlug: "comp-ratio14",
    hypothesis: "The 68-click cup needs more concentration to carry sweetness cold.",
    changedVariables: "Ratio 1:15 → 1:14 (one variable, grind held at 68).",
    expectedResult: "More intensity, similar extraction character.",
    actualResult: "Intensity up, but bitterness emerged as it cooled. Balance worse.",
    conclusion: "1:14 over-concentrates this lot. Return to 1:15.",
    nextQuestion: "Is the Wave filter limiting clarity before touching ratio again?",
    daysAgo: 6,
  },
  {
    brewSlug: "comp-wave",
    hypothesis: "Wave flat-bed will even out extraction vs the conical Abaca.",
    changedVariables: "Filter Abaca → Wave AND temp 92 → 93C (two variables — mistake).",
    expectedResult: "Cleaner cup, similar intensity.",
    actualResult: "Muted aromatics, slower drawdown. Cannot separate filter effect from temp effect.",
    conclusion: "Confounded experiment. Repeat Wave at 92C before judging the filter.",
    nextQuestion: "Wave at 92C, grind 68, ratio 1:15 — direct Abaca comparison?",
    daysAgo: 4,
  },
  {
    sessionSlug: "cupping",
    hypothesis: "The practice lot suits medium-high extraction; watch whether acidity stays integrated as it cools.",
    changedVariables: "n/a — cupping baseline, no brew variable changed.",
    expectedResult: "Floral/citrus aromatics, sweetness developing warm.",
    actualResult: "Red apple, brown sugar warm; acidity disconnected slightly when fully cold.",
    conclusion: "Favor recipes that preserve warm-phase sweetness into the cold cup.",
    nextQuestion: "Pull the 1:15 baseline and evaluate hot/warm/cold against this cupping.",
    daysAgo: 10,
  },
];

export const SEED_COFFEE_NAMES = SEED_COFFEES.map((c) => c.name);
export const SEED_SESSION_TITLES = SEED_SESSIONS.map((s) => s.title);
