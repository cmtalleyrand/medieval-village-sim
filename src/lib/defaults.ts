import type { SimParams } from "./simulation";

export const DEFAULTS: SimParams = {
  households: 20,
  growingMonths: 9,   // Standard English growing season: March–November
  winterMonths: 3,    // Standard English winter: December–February
  sunEraMonths: 12,   // One sun-era = one calendar year (12-month cycle)
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
  cartloadToKgHay: 250,
  grassKcalPerKg: 600,
  titheAndManufacturePct: 15, // % deducted from harvest for taxes, tithes, and non-cloth manufactures
  woolPerSheep: 1.5, // lbs of wool per sheep per year
  clothingNeedWoolLbs: 1.5, // lbs of wool needed per person per year for basic garments
  woodlandAcres: 300, // Acres of woodland/commons for gathering fuel
  // Meadowland: low-lying, permanently wet ground near water. Never plowed. Fertility
  // maintained by seasonal flooding. Hay cut at Midsummer; aftermath grazed in autumn.
  // Historically the binding constraint on winter livestock numbers. Separate from
  // arable hay (which is grown in rotation on ordinary farmland).
  meadowAcres: 60,              // Typically 5–10% of total village land
  meadowHayYieldPerAcre: 1.5,   // Tons per acre — slightly above arable hay (1.2) due to natural flooding
  fuelYieldPerAcre: 1.5, // Cartloads of fuel gathered per acre of woodland per year
  fuelNeedsSummer: 0.5,      // Cartloads of fuel per household per month (cooking)
  fuelNeedsWinter: 1.5,      // Cartloads per household per month (shoulder winter)
  fuelNeedsDeepWinter: 2.0,  // Cartloads per household per month (deep winter, full heating)
  deepWinterFeedMultiplier: 1.25, // Animal feed increase in deep winter (cold stress)
  plannerRiskBufferPct: 5, // Planner-only reserve margin applied to annual needs
  bullsPerCow: 1 / 12, // Bulls required per cow
  pastureAcresPerSheep: 0.5, // Pasture acres per sheep
  pastureAcresPerCattle: 1, // Pasture acres per ox/cow/bull
  initialFertility: 0.85,
  fertilityFloor: 0.40,
  
  peoplePerHH: { male: 1, female: 1, child: 2.5 },
  kcalPerDay: { male: 2500, female: 2000, child: 1600 },
  animalsPerHH: { oxen: 2, cows: 2, sheep: 4 },
  feedNeedsWinter: { 
    oxenOats: 3, // Bushels per month
    oxenHay: 2, // Cartloads of hay per month
    cowOats: 2, 
    cowHay: 2,
    sheepHay: 0.4
  },
  production: {
    cowDairyLitresPerMonth: 60,    // Litres of milk per lactating cow per month at peak (post-weaning)
    sheepDairyLitresPerMonth: 4,   // Litres per lactating ewe per month at peak
    milkKcalPerLitre: 600,         // kcal per litre (cow and sheep milk similar energy density)
    sheepMeatKcal: 40000,          // kcal per sheep culled
    cattleMeatAdult: 350000,       // kcal per adult cow/ox culled
    cattleMeatCalf: 75000,         // kcal per calf culled
  },
  cropStats: {
    wheat: { kcalPerBu: 90000, seedRate: 2.5 }, // 60 lbs * 1500 kcal
    barley: { kcalPerBu: 75000, seedRate: 4 }, // 50 lbs * 1500 kcal
    oats: { kcalPerBu: 38000, seedRate: 4 }, // 32 lbs * 1200 kcal
  }
};
