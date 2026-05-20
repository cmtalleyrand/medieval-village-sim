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
  meatStock: number;
  deficit: number;
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

export function randomizeYield(base: number, variabilityPct: number) {
  // Simple Box-Muller transform for normal distribution
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  
  const stdDev = base * (variabilityPct / 100);
  let res = base + num * stdDev;
  return Math.max(0, res); // No negative yields
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
  const totalPeople = params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child);
  const monthlyClothingWool = totalPeople * params.clothingNeedWoolLbs / 12;
  const initWoolStocks = totalPeople * params.clothingNeedWoolLbs * 0.5;

  for (let i = 0; i < iterations; i++) {
    let wheatStocks = initWheatStocks;
    let barleyStocks = initBarleyStocks;
    let oatStocks = initOatStocks;
    let hayStocks = initHayStocks;
    let currentSheep = initialSheep;
    let meatStocks = 0;
    let fuelStocks = 0;
    let woolStocks = initWoolStocks;

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

      // Annually randomize yields (fuel gathering is weather-dependent like crops)
      const wYield = randomizeYield(params.yields.wheat, params.yieldVariability);
      const bYield = randomizeYield(params.yields.barley, params.yieldVariability);
      const oYield = randomizeYield(params.yields.oats, params.yieldVariability);
      const hYield = randomizeYield(params.yields.hay, params.yieldVariability);
      const annualFuelYield = randomizeYield(params.woodlandAcres * params.fuelYieldPerAcre, params.yieldVariability);
      const monthlyFuelGathering = annualFuelYield / params.growingMonths;

      const wAcres = wAcresConst;
      const bAcres = bAcresConst;
      const oAcres = oAcresConst;
      const hAcres = hAcresConst;

      // Simulate 12 months: Growing season then Winter
      for (let month = 1; month <= params.growingMonths + params.winterMonths; month++) {
        const isWinter = month > params.growingMonths;
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

        // Spring reproduction (Month 1 is beginning of spring)
        if (month === 1) {
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

        // Fuel gathered continuously throughout the growing season
        if (!isWinter) {
            fuelStocks += monthlyFuelGathering;
        }

        // Sheep shearing (Early summer, Month 3): add to wool stock
        if (month === 3) {
            woolThisMonth = (currentSheep * params.woolPerSheep) * titheFactor;
            woolStocks += woolThisMonth;
            totalWoolProduced += woolThisMonth;
        }

        // Clothing: consume wool from stock every month; shortage if stock runs dry
        {
            const consumed = Math.min(woolStocks, monthlyClothingWool);
            woolStocks -= consumed;
            if (consumed < monthlyClothingWool) hadClothingShortage = true;
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

        // Fuel consumption & baseline setup
        let currentMonthlyKcalReq = monthlyKcalReq;
        let fuelNeeded = params.households * (isWinter ? params.fuelNeedsWinter : params.fuelNeedsSummer);
        let actualFuelConsumed = 0;
        let fuelShortagePct = 0;

        if (fuelStocks >= fuelNeeded) {
            fuelStocks -= fuelNeeded;
            actualFuelConsumed = fuelNeeded;
        } else {
            actualFuelConsumed = fuelStocks;
            fuelShortagePct = (fuelNeeded - fuelStocks) / fuelNeeded;
            fuelStocks = 0;
            hadFuelShortage = true;
            
            // Penalty to caloric needs!
            if (isWinter) {
                currentMonthlyKcalReq += monthlyKcalReq * (0.3 * fuelShortagePct); // Up to +30% calories required in winter if freezing
            } else {
                currentMonthlyKcalReq += monthlyKcalReq * (0.1 * fuelShortagePct); // Cooking/hygiene penalty in summer
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
          
          while (currentSheep > 0 && kcalNeeded > 0) {
              currentSheep--;
              let meatKcal = params.production.sheepMeatKcal;
              kcalNeeded = Math.max(0, kcalNeeded - meatKcal);
              dietAgg.meat += meatKcal;
              animalDeath = true;
          }
          if (kcalNeeded > 0) dietAgg.deficit += kcalNeeded;
        }

        // Animals consume feed
        let oatsNeeded = 0;
        let hayNeeded = 0;

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
                    hayNeeded += params.feedNeedsWinter.oxenHay * multiplier;
                    oatsNeeded += params.feedNeedsWinter.oxenOats * multiplier;
                } else if (c.type === 'cow') {
                    hayNeeded += params.feedNeedsWinter.cowHay * multiplier;
                    oatsNeeded += params.feedNeedsWinter.cowOats * multiplier;
                }
            });

            // Sheep
            if (winterMonthIndex > 3 && winterMonthIndex <= 6) {
                hayNeeded += currentSheep * (params.feedNeedsWinter.sheepHay / 2);
            } else if (winterMonthIndex > 6) {
                hayNeeded += currentSheep * params.feedNeedsWinter.sheepHay;
            }
        }

        // Deduct feed, preferring hay. If hay runs out, cows/oxen switch strictly to oats
        if (hayStocks >= hayNeeded) {
          hayStocks -= hayNeeded;
          fAHay += hayNeeded;
        } else {
          fAHay += hayStocks;
          const hayShortfall = hayNeeded - hayStocks;
          hayStocks = 0;
          
          // If hay runs out, sheep begin to die of starvation immediately because they can't digest raw oats efficiently
          if (hayShortfall > 0 && currentSheep > 0) {
              const sheepDying = Math.min(currentSheep, Math.ceil(hayShortfall / params.feedNeedsWinter.sheepHay));
              currentSheep -= sheepDying;
              animalDeath = true;
          }
          
          oatsNeeded += hayShortfall * 10; // rough conversion: 1 ton hay = 10 bu oats replacement for cattle
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
              for(let k=0; k<cattleDying; k++) {
                  if (herd.length > 0) herd.pop(); // Randomly kill a cattle
              }
          }
          currentSheep = Math.max(0, currentSheep - 2); // Cull remaining sheep to 'buy' feed for plow teams
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
  const activeAcres = params.totalAcres * (1 - params.fallowPct / 100);
  const yearlyKcalReq = getAnnualKcalRequirement(params);

  const titheFactor = (100 - params.titheAndManufacturePct) / 100

  const totalOxen = params.households * params.animalsPerHH.oxen;
  const totalCows = params.households * params.animalsPerHH.cows;
  const initialSheep = params.households * params.animalsPerHH.sheep;

  // Animals Feed needed for winter, accounting for sub-adults and bulls
  const cattleMultiplier = 1.3; // Account for calves and subadults
  const oxenFeedUnits = (totalOxen * cattleMultiplier) + 2; // +2 for bulls
  const cowFeedUnits = totalCows * cattleMultiplier;
  
  const oatsNeeded = (oxenFeedUnits * params.feedNeedsWinter.oxenOats + cowFeedUnits * params.feedNeedsWinter.cowOats) * params.winterMonths;
  let sheepHayFactor = 0; // Months sheep need hay/half-hay
  for(let i=1; i<=params.winterMonths; i++) {
    if (i > 3 && i <= 6) sheepHayFactor += 0.5;
    else if (i > 6) sheepHayFactor += 1;
  }
  const hayNeeded = (oxenFeedUnits * params.feedNeedsWinter.oxenHay + cowFeedUnits * params.feedNeedsWinter.cowHay) * params.winterMonths + (initialSheep * params.feedNeedsWinter.sheepHay * sheepHayFactor);

  // Human Kcal provided by animals natively
  const dairyMonthsEquivalent = getDairyMonthsEquivalent(params.winterMonths);
  const animalKcalPerYear = (totalCows * params.production.cowDairyKcal + (initialSheep * 0.5) * params.production.sheepDairyKcal) * dairyMonthsEquivalent + (initialSheep * 0.1 * params.production.sheepMeatKcal);

  // Kcal needed from crops
  const cropKcalNeeded = Math.max(0, yearlyKcalReq - animalKcalPerYear);

  // Apply safety buffer (e.g. 1.25x for variability and spoilage)
  const targetOats = oatsNeeded * 1.35;
  const targetHay = hayNeeded * 1.35;
  const targetCropKcal = cropKcalNeeded * 1.45;

  const netOatsYield = Math.max(0.1, params.yields.oats * titheFactor - params.cropStats.oats.seedRate);
  const netHayYield = Math.max(0.1, params.yields.hay);
  const netWheatYieldBu = Math.max(0.1, params.yields.wheat * titheFactor - params.cropStats.wheat.seedRate);
  const netBarleyYieldBu = Math.max(0.1, params.yields.barley * titheFactor - params.cropStats.barley.seedRate);
  
  const oatAcres = targetOats / netOatsYield;
  const hayAcres = targetHay / netHayYield;
  
  let remainderAcres = activeAcres - oatAcres - hayAcres;
  
  let wheatAcres = 0;
  let barleyAcres = 0;
  
  if (remainderAcres <= 0) {
     const scale = activeAcres / (oatAcres + hayAcres);
     return {
        wheat: 0,
        barley: 0,
        oats: (oatAcres * scale / activeAcres) * 100,
        hay: (hayAcres * scale / activeAcres) * 100
     };
  }
  
  const wheatKcalPerAcre = netWheatYieldBu * params.cropStats.wheat.kcalPerBu;
  const barleyKcalPerAcre = netBarleyYieldBu * params.cropStats.barley.kcalPerBu;

  // Let's split remaining acres to meet crop Kcal, bias towards wheat if possible
  const totalWheatNeeded = targetCropKcal / wheatKcalPerAcre;
  
  if (totalWheatNeeded > remainderAcres) {
    wheatAcres = remainderAcres * 0.85; // Mostly wheat if starving
    barleyAcres = remainderAcres * 0.15;
  } else {
    wheatAcres = totalWheatNeeded; // Meet wheat Kcal target
    barleyAcres = remainderAcres - wheatAcres; // Rest in barley for ale
  }
  
  const sum = wheatAcres + barleyAcres + oatAcres + hayAcres;
  return {
    wheat: (wheatAcres / sum) * 100,
    barley: (barleyAcres / sum) * 100,
    oats: (oatAcres / sum) * 100,
    hay: (hayAcres / sum) * 100
  };
}

