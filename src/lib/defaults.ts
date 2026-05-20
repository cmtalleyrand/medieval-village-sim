import type { SimParams } from "./simulation";

export const DEFAULTS: SimParams = {
  households: 20,
  growingMonths: 7,
  winterMonths: 5,
  totalAcres: 1200,
  fallowPct: 33.3, // 1/3 of total
  landSplit: { // sums to 100% of the active land
    wheat: 30,
    barley: 20, 
    oats: 20,
    hay: 30,
  },
  yields: {
    wheat: 8,   // Bushels per acre (historical ~8-12)
    barley: 10,
    oats: 10,
    hay: 1.2,    // Tons per acre
  },
  yieldVariability: 15, // % Standard Deviation
  spoilageRate: 3, // % per month for grain
  haySpoilageRate: 5, // % per month for hay
  titheAndManufacturePct: 15, // % deducted from harvest for taxes, tithes, and non-cloth manufactures
  woolPerSheep: 1.5, // lbs of wool per sheep per year
  woodlandAcres: 300, // Acres of woodland/commons for gathering fuel
  fuelYieldPerAcre: 1.5, // Cartloads of fuel gathered per acre of woodland per year
  fuelNeedsSummer: 0.5, // Cartloads of fuel per household per month (cooking)
  fuelNeedsWinter: 1.5, // Cartloads of fuel per household per month (cooking + heating)
  
  peoplePerHH: { male: 1, female: 1, child: 2.5 },
  kcalPerDay: { male: 2500, female: 2000, child: 1600 },
  animalsPerHH: { oxen: 2, cows: 2, sheep: 4 },
  feedNeedsWinter: { 
    oxenOats: 3, // Bushels per month
    oxenHay: 0.5, // Tons per month
    cowOats: 2, 
    cowHay: 0.5, 
    sheepHay: 0.1 
  },
  production: { 
    cowDairyKcal: 35000,   // Per producing cow per month
    sheepDairyKcal: 2500,  // Per producing sheep per month
    sheepMeatKcal: 40000,  // Per sheep
    cattleMeatAdult: 350000, // Per adult cow/ox culled
    cattleMeatCalf: 75000  // Per calf culled
  },
  cropStats: {
    wheat: { kcalPerBu: 90000, seedRate: 2 }, // 60 lbs * 1500 kcal
    barley: { kcalPerBu: 75000, seedRate: 2.5 }, // 50 lbs * 1500 kcal
    oats: { kcalPerBu: 38000, seedRate: 4 }, // 32 lbs * 1200 kcal
  }
};
