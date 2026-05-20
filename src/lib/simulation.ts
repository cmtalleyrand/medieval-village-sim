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
  fuelEnergy: {
    woodDensityKgPerM3: number;
    grossKjPerKg: number;
    netUsableHeatFraction: number;
  };
  foodEnergyModel: {
    barleyProcessingLossPct: number;
    barleyProcessingWasteFeedShare: number;
    densitiesKgPerBu: { wheat: number; barley: number; oats: number };
    energyKjPerKg: { wheat: number; barley: number; oats: number; hay: number };
    metabolizableKjPerKg: { oatsForRuminants: number; oatsForMonogastrics: number; hayForRuminants: number };
  };
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
  barley: number; // Includes ale eqv
  oats: number;
  hay: number;
  fuel: number;
  hWheat: number;
  hBarley: number;
  hOats: number;
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
}


export interface FuelAudit {
  volumeM3: number;
  massKg: number;
  grossEnergyKj: number;
  usableHeatKj: number;
}

export interface FoodPathwayAudit {
  volumeM3: number | null;
  weightKg: number;
  energy: {
    ruminantOnlyKj: number;
    animalDirectKj: number;
    humanProcessedKj: number;
    processingWasteAnimalKj: number;
    humanDirectKj: number;
  };
}

export interface ConversionAudit {
  fuel: {
    annualGathered: FuelAudit;
    annualWinterDemand: FuelAudit;
  };
  foods: {
    wheat: FoodPathwayAudit;
    barley: FoodPathwayAudit;
    oats: FoodPathwayAudit;
    hay: FoodPathwayAudit;
    dairy: FoodPathwayAudit;
    meat: FoodPathwayAudit;
  };
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
  humanShortageObj: number; // probability 0-1
  severeShortageObj: number; // probability 0-1
  animalDeathObj: number;
  fuelShortageObj: number;
  clothingShortageObj: number; // probability 0-1
  avgWheatRemaining: number;
  avgOatsRemaining: number;
  avgWoolPerYear: number;
  logs: string[];
  history: MonthHistory[];
  diet: HumanDiet; // kcal per household per simulation-year average
  conversionAudit: ConversionAudit;
}

interface Cattle {
    type: 'bull' | 'cow' | 'ox';
    ageMonths: number;
}

const DAYS_PER_YEAR = 365;
const MONTHS_PER_YEAR = 12;
const WINTER_DAIRY_OUTPUT_FACTOR = 0.35;

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

// Fraction of annual yield variance explained by the shared climate shock.
// Cross-crop correlation = product of two crops' sensitivities
// (wheat–barley ≈ 0.56, wheat–oats ≈ 0.48, barley–oats ≈ 0.42).
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

