import { DEFAULTS } from "./defaults";

export interface SimParams {
  households: number;
  growingMonths: number;
  winterMonths: number;
  totalAcres: number;
  fallowPct: number;
  landSplit: {
    wheat: number;
    barley: number;
    oats: number;
    hay: number;
  };
  yields: {
    wheat: number;
    barley: number;
    oats: number;
    hay: number;
  };
  yieldVariability: number;
  spoilageRate: number;
  haySpoilageRate: number;
  cartloadToKgHay: number;
  grassKcalPerKg: number;
  titheAndManufacturePct: number;
  woolPerSheep: number;
  clothingNeedWoolLbs: number;
  woodlandAcres: number;
  fuelYieldPerAcre: number;
  fuelNeedsSummer: number;
  fuelNeedsWinter: number;
  fuelNeedsDeepWinter: number;        // cartloads per household per month in deep-winter core
  deepWinterFeedMultiplier: number;   // multiplier on all winter animal feed in deep-winter months
  plannerRiskBufferPct: number;
  bullsPerCow: number;
  pastureAcresPerSheep: number;
  pastureAcresPerCattle: number;
  initialFertility?: number;
  fertilityFloor?: number;

  peoplePerHH: { male: number, female: number, child: number };
  kcalPerDay: { male: number, female: number, child: number };
  animalsPerHH: { oxen: number, cows: number, sheep: number };
  feedNeedsWinter: { oxenOats: number, oxenHay: number, cowOats: number, cowHay: number, sheepHay: number };
  production: {
    cowDairyLitresPerMonth: number;    // litres of milk per lactating cow per month (peak)
    sheepDairyLitresPerMonth: number;  // litres of milk per lactating ewe per month (peak)
    milkKcalPerLitre: number;          // kcal per litre of milk (cow and sheep similar)
    sheepMeatKcal: number;
    cattleMeatAdult: number;
    cattleMeatCalf: number;
  };
  cropStats: {
    wheat: { kcalPerBu: number, seedRate: number };
    barley: { kcalPerBu: number, seedRate: number };
    oats: { kcalPerBu: number, seedRate: number };
  };
}

export interface MonthHistory {
  month: number;   // absolute month index across all years (used as chart X-axis)
  year: number;    // year within the recorded cycle (1 to YEARS_PER_ITERATION)
  cycle: number;   // which Monte Carlo iteration this chronicle was recorded from (1-based)
  wheat: number;
  barley: number;
  oats: number;
  hay: number;
  fuel: number;
  hWheat: number;
  hBarley: number;
  hOats: number;
  hHay: number;
  aOats: number;
  aHay: number;
  seedCol: number;
  spoilCol: number;
  sheep: number;
  cattleCount: number;
  wool: number;
  woolStocks: number;
  clothStocks: number;
  meatStock: number;
  deficit: number;
  lambCount: number;
  preWinterSheepCull: number;
  hayCuts: number;
  calvings: number;
  shearings: number;
  fertility: number;
}

export interface HumanDiet {
  wheat: number;
  barley: number;
  oats: number;
  dairy: number;
  meat: number;
  deficit: number;
}

export interface SimResult {
  humanShortageObj: number;
  severeShortageObj: number;
  animalDeathObj: number;
  fuelShortageObj: number;
  clothingShortageObj: number;
  avgWheatRemaining: number;
  avgOatsRemaining: number;
  avgWoolPerYear: number;
  logs: string[];
  history: MonthHistory[];
  diet: HumanDiet;
}

// ── Season types ──────────────────────────────────────────────────────────────

type SeasonType = 'spring' | 'long_summer' | 'autumn' | 'winter' | 'deep_winter';

function classifyMonth(growingMonth: number, G: number): SeasonType {
  if (growingMonth <= 0) return 'winter';
  const springLen = Math.min(3, Math.floor(G / 2));
  const autumnStart = G - Math.min(3, Math.floor(G / 2)) + 1;
  if (growingMonth <= springLen) return 'spring';
  if (growingMonth >= autumnStart) return 'autumn';
  return 'long_summer';
}

// Long winters develop a frozen "deep winter" core with no soil recovery.
// Shoulder months (normal winter) on each side of the core are specified as:
//   winterMonths <  6: no deep winter at all
//   winterMonths  6– 8: 2 normal start, 2 normal end
//   winterMonths  9–11: 3 normal start, 2 normal end
//   winterMonths 12–13: 3 normal start, 3 normal end
//   winterMonths 14–15: 4 normal start, 3 normal end
//   winterMonths 16–17: 4 normal start, 4 normal end
//   winterMonths 18–19: 5 normal start, 4 normal end
//   winterMonths >= 20: stabilises at ~half normal (floor(winterMonths/4) each end)
function classifyWinterMonth(winterMonth: number, winterMonths: number): 'winter' | 'deep_winter' {
  if (winterMonths < 6) return 'winter';
  let startNormal: number, endNormal: number;
  if      (winterMonths <=  8) { startNormal = 2; endNormal = 2; }
  else if (winterMonths <= 11) { startNormal = 3; endNormal = 2; }
  else if (winterMonths <= 13) { startNormal = 3; endNormal = 3; }
  else if (winterMonths <= 15) { startNormal = 4; endNormal = 3; }
  else if (winterMonths <= 17) { startNormal = 4; endNormal = 4; }
  else if (winterMonths <= 19) { startNormal = 5; endNormal = 4; }
  else { startNormal = Math.floor(winterMonths / 4); endNormal = Math.floor(winterMonths / 4); }
  if (winterMonth <= startNormal || winterMonth > winterMonths - endNormal) return 'winter';
  return 'deep_winter';
}

// ── Growth rates ──────────────────────────────────────────────────────────────

// Generic season growth rate — used for hay, fallow-recovery timing, and remaining-potential calculations.
const SEASON_GROWTH_RATE: Record<SeasonType, number> = {
  spring: 0.7, long_summer: 1.0, autumn: 0.7, winter: 0.0, deep_winter: 0.0,
};

// Per-crop growth rates. Wheat grows slowly through normal winter (it is sown in autumn
// and overwinters in the ground); barley and oats do not survive winter and are always
// harvested before winter begins.
const CROP_GROWTH_RATE: Record<'wheat' | 'barley' | 'oats', Record<SeasonType, number>> = {
  wheat:  { spring: 0.7, long_summer: 1.0, autumn: 0.7, winter: 0.15, deep_winter: 0.0 },
  barley: { spring: 0.7, long_summer: 1.0, autumn: 0.7, winter: 0.0,  deep_winter: 0.0 },
  oats:   { spring: 0.7, long_summer: 1.0, autumn: 0.7, winter: 0.0,  deep_winter: 0.0 },
};

const WOOL_GROWTH_RATE: Record<SeasonType, number> = {
  spring: 0.8, long_summer: 1.0, autumn: 0.6, winter: 0.3, deep_winter: 0.3,
};

// Hay only accumulates in long_summer — spring/autumn grass is consumed by
// grazing livestock in situ; no surplus reaches storage until summer.
const HAY_GROWTH_RATE: Record<SeasonType, number> = {
  spring: 0.0, long_summer: 1.0, autumn: 0.0, winter: 0.0, deep_winter: 0.0,
};

// Fertility recovery rate used in fallow periods (per GU-equiv of idle time)
const WINTER_FALLOW_RECOVERY: Record<'winter' | 'deep_winter', number> = {
  winter: 0.3,      // shoulder winter: ground recovers modestly (frost mineralisation)
  deep_winter: 0.0, // deep winter: ground frozen, no recovery
};

// ── Crop maturity (summer-equivalent growth units) ───────────────────────────
// Derived from historical medieval English harvest schedules:
//   Wheat:  sown 2nd month of autumn; overwinters; harvested last month of summer.
//           Accumulates: 2 autumn months (×0.7) + 3 mild-winter months (×0.15)
//           + 3 spring months (×0.7) + 2 summer months (×1.0) = 5.95 GU.
//   Oats:   sown 1st spring month; harvested last month of summer.
//           Accumulates: 3 spring months (×0.7) + 2 summer months (×1.0) = 4.1 GU.
//   Barley: sown 1st spring month; harvested 1st month of autumn.
//           Accumulates: 3 spring (×0.7) + 2 summer (×1.0) + 1 autumn (×0.7) = 4.8 GU.
// With the default 7 growing months and 5 winter months these crops mature roughly
// 1–2 months later than the historical reference because the default has only 1
// long_summer month (vs. 2 in the historical reference). This is expected: the GU
// values capture biology, not a specific calendar configuration.

const CROP_MATURITY: Record<'wheat' | 'barley' | 'oats', number> = {
  wheat: 5.95,
  barley: 4.80,
  oats: 4.10,
};

