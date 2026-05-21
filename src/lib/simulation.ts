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
  titheAndManufacturePct: number;
  woolPerSheep: number;
  clothingNeedWoolLbs: number;
  woodlandAcres: number;
  fuelYieldPerAcre: number;
  fuelNeedsSummer: number;
  fuelNeedsWinter: number;
  plannerRiskBufferPct: number;
  bullsPerCow: number;
  pastureAcresPerSheep: number;
  pastureAcresPerCattle: number;

  peoplePerHH: { male: number, female: number, child: number };
  kcalPerDay: { male: number, female: number, child: number };
  animalsPerHH: { oxen: number, cows: number, sheep: number };
  feedNeedsWinter: { oxenOats: number, oxenHay: number, cowOats: number, cowHay: number, sheepHay: number };
  production: { cowDairyKcal: number, sheepDairyKcal: number, sheepMeatKcal: number, cattleMeatAdult: number, cattleMeatCalf: number };
  cropStats: {
    wheat: { kcalPerBu: number, seedRate: number };
    barley: { kcalPerBu: number, seedRate: number };
    oats: { kcalPerBu: number, seedRate: number };
  };
}

export interface MonthHistory {
  month: number;
  year: number;
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

interface Cattle {
    type: 'bull' | 'cow' | 'ox';
    ageMonths: number;
}

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const WINTER_DAIRY_OUTPUT_FACTOR = 0.35;
const CATTLE_MAX_LIFESPAN = 120; // 10 years in months

function getDailyKcalRequirement(params: SimParams) {
  return params.households * (
    params.kcalPerDay.male * params.peoplePerHH.male +
    params.kcalPerDay.female * params.peoplePerHH.female +
    params.kcalPerDay.child * params.peoplePerHH.child
  );
}

function getAnnualKcalRequirement(params: SimParams) {
  return getDailyKcalRequirement(params) * DAYS_PER_YEAR;
}

function getMonthlyKcalRequirement(params: SimParams) {
  return getAnnualKcalRequirement(params) / MONTHS_PER_YEAR;
}

function getDairyMonthsEquivalent(winterMonths: number) {
  return (MONTHS_PER_YEAR - winterMonths) + (winterMonths * WINTER_DAIRY_OUTPUT_FACTOR);
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

// Log-normal yield with a shared climate component. Mean-preserving: E[result] == base.
export function randomizeCorrelatedYield(
  base: number,
  variabilityPct: number,
  sharedShock: number,
  climateSensitivity: number
): number {
  const rho = climateSensitivity;
  const combinedShock = rho * sharedShock + Math.sqrt(1 - rho * rho) * boxMuller();
  const sigma = variabilityPct / 100;
  return base * Math.exp(sigma * combinedShock - (sigma * sigma) / 2);
}

// Independent log-normal yield (hay). Strictly non-negative, mean-preserving.
export function randomizeYield(base: number, variabilityPct: number): number {
  const sigma = variabilityPct / 100;
  return base * Math.exp(sigma * boxMuller() - (sigma * sigma) / 2);
}

export function runSimulation(params: SimParams, iterations = 100): SimResult {
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

  const totalOxen = params.households * params.animalsPerHH.oxen;
  const totalCows = params.households * params.animalsPerHH.cows;
  const totalBulls = Math.max(1, Math.round(totalCows * params.bullsPerCow));
  const initialSheep = params.households * params.animalsPerHH.sheep;

  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const YEARS_PER_ITERATION = 5;
  const CROP_MATURATION_MONTHS = 8;
  const firstHarvestMonth = Math.max(1, Math.min(params.growingMonths, CROP_MATURATION_MONTHS));
  // Hay is cut once per calendar year at midsummer, regardless of total growing season length.
  // For a 7-month season one cut; for a 24-month season two cuts at months ~4 and ~16, etc.
  const hayCutMonthInYear = Math.max(3, Math.min(6, Math.ceil(Math.min(params.growingMonths, 12) / 2)));

  // Annual events within the growing season fire at months 1, 13, 25... (spring)
  // or 3, 15, 27... (shearing) or hayCutMonthInYear, +12, +24... (hay).
  // Autumn lambing fires at month 8, 20, 32... but only when that month is reachable.
  const MONTHS_PER_REAL_YEAR = 12;
  const firesAnnually = (gm: number, monthInYear: number) =>
    gm >= monthInYear && (gm - monthInYear) % MONTHS_PER_REAL_YEAR === 0;

  const titheFactor = (100 - params.titheAndManufacturePct) / 100;
  const wAcresConst = activeAcres * (params.landSplit.wheat / 100);
  const bAcresConst = activeAcres * (params.landSplit.barley / 100);
  const oAcresConst = activeAcres * (params.landSplit.oats / 100);
  const hAcresConst = activeAcres * (params.landSplit.hay / 100);
  const seedWheat = wAcresConst * params.cropStats.wheat.seedRate;
  const seedBarley = bAcresConst * params.cropStats.barley.seedRate;
  const seedOats = oAcresConst * params.cropStats.oats.seedRate;
  const initWheatStocks  = monthlyKcalReq * firstHarvestMonth / params.cropStats.wheat.kcalPerBu + seedWheat;
  const initBarleyStocks = monthlyKcalReq * firstHarvestMonth * 0.20 / params.cropStats.barley.kcalPerBu + seedBarley;
  const initOatStocks    = seedOats + totalOxen * (params.feedNeedsWinter.oxenOats / 2);
  const initHayStocks    = 0;
  const householdPeople = params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child;
  const totalPeople = params.households * householdPeople;
  const monthlyWoolToCloth = params.households * params.peoplePerHH.female *
    (householdPeople * params.clothingNeedWoolLbs * 1.5 / 12);
  const clothingBaseRate = totalPeople * params.clothingNeedWoolLbs /
    (params.growingMonths + 2 * params.winterMonths);
  const initWoolStocks = totalPeople * params.clothingNeedWoolLbs * 0.5;
  const initClothStocks = totalPeople * params.clothingNeedWoolLbs * 0.5;
  // Woodland fuel: deterministic end-of-season harvest scaled for season length
  const woodlandFuelYield = params.woodlandAcres * params.fuelYieldPerAcre * params.growingMonths / 12;

  // Replacement cohort sizes (for stable herd over 10-year lifespan)
  const neededCowsPerYear = Math.ceil(totalCows / 6);
  const neededOxenPerYear = Math.ceil(totalOxen / 6);

  // Culling age thresholds: animal must have meaningful productive life remaining after winter.
  // Cows: need ≥9 months (one gestation) remaining after winter — cull if they can't calve again.
  const cowCullAge = CATTLE_MAX_LIFESPAN - params.winterMonths - 9;
  // Oxen/bulls: need ≥ half of one year's growing season of working life remaining.
  const halfSeasonMonths = Math.ceil(Math.min(params.growingMonths, 12) / 2);
  const oxBullCullAge = CATTLE_MAX_LIFESPAN - params.winterMonths - halfSeasonMonths;

  // Minimum sheep to always retain — enough breeding stock to recover over subsequent years
  const minSheepFloor = Math.max(params.households, Math.floor(initialSheep * 0.15));

  // Pick a random iteration to record for the Chronicle
  const chronicleIteration = Math.floor(Math.random() * iterations);

  for (let i = 0; i < iterations; i++) {
    let wheatStocks = initWheatStocks;
    let barleyStocks = initBarleyStocks;
    let oatStocks = initOatStocks;
    let hayStocks = initHayStocks;
    let currentSheep = initialSheep;
    let meatStocks = 0;
    let fuelStocks = 0;
    let woolStocks = initWoolStocks;
    let clothStocks = initClothStocks;

    let herd: Cattle[] = [];
    // Bulls: size from bullsPerCow, spread across productive ages
    for (let j = 0; j < totalBulls; j++) herd.push({ type: 'bull', ageMonths: 36 + Math.floor(Math.random() * 60) });
    for (let j = 0; j < totalCows; j++) herd.push({ type: 'cow', ageMonths: 36 + Math.floor(Math.random() * 70) });
    for (let j = 0; j < totalOxen; j++) herd.push({ type: 'ox', ageMonths: 36 + Math.floor(Math.random() * 70) });
    // Pre-load three cohorts of young stock (replacement pipeline)
    for (let ageYears = 0; ageYears < 3; ageYears++) {
        for (let j = 0; j < neededCowsPerYear; j++) herd.push({ type: 'cow', ageMonths: ageYears * 12 + 6 });
        for (let j = 0; j < neededOxenPerYear; j++) herd.push({ type: 'ox', ageMonths: ageYears * 12 + 6 });
    }

    for (let year = 1; year <= YEARS_PER_ITERATION; year++) {
      let hadShortage = false;
      let hadSevere = false;
      let animalDeath = false;
      let hadFuelShortage = false;
      let hadClothingShortage = false;

      const climateShock = boxMuller();
      const wYield = randomizeCorrelatedYield(params.yields.wheat, params.yieldVariability, climateShock, WHEAT_CLIMATE_SENSITIVITY);
      const bYield = randomizeCorrelatedYield(params.yields.barley, params.yieldVariability, climateShock, BARLEY_CLIMATE_SENSITIVITY);
      const oYield = randomizeCorrelatedYield(params.yields.oats, params.yieldVariability, climateShock, OATS_CLIMATE_SENSITIVITY);
      // Hay varies independently — meadow yield is not correlated with grain climate shocks
      const hYield = randomizeYield(params.yields.hay, params.yieldVariability);

      for (let month = 1; month <= params.growingMonths + params.winterMonths; month++) {
        const isWinter = month > params.growingMonths;
        const absoluteMonth = (year - 1) * (params.growingMonths + params.winterMonths) + month;
        const growingMonth = month <= params.growingMonths ? month : 0;
        const cycleMonth = growingMonth > 0 ? ((growingMonth - 1) % CROP_MATURATION_MONTHS) + 1 : 0;
        const isSeedPlanting = growingMonth > 0 && cycleMonth === 1;
        let winterMonthIndex = isWinter ? month - params.growingMonths : 0;

        let fHWheat = 0, fHBarley = 0, fHOats = 0, fHHay = 0;
        let fAOats = 0, fAHay = 0;
        let fSeed = 0;
        let woolThisMonth = 0;
        let fLambs = 0;
        let fPreWinterSheepCull = 0;

        herd.forEach(c => c.ageMonths++);

        // Spring: lambing and calving fire once per calendar year (months 1, 13, 25…)
        if (growingMonth > 0 && firesAnnually(growingMonth, 1)) {
            const newLambs = Math.floor(currentSheep * 0.3);
            currentSheep += newLambs;
            fLambs = newLambs;

            const newCalves: Cattle[] = [];
            herd.forEach(c => {
                if (c.type === 'cow' && c.ageMonths >= 36) {
                    if (Math.random() < 0.8) {
                        newCalves.push({ type: Math.random() < 0.5 ? 'ox' : 'cow', ageMonths: 0 });
                    }
                }
            });
            herd = herd.concat(newCalves);
        }

        // Autumn lambing: fires at month 8, 20, 32… (only reachable in seasons ≥9 months)
        if (growingMonth > 0 && firesAnnually(growingMonth, 8)) {
            const autumnLambs = Math.floor(currentSheep * 0.15);
            currentSheep += autumnLambs;
            fLambs += autumnLambs;
        }

        // Woodland fuel: harvested once at end of growing season for winter.
        if (month === params.growingMonths) {
            fuelStocks += woodlandFuelYield;
        }

        // Shearing fires once per calendar year (months 3, 15, 27…)
        if (growingMonth > 0 && firesAnnually(growingMonth, 3)) {
            woolThisMonth = (currentSheep * params.woolPerSheep) * titheFactor;
            woolStocks += woolThisMonth;
            totalWoolProduced += woolThisMonth;
        }

        // Clothing production and consumption
        {
            const spun = Math.min(woolStocks, monthlyWoolToCloth);
            woolStocks -= spun;
            clothStocks += spun;
            const clothConsumed = isWinter ? 2 * clothingBaseRate : clothingBaseRate;
            clothStocks -= clothConsumed;
            if (clothStocks < 0) {
                hadClothingShortage = true;
                clothStocks = 0;
            }
        }

        // Grain harvest: every 8 months (or at end of growing season if season ends mid-cycle)
        if (growingMonth > 0 && (cycleMonth === CROP_MATURATION_MONTHS || growingMonth === params.growingMonths)) {
            const cycleProgress = cycleMonth === CROP_MATURATION_MONTHS ? 1 : cycleMonth / CROP_MATURATION_MONTHS;
            wheatStocks  += (wAcresConst * wYield * cycleProgress) * titheFactor;
            barleyStocks += (bAcresConst * bYield * cycleProgress) * titheFactor;
            oatStocks    += (oAcresConst * oYield * cycleProgress) * titheFactor;
        }

        // Hay: cut once per calendar year at midsummer (months 4, 16, 28… for a 7-month season)
        if (growingMonth > 0 && firesAnnually(growingMonth, hayCutMonthInYear)) {
            const hayHarvested = hAcresConst * hYield;
            hayStocks += hayHarvested;
            fHHay = hayHarvested;
        }

        if (isSeedPlanting) {
            let sW = Math.min(wheatStocks, wAcresConst * params.cropStats.wheat.seedRate);
            let sB = Math.min(barleyStocks, bAcresConst * params.cropStats.barley.seedRate);
            let sO = Math.min(oatStocks, oAcresConst * params.cropStats.oats.seedRate);
            wheatStocks -= sW;
            barleyStocks -= sB;
            oatStocks -= sO;
            fSeed = sW + sB + sO;
        }

        let safeWheat = wheatStocks;
        let safeBarley = barleyStocks;
        let safeOats = oatStocks;
        if (!isSeedPlanting && month < params.growingMonths) {
            safeWheat = Math.max(0, wheatStocks - (wAcresConst * params.cropStats.wheat.seedRate));
            safeBarley = Math.max(0, barleyStocks - (bAcresConst * params.cropStats.barley.seedRate));
            safeOats = Math.max(0, oatStocks - (oAcresConst * params.cropStats.oats.seedRate));
        }

        // End of growing season: cull livestock before winter
        if (!isWinter && month === params.growingMonths) {
          // 1. Surplus sheep above stable herd target
          const surplusSheep = Math.max(0, currentSheep - initialSheep);
          if (surplusSheep > 0) {
              currentSheep -= surplusSheep;
              meatStocks += surplusSheep * params.production.sheepMeatKcal;
              fPreWinterSheepCull += surplusSheep;
          }

          // 2. Sophisticated cattle culling
          // Phase 1: remove animals that won't have meaningful productive life after winter
          const survivingPhase1: Cattle[] = [];
          for (const c of herd) {
              const isPastPrime =
                  (c.type === 'cow' && c.ageMonths >= cowCullAge) ||
                  ((c.type === 'ox' || c.type === 'bull') && c.ageMonths >= oxBullCullAge);
              if (isPastPrime) {
                  meatStocks += params.production.cattleMeatAdult;
              } else {
                  survivingPhase1.push(c);
              }
          }

          // Phase 2: manage young cohorts to stabilise herd size, recovering losses if needed
          const adultCows  = survivingPhase1.filter(c => c.type === 'cow'  && c.ageMonths >= 36).length;
          const adultOxen  = survivingPhase1.filter(c => c.type === 'ox'   && c.ageMonths >= 36).length;
          const adultBulls = survivingPhase1.filter(c => c.type === 'bull' && c.ageMonths >= 36).length;

          const cowDeficit  = Math.max(0, totalCows  - adultCows);
          const oxDeficit   = Math.max(0, totalOxen  - adultOxen);
          const bullDeficit = Math.max(0, totalBulls - adultBulls);

          // Keep oldest young first (they are closest to productive); cull youngest
          const youngCows  = survivingPhase1.filter(c => c.type === 'cow'  && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const youngOxen  = survivingPhase1.filter(c => c.type === 'ox'   && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const youngBulls = survivingPhase1.filter(c => c.type === 'bull' && c.ageMonths < 36).sort((a, b) => b.ageMonths - a.ageMonths);
          const adults     = survivingPhase1.filter(c => c.ageMonths >= 36);

          const keepCows  = neededCowsPerYear  + cowDeficit;
          const keepOxen  = neededOxenPerYear  + oxDeficit;
          const keepBulls = Math.max(bullDeficit, youngBulls.length > 0 ? 1 : 0);

          const culledYoungCows  = youngCows.slice(keepCows);
          const culledYoungOxen  = youngOxen.slice(keepOxen);
          const culledYoungBulls = youngBulls.slice(keepBulls);
          const culledCalvesCount = culledYoungCows.length + culledYoungOxen.length + culledYoungBulls.length;
          meatStocks += culledCalvesCount * params.production.cattleMeatCalf;

          herd = [
              ...adults,
              ...youngCows.slice(0, keepCows),
              ...youngOxen.slice(0, keepOxen),
              ...youngBulls.slice(0, keepBulls),
          ];

          // 3. Deterministic pre-winter food planning
          // Villagers know the harvest and winter length; they pre-cull sheep now rather than
          // face an emergency mid-winter.
          let winterCowDairyEst = 0;
          herd.forEach(c => {
              if (c.type === 'cow') {
                  const rate = c.ageMonths >= 48 ? 1 : c.ageMonths >= 36 ? 0.5 : 0;
                  winterCowDairyEst += params.production.cowDairyKcal * rate * WINTER_DAIRY_OUTPUT_FACTOR;
              }
          });
          winterCowDairyEst *= params.winterMonths;
          const winterSheepDairyEst = (currentSheep * 0.5) * params.production.sheepDairyKcal * WINTER_DAIRY_OUTPUT_FACTOR * params.winterMonths;

          const animalsNeedOats = (totalOxen * params.feedNeedsWinter.oxenOats + totalCows * params.feedNeedsWinter.cowOats) * params.winterMonths;
          const humanWheatKcal   = Math.max(0, wheatStocks - seedWheat) * params.cropStats.wheat.kcalPerBu;
          const humanBarleyKcal  = barleyStocks * params.cropStats.barley.kcalPerBu;
          const humanOatsKcal    = Math.max(0, oatStocks - seedOats - animalsNeedOats) * params.cropStats.oats.kcalPerBu;
          const winterFoodEst    = humanWheatKcal + humanBarleyKcal + humanOatsKcal + winterCowDairyEst + winterSheepDairyEst + meatStocks;
          const winterKcalNeed   = monthlyKcalReq * params.winterMonths;
          const expectedShortfall = Math.max(0, winterKcalNeed - winterFoodEst);

          // Pre-cull to cover shortfall; retain at minimum a viable breeding nucleus
          if (expectedShortfall > 0 && currentSheep > minSheepFloor) {
              const canCull   = currentSheep - minSheepFloor;
              const needCull  = Math.ceil(expectedShortfall / params.production.sheepMeatKcal);
              const extraCull = Math.min(canCull, needCull);
              currentSheep  -= extraCull;
              meatStocks    += extraCull * params.production.sheepMeatKcal;
              fPreWinterSheepCull += extraCull;
          }
        }

        // Winter fuel: heated homes; summer cooking is free (dung, hedges, scraps).
        let currentMonthlyKcalReq = monthlyKcalReq;
        if (isWinter) {
            const fuelNeeded = params.households * params.fuelNeedsWinter;
            if (fuelStocks >= fuelNeeded) {
                fuelStocks -= fuelNeeded;
            } else {
                const fuelShortagePct = fuelNeeded > 0 ? (fuelNeeded - fuelStocks) / fuelNeeded : 0;
                fuelStocks = 0;
                hadFuelShortage = true;
                // Cold increases caloric need modestly (reduced cooking efficiency + body heat)
                currentMonthlyKcalReq += monthlyKcalReq * (0.10 * fuelShortagePct);
            }
        }

        // Dairy production
        let cowDairy = 0;
        herd.forEach(c => {
            if (c.type === 'cow') {
                if (c.ageMonths >= 48) cowDairy += params.production.cowDairyKcal;
                else if (c.ageMonths >= 36) cowDairy += (params.production.cowDairyKcal * 0.5);
            }
        });
        let sheepDairy = (currentSheep * 0.5) * params.production.sheepDairyKcal;
        let dairyKcal = cowDairy + sheepDairy;
        if (isWinter) dairyKcal = dairyKcal * WINTER_DAIRY_OUTPUT_FACTOR;
        dietAgg.dairy += dairyKcal;
        let availableKcal = dairyKcal;

        // Meat: up to 15% of calories from preserved stocks
        if (meatStocks > 0) {
            let meatToEat = Math.min(meatStocks, currentMonthlyKcalReq * 0.15);
            meatStocks -= meatToEat;
            availableKcal += meatToEat;
            dietAgg.meat += meatToEat;
        }

        // Ale/barley (~20% of caloric intake)
        let aleKcalTarget = currentMonthlyKcalReq * 0.20;
        if (safeBarley > 0) {
            const maxAleKcal = safeBarley * params.cropStats.barley.kcalPerBu;
            if (maxAleKcal > aleKcalTarget) {
                const buUsed = aleKcalTarget / params.cropStats.barley.kcalPerBu;
                barleyStocks -= buUsed;
                fHBarley += buUsed;
                safeBarley -= buUsed;
                dietAgg.barley += aleKcalTarget;
                availableKcal += aleKcalTarget;
            } else {
                barleyStocks -= safeBarley;
                fHBarley += safeBarley;
                dietAgg.barley += maxAleKcal;
                availableKcal += maxAleKcal;
                safeBarley = 0;
            }
        }

        let kcalNeeded = Math.max(0, currentMonthlyKcalReq - availableKcal);

        if (kcalNeeded > 0 && safeWheat > 0) {
          const wheatKcal = safeWheat * params.cropStats.wheat.kcalPerBu;
          if (wheatKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.wheat.kcalPerBu);
            wheatStocks -= buUsed; fHWheat += buUsed; dietAgg.wheat += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= wheatKcal; wheatStocks -= safeWheat; fHWheat += safeWheat; dietAgg.wheat += wheatKcal;
          }
        }
        if (kcalNeeded > 0 && safeBarley > 0) {
          const barleyKcal = safeBarley * params.cropStats.barley.kcalPerBu;
          if (barleyKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.barley.kcalPerBu);
            barleyStocks -= buUsed; fHBarley += buUsed; dietAgg.barley += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= barleyKcal; barleyStocks -= safeBarley; fHBarley += safeBarley; dietAgg.barley += barleyKcal;
          }
        }
        if (kcalNeeded > 0 && safeOats > 0) {
          const oatKcal = safeOats * params.cropStats.oats.kcalPerBu;
          if (oatKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.oats.kcalPerBu);
            oatStocks -= buUsed; fHOats += buUsed; dietAgg.oats += kcalNeeded; kcalNeeded = 0;
          } else {
            kcalNeeded -= oatKcal; oatStocks -= safeOats; fHOats += safeOats; dietAgg.oats += oatKcal;
          }
        }
        if (kcalNeeded > 0 && meatStocks > 0) {
            let extraMeat = Math.min(meatStocks, kcalNeeded);
            meatStocks -= extraMeat; kcalNeeded -= extraMeat;
            dietAgg.meat += extraMeat; availableKcal += extraMeat;
        }

        if (kcalNeeded > 0) {
          hadShortage = true;
          if (kcalNeeded > currentMonthlyKcalReq * 0.2) hadSevere = true;
          // No emergency winter sheep slaughter: households planned before winter
          dietAgg.deficit += kcalNeeded;
        }

        // Animal feed (winter only, plus spring plowing oats)
        let oatsNeeded = 0;
        let hayNeeded = 0;
        let sheepHayNeeded = 0;
        let cattleHayNeeded = 0;

        if (isSeedPlanting) {
            let activeOxen = 0;
            herd.forEach(c => { if ((c.type === 'ox' || c.type === 'bull') && c.ageMonths >= 36) activeOxen++; });
            oatsNeeded += activeOxen * (params.feedNeedsWinter.oxenOats / 2);
        }

        if (isWinter) {
            herd.forEach(c => {
                let multiplier = 1;
                if (c.ageMonths <= 12) multiplier = 0.2;
                else if (c.ageMonths < 36) multiplier = 0.5;

                if (c.type === 'ox' || c.type === 'bull') {
                    const oxHay = params.feedNeedsWinter.oxenHay * multiplier;
                    hayNeeded += oxHay; cattleHayNeeded += oxHay;
                    oatsNeeded += params.feedNeedsWinter.oxenOats * multiplier;
                } else if (c.type === 'cow') {
                    const cowHay = params.feedNeedsWinter.cowHay * multiplier;
                    hayNeeded += cowHay; cattleHayNeeded += cowHay;
                    oatsNeeded += params.feedNeedsWinter.cowOats * multiplier;
                }
            });

            if (winterMonthIndex > 3 && winterMonthIndex <= 6) {
                sheepHayNeeded = currentSheep * (params.feedNeedsWinter.sheepHay / 2);
            } else if (winterMonthIndex > 6) {
                sheepHayNeeded = currentSheep * params.feedNeedsWinter.sheepHay;
            }
            hayNeeded += sheepHayNeeded;
        }

        if (hayStocks >= hayNeeded) {
          hayStocks -= hayNeeded; fAHay += hayNeeded;
        } else {
          fAHay += hayStocks;
          const hayShortfall = hayNeeded - hayStocks;
          hayStocks = 0;
          const sheepHayShortfall = Math.min(hayShortfall, sheepHayNeeded);
          if (sheepHayShortfall > 0 && currentSheep > 0) {
              const sheepDying = Math.min(currentSheep, Math.ceil(sheepHayShortfall / params.feedNeedsWinter.sheepHay));
              currentSheep -= sheepDying;
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
          if (shortage > 0) {
              const cattleDying = Math.min(herd.length, Math.ceil(shortage / params.feedNeedsWinter.cowOats));
              herd.sort((a, b) => b.ageMonths - a.ageMonths);
              herd.splice(0, cattleDying);
          }
        }

        // Monthly spoilage
        const spoilFactor = (100 - params.spoilageRate) / 100;
        const haySpoilFactor = (100 - params.haySpoilageRate) / 100;
        let sW = wheatStocks * (1 - spoilFactor);
        let sB = barleyStocks * (1 - spoilFactor);
        let sO = oatStocks * (1 - spoilFactor);
        let sH = hayStocks * (1 - haySpoilFactor);
        wheatStocks = Math.max(0, wheatStocks - sW);
        barleyStocks = Math.max(0, barleyStocks - sB);
        oatStocks = Math.max(0, oatStocks - sO);
        hayStocks = Math.max(0, hayStocks - sH);
        let fSpoil = sW + sB + sO + sH;
        meatStocks = Math.max(0, meatStocks * 0.85);

        if (i === chronicleIteration) {
          exampleHistory.push({
            month: absoluteMonth,
            year,
            wheat: Math.round(wheatStocks),
            barley: Math.round(barleyStocks),
            oats: Math.round(oatStocks),
            hay: Math.round(hayStocks),
            fuel: Math.round(fuelStocks),
            hWheat: Math.round(fHWheat),
            hBarley: Math.round(fHBarley),
            hOats: Math.round(fHOats),
            hHay: Math.round(fHHay),
            aOats: Math.round(fAOats),
            aHay: Math.round(fAHay),
            seedCol: Math.round(fSeed),
            spoilCol: Math.round(fSpoil),
            sheep: currentSheep,
            cattleCount: herd.length,
            wool: Math.round(woolThisMonth),
            woolStocks: Math.round(woolStocks),
            clothStocks: Math.round(clothStocks),
            meatStock: Math.round(meatStocks),
            deficit: Math.round(kcalNeeded),
            lambCount: fLambs,
            preWinterSheepCull: Math.round(fPreWinterSheepCull),
          });
        }
      } // end month loop

      if (hadShortage) shortageCount++;
      if (hadSevere) severeShortageCount++;
      if (animalDeath) animalDeathCount++;
      if (hadFuelShortage) fuelShortageCount++;
      if (hadClothingShortage) clothingShortageCount++;

      // Accumulate end-of-year stocks for true mean (not just last year of run)
      totalWheatEnd += wheatStocks;
      totalOatsEnd += oatStocks;
    } // end year loop

  } // end iteration loop

  const dietDenominator = iterations * YEARS_PER_ITERATION * params.households;
  const annualDenominator = iterations * YEARS_PER_ITERATION;

  return {
    humanShortageObj: shortageCount / annualDenominator,
    severeShortageObj: severeShortageCount / annualDenominator,
    animalDeathObj: animalDeathCount / annualDenominator,
    fuelShortageObj: fuelShortageCount / annualDenominator,
    clothingShortageObj: clothingShortageCount / annualDenominator,
    avgWheatRemaining: totalWheatEnd / (iterations * YEARS_PER_ITERATION),
    avgOatsRemaining: totalOatsEnd / (iterations * YEARS_PER_ITERATION),
    avgWoolPerYear: totalWoolProduced / annualDenominator,
    logs: [],
    history: exampleHistory,
    diet: {
      wheat: dietAgg.wheat / dietDenominator,
      barley: dietAgg.barley / dietDenominator,
      oats: dietAgg.oats / dietDenominator,
      dairy: dietAgg.dairy / dietDenominator,
      meat: dietAgg.meat / dietDenominator,
      deficit: dietAgg.deficit / dietDenominator
    }
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
    return {
      annualFamineProbability: result.humanShortageObj,
      yearlyDeficitCount,
    };
  } finally {
    Math.random = originalRandom;
  }
}

export function autoAllocateLand(params: SimParams): SimParams["landSplit"] {
  const report = planVillageResources(params, "fixed-total-land");
  const sum = report.solution.activeFarmlandAcres;
  const wheatAcres = report.solution.wheatAcres;
  const barleyAcres = report.solution.barleyAcres;
  const oatAcres = report.solution.oatAcres;
  const hayAcres = report.solution.hayAcres;
  if (sum <= 0) {
    return { wheat: 0, barley: 0, oats: 0, hay: 0 };
  }
  return {
    wheat: (wheatAcres / sum) * 100,
    barley: (barleyAcres / sum) * 100,
    oats: (oatAcres / sum) * 100,
    hay: (hayAcres / sum) * 100
  };
}

export function solveMinimumAcres(params: SimParams): number {
  const report = planVillageResources(params, "min-total-land");
  const requiredTotalAcres = report.solution.totalLandAcres;
  return Math.ceil(requiredTotalAcres / 10) * 10;
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
  const riskFactor = 1 + (params.plannerRiskBufferPct / 100);
  const activeRate = 1 - params.fallowPct / 100;
  const titheFactor = (100 - params.titheAndManufacturePct) / 100;
  const deratedYield = (y: number) => Math.max(0.000001, y * titheFactor * (1 - params.spoilageRate / 100));
  const wheatKcalPerAcre = deratedYield(params.yields.wheat) * params.cropStats.wheat.kcalPerBu;
  const barleyKcalPerAcre = deratedYield(params.yields.barley) * params.cropStats.barley.kcalPerBu;
  const oatsFeedPerAcre = deratedYield(params.yields.oats);
  const hayFeedPerAcre = Math.max(0.000001, params.yields.hay * (1 - params.haySpoilageRate / 100));
  const fuelPerForestAcre = Math.max(0.000001, params.fuelYieldPerAcre * (params.growingMonths / 12));
  const kcalNeed = getAnnualKcalRequirement(params) * riskFactor;
  const fuelNeed = params.households * params.fuelNeedsWinter * params.winterMonths * riskFactor;
  const sheepNeed = Math.ceil((params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child) * params.clothingNeedWoolLbs * riskFactor) / Math.max(0.000001, params.woolPerSheep));
  const oxen = Math.max(0, Math.ceil(params.households * params.animalsPerHH.oxen));
  const cows = Math.max(0, Math.ceil(oxen / 2));
  const bulls = Math.max(1, Math.ceil(cows * params.bullsPerCow));
  const sheep = sheepNeed;
  const dairyMonthsEquivalent = getDairyMonthsEquivalent(params.winterMonths);
  const animalKcal = (cows * params.production.cowDairyKcal + (sheep * 0.5) * params.production.sheepDairyKcal) * dairyMonthsEquivalent + (sheep * 0.1 * params.production.sheepMeatKcal);
  const cropKcalNeed = Math.max(0, kcalNeed - animalKcal);
  const oatsFeedNeed = ((oxen * params.feedNeedsWinter.oxenOats) + (cows * params.feedNeedsWinter.cowOats)) * params.winterMonths * riskFactor;
  const hayFeedNeed = ((oxen * params.feedNeedsWinter.oxenHay) + (cows * params.feedNeedsWinter.cowHay) + (sheep * params.feedNeedsWinter.sheepHay)) * params.winterMonths * riskFactor;
  const barleyShareTarget = 0.10;
  const w = wheatKcalPerAcre;
  const b = barleyKcalPerAcre;
  const v = (1 - barleyShareTarget) / barleyShareTarget;
  const minBarleyAcres = cropKcalNeed / (b + v * w);
  const wheatAtMinBarley = (b * (1 - barleyShareTarget) * minBarleyAcres) / (barleyShareTarget * w);
  const wheatAcres = Math.max(0, wheatAtMinBarley);
  const barleyAcres = Math.max(0, minBarleyAcres);
  const oatAcres = oatsFeedNeed / oatsFeedPerAcre;
  const hayAcres = hayFeedNeed / hayFeedPerAcre;
  const activeFarmlandAcres = wheatAcres + barleyAcres + oatAcres + hayAcres;
  const farmlandAcres = activeFarmlandAcres / Math.max(0.000001, activeRate);
  const forestAcres = fuelNeed / fuelPerForestAcre;
  const pastureAcres = (sheep * params.pastureAcresPerSheep) + ((oxen + cows + bulls) * params.pastureAcresPerCattle);
  const totalLandAcres = farmlandAcres + forestAcres + pastureAcres;
  const fixedTotal = params.totalAcres;
  const barleyKcal = barleyAcres * barleyKcalPerAcre;
  const wheatKcal = wheatAcres * wheatKcalPerAcre;
  const cropKcal = barleyKcal + wheatKcal;
  const barleyShare = cropKcal > 0 ? barleyKcal / cropKcal : 0;
  const slacks: Record<string, number> = {
    calorie: cropKcal + animalKcal - kcalNeed,
    barleyLower: barleyShare - 0.10,
    barleyUpper: 0.20 - barleyShare,
    oatsFeed: oatAcres * oatsFeedPerAcre - oatsFeedNeed,
    hayFeed: hayAcres * hayFeedPerAcre - hayFeedNeed,
    fuel: forestAcres * fuelPerForestAcre - fuelNeed,
    tractionOxen: oxen - params.households * params.animalsPerHH.oxen,
    cowsToOxen: cows - oxen / 2,
    bullsToCows: bulls - (cows * params.bullsPerCow),
    sheepClothing: sheep * params.woolPerSheep - params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child) * params.clothingNeedWoolLbs * riskFactor,
    totalLand: mode === "fixed-total-land" ? fixedTotal - totalLandAcres : 0,
  };
  const feasible = Object.values(slacks).every((s) => s >= -1e-6);
  return {
    mode,
    feasible,
    objectiveValue: mode === "fixed-total-land" ? slacks.totalLand : totalLandAcres,
    solution: { totalLandAcres: mode === "fixed-total-land" ? fixedTotal : totalLandAcres, farmlandAcres, activeFarmlandAcres, pastureAcres, forestAcres, wheatAcres, barleyAcres, oatAcres, hayAcres, sheep, oxen, cows, bulls },
    slacks,
  };
}