function buildConversionAudit(params: SimParams): ConversionAudit {
  const fuelMassPerM3 = params.fuelEnergy.woodDensityKgPerM3;
  const fuelGrossPerM3 = fuelMassPerM3 * params.fuelEnergy.grossKjPerKg;
  const fuelUsablePerM3 = fuelGrossPerM3 * params.fuelEnergy.netUsableHeatFraction;
  const annualFuelGatheredM3 = params.woodlandAcres * params.fuelYieldPerAcre * params.growingMonths / 12;
  const annualFuelWinterDemandM3 = params.households * params.fuelNeedsWinter * params.winterMonths;

  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const wheatBu = activeAcres * (params.landSplit.wheat / 100) * params.yields.wheat;
  const barleyBu = activeAcres * (params.landSplit.barley / 100) * params.yields.barley;
  const oatsBu = activeAcres * (params.landSplit.oats / 100) * params.yields.oats;
  const hayTons = activeAcres * (params.landSplit.hay / 100) * params.yields.hay;

  const wheatKg = wheatBu * params.foodEnergyModel.densitiesKgPerBu.wheat;
  const barleyKg = barleyBu * params.foodEnergyModel.densitiesKgPerBu.barley;
  const oatsKg = oatsBu * params.foodEnergyModel.densitiesKgPerBu.oats;
  const hayKg = hayTons * 907.18474;

  const barleyGross = barleyKg * params.foodEnergyModel.energyKjPerKg.barley;
  const barleyProcessed = barleyGross * (1 - params.foodEnergyModel.barleyProcessingLossPct / 100);
  const barleyWaste = (barleyGross - barleyProcessed) * params.foodEnergyModel.barleyProcessingWasteFeedShare;

  return {
    fuel: {
      annualGathered: {
        volumeM3: annualFuelGatheredM3,
        massKg: annualFuelGatheredM3 * fuelMassPerM3,
        grossEnergyKj: annualFuelGatheredM3 * fuelGrossPerM3,
        usableHeatKj: annualFuelGatheredM3 * fuelUsablePerM3,
      },
      annualWinterDemand: {
        volumeM3: annualFuelWinterDemandM3,
        massKg: annualFuelWinterDemandM3 * fuelMassPerM3,
        grossEnergyKj: annualFuelWinterDemandM3 * fuelGrossPerM3,
        usableHeatKj: annualFuelWinterDemandM3 * fuelUsablePerM3,
      },
    },
    foods: {
      wheat: { volumeM3: null, weightKg: wheatKg, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: wheatKg * params.foodEnergyModel.energyKjPerKg.wheat } },
      barley: { volumeM3: null, weightKg: barleyKg, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: barleyProcessed, processingWasteAnimalKj: barleyWaste, humanDirectKj: barleyGross * 0.25 } },
      oats: { volumeM3: null, weightKg: oatsKg, energy: { ruminantOnlyKj: 0, animalDirectKj: oatsKg * params.foodEnergyModel.metabolizableKjPerKg.oatsForMonogastrics, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: oatsKg * params.foodEnergyModel.energyKjPerKg.oats } },
      hay: { volumeM3: null, weightKg: hayKg, energy: { ruminantOnlyKj: hayKg * params.foodEnergyModel.metabolizableKjPerKg.hayForRuminants, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: 0 } },
      dairy: { volumeM3: null, weightKg: 0, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: params.households * params.animalsPerHH.cows * params.production.cowDairyKcal * 12 * 4.184 } },
      meat: { volumeM3: null, weightKg: 0, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: (params.households * params.animalsPerHH.sheep * params.production.sheepMeatKcal) * 4.184 } },
    },
  };
}