// GU past maturity before harvest is forced.
// Wheat:         ~1 long_summer month of drying on the stem (grain can shatter after that).
// Barley/oats:   ~1 autumn month (can stand briefly in shocks to dry).
const CROP_HARVEST_DELTA_MAX: Record<'wheat' | 'barley' | 'oats', number> = {
  wheat: 1.0,
  barley: 0.7,
  oats: 0.7,
};

const HAY_FIRST_CUT_THRESHOLD = 1.0;
const HAY_REGROWTH_CUT_THRESHOLD = 2.0;
const HAY_POST_MOW_GU_RESIDUAL_FACTOR = 0.5;
const INTENSE_GRAZING_TRIGGER = 0.03;
const INTENSE_GRAZING_MAX_SHARE = 0.6;
const WINTER_GRASS_GROWTH_RATE = 0.2;

// ── Livestock constants ───────────────────────────────────────────────────────

const COW_GESTATION = 9;
const COW_LACTATION_MAX = 10; // months; cow is dry ~10 months after calving
const COW_POSTPARTUM_INFERTILE = 2; // months before cow can conceive again
const COW_CALF_WEAN_MONTHS = 2;    // calf nurses for 2 months; human milk starts month 3
const EWE_GESTATION = 5;
const EWE_LACTATION_MAX = 4;
const EWE_POSTPARTUM_INFERTILE = 2;

// Target inter-parturition interval: annual cycle for both species (12 months).
// Biological minimum would be COW_GESTATION+COW_POSTPARTUM_INFERTILE=11 and
// EWE_GESTATION+EWE_POSTPARTUM_INFERTILE=7, but medieval practice was once-a-year
// calving/lambing. For two staggered cohorts half the herd can be set to cycle
// offset by 6 months (initialise half with monthsSinceParturition = 6 vs. 0).
const COW_MIN_CYCLE = 12;
const EWE_MIN_CYCLE = 12;

// ── Land fertility ─────────────────────────────────────────────────────────────
// Monthly model:
//   Cropped month:  fertility -= d × CROP_GROWTH_RATE[type][season]
//   Fallow month:   fertility += r × growthRate × (1 - fertility)
//     growing season: growthRate = SEASON_GROWTH_RATE[season]
//     winter fallow:  growthRate = WINTER_FALLOW_RECOVERY[season] (0.3 normal, 0.0 deep)
//   Wheat in normal winter grows at 0.15, so its parcel is depleted (not recovered) that winter.
//
// Calibration — 3-field rotation, 7 growing months + 5 winter months:
//   Wheat cycle depletion: (5.2 growing GU + 0.75 winter GU) × d = 5.95d
//   Barley cycle depletion: 5.2 growing GU × d (no winter growth)
//   Total depletion/cycle: 11.15d
//   Recovery GU-equiv/cycle:
//     wheat-year autumn fallow (2×0.7=1.4) + barley-year winter (5×0.3=1.5)
//     + fallow-year growing (5.2) + fallow-year winter (1.5) = 9.6
//     (wheat-year winter not counted — wheat is actively growing, depleting, not recovering)
//   Equilibrium: 11.15 × 0.03 = 9.6 × 0.11 × (1-f*)  →  f* ≈ 0.68
//   Planner uses 0.70 (slight upward buffer for oscillation high).

const FERTILITY_DEPLETION_RATE = 0.03;  // d: per growth-unit accumulated by crop
const FERTILITY_RECOVERY_RATE  = 0.11;  // r: per uncropped GU-equiv
const PLANNER_AVG_FERTILITY    = 0.70;  // steady-state mean fertility at mid-oscillation

// ── Wool shearing thresholds ──────────────────────────────────────────────────

const WOOL_SHEAR_ELIGIBLE = 9.0;
const WOOL_SHEAR_URGENT   = 12.0;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface CropParcel {
  type: 'wheat' | 'barley' | 'oats';
  acres: number;
  fertility: number;
  growthUnits: number;
  // isAutumnSown: wheat is sown in autumn and grows through winter at reduced rate;
  // spring crops (barley, oats) are always harvested before winter.
  isAutumnSown: boolean;
  harvested: boolean;
}

interface Cattle {
  type: 'bull' | 'cow' | 'ox';
  ageMonths: number;
  pregnancyMonths: number;
  lactationMonths: number;
  monthsSinceParturition: number;
}

interface Sheep {
  sex: 'ram' | 'ewe';
  ageMonths: number;
  pregnancyMonths: number;
  lactationMonths: number;
  monthsSinceParturition: number;
  woolGrowthUnits: number;
}

interface LandCohortState {
  totalArea: number;
  hay: number;
  normalGrazing: number;
  intenseGrazing: number;
  storedGrass: number;
  growthUnits: number;
}

// ── Misc constants ────────────────────────────────────────────────────────────

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const CATTLE_MAX_LIFESPAN = 120;
const GRASS_TO_HAY_MASS_RATIO = 0.25;
const GRASS_TO_HAY_KCAL_RATIO = 3.6;
const RATIO_EPSILON = 1e-12;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDailyKcalRequirement(params: SimParams) {
  return params.households * (
    params.kcalPerDay.male   * params.peoplePerHH.male +
    params.kcalPerDay.female * params.peoplePerHH.female +
    params.kcalPerDay.child  * params.peoplePerHH.child
  );
}

function getAnnualKcalRequirement(params: SimParams) {
  return getDailyKcalRequirement(params) * DAYS_PER_YEAR;
}

function getMonthlyKcalRequirement(params: SimParams) {
  return getAnnualKcalRequirement(params) / MONTHS_PER_YEAR;
}

function getDairyMonthsEquivalent(winterMonths: number) {
  const WINTER_DAIRY_FACTOR = 0.35;
  return (MONTHS_PER_YEAR - winterMonths) + (winterMonths * WINTER_DAIRY_FACTOR);
}