export function solveMinimumAcres(params: SimParams): number {
  const yearlyKcalReq = getAnnualKcalRequirement(params);

  const titheFactor = (100 - params.titheAndManufacturePct) / 100

  const totalOxen = params.households * params.animalsPerHH.oxen;
  const totalCows = params.households * params.animalsPerHH.cows;
  const initialSheep = params.households * params.animalsPerHH.sheep;

  const cattleMultiplier = 1.3;
  const oxenFeedUnits = (totalOxen * cattleMultiplier) + 2;
  const cowFeedUnits = totalCows * cattleMultiplier;

  const oatsNeeded = (oxenFeedUnits * params.feedNeedsWinter.oxenOats + cowFeedUnits * params.feedNeedsWinter.cowOats) * params.winterMonths;
  let sheepHayFactor = 0;
  for(let i=1; i<=params.winterMonths; i++) {
    if (i > 3 && i <= 6) sheepHayFactor += 0.5;
    else if (i > 6) sheepHayFactor += 1;
  }
  const hayNeeded = (oxenFeedUnits * params.feedNeedsWinter.oxenHay + cowFeedUnits * params.feedNeedsWinter.cowHay) * params.winterMonths + (initialSheep * params.feedNeedsWinter.sheepHay * sheepHayFactor);

  const dairyMonthsEquivalent = getDairyMonthsEquivalent(params.winterMonths);
  const animalKcalPerYear = (totalCows * params.production.cowDairyKcal + (initialSheep * 0.5) * params.production.sheepDairyKcal) * dairyMonthsEquivalent + (initialSheep * 0.1 * params.production.sheepMeatKcal);
  const cropKcalNeeded = Math.max(0, yearlyKcalReq - animalKcalPerYear);

  const targetOats = oatsNeeded * 1.35;
  const targetHay = hayNeeded * 1.35;
  const targetCropKcal = cropKcalNeeded * 1.45;

  const netOatsYield = Math.max(0.1, params.yields.oats * titheFactor - params.cropStats.oats.seedRate);
  const netHayYield = Math.max(0.1, params.yields.hay);
  const netWheatYieldBu = Math.max(0.1, params.yields.wheat * titheFactor - params.cropStats.wheat.seedRate);
  
  const oatAcres = targetOats / netOatsYield;
  const hayAcres = targetHay / netHayYield;
  
  const wheatKcalPerAcre = netWheatYieldBu * params.cropStats.wheat.kcalPerBu;
  const totalWheatNeeded = targetCropKcal / wheatKcalPerAcre;
  
  // Total active acres (with a small 15% bump on food acres for barley/ale)
  const activeAcres = oatAcres + hayAcres + totalWheatNeeded * 1.15;
  
  // Required total acres accounts for fallow land
  const requiredTotalAcres = activeAcres / (1 - params.fallowPct / 100);
  
  return Math.ceil(requiredTotalAcres / 10) * 10;
}