function buildConversionAudit(params: SimParams): ConversionAudit {
  const fuelMassPerM3 = params.fuelEnergy.woodDensityKgPerM3;
  const fuelGrossPerM3 = fuelMassPerM3 * params.fuelEnergy.grossKjPerKg;
  const fuelUsablePerM3 = fuelGrossPerM3 * params.fuelEnergy.netUsableHeatFraction;
  const annualFuelGatheredM3 = params.woodlandAcres * params.fuelYieldPerAcre * params.growingMonths / 12;
  const annualFuelWinterDemandM3 = params.households * params.fuelNeedsWinter * params.winterMonths;

  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const wheatBu = activeAcres * (params.landSplit.wheat / 100) * params.yields.wheat;
  const barleyBu = activeAcres * (params.landSplit.barley / 100) * params.yields.barley;
  const oatsBu = activeAcres * (params.landSplit.oats / 100) * params.yields.oats;
  const hayTons = activeAcres * (params.landSplit.hay / 100) * params.yields.hay;

  const wheatKg = wheatBu * params.foodEnergyModel.densitiesKgPerBu.wheat;
  const barleyKg = barleyBu * params.foodEnergyModel.densitiesKgPerBu.barley;
  const oatsKg = oatsBu * params.foodEnergyModel.densitiesKgPerBu.oats;
  const hayKg = hayTons * 907.18474;

  const barleyGross = barleyKg * params.foodEnergyModel.energyKjPerKg.barley;
  const barleyProcessed = barleyGross * (1 - params.foodEnergyModel.barleyProcessingLossPct / 100);
  const barleyWaste = (barleyGross - barleyProcessed) * params.foodEnergyModel.barleyProcessingWasteFeedShare;

  return {
    fuel: {
      annualGathered: {
        volumeM3: annualFuelGatheredM3,
        massKg: annualFuelGatheredM3 * fuelMassPerM3,
        grossEnergyKj: annualFuelGatheredM3 * fuelGrossPerM3,
        usableHeatKj: annualFuelGatheredM3 * fuelUsablePerM3,
      },
      annualWinterDemand: {
        volumeM3: annualFuelWinterDemandM3,
        massKg: annualFuelWinterDemandM3 * fuelMassPerM3,
        grossEnergyKj: annualFuelWinterDemandM3 * fuelGrossPerM3,
        usableHeatKj: annualFuelWinterDemandM3 * fuelUsablePerM3,
      },
    },
    foods: {
      wheat: { volumeM3: null, weightKg: wheatKg, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: wheatKg * params.foodEnergyModel.energyKjPerKg.wheat } },
      barley: { volumeM3: null, weightKg: barleyKg, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: barleyProcessed, processingWasteAnimalKj: barleyWaste, humanDirectKj: barleyGross * 0.25 } },
      oats: { volumeM3: null, weightKg: oatsKg, energy: { ruminantOnlyKj: 0, animalDirectKj: oatsKg * params.foodEnergyModel.metabolizableKjPerKg.oatsForMonogastrics, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: oatsKg * params.foodEnergyModel.energyKjPerKg.oats } },
      hay: { volumeM3: null, weightKg: hayKg, energy: { ruminantOnlyKj: hayKg * params.foodEnergyModel.metabolizableKjPerKg.hayForRuminants, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: 0 } },
      dairy: { volumeM3: null, weightKg: 0, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: params.households * params.animalsPerHH.cows * params.production.cowDairyKcal * 12 * 4.184 } },
      meat: { volumeM3: null, weightKg: 0, energy: { ruminantOnlyKj: 0, animalDirectKj: 0, humanProcessedKj: 0, processingWasteAnimalKj: 0, humanDirectKj: (params.households * params.animalsPerHH.sheep * params.production.sheepMeatKcal) * 4.184 } },
    },
  };
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
  const initialSheep = params.households * params.animalsPerHH.sheep;

  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const YEARS_PER_ITERATION = 5;
  const CROP_MATURATION_MONTHS = 8;
  const firstHarvestMonth = Math.max(1, Math.min(params.growingMonths, CROP_MATURATION_MONTHS));
  
  const titheFactor = (100 - params.titheAndManufacturePct) / 100;
  const wAcresConst = activeAcres * (params.landSplit.wheat / 100);
  const bAcresConst = activeAcres * (params.landSplit.barley / 100);
  const oAcresConst = activeAcres * (params.landSplit.oats / 100);
  const hAcresConst = activeAcres * (params.landSplit.hay / 100);
  const cattleOatsPerMonth = totalOxen * params.feedNeedsWinter.oxenOats + totalCows * params.feedNeedsWinter.cowOats;
  const cattleHayPerMonth = totalOxen * params.feedNeedsWinter.oxenHay + totalCows * params.feedNeedsWinter.cowHay;
  // Seed reserves needed each spring
  const seedWheat = wAcresConst * params.cropStats.wheat.seedRate;
  const seedBarley = bAcresConst * params.cropStats.barley.seedRate;
  const seedOats = oAcresConst * params.cropStats.oats.seedRate;
  // Initial stocks: enough to bridge from the start of the growing season to the first harvest,
  // plus seed corn. Animals graze freely during the growing season so no hay or oat reserves
  // are needed until winter arrives after that first harvest.
  const initWheatStocks  = monthlyKcalReq * firstHarvestMonth / params.cropStats.wheat.kcalPerBu + seedWheat;
  const initBarleyStocks = monthlyKcalReq * firstHarvestMonth * 0.20 / params.cropStats.barley.kcalPerBu + seedBarley;
  const initOatStocks    = seedOats + totalOxen * (params.feedNeedsWinter.oxenOats / 2); // seed + spring plowing draw
  const initHayStocks    = 0;
  // Fuel: gathered continuously during the growing season, so no bridge stock needed.
  // Wool: carry-over from the previous year's shearing (half annual village need).
  const householdPeople = params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child;
  const totalPeople = params.households * householdPeople;
  // Women spin raw wool into cloth: each woman meets 1.5× her household's annual clothing need
  const monthlyWoolToCloth = params.households * params.peoplePerHH.female *
    (householdPeople * params.clothingNeedWoolLbs * 1.5 / 12);
  // Consumption is weighted: double in winter, so annual total still = totalPeople * clothingNeedWoolLbs
  const clothingBaseRate = totalPeople * params.clothingNeedWoolLbs /
    (params.growingMonths + 2 * params.winterMonths);
  const initWoolStocks = totalPeople * params.clothingNeedWoolLbs * 0.5;
  const initClothStocks = totalPeople * params.clothingNeedWoolLbs * 0.5;
  // Woodland fuel: deterministic end-of-season harvest scaled for season length; no summer consumption
  const woodlandFuelYield = params.woodlandAcres * params.fuelYieldPerAcre * params.growingMonths / 12;

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
    herd.push({ type: 'bull', ageMonths: 48 });
    herd.push({ type: 'bull', ageMonths: 72 });
    for(let j=0; j<totalCows; j++) herd.push({ type: 'cow', ageMonths: 36 + Math.floor(Math.random() * 70) });
    for(let j=0; j<totalOxen; j++) herd.push({ type: 'ox', ageMonths: 36 + Math.floor(Math.random() * 70) });
    
    const neededCowsPerYear = Math.ceil(totalCows / 6);
    const neededOxenPerYear = Math.ceil(totalOxen / 6);
    for(let ageYears = 0; ageYears < 3; ageYears++) { 
        for(let j = 0; j < neededCowsPerYear; j++) herd.push({ type: 'cow', ageMonths: ageYears * 12 + 6 });
        for(let j = 0; j < neededOxenPerYear; j++) herd.push({ type: 'ox', ageMonths: ageYears * 12 + 6 });
    }
    
    // Simulate X years continuously
    for (let year = 1; year <= YEARS_PER_ITERATION; year++) {
      let hadShortage = false;
      let hadSevere = false;
      let animalDeath = false;
      let hadFuelShortage = false;
      let hadClothingShortage = false;

      // Shared climate shock drives correlated grain yields; hay varies independently.
      const climateShock = boxMuller();
      const wYield = randomizeCorrelatedYield(params.yields.wheat, params.yieldVariability, climateShock, WHEAT_CLIMATE_SENSITIVITY);
      const bYield = randomizeCorrelatedYield(params.yields.barley, params.yieldVariability, climateShock, BARLEY_CLIMATE_SENSITIVITY);
      const oYield = randomizeCorrelatedYield(params.yields.oats, params.yieldVariability, climateShock, OATS_CLIMATE_SENSITIVITY);
      const hYield = randomizeYield(params.yields.hay, params.yieldVariability);
      const wAcres = wAcresConst;
      const bAcres = bAcresConst;
      const oAcres = oAcresConst;
      const hAcres = hAcresConst;

      // Simulate 12 months: Growing season then Winter
      for (let month = 1; month <= params.growingMonths + params.winterMonths; month++) {
        const isWinter = month > params.growingMonths;
        const absoluteMonth = (year - 1) * (params.growingMonths + params.winterMonths) + month;
        const calendarMonth = ((absoluteMonth - 1) % 12) + 1;
        const growingMonth = month <= params.growingMonths ? month : 0;
        const cycleMonth = growingMonth > 0 ? ((growingMonth - 1) % CROP_MATURATION_MONTHS) + 1 : 0;
        const isSeedPlanting = growingMonth > 0 && cycleMonth === 1;
        let winterMonthIndex = isWinter ? month - params.growingMonths : 0;

        // Flow tracking variables
        let fHWheat = 0, fHBarley = 0, fHOats = 0;
        let fAOats = 0, fAHay = 0;
        let fSeed = 0;
        let woolThisMonth = 0;
        
        // Age the herd
        herd.forEach(c => c.ageMonths++);

        // Spring reproduction: fires at calendar month 1 (January equivalent), growing season only
        if (calendarMonth === 1 && !isWinter) {
            // Sheep reproduction
            currentSheep += Math.floor(currentSheep * 0.3); // 30% survival of lambing

            // Cattle reproduction
            let newCalves: Cattle[] = [];
            herd.forEach(c => {
                if (c.type === 'cow' && c.ageMonths >= 36) {
                     if (Math.random() < 0.8) { // 80% calving rate
                         newCalves.push({ type: Math.random() < 0.5 ? 'ox' : 'cow', ageMonths: 0 }); 
                     }
                }
            });
            herd = herd.concat(newCalves);
        }

        // Woodland fuel: harvested once at end of growing season for winter.
        // Summer cooking fuel comes from other sources — free and untracked.
        if (month === params.growingMonths) {
            fuelStocks += woodlandFuelYield;
        }

        // Sheep shearing at calendar month 3 (March equivalent), growing season only
        if (calendarMonth === 3 && !isWinter) {
            woolThisMonth = (currentSheep * params.woolPerSheep) * titheFactor;
            woolStocks += woolThisMonth;
            totalWoolProduced += woolThisMonth;
        }

        // Clothing: women spin raw wool into cloth; cloth consumed at double rate in winter
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

        // Harvest logic: crops mature every 8 months. A long growing season yields multiple
        // full harvests. If the season ends mid-cycle the immature crop is harvested at a
        // proportional fraction of a full yield (e.g. 7-month season → 7/8 = 87.5%).
        if (growingMonth > 0 && (cycleMonth === CROP_MATURATION_MONTHS || growingMonth === params.growingMonths)) {
            const cycleProgress = cycleMonth === CROP_MATURATION_MONTHS ? 1 : cycleMonth / CROP_MATURATION_MONTHS;

            wheatStocks += (wAcres * wYield * cycleProgress) * titheFactor;
            barleyStocks += (bAcres * bYield * cycleProgress) * titheFactor;
            oatStocks += (oAcres * oYield * cycleProgress) * titheFactor;
            hayStocks += (hAcres * hYield * cycleProgress);
        }
        
        if (isSeedPlanting) {
            let sW = Math.min(wheatStocks, wAcres * params.cropStats.wheat.seedRate);
            let sB = Math.min(barleyStocks, bAcres * params.cropStats.barley.seedRate);
            let sO = Math.min(oatStocks, oAcres * params.cropStats.oats.seedRate);
            wheatStocks -= sW;
            barleyStocks -= sB;
            oatStocks -= sO;
            fSeed = sW + sB + sO;
        }

        let safeWheat = wheatStocks;
        let safeBarley = barleyStocks;
        let safeOats = oatStocks;
        if (!isSeedPlanting && month < params.growingMonths) {
            safeWheat = Math.max(0, wheatStocks - (wAcres * params.cropStats.wheat.seedRate));
            safeBarley = Math.max(0, barleyStocks - (bAcres * params.cropStats.barley.seedRate));
            safeOats = Math.max(0, oatStocks - (oAcres * params.cropStats.oats.seedRate));
        }

        // End of growing season -> cull surplus sheep and cattle, add to meat stocks
        if (!isWinter && month === params.growingMonths) {
          const surplusSheep = Math.max(0, currentSheep - initialSheep);
          if (surplusSheep > 0) {
              currentSheep -= surplusSheep;
              meatStocks += surplusSheep * params.production.sheepMeatKcal;
          }

          const survivingHerd: Cattle[] = [];
          let culledOld = 0;
          for (const c of herd) {
              // Cull cattle that will have less than 6 months of work left by next spring
              // Maximum lifespan is 120 months (10 years)
              if (c.ageMonths + params.winterMonths + 6 > 120) {
                  culledOld++;
              } else {
                  survivingHerd.push(c);
              }
          }
          herd = survivingHerd;

          let calvesCow = 0, calvesOx = 0, culledCalves = 0;
          const postCullHerd: Cattle[] = [];
          for (const c of herd) {
              if (c.ageMonths <= 12) {
                  if (c.type === 'cow') {
                      if (calvesCow < neededCowsPerYear) { calvesCow++; postCullHerd.push(c); }
                      else culledCalves++;
                  } else if (c.type === 'ox') {
                      if (calvesOx < neededOxenPerYear) { calvesOx++; postCullHerd.push(c); }
                      else culledCalves++;
                  } else {
                      postCullHerd.push(c); // Keep subadult bulls
                  }
              } else {
                  postCullHerd.push(c);
              }
          }
          herd = postCullHerd;
          
          meatStocks += (culledOld * params.production.cattleMeatAdult) + (culledCalves * params.production.cattleMeatCalf);
        }

        // Fuel: communal woodland stock heats the village in winter only; summer cooking is free.
        let currentMonthlyKcalReq = monthlyKcalReq;
        if (isWinter) {
            const fuelNeeded = params.households * params.fuelNeedsWinter;
            if (fuelStocks >= fuelNeeded) {
                fuelStocks -= fuelNeeded;
            } else {
                const fuelShortagePct = fuelNeeded > 0 ? (fuelNeeded - fuelStocks) / fuelNeeded : 0;
                fuelStocks = 0;
                hadFuelShortage = true;
                currentMonthlyKcalReq += monthlyKcalReq * (0.3 * fuelShortagePct);
            }
        }

        // Humans consume dairy
        let cowDairy = 0;
        herd.forEach(c => {
            if (c.type === 'cow') {
                if (c.ageMonths >= 48) cowDairy += params.production.cowDairyKcal; // fully productive
                else if (c.ageMonths >= 36) cowDairy += (params.production.cowDairyKcal * 0.5); // half productive
            }
        });
        
        let sheepDairy = (currentSheep * 0.5) * params.production.sheepDairyKcal; // Assuming ~50% are ewes
        let dairyKcal = cowDairy + sheepDairy; 
        if (isWinter) dairyKcal = dairyKcal * WINTER_DAIRY_OUTPUT_FACTOR; // 65% drop in winter dairy production
        dietAgg.dairy += dairyKcal;
        let availableKcal = dairyKcal;
        
        // Consume Meat Stocks based on sensible diet (up to 15% of daily calories)
        if (meatStocks > 0) {
            let meatToEat = Math.min(meatStocks, currentMonthlyKcalReq * 0.15); 
            meatStocks -= meatToEat;
            availableKcal += meatToEat;
            dietAgg.meat += meatToEat;
        }

        // Determine ale/barley consumption (Ale is roughly 15-20% of the required daily intake when available)
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

        // Consume Wheat & remaining Barley to meet kcal
        if (kcalNeeded > 0 && safeWheat > 0) {
          const wheatKcal = safeWheat * params.cropStats.wheat.kcalPerBu;
          if (wheatKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.wheat.kcalPerBu);
            wheatStocks -= buUsed;
            fHWheat += buUsed;
            dietAgg.wheat += kcalNeeded;
            kcalNeeded = 0;
          } else {
            kcalNeeded -= wheatKcal;
            wheatStocks -= safeWheat;
            fHWheat += safeWheat;
            dietAgg.wheat += wheatKcal;
          }
        }
        if (kcalNeeded > 0 && safeBarley > 0) {
          const barleyKcal = safeBarley * params.cropStats.barley.kcalPerBu;
          if (barleyKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.barley.kcalPerBu);
            barleyStocks -= buUsed;
            fHBarley += buUsed;
            dietAgg.barley += kcalNeeded;
            kcalNeeded = 0;
          } else {
            kcalNeeded -= barleyKcal;
            barleyStocks -= safeBarley;
            fHBarley += safeBarley;
            dietAgg.barley += barleyKcal;
          }
        }

        // If still hungry, humans eat Oats!
        if (kcalNeeded > 0 && safeOats > 0) {
          const oatKcal = safeOats * params.cropStats.oats.kcalPerBu;
          if (oatKcal > kcalNeeded) {
            const buUsed = (kcalNeeded / params.cropStats.oats.kcalPerBu);
            oatStocks -= buUsed;
            fHOats += buUsed;
            dietAgg.oats += kcalNeeded;
            kcalNeeded = 0;
          } else {
            kcalNeeded -= oatKcal;
            oatStocks -= safeOats;
            fHOats += safeOats;
            dietAgg.oats += oatKcal;
          }
        }

        if (kcalNeeded > 0 && meatStocks > 0) {
            let extraMeatEat = Math.min(meatStocks, kcalNeeded);
            meatStocks -= extraMeatEat;
            kcalNeeded -= extraMeatEat;
            dietAgg.meat += extraMeatEat;
            availableKcal += extraMeatEat;
        }

        if (kcalNeeded > 0) {
          hadShortage = true;
          if (kcalNeeded > currentMonthlyKcalReq * 0.2) hadSevere = true;

          if (isWinter) {
            while (currentSheep > 0 && kcalNeeded > 0) {
                currentSheep--;
                let meatKcal = params.production.sheepMeatKcal;
                kcalNeeded = Math.max(0, kcalNeeded - meatKcal);
                dietAgg.meat += meatKcal;
                animalDeath = true;
            }
          }

          if (kcalNeeded > 0) dietAgg.deficit += kcalNeeded;
        }

        // Animals consume feed
        let oatsNeeded = 0;
        let hayNeeded = 0;
        let sheepHayNeeded = 0;
        let cattleHayNeeded = 0;

        if (isSeedPlanting) {
            // Active oxen need some oats for spring planting
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
                    hayNeeded += oxHay;
                    cattleHayNeeded += oxHay;
                    oatsNeeded += params.feedNeedsWinter.oxenOats * multiplier;
                } else if (c.type === 'cow') {
                    const cowHay = params.feedNeedsWinter.cowHay * multiplier;
                    hayNeeded += cowHay;
                    cattleHayNeeded += cowHay;
                    oatsNeeded += params.feedNeedsWinter.cowOats * multiplier;
                }
            });

            // Sheep
            if (winterMonthIndex > 3 && winterMonthIndex <= 6) {
                sheepHayNeeded = currentSheep * (params.feedNeedsWinter.sheepHay / 2);
            } else if (winterMonthIndex > 6) {
                sheepHayNeeded = currentSheep * params.feedNeedsWinter.sheepHay;
            }
            hayNeeded += sheepHayNeeded;
        }

        // Deduct feed, preferring hay. If hay runs out, cows/oxen switch strictly to oats
        if (hayStocks >= hayNeeded) {
          hayStocks -= hayNeeded;
          fAHay += hayNeeded;
        } else {
          fAHay += hayStocks;
          const hayShortfall = hayNeeded - hayStocks;
          hayStocks = 0;
          
          // If hay runs out, only sheep-specific hay shortfall causes sheep deaths.
          // Cattle hay shortfalls are handled via oats substitution below.
          const sheepHayShortfall = Math.min(hayShortfall, sheepHayNeeded);
          if (sheepHayShortfall > 0 && currentSheep > 0) {
              const sheepDying = Math.min(currentSheep, Math.ceil(sheepHayShortfall / params.feedNeedsWinter.sheepHay));
              currentSheep -= sheepDying;
              animalDeath = true;
          }
          
          const cattleHayShortfall = Math.min(hayShortfall, cattleHayNeeded);
          oatsNeeded += cattleHayShortfall * 10; // rough conversion: 1 ton hay = 10 bu oats replacement for cattle
        }

        if (oatStocks >= oatsNeeded) {
          oatStocks -= oatsNeeded;
          fAOats += oatsNeeded;
        } else {
          fAOats += oatStocks;
          const shortage = oatsNeeded - oatStocks;
          oatStocks = 0;
          animalDeath = true; // Feed shortage = animal deaths
          
          if (shortage > 0) {
              const cattleDying = Math.min(herd.length, Math.ceil(shortage / params.feedNeedsWinter.cowOats));
              herd.sort((a, b) => b.ageMonths - a.ageMonths); // Oldest first — least remaining productive value
              herd.splice(0, cattleDying);
          }
          // Sheep are not culled here: this branch represents oat shortage for working cattle.
        }

        // Spoilage at the end of the month
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
        meatStocks = Math.max(0, meatStocks * 0.85); // 15% spoilage of preserved meat per month
        
        // Record history for the FIRST iteration ONLY
        if (i === 0) {
          exampleHistory.push({
            month: month + ((year - 1) * (params.growingMonths + params.winterMonths)),
            year,
            wheat: Math.round(wheatStocks),
            barley: Math.round(barleyStocks),
            oats: Math.round(oatStocks),
            hay: Math.round(hayStocks),
            fuel: Math.round(fuelStocks),
            hWheat: Math.round(fHWheat),
            hBarley: Math.round(fHBarley),
            hOats: Math.round(fHOats),
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
            deficit: Math.round(kcalNeeded)
          });
        }
      }

      if (hadShortage) shortageCount++;
      if (hadSevere) severeShortageCount++;
      if (animalDeath) animalDeathCount++;
      if (hadFuelShortage) fuelShortageCount++;
      if (hadClothingShortage) clothingShortageCount++;
    }
    
    totalWheatEnd += wheatStocks;
    totalOatsEnd += oatStocks;
  }

  const dietDenominator = iterations * YEARS_PER_ITERATION * params.households;
  const annualDenominator = iterations * YEARS_PER_ITERATION;

  return {
    humanShortageObj: shortageCount / annualDenominator,
    severeShortageObj: severeShortageCount / annualDenominator,
    animalDeathObj: animalDeathCount / annualDenominator,
    fuelShortageObj: fuelShortageCount / annualDenominator,
    clothingShortageObj: clothingShortageCount / annualDenominator,
    avgWheatRemaining: totalWheatEnd / iterations,
    avgOatsRemaining: totalOatsEnd / iterations,
    avgWoolPerYear: totalWoolProduced / (iterations * YEARS_PER_ITERATION),
    logs: [], // Add debug logs if necessary
    history: exampleHistory,
    diet: {
      wheat: dietAgg.wheat / dietDenominator,
      barley: dietAgg.barley / dietDenominator,
      oats: dietAgg.oats / dietDenominator,
      dairy: dietAgg.dairy / dietDenominator,
      meat: dietAgg.meat / dietDenominator,
      deficit: dietAgg.deficit / dietDenominator
    },
    conversionAudit: buildConversionAudit(params)
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
  constraintAudit: Array<{
    key: string;
    label: string;
    unit: string;
    required: number;
    supplied: number;
    slack: number;
  }>;
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
  // Summer fuel is gathered informally (gleaning, hedge scraps, dung) at no woodland cost.
  // Only winter fuel requires the managed woodland stock.
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
  const constraintAudit = [
    { key: "calorie", label: "Calories", unit: "kcal", required: kcalNeed, supplied: cropKcal + animalKcal, slack: slacks.calorie },
    { key: "oatsFeed", label: "Oats feed", unit: "bu", required: oatsFeedNeed, supplied: oatAcres * oatsFeedPerAcre, slack: slacks.oatsFeed },
    { key: "hayFeed", label: "Hay feed", unit: "tons", required: hayFeedNeed, supplied: hayAcres * hayFeedPerAcre, slack: slacks.hayFeed },
    { key: "fuel", label: "Fuel", unit: "loads", required: fuelNeed, supplied: forestAcres * fuelPerForestAcre, slack: slacks.fuel },
    { key: "sheepClothing", label: "Wool", unit: "lb", required: params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child) * params.clothingNeedWoolLbs * riskFactor, supplied: sheep * params.woolPerSheep, slack: slacks.sheepClothing },
    { key: "totalLand", label: "Total land", unit: "ac", required: totalLandAcres, supplied: mode === "fixed-total-land" ? fixedTotal : totalLandAcres, slack: slacks.totalLand },
  ];
  return {
    mode,
    feasible,
    objectiveValue: mode === "fixed-total-land" ? slacks.totalLand : totalLandAcres,
    solution: { totalLandAcres: mode === "fixed-total-land" ? fixedTotal : totalLandAcres, farmlandAcres, activeFarmlandAcres, pastureAcres, forestAcres, wheatAcres, barleyAcres, oatAcres, hayAcres, sheep, oxen, cows, bulls },
    slacks,
    constraintAudit,
  };
}