function boxMuller(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

const WHEAT_CLIMATE_SENSITIVITY  = 0.8;
const BARLEY_CLIMATE_SENSITIVITY = 0.7;
const OATS_CLIMATE_SENSITIVITY   = 0.6;

export function randomizeCorrelatedYield(
  base: number, variabilityPct: number, sharedShock: number, climateSensitivity: number
): number {
  const rho = climateSensitivity;
  const combinedShock = rho * sharedShock + Math.sqrt(1 - rho * rho) * boxMuller();
  const sigma = variabilityPct / 100;
  return base * Math.exp(sigma * combinedShock - (sigma * sigma) / 2);
}

export function randomizeYield(base: number, variabilityPct: number): number {
  const sigma = variabilityPct / 100;
  return base * Math.exp(sigma * boxMuller() - (sigma * sigma) / 2);
}

function harvestModifier(delta: number): number {
  // delta < 0: early harvest penalty (0.85 per month short of maturity)
  // delta 0→3: diminishing bonus (+5%, +3%, +2% per additional month, max 1.10 at +3)
  // delta > 3: declining from peak
  if (delta < 0) return Math.pow(0.85, -delta);
  if (delta <= 1) return 1.0 + delta * 0.05;
  if (delta <= 2) return 1.05 + (delta - 1) * 0.03;
  if (delta <= 3) return 1.08 + (delta - 2) * 0.02;
  return 1.10 * Math.pow(0.90, delta - 3);
}

// The one actual decision: should we harvest early to make room for a re-sow?
// Compares total output of (early harvest now + re-sow) vs (wait for maturity).
function shouldHarvestEarlyForResow(
  parcel: CropParcel,
  remainingGrowthPotential: number,
  baseYield: number,
  fertilityFloor: number,
): boolean {
  const mat = CROP_MATURITY[parcel.type];
  const unitsShort = mat - parcel.growthUnits;
  if (unitsShort <= 0) return false;
  if (remainingGrowthPotential < 0.6 * mat) return false;

  const earlyYield = parcel.acres * baseYield * parcel.fertility * Math.pow(0.85, unitsShort);

  const resowGrowth = remainingGrowthPotential;
  const resowDelta = resowGrowth - mat;
  const resowFertility = Math.max(fertilityFloor, parcel.fertility - FERTILITY_DEPLETION_RATE * mat);
  const resowYield = parcel.acres * baseYield * resowFertility * harvestModifier(resowDelta);

  const waitDelta = remainingGrowthPotential >= unitsShort
    ? Math.min(remainingGrowthPotential - unitsShort, 3) // best late bonus achievable (peak at +3)
    : -(unitsShort - remainingGrowthPotential);           // season ends before maturity
  const waitYield = parcel.acres * baseYield * parcel.fertility * harvestModifier(waitDelta);

  return earlyYield + resowYield > waitYield;
}

// Returns kcal/month. Months 1-2: calf nurses, no human milk. Month 3: peak post-weaning.
// Linear decline to dry at COW_LACTATION_MAX.
function cowMilkKcal(lactMonth: number, peakLitres: number, kcalPerLitre: number): number {
  if (lactMonth <= COW_CALF_WEAN_MONTHS || lactMonth > COW_LACTATION_MAX) return 0;
  const peakKcal = peakLitres * kcalPerLitre;
  if (lactMonth === COW_CALF_WEAN_MONTHS + 1) return peakKcal;
  return peakKcal * (1 - (lactMonth - (COW_CALF_WEAN_MONTHS + 1)) / (COW_LACTATION_MAX - (COW_CALF_WEAN_MONTHS + 1)));
}

// Ewe milk: first 2 months full, months 3-4 half, then dry.
function eweMilkKcal(lactMonth: number, peakLitres: number, kcalPerLitre: number): number {
  if (lactMonth <= 0 || lactMonth > EWE_LACTATION_MAX) return 0;
  const peakKcal = peakLitres * kcalPerLitre;
  return lactMonth <= 2 ? peakKcal : peakKcal * 0.5;
}

// ── Main simulation ───────────────────────────────────────────────────────────

export function runSimulation(params: SimParams, iterations = 100): SimResult {
  const fertilityFloor = params.fertilityFloor ?? 0.40;
  const initialFertility = params.initialFertility ?? 0.85;
  const titheFactor = (100 - params.titheAndManufacturePct) / 100;

  let shortageCount = 0;
  let severeShortageCount = 0;
  let animalDeathCount = 0;
  let fuelShortageCount = 0;
  let clothingShortageCount = 0;
  let totalWheatEnd = 0;
  let totalOatsEnd = 0;
  let totalWoolProduced = 0;

  let exampleHistory: MonthHistory[] = [];
  let dietAgg: HumanDiet = { wheat: 0, barley: 0, oats: 0, dairy: 0, meat: 0, deficit: 0 };

  const monthlyKcalReq = getMonthlyKcalRequirement(params);
  const G = params.growingMonths;
  const W = params.winterMonths;
  const hayKcalPerKg = GRASS_TO_HAY_KCAL_RATIO * params.grassKcalPerKg;
  const hayKcalPerCartload = hayKcalPerKg * params.cartloadToKgHay;
  if (Math.abs((hayKcalPerKg / params.grassKcalPerKg) - GRASS_TO_HAY_KCAL_RATIO) > RATIO_EPSILON) {
    throw new Error("Hay/grass kcal ratio invariant failed.");
  }
  const hasTwoSummerMonths = (() => {
    for (let m = 1; m < G; m++) {
      if (classifyMonth(m, G) === 'long_summer' && classifyMonth(m + 1, G) === 'long_summer') return true;
    }
    return false;
  })();

  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const YEARS_PER_ITERATION = 5;
  const wAcresConst = activeAcres * (params.landSplit.wheat / 100);
  const bAcresConst = activeAcres * (params.landSplit.barley / 100);
  const oAcresConst = activeAcres * (params.landSplit.oats / 100);
  const hAcresConst = activeAcres * (params.landSplit.hay / 100);

  const seedWheat  = wAcresConst * params.cropStats.wheat.seedRate;
  const seedBarley = bAcresConst * params.cropStats.barley.seedRate;
  const seedOats   = oAcresConst * params.cropStats.oats.seedRate;

  const householdPeople = params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child;
  const totalPeople = params.households * householdPeople;

  const totalOxen = params.households * params.animalsPerHH.oxen;
  const totalCows = params.households * params.animalsPerHH.cows;
  const totalBulls = Math.max(1, Math.round(totalCows * params.bullsPerCow));
  const initialSheepCount = params.households * params.animalsPerHH.sheep;

  // Static floor used for hay-shortage emergencies (conservative overestimate)
  const clothingFloor = Math.max(5, Math.ceil(totalPeople * params.clothingNeedWoolLbs / params.woolPerSheep));

  const monthlyWoolToCloth = params.households * params.peoplePerHH.female *
    (householdPeople * params.clothingNeedWoolLbs * 1.5 / 12);
  const clothingBaseRate = totalPeople * params.clothingNeedWoolLbs /
    (G + 2 * W);

  const woodlandFuelYield = params.woodlandAcres * params.fuelYieldPerAcre * G / 12;

  const neededCowsPerYear = Math.ceil(totalCows / 6);
  const neededOxenPerYear = Math.ceil(totalOxen / 6);
  const cowCullAge = CATTLE_MAX_LIFESPAN - W - COW_GESTATION;
  const halfSeasonMonths = Math.ceil(Math.min(G, 12) / 2);
  const oxBullCullAge = CATTLE_MAX_LIFESPAN - W - halfSeasonMonths;

  const chronicleIteration = Math.floor(Math.random() * iterations);

  for (let i = 0; i < iterations; i++) {
    // ── Initial stocks ──
    let wheatStocks  = monthlyKcalReq * Math.min(G, CROP_MATURITY.wheat + 1) / params.cropStats.wheat.kcalPerBu + seedWheat;
    let barleyStocks = monthlyKcalReq * Math.min(G, CROP_MATURITY.barley + 1) * 0.20 / params.cropStats.barley.kcalPerBu + seedBarley;
    let oatStocks    = seedOats + totalOxen * (params.feedNeedsWinter.oxenOats / 2);
    let hayStocks    = 0; // cartloads
    let meatStocks   = 0;
    let fuelStocks   = 0;
    let woolStocks   = totalPeople * params.clothingNeedWoolLbs * 0.5;
    let clothStocks  = totalPeople * params.clothingNeedWoolLbs * 0.5;

    // ── Initial cattle herd ──
    let herd: Cattle[] = [];
    for (let j = 0; j < totalBulls; j++)
      herd.push({ type: 'bull', ageMonths: 36 + Math.floor(Math.random() * 60), pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: COW_MIN_CYCLE });
    for (let j = 0; j < totalCows; j++)
      herd.push({ type: 'cow', ageMonths: 36 + Math.floor(Math.random() * 70), pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: Math.floor(Math.random() * COW_MIN_CYCLE) });
    for (let j = 0; j < totalOxen; j++)
      herd.push({ type: 'ox', ageMonths: 36 + Math.floor(Math.random() * 70), pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0 });
    for (let ageYears = 0; ageYears < 3; ageYears++) {
      for (let j = 0; j < neededCowsPerYear; j++)
        herd.push({ type: 'cow', ageMonths: ageYears * 12 + 6, pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0 });
      for (let j = 0; j < neededOxenPerYear; j++)
        herd.push({ type: 'ox', ageMonths: ageYears * 12 + 6, pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0 });
    }

    // ── Initial flock ──
    let flock: Sheep[] = [];
    for (let j = 0; j < initialSheepCount; j++) {
      const sex: 'ram' | 'ewe' = Math.random() < 0.5 ? 'ewe' : 'ram';
      flock.push({
        sex,
        ageMonths: 6 + Math.floor(Math.random() * 42),
        pregnancyMonths: 0,
        lactationMonths: 0,
        monthsSinceParturition: Math.floor(Math.random() * EWE_MIN_CYCLE),
        woolGrowthUnits: Math.random() * WOOL_SHEAR_ELIGIBLE,
      });
    }

    // ── Crop parcels ──
    // Wheat: autumn-sown, overwinters in ground, starts unplanted (sown in first autumn).
    // Barley/oats: spring-sown, always harvested before winter begins.
    let wheatParcels: CropParcel[] = [{
      type: 'wheat', acres: wAcresConst, fertility: initialFertility,
      growthUnits: 0, isAutumnSown: true, harvested: false,
    }];
    let barleyParcels: CropParcel[] = [{
      type: 'barley', acres: bAcresConst, fertility: initialFertility,
      growthUnits: 0, isAutumnSown: false, harvested: false,
    }];
    let oatParcels: CropParcel[] = [{
      type: 'oats', acres: oAcresConst, fertility: initialFertility,
      growthUnits: 0, isAutumnSown: false, harvested: false,
    }];

    // Land cohorts for grassland transitions (aggregate state only)
    const meadowState: LandCohortState = {
      totalArea: hAcresConst,
      hay: hAcresConst,
      normalGrazing: 0,
      intenseGrazing: 0,
      storedGrass: 0,
      growthUnits: 0,
    };
    const pastureAreaBase = (initialSheepCount * params.pastureAcresPerSheep) + ((totalOxen + totalCows + totalBulls) * params.pastureAcresPerCattle);
    const pastureState: LandCohortState = {
      totalArea: pastureAreaBase,
      hay: 0,
      normalGrazing: pastureAreaBase,
      intenseGrazing: 0,
      storedGrass: 0,
      growthUnits: 0,
    };
    let hayFirstCutDone = false;
    let hayFertility = initialFertility;

    for (let year = 1; year <= YEARS_PER_ITERATION; year++) {
      let hadShortage = false;
      let hadSevere = false;
      let animalDeath = false;
      let hadFuelShortage = false;
      let hadClothingShortage = false;

      const climateShock = boxMuller();
      const wBaseYield = randomizeCorrelatedYield(params.yields.wheat,  params.yieldVariability, climateShock, WHEAT_CLIMATE_SENSITIVITY);
      const bBaseYield = randomizeCorrelatedYield(params.yields.barley, params.yieldVariability, climateShock, BARLEY_CLIMATE_SENSITIVITY);
      const oBaseYield = randomizeCorrelatedYield(params.yields.oats,   params.yieldVariability, climateShock, OATS_CLIMATE_SENSITIVITY);
      const hBaseYield = randomizeYield(params.yields.hay, params.yieldVariability);

      for (let month = 1; month <= G + W; month++) {
        const isWinter = month > G;
        const growingMonth = isWinter ? 0 : month;
        const winterMonth = isWinter ? month - G : 0;
        const winterType = isWinter ? classifyWinterMonth(winterMonth, W) : 'winter';
        const isDeepWinter = winterType === 'deep_winter';
        const season: SeasonType = isWinter ? winterType : classifyMonth(growingMonth, G);
        const absoluteMonth = (year - 1) * (G + W) + month;
        const isFirstGrowingMonth = growingMonth === 1;
        const isLastGrowingMonth = growingMonth === G;

        let fHWheat = 0, fHBarley = 0, fHOats = 0, fHHay = 0;
        let fAOats = 0, fAHay = 0;
        let fSeed = 0;
        let woolThisMonth = 0;
        let fLambs = 0;
        let fCalvings = 0;
        let fShearings = 0;
        let fPreWinterSheepCull = 0;
        let fHayCuts = 0;

        // ── Age all animals ──
        herd.forEach(c => {
          c.ageMonths++;
          c.monthsSinceParturition++;
          if (c.pregnancyMonths > 0) c.pregnancyMonths++;
          if (c.lactationMonths > 0) c.lactationMonths++;
        });
        flock.forEach(s => {
          s.ageMonths++;
          s.monthsSinceParturition++;
          if (s.pregnancyMonths > 0) s.pregnancyMonths++;
          if (s.lactationMonths > 0) s.lactationMonths++;
          s.woolGrowthUnits += WOOL_GROWTH_RATE[season];
        });

        // ── Cattle reproduction (biological timer, any non-winter month) ──
        if (!isWinter) {
          const ramPresent = herd.some(c => c.type === 'bull' && c.ageMonths >= 24);
          const newCalves: Cattle[] = [];
          herd.forEach(c => {
            if (c.type === 'cow') {
              // Calving
              if (c.pregnancyMonths > COW_GESTATION) {
                c.pregnancyMonths = 0;
                c.lactationMonths = 1;
                c.monthsSinceParturition = 0;
                const calfType: 'cow' | 'ox' = Math.random() < 0.5 ? 'cow' : 'ox';
                newCalves.push({ type: calfType, ageMonths: 0, pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0 });
                fCalvings++;
              }
              // Breeding
              if (ramPresent && c.pregnancyMonths === 0 && c.ageMonths >= 24
                  && c.monthsSinceParturition >= COW_MIN_CYCLE) {
                if (Math.random() < 0.85) c.pregnancyMonths = 1;
              }
            }
          });
          herd = herd.concat(newCalves);
        }

        // ── Sheep reproduction (biological timer, any non-winter month) ──
        if (!isWinter) {
          const ramCount = flock.filter(s => s.sex === 'ram' && s.ageMonths >= 12).length;
          const newLambs: Sheep[] = [];
          flock.forEach(s => {
            if (s.sex === 'ewe') {
              // Lambing
              if (s.pregnancyMonths > EWE_GESTATION) {
                s.pregnancyMonths = 0;
                s.lactationMonths = 1;
                s.monthsSinceParturition = 0;
                const lambSex: 'ram' | 'ewe' = Math.random() < 0.5 ? 'ewe' : 'ram';
                newLambs.push({ sex: lambSex, ageMonths: 0, pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0, woolGrowthUnits: 0 });
                fLambs++;
              }
              // Breeding
              if (ramCount > 0 && s.pregnancyMonths === 0 && s.ageMonths >= 12
                  && s.monthsSinceParturition >= EWE_MIN_CYCLE) {
                if (Math.random() < 0.85) s.pregnancyMonths = 1;
              }
            }
          });
          flock = flock.concat(newLambs);
        }

        // Lambs born in winter: 30% mortality from exposure
        if (isWinter) {
          flock.forEach(s => {
            if (s.sex === 'ewe' && s.pregnancyMonths > EWE_GESTATION) {
              s.pregnancyMonths = 0;
              s.lactationMonths = 1;
              s.monthsSinceParturition = 0;
              if (Math.random() > 0.30) {
                const lambSex: 'ram' | 'ewe' = Math.random() < 0.5 ? 'ewe' : 'ram';
                flock.push({ sex: lambSex, ageMonths: 0, pregnancyMonths: 0, lactationMonths: 0, monthsSinceParturition: 0, woolGrowthUnits: 0 });
                fLambs++;
              }
            }
          });
        }

        // ── Wool shearing ──
        // May shear in spring or long_summer when eligible; must shear if urgent and not winter
        if (season === 'spring' || season === 'long_summer') {
          flock.forEach(s => {
            if (s.woolGrowthUnits >= WOOL_SHEAR_ELIGIBLE || (s.woolGrowthUnits >= WOOL_SHEAR_URGENT && !isWinter)) {
              const w = params.woolPerSheep * titheFactor;
              woolStocks += w;
              woolThisMonth += w;
              totalWoolProduced += w;
              s.woolGrowthUnits = 0;
              fShearings++;
            }
          });
        } else if (!isWinter) {
          // autumn: only urgent shearing (animal welfare)
          flock.forEach(s => {
            if (s.woolGrowthUnits >= WOOL_SHEAR_URGENT) {
              const w = params.woolPerSheep * titheFactor;
              woolStocks += w;
              woolThisMonth += w;
              totalWoolProduced += w;
              s.woolGrowthUnits = 0;
              fShearings++;
            }
          });
        }

        // ── Clothing production and consumption ──
        {
          const spun = Math.min(woolStocks, monthlyWoolToCloth);
          woolStocks -= spun;
          clothStocks += spun;
          const clothConsumed = isWinter ? 2 * clothingBaseRate : clothingBaseRate;
          clothStocks -= clothConsumed;
          if (clothStocks < 0) { hadClothingShortage = true; clothStocks = 0; }
        }

        // ── Woodland fuel (harvested at end of growing season) ──
        if (isLastGrowingMonth) fuelStocks += woodlandFuelYield;

        // ── Crop parcel growth and harvest ──

        // Remaining growing-season growth potential (used by re-sow decision for all crops;
        // wheat also gains from winter months but those don't affect in-season re-sow logic).
        let remainingPotential = 0;
        if (!isWinter) {
          for (let m = growingMonth + 1; m <= G; m++) {
            remainingPotential += SEASON_GROWTH_RATE[classifyMonth(m, G)];
          }
        }

        const doHarvestParcel = (parcel: CropParcel, baseYield: number): number => {
          const delta = parcel.growthUnits - CROP_MATURITY[parcel.type];
          const mod = harvestModifier(delta);
          const amt = parcel.acres * baseYield * parcel.fertility * mod * titheFactor;
          parcel.growthUnits = 0;
          parcel.harvested = true;
          return amt;
        };

        const addHarvest = (type: 'wheat' | 'barley' | 'oats', amount: number) => {
          if (type === 'wheat')  { wheatStocks  += amount; fHWheat  += amount; }
          if (type === 'barley') { barleyStocks += amount; fHBarley += amount; }
          if (type === 'oats')   { oatStocks    += amount; fHOats   += amount; }
        };

        // Process one parcel: accumulate growth (using per-crop rates), apply fertility depletion,
        // and trigger harvest when appropriate.
        // Wheat grows through normal winter at 0.15 rate; barley and oats have rate 0 in winter
        // so this function is a no-op for them in winter (they're always harvested before winter).
        const processParcel = (parcel: CropParcel, baseYield: number) => {
          const cropRate = CROP_GROWTH_RATE[parcel.type][season];

          if (isWinter) {
            // Only wheat has a non-zero winter crop rate (0.15 in normal winter, 0 in deep winter).
            if (cropRate > 0) {
              parcel.growthUnits += cropRate;
              parcel.fertility = Math.max(fertilityFloor, parcel.fertility - FERTILITY_DEPLETION_RATE * cropRate);
            }
            // Harvest never happens in winter — fields can't be worked.
            return;
          }

          // Growing season: accumulate growth and apply fertility depletion
          parcel.growthUnits += cropRate;
          parcel.fertility = Math.max(fertilityFloor, parcel.fertility - FERTILITY_DEPLETION_RATE * cropRate);

          const delta = parcel.growthUnits - CROP_MATURITY[parcel.type];

          // Force harvest once well past maturity (grain shatters or quality declines sharply)
          if (delta > CROP_HARVEST_DELTA_MAX[parcel.type]) {
            addHarvest(parcel.type, doHarvestParcel(parcel, baseYield));
            return;
          }

          // At or past maturity: harvest if season is nearly over, or a re-sow is worthwhile
          if (delta >= 0) {
            const resowNeeded = shouldHarvestEarlyForResow(parcel, remainingPotential, baseYield, fertilityFloor);
            if (remainingPotential < 0.5 || resowNeeded) {
              addHarvest(parcel.type, doHarvestParcel(parcel, baseYield));
            }
            // else hold for small late-ripening bonus
            return;
          }

          // Still immature: only harvest early if a re-sow is clearly more productive
          if (shouldHarvestEarlyForResow(parcel, remainingPotential, baseYield, fertilityFloor)) {
            addHarvest(parcel.type, doHarvestParcel(parcel, baseYield));
          }
        };

        // Fallow recovery helper — called for parcels sitting idle this month
        const falseRecovery = (parcel: CropParcel) => {
          const recoveryRate = isWinter ? WINTER_FALLOW_RECOVERY[winterType] : SEASON_GROWTH_RATE[season];
          parcel.fertility = Math.min(1.0, parcel.fertility + FERTILITY_RECOVERY_RATE * recoveryRate * (1 - parcel.fertility));
        };

        // Wheat: sown in autumn months; overwinters and grows through normal winter.
        const isAutumnMonth = season === 'autumn';
        wheatParcels.forEach(p => {
          const isIdle = p.harvested || p.growthUnits === 0;
          if (isIdle) {
            if (!isWinter && isAutumnMonth) {
              // Sow wheat — it starts growing this month
              const sW = Math.min(wheatStocks, p.acres * params.cropStats.wheat.seedRate);
              wheatStocks -= sW; fSeed += sW;
              p.harvested = false;
              p.growthUnits = 0;
              p.isAutumnSown = true;
              processParcel(p, wBaseYield);
            } else {
              falseRecovery(p);
            }
          } else {
            // Wheat is in ground — process growth (including during winter)
            processParcel(p, wBaseYield);
          }
        });

        // Barley: sown at first spring month; harvested before winter.
        barleyParcels.forEach(p => {
          const isIdle = p.harvested || p.growthUnits === 0;
          if (isIdle) {
            if (!isWinter && isFirstGrowingMonth) {
              const sB = Math.min(barleyStocks, p.acres * params.cropStats.barley.seedRate);
              barleyStocks -= sB; fSeed += sB;
              p.harvested = false;
              p.growthUnits = 0;
              processParcel(p, bBaseYield);
            } else {
              falseRecovery(p);
            }
          } else {
            processParcel(p, bBaseYield);
          }
        });

        // Oats: sown at first spring month; harvested before winter.
        oatParcels.forEach(p => {
          const isIdle = p.harvested || p.growthUnits === 0;
          if (isIdle) {
            if (!isWinter && isFirstGrowingMonth) {
              const sO = Math.min(oatStocks, p.acres * params.cropStats.oats.seedRate);
              oatStocks -= sO; fSeed += sO;
              p.harvested = false;
              p.growthUnits = 0;
              processParcel(p, oBaseYield);
            } else {
              falseRecovery(p);
            }
          } else {
            processParcel(p, oBaseYield);
          }
        });

        // At end of the growing season: force-harvest anything still standing.
        // Wheat that is still below maturity overwinters — leave it in the ground.
        // Barley and oats cannot survive winter and must be taken now regardless.
        if (isLastGrowingMonth) {
          [...wheatParcels, ...barleyParcels, ...oatParcels].forEach(p => {
            if (p.harvested || p.growthUnits === 0) return;
            if (p.type === 'wheat' && p.growthUnits < CROP_MATURITY[p.type]) return;
            addHarvest(p.type, doHarvestParcel(p, p.type === 'wheat' ? wBaseYield : p.type === 'barley' ? bBaseYield : oBaseYield));
          });
          hayFirstCutDone = false;
        }

        // ── Grassland cohort transitions (deterministic monthly order) ──
        const winterSheepOnlyNeed = flock.length * 0.005;
        const grazingNeedThisMonth = isWinter ? winterSheepOnlyNeed : herd.length * 0.02 + flock.length * 0.005;
        const totalActiveGrazingArea = meadowState.normalGrazing + meadowState.intenseGrazing + pastureState.normalGrazing + pastureState.intenseGrazing;
        let meadowCutThisMonth = false;
        [meadowState, pastureState].forEach(state => {
          // 1) seasonal growth update
          const growthRate = isDeepWinter ? 0 : isWinter ? WINTER_GRASS_GROWTH_RATE : SEASON_GROWTH_RATE[season];
          state.growthUnits += growthRate;
          state.storedGrass += growthRate * (state.normalGrazing + 1.5 * state.intenseGrazing);

          // 2) optional mowing decision
          if (state.hay > 0 && !isWinter) {
            const nextIsLongSummer = growingMonth < G && classifyMonth(growingMonth + 1, G) === 'long_summer';
            const canMowNow = season === 'long_summer' && (!hasTwoSummerMonths || nextIsLongSummer);
            const cutThreshold = hayFirstCutDone ? HAY_REGROWTH_CUT_THRESHOLD : HAY_FIRST_CUT_THRESHOLD;
            if (canMowNow && state.growthUnits >= cutThreshold && state.hay > 0) {
              const cutMod = hayFirstCutDone ? 0.7 : 1;
              const hayHarvested = state.hay * hBaseYield * hayFertility * cutMod;
              hayStocks += hayHarvested; fHHay += hayHarvested; fHayCuts++;
              hayFirstCutDone = true;
              state.growthUnits = HAY_POST_MOW_GU_RESIDUAL_FACTOR * hayFertility;
              if (state === meadowState) meadowCutThisMonth = true;
            }
          }

          // 3) grazing consumption and storage update
          const thisArea = state.normalGrazing + state.intenseGrazing;
          if (thisArea > 0 && totalActiveGrazingArea > 0) {
            const classGrazingShare = thisArea / totalActiveGrazingArea;
            const demand = grazingNeedThisMonth * classGrazingShare;
            state.storedGrass = Math.max(0, state.storedGrass - demand);
          }
        });

        // 4) area reallocation for next month
        let hasFutureMowWindow = false;
        if (!isWinter) {
          for (let m = growingMonth + 1; m <= G; m++) {
            if (classifyMonth(m, G) !== 'long_summer') continue;
            if (!hasTwoSummerMonths || (m < G && classifyMonth(m + 1, G) === 'long_summer')) {
              hasFutureMowWindow = true;
              break;
            }
          }
        }
        const wasLastHayCut = meadowCutThisMonth && !hasFutureMowWindow;
        if (wasLastHayCut) {
          meadowState.hay = 0;
          meadowState.normalGrazing = 0;
          meadowState.intenseGrazing = meadowState.totalArea;
        } else {
          meadowState.hay = meadowState.totalArea;
          meadowState.normalGrazing = 0;
          meadowState.intenseGrazing = 0;
        }

        pastureState.hay = 0;
        pastureState.normalGrazing = pastureState.totalArea;
        pastureState.intenseGrazing = 0;

        const totalGrazingAreaNextMonth = meadowState.normalGrazing + pastureState.normalGrazing;
        if (totalGrazingAreaNextMonth > 0 && !isWinter) {
          const pressure = grazingNeedThisMonth / totalGrazingAreaNextMonth;
          const intenseShare = pressure > INTENSE_GRAZING_TRIGGER
            ? Math.min(INTENSE_GRAZING_MAX_SHARE, (pressure - INTENSE_GRAZING_TRIGGER) / INTENSE_GRAZING_TRIGGER)
            : 0;
          [meadowState, pastureState].forEach(state => {
            const grazingArea = state.normalGrazing;
            const intenseArea = grazingArea * intenseShare;
            state.normalGrazing = grazingArea - intenseArea;
            state.intenseGrazing = intenseArea;
          });
        }
        if (isDeepWinter) {
          meadowState.growthUnits = 0;
          pastureState.growthUnits = 0;
        }

        // ── Pre-winter culling ──
        if (isLastGrowingMonth) {
          // Dynamic clothing floor: accounts for long seasons where each sheep produces more wool.
          // Wool can be overwintered at zero cost; only sheep that produce *additional* wool are needed.
          const totalWoolGrowthNextCycle = (() => {
            let s = W * WOOL_GROWTH_RATE['winter'];
            for (let m = 1; m <= G; m++) s += WOOL_GROWTH_RATE[classifyMonth(m, G)];
            return s;
          })();
          const projWoolPerSheepPerCycle = (totalWoolGrowthNextCycle / WOOL_SHEAR_ELIGIBLE) * params.woolPerSheep;
          const clothingNeedNextCycle = totalPeople * params.clothingNeedWoolLbs * (G + W) / 12;
          const dynFloor = Math.max(3, Math.ceil(Math.max(0, clothingNeedNextCycle - woolStocks) / Math.max(0.001, projWoolPerSheepPerCycle)));

          // Cattle phase 1: remove past-prime animals
          const survivingPhase1: Cattle[] = [];
          for (const c of herd) {
            const isPastPrime =
              (c.type === 'cow' && c.ageMonths >= cowCullAge) ||
              ((c.type === 'ox' || c.type === 'bull') && c.ageMonths >= oxBullCullAge);
            if (isPastPrime) meatStocks += params.production.cattleMeatAdult;
            else survivingPhase1.push(c);
          }

          // Cattle phase 2: manage young cohorts
          const adultCows  = survivingPhase1.filter(c => c.type === 'cow'  && c.ageMonths >= 36).length;
          const adultOxen  = survivingPhase1.filter(c => c.type === 'ox'   && c.ageMonths >= 36).length;
          const adultBulls = survivingPhase1.filter(c => c.type === 'bull' && c.ageMonths >= 36).length;
          const cowDeficit  = Math.max(0, totalCows  - adultCows);
          const oxDeficit   = Math.max(0, totalOxen  - adultOxen);
          const bullDeficit = Math.max(0, totalBulls - adultBulls);

          const youngCows  = survivingPhase1.filter(c => c.type === 'cow'  && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const youngOxen  = survivingPhase1.filter(c => c.type === 'ox'   && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const youngBulls = survivingPhase1.filter(c => c.type === 'bull' && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const adults = survivingPhase1.filter(c => c.ageMonths >= 36);

          const keepCows  = neededCowsPerYear + cowDeficit;
          const keepOxen  = neededOxenPerYear + oxDeficit;
          const keepBulls = Math.max(bullDeficit, youngBulls.length > 0 ? 1 : 0);

          const culledYoung = youngCows.slice(keepCows).length + youngOxen.slice(keepOxen).length + youngBulls.slice(keepBulls).length;
          meatStocks += culledYoung * params.production.cattleMeatCalf;

          herd = [
            ...adults,
            ...youngCows.slice(0, keepCows),
            ...youngOxen.slice(0, keepOxen),
            ...youngBulls.slice(0, keepBulls),
          ];

          // Sheep: remove surplus above initialSheepCount, never below dynFloor
          const surplusSheep = Math.max(0, flock.length - initialSheepCount);
          if (surplusSheep > 0) {
            flock.sort((a, b) => b.ageMonths - a.ageMonths);
            let culled = 0;
            flock = flock.filter(s => {
              if (culled >= surplusSheep) return true;
              if (flock.length - culled <= dynFloor) return true;
              culled++;
              meatStocks += params.production.sheepMeatKcal;
              fPreWinterSheepCull++;
              return false;
            });
          }

          // Pre-winter food planning: cull sheep to cover projected winter shortfall.
          // Account for deep-winter months having higher feed needs.
          const deepWinterMonthCount = (() => {
            let n = 0;
            for (let wm = 1; wm <= W; wm++) if (classifyWinterMonth(wm, W) === 'deep_winter') n++;
            return n;
          })();
          const normalWinterMonthCount = W - deepWinterMonthCount;
          const projFeedMult = (normalWinterMonthCount + deepWinterMonthCount * params.deepWinterFeedMultiplier) / W;
          const projWinterOats = (totalOxen * params.feedNeedsWinter.oxenOats + totalCows * params.feedNeedsWinter.cowOats) * W * projFeedMult;
          const projWinterHayKcal = (
            (totalOxen * params.feedNeedsWinter.oxenHay) +
            (totalCows * params.feedNeedsWinter.cowHay) +
            (flock.length * params.feedNeedsWinter.sheepHay)
          ) * W * projFeedMult * hayKcalPerCartload;
          const cowDairyKcalPeak = params.production.cowDairyLitresPerMonth * params.production.milkKcalPerLitre;
          const sheepDairyKcalPeak = params.production.sheepDairyLitresPerMonth * params.production.milkKcalPerLitre;
          const projCowDairy = herd.reduce((s, c) => {
            if (c.type !== 'cow') return s;
            const rate = c.ageMonths >= 48 ? 1 : c.ageMonths >= 36 ? 0.5 : 0;
            return s + cowDairyKcalPeak * rate * 0.35;
          }, 0) * W;
          const projSheepDairy = flock.filter(s => s.sex === 'ewe').length * 0.5 * sheepDairyKcalPeak * 0.35 * W;
          const humanWheatKcal  = Math.max(0, wheatStocks - seedWheat) * params.cropStats.wheat.kcalPerBu;
          const humanBarleyKcal = barleyStocks * params.cropStats.barley.kcalPerBu;
          const humanOatsKcal   = Math.max(0, oatStocks - seedOats - projWinterOats) * params.cropStats.oats.kcalPerBu;
          const winterFoodEst   = humanWheatKcal + humanBarleyKcal + humanOatsKcal + projCowDairy + projSheepDairy + meatStocks + projWinterHayKcal;
          const winterKcalNeed  = monthlyKcalReq * W;
          const shortfall = Math.max(0, winterKcalNeed - winterFoodEst);

          if (shortfall > 0) {
            const needCull = Math.ceil(shortfall / params.production.sheepMeatKcal);
            const canCull = Math.max(0, flock.length - dynFloor);
            const extraCull = Math.min(canCull, needCull);
            flock.sort((a, b) => b.ageMonths - a.ageMonths);
            flock.splice(0, extraCull);
            meatStocks += extraCull * params.production.sheepMeatKcal;
            fPreWinterSheepCull += extraCull;
          }
        }

        // ── Winter fuel consumption ──
        let currentMonthlyKcalReq = monthlyKcalReq;
        if (isWinter) {
          const fuelPerHH = isDeepWinter ? params.fuelNeedsDeepWinter : params.fuelNeedsWinter;
          const fuelNeeded = params.households * fuelPerHH;
          if (fuelStocks >= fuelNeeded) {
            fuelStocks -= fuelNeeded;
          } else {
            const fuelShortagePct = fuelNeeded > 0 ? (fuelNeeded - fuelStocks) / fuelNeeded : 0;
            fuelStocks = 0;
            hadFuelShortage = true;
            currentMonthlyKcalReq += monthlyKcalReq * (0.10 * fuelShortagePct);
          }
        }

        // ── Dairy production ──
        let dairyKcal = 0;
        herd.forEach(c => {
          if (c.type === 'cow') {
            const raw = cowMilkKcal(c.lactationMonths, params.production.cowDairyLitresPerMonth, params.production.milkKcalPerLitre);
            dairyKcal += isWinter ? raw * 0.35 : raw;
          }
        });
        flock.forEach(s => {
          if (s.sex === 'ewe') {
            const raw = eweMilkKcal(s.lactationMonths, params.production.sheepDairyLitresPerMonth, params.production.milkKcalPerLitre);
            dairyKcal += isWinter ? raw * 0.35 : raw;
          }
        });
        dietAgg.dairy += dairyKcal;
        let availableKcal = dairyKcal;

        // ── Meat (up to 15% of calories) ──
        if (meatStocks > 0) {
          const meatToEat = Math.min(meatStocks, currentMonthlyKcalReq * 0.15);
          meatStocks -= meatToEat;
          availableKcal += meatToEat;
          dietAgg.meat += meatToEat;
        }

        // ── Safe grain reserves (keep seed back) ──
        const safeWheat  = Math.max(0, wheatStocks  - seedWheat);
        const safeBarley = Math.max(0, barleyStocks - seedBarley);
        const safeOats   = Math.max(0, oatStocks    - seedOats);

        // ── Ale/barley (~20%) ──
        let aleKcalTarget = currentMonthlyKcalReq * 0.20;
        if (safeBarley > 0) {
          const maxAleKcal = safeBarley * params.cropStats.barley.kcalPerBu;
          if (maxAleKcal >= aleKcalTarget) {
            const buUsed = aleKcalTarget / params.cropStats.barley.kcalPerBu;
            barleyStocks -= buUsed; fHBarley += buUsed;
            dietAgg.barley += aleKcalTarget; availableKcal += aleKcalTarget;
          } else {
            barleyStocks -= safeBarley; fHBarley += safeBarley;
            dietAgg.barley += maxAleKcal; availableKcal += maxAleKcal;
          }
        }

        // ── Bread grain ──
        let kcalNeeded = Math.max(0, currentMonthlyKcalReq - availableKcal);

        if (kcalNeeded > 0 && safeWheat > 0) {
          const wheatKcal = safeWheat * params.cropStats.wheat.kcalPerBu;
          if (wheatKcal >= kcalNeeded) {
            const buUsed = kcalNeeded / params.cropStats.wheat.kcalPerBu;
            wheatStocks -= buUsed; fHWheat += buUsed; dietAgg.wheat += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= wheatKcal; wheatStocks -= safeWheat; fHWheat += safeWheat; dietAgg.wheat += wheatKcal;
          }
        }
        if (kcalNeeded > 0 && safeBarley > 0) {
          const barleyKcal = safeBarley * params.cropStats.barley.kcalPerBu;
          if (barleyKcal >= kcalNeeded) {
            const buUsed = kcalNeeded / params.cropStats.barley.kcalPerBu;
            barleyStocks -= buUsed; fHBarley += buUsed; dietAgg.barley += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= barleyKcal; barleyStocks -= safeBarley; fHBarley += safeBarley; dietAgg.barley += barleyKcal;
          }
        }
        if (kcalNeeded > 0 && safeOats > 0) {
          const oatKcal = safeOats * params.cropStats.oats.kcalPerBu;
          if (oatKcal >= kcalNeeded) {
            const buUsed = kcalNeeded / params.cropStats.oats.kcalPerBu;
            oatStocks -= buUsed; fHOats += buUsed; dietAgg.oats += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= oatKcal; oatStocks -= safeOats; fHOats += safeOats; dietAgg.oats += oatKcal;
          }
        }
        if (kcalNeeded > 0 && meatStocks > 0) {
          const extraMeat = Math.min(meatStocks, kcalNeeded);
          meatStocks -= extraMeat; kcalNeeded -= extraMeat;
          dietAgg.meat += extraMeat;
        }

        if (kcalNeeded > 0) {
          hadShortage = true;
          if (kcalNeeded > currentMonthlyKcalReq * 0.2) hadSevere = true;
          dietAgg.deficit += kcalNeeded;
        }

        // ── Animal feed ──
        let oatsNeeded = 0;
        let hayNeededKcal = 0;
        let hayNeededCartloads = 0;
        let sheepHayNeeded = 0;
        let cattleHayNeeded = 0;

        // Plowing oats at start of growing season
        if (isFirstGrowingMonth) {
          const activeOxen = herd.filter(c => (c.type === 'ox' || c.type === 'bull') && c.ageMonths >= 36).length;
          oatsNeeded += activeOxen * (params.feedNeedsWinter.oxenOats / 2);
        }

        if (isWinter) {
          // Deep winter: cold stress raises feed needs proportionally
          const deepMult = isDeepWinter ? params.deepWinterFeedMultiplier : 1.0;
          herd.forEach(c => {
            const ageMult = c.ageMonths <= 12 ? 0.2 : c.ageMonths < 36 ? 0.5 : 1;
            const pregnantMult = (c.type === 'cow' && c.pregnancyMonths >= 6) ? 1.3 : 1;
            const lactMult     = (c.type === 'cow' && c.lactationMonths >= 1 && c.lactationMonths <= 6) ? 1.2 : 1;
            const feedMult = ageMult * Math.max(pregnantMult, lactMult) * deepMult;
            if (c.type === 'ox' || c.type === 'bull') {
              const h = params.feedNeedsWinter.oxenHay * feedMult;
              hayNeededCartloads += h; cattleHayNeeded += h;
              oatsNeeded += params.feedNeedsWinter.oxenOats * feedMult;
            } else if (c.type === 'cow') {
              const h = params.feedNeedsWinter.cowHay * feedMult;
              hayNeededCartloads += h; cattleHayNeeded += h;
              oatsNeeded += params.feedNeedsWinter.cowOats * feedMult;
            }
          });

          flock.forEach(s => {
            const pregnantMult = s.pregnancyMonths >= 3 ? 1.5 : 1;
            const lactMult     = s.lactationMonths >= 1 ? 1.3 : 1;
            const feedMult = Math.max(pregnantMult, lactMult) * deepMult;
            const h = params.feedNeedsWinter.sheepHay * feedMult;
            sheepHayNeeded += h;
          });
          hayNeededCartloads += sheepHayNeeded;
          hayNeededKcal = hayNeededCartloads * hayKcalPerCartload;
        }

        if (hayStocks * hayKcalPerCartload >= hayNeededKcal) {
          const consumedHayCartloads = hayNeededKcal / hayKcalPerCartload;
          hayStocks -= consumedHayCartloads; fAHay += consumedHayCartloads;
        } else {
          fAHay += hayStocks;
          const hayShortfall = hayNeededCartloads - hayStocks;
          hayStocks = 0;
          const sheepHayShortfall = Math.min(hayShortfall, sheepHayNeeded);
          if (sheepHayShortfall > 0 && flock.length > clothingFloor) {
            const sheepDying = Math.min(flock.length - clothingFloor, Math.ceil(sheepHayShortfall / params.feedNeedsWinter.sheepHay));
            flock.sort((a, b) => b.ageMonths - a.ageMonths);
            flock.splice(0, sheepDying);
            animalDeath = true;
          }
          const cattleHayShortfall = Math.min(hayShortfall, cattleHayNeeded);
          oatsNeeded += cattleHayShortfall * 10;
        }

        if (oatStocks >= oatsNeeded) {
          oatStocks -= oatsNeeded; fAOats += oatsNeeded;
        } else {
          fAOats += oatStocks;
          const shortage = oatsNeeded - oatStocks;
          oatStocks = 0;
          animalDeath = true;
          const cattleDying = Math.min(herd.length, Math.ceil(shortage / params.feedNeedsWinter.cowOats));
          herd.sort((a, b) => b.ageMonths - a.ageMonths);
          herd.splice(0, cattleDying);
        }

        // ── Monthly spoilage ──
        const sf  = (100 - params.spoilageRate)    / 100;
        const hsf = (100 - params.haySpoilageRate) / 100;
        const sW = wheatStocks  * (1 - sf);
        const sB = barleyStocks * (1 - sf);
        const sO = oatStocks    * (1 - sf);
        const sH = hayStocks    * (1 - hsf);
        wheatStocks  = Math.max(0, wheatStocks  - sW);
        barleyStocks = Math.max(0, barleyStocks - sB);
        oatStocks    = Math.max(0, oatStocks    - sO);
        hayStocks    = Math.max(0, hayStocks    - sH);
        const fSpoil = sW + sB + sO + sH;
        meatStocks = Math.max(0, meatStocks * 0.85);

        // ── Mean fertility for display ──
        const allParcels = [...wheatParcels, ...barleyParcels, ...oatParcels];
        const meanFertility = allParcels.reduce((s, p) => s + p.fertility, 0) / allParcels.length;

        if (i === chronicleIteration) {
          exampleHistory.push({
            month: absoluteMonth, year, cycle: i + 1,
            wheat:      Math.round(wheatStocks),
            barley:     Math.round(barleyStocks),
            oats:       Math.round(oatStocks),
            hay:        Math.round(hayStocks),
            fuel:       Math.round(fuelStocks),
            hWheat:     Math.round(fHWheat),
            hBarley:    Math.round(fHBarley),
            hOats:      Math.round(fHOats),
            hHay:       Math.round(fHHay),
            aOats:      Math.round(fAOats),
            aHay:       Math.round(fAHay),
            seedCol:    Math.round(fSeed),
            spoilCol:   Math.round(fSpoil),
            sheep:      flock.length,
            cattleCount: herd.length,
            wool:       Math.round(woolThisMonth),
            woolStocks: Math.round(woolStocks),
            clothStocks: Math.round(clothStocks),
            meatStock:  Math.round(meatStocks),
            deficit:    Math.round(kcalNeeded),
            lambCount:  fLambs,
            preWinterSheepCull: Math.round(fPreWinterSheepCull),
            hayCuts:    fHayCuts,
            calvings:   fCalvings,
            shearings:  fShearings,
            fertility:  Math.round(meanFertility * 100) / 100,
          });
        }
      } // end month loop

      if (hadShortage)    shortageCount++;
      if (hadSevere)      severeShortageCount++;
      if (animalDeath)    animalDeathCount++;
      if (hadFuelShortage)    fuelShortageCount++;
      if (hadClothingShortage) clothingShortageCount++;

      totalWheatEnd += wheatStocks;
      totalOatsEnd  += oatStocks;
    } // end year loop
  } // end iteration loop

  const dietDenominator   = iterations * YEARS_PER_ITERATION * params.households;
  const annualDenominator = iterations * YEARS_PER_ITERATION;

  return {
    humanShortageObj:    shortageCount    / annualDenominator,
    severeShortageObj:   severeShortageCount / annualDenominator,
    animalDeathObj:      animalDeathCount    / annualDenominator,
    fuelShortageObj:     fuelShortageCount   / annualDenominator,
    clothingShortageObj: clothingShortageCount / annualDenominator,
    avgWheatRemaining:   totalWheatEnd / (iterations * YEARS_PER_ITERATION),
    avgOatsRemaining:    totalOatsEnd  / (iterations * YEARS_PER_ITERATION),
    avgWoolPerYear:      totalWoolProduced / annualDenominator,
    logs: [],
    history: exampleHistory,
    diet: {
      wheat:   dietAgg.wheat   / dietDenominator,
      barley:  dietAgg.barley  / dietDenominator,
      oats:    dietAgg.oats    / dietDenominator,
      dairy:   dietAgg.dairy   / dietDenominator,
      meat:    dietAgg.meat    / dietDenominator,
      deficit: dietAgg.deficit / dietDenominator,
    },
  };
}

function makeSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function runDeterministicRiskSmokeCheck(): { annualFamineProbability: number; yearlyDeficitCount: number } {
  const seededRandom = makeSeededRandom(123456789);
  const originalRandom = Math.random;
  Math.random = seededRandom;
  try {
    const result = runSimulation(DEFAULTS, 20);
    const totalYears = 20 * 5;
    const yearlyDeficitCount = Math.round(result.humanShortageObj * totalYears);
    return { annualFamineProbability: result.humanShortageObj, yearlyDeficitCount };
  } finally {
    Math.random = originalRandom;
  }
}

export function autoAllocateLand(params: SimParams): SimParams["landSplit"] {
  const report = planVillageResources(params, "fixed-total-land");
  const sum = report.solution.activeFarmlandAcres;
  if (sum <= 0) return { wheat: 0, barley: 0, oats: 0, hay: 0 };
  return {
    wheat:  (report.solution.wheatAcres  / sum) * 100,
    barley: (report.solution.barleyAcres / sum) * 100,
    oats:   (report.solution.oatAcres    / sum) * 100,
    hay:    (report.solution.hayAcres    / sum) * 100,
  };
}

export function solveMinimumAcres(params: SimParams): number {
  const report = planVillageResources(params, "min-total-land");
  return Math.ceil(report.solution.totalLandAcres / 10) * 10;
}

type PlannerMode = "min-total-land" | "fixed-total-land";
interface PlannerReport {
  mode: PlannerMode;
  feasible: boolean;
  objectiveValue: number;
  solution: {
    totalLandAcres: number;
    farmlandAcres: number;
    activeFarmlandAcres: number;
    pastureAcres: number;
    forestAcres: number;
    wheatAcres: number;
    barleyAcres: number;
    oatAcres: number;
    hayAcres: number;
    sheep: number;
    oxen: number;
    cows: number;
    bulls: number;
  };
  slacks: Record<string, number>;
}

export function planVillageResources(params: SimParams, mode: PlannerMode = "min-total-land"): PlannerReport {
  const riskFactor   = 1 + (params.plannerRiskBufferPct / 100);
  const activeRate   = 1 - params.fallowPct / 100;
  const titheFactor  = (100 - params.titheAndManufacturePct) / 100;
  // Fertility-adjusted yield (long-run average)
  const deratedYield = (y: number) => Math.max(0.000001, y * PLANNER_AVG_FERTILITY * titheFactor * (1 - params.spoilageRate / 100));
  const wheatKcalPerAcre  = deratedYield(params.yields.wheat)  * params.cropStats.wheat.kcalPerBu;
  const barleyKcalPerAcre = deratedYield(params.yields.barley) * params.cropStats.barley.kcalPerBu;
  const oatsFeedPerAcre   = deratedYield(params.yields.oats);
  const hayFeedPerAcre = Math.max(
    0.000001,
    (params.yields.hay * 1000 * GRASS_TO_HAY_MASS_RATIO / params.cartloadToKgHay) *
    PLANNER_AVG_FERTILITY * (1 - params.haySpoilageRate / 100),
  );
  const fuelPerForestAcre = Math.max(0.000001, params.fuelYieldPerAcre * (params.growingMonths / 12));

  // Compute effective winter averages accounting for deep-winter months
  const W = params.winterMonths;
  const deepWinterMonths = (() => {
    let n = 0;
    for (let wm = 1; wm <= W; wm++) if (classifyWinterMonth(wm, W) === 'deep_winter') n++;
    return n;
  })();
  const normalWinterMonths = W - deepWinterMonths;
  const avgWinterFuelPerHH = (normalWinterMonths * params.fuelNeedsWinter + deepWinterMonths * params.fuelNeedsDeepWinter) / Math.max(1, W);
  const avgFeedMult = (normalWinterMonths + deepWinterMonths * params.deepWinterFeedMultiplier) / Math.max(1, W);

  const kcalNeed  = getAnnualKcalRequirement(params) * riskFactor;
  const fuelNeed  = params.households * avgWinterFuelPerHH * W * riskFactor;
  const sheepNeed = Math.ceil((totalPeopleFromParams(params) * params.clothingNeedWoolLbs * riskFactor) / Math.max(0.000001, params.woolPerSheep));

  const oxen  = Math.max(0, Math.ceil(params.households * params.animalsPerHH.oxen));
  const cows  = Math.max(0, Math.ceil(oxen / 2));
  const bulls = Math.max(1, Math.ceil(cows * params.bullsPerCow));
  const sheep = sheepNeed;

  const dairyMonthsEquivalent = getDairyMonthsEquivalent(params.winterMonths);
  const cowDairyKcalPerMonth = params.production.cowDairyLitresPerMonth * params.production.milkKcalPerLitre;
  const sheepDairyKcalPerMonth = params.production.sheepDairyLitresPerMonth * params.production.milkKcalPerLitre;
  const animalKcal = (cows * cowDairyKcalPerMonth + (sheep * 0.5) * sheepDairyKcalPerMonth) * dairyMonthsEquivalent
    + (sheep * 0.1 * params.production.sheepMeatKcal);
  const cropKcalNeed  = Math.max(0, kcalNeed - animalKcal);
  const oatsFeedNeed  = ((oxen * params.feedNeedsWinter.oxenOats) + (cows * params.feedNeedsWinter.cowOats)) * W * avgFeedMult * riskFactor;
  const hayFeedNeed   = ((oxen * params.feedNeedsWinter.oxenHay) + (cows * params.feedNeedsWinter.cowHay) + (sheep * params.feedNeedsWinter.sheepHay)) * W * avgFeedMult * riskFactor;

  const barleyShareTarget = 0.10;
  const w = wheatKcalPerAcre;
  const b = barleyKcalPerAcre;
  const v = (1 - barleyShareTarget) / barleyShareTarget;
  const minBarleyAcres = cropKcalNeed / (b + v * w);
  const wheatAcres  = Math.max(0, (b * (1 - barleyShareTarget) * minBarleyAcres) / (barleyShareTarget * w));
  const barleyAcres = Math.max(0, minBarleyAcres);
  const oatAcres    = oatsFeedNeed / oatsFeedPerAcre;
  const hayAcres    = hayFeedNeed  / hayFeedPerAcre;

  const activeFarmlandAcres = wheatAcres + barleyAcres + oatAcres + hayAcres;
  const farmlandAcres = activeFarmlandAcres / Math.max(0.000001, activeRate);
  const forestAcres   = fuelNeed / fuelPerForestAcre;
  const pastureAcres  = (sheep * params.pastureAcresPerSheep) + ((oxen + cows + bulls) * params.pastureAcresPerCattle);
  const totalLandAcres = farmlandAcres + forestAcres + pastureAcres;

  const barleyKcal = barleyAcres * barleyKcalPerAcre;
  const wheatKcal  = wheatAcres  * wheatKcalPerAcre;
  const cropKcal   = barleyKcal  + wheatKcal;
  const barleyShare = cropKcal > 0 ? barleyKcal / cropKcal : 0;

  const slacks: Record<string, number> = {
    calorie:     cropKcal + animalKcal - kcalNeed,
    barleyLower: barleyShare - 0.10,
    barleyUpper: 0.20 - barleyShare,
    oatsFeed:    oatAcres * oatsFeedPerAcre - oatsFeedNeed,
    hayFeed:     hayAcres * hayFeedPerAcre  - hayFeedNeed,
    fuel:        forestAcres * fuelPerForestAcre - fuelNeed,
    tractionOxen: oxen  - params.households * params.animalsPerHH.oxen,
    cowsToOxen:   cows  - oxen / 2,
    bullsToCows:  bulls - (cows * params.bullsPerCow),
    sheepClothing: sheep * params.woolPerSheep - totalPeopleFromParams(params) * params.clothingNeedWoolLbs * riskFactor,
    totalLand: mode === "fixed-total-land" ? params.totalAcres - totalLandAcres : 0,
  };

  return {
    mode,
    feasible: Object.values(slacks).every(s => s >= -1e-6),
    objectiveValue: mode === "fixed-total-land" ? slacks.totalLand : totalLandAcres,
    solution: {
      totalLandAcres: mode === "fixed-total-land" ? params.totalAcres : totalLandAcres,
      farmlandAcres, activeFarmlandAcres, pastureAcres, forestAcres,
      wheatAcres, barleyAcres, oatAcres, hayAcres, sheep, oxen, cows, bulls,
    },
    slacks,
  };
}

function totalPeopleFromParams(params: SimParams): number {
  return params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child);
}
