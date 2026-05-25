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
    wheat: 10,   // Bushels per acre (gross of seed)
    barley: 12,
    oats: 12,
    hay: 1.2,    // Tons per acre
  },
  yieldVariability: 15, // % Standard Deviation
  spoilageRate: 3, // % per month for grain
  haySpoilageRate: 5, // % per month for hay
  titheAndManufacturePct: 15, // % deducted from harvest for taxes, tithes, and non-cloth manufactures
  woolPerSheep: 1.5, // lbs of wool per sheep per year
  clothingNeedWoolLbs: 1.5, // lbs of wool needed per person per year for basic garments
  woodlandAcres: 300, // Acres of woodland/commons for gathering fuel
  fuelYieldPerAcre: 1.8, // Stacked cubic meters (stere) gathered per acre of woodland per year
  fuelNeedsSummer: 0.6, // Stacked m³ fuel per household per month (cooking)
  fuelNeedsWinter: 1.8, // Stacked m³ fuel per household per month (cooking + heating)
  fuelEnergy: {
    woodDensityKgPerM3: 340, // Air-dry stacked mixed hardwood/softwood equivalent
    kcalPerKgWood: 3585.086, // Air-dry fuelwood NCV expressed in kcal/kg (converted from 15000 kJ/kg)
    netUsableHeatFraction: 0.45, // Open hearth + simple stove seasonal efficiency
  },
  foodEnergyModel: {
    barleyProcessingLossPct: 12,
    barleyProcessingWasteFeedShare: 0.85,
    densitiesKgPerBu: { wheat: 27.2, barley: 21.8, oats: 14.5 },
    energyKcalPerKg: { wheat: 3417.782, barley: 3370.937, oats: 3728.489, hay: 3824.092 },
    metabolizableKcalPerKg: { oatsForRuminants: 2605.163, oatsForMonogastrics: 2963.671, hayForRuminants: 1768.642 },
  },
  plannerRiskBufferPct: 5, // Planner-only reserve margin applied to annual needs
  bullsPerCow: 1 / 12, // Bulls required per cow
  pastureAcresPerSheep: 0.5, // Pasture acres per sheep
  pastureAcresPerCattle: 1, // Pasture acres per ox/cow/bull
  
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
    wheat: { kcalPerBu: 90000, seedRate: 2.5 }, // 60 lbs * 1500 kcal
    barley: { kcalPerBu: 75000, seedRate: 4 }, // 50 lbs * 1500 kcal
    oats: { kcalPerBu: 38000, seedRate: 4 }, // 32 lbs * 1200 kcal
  }
};
