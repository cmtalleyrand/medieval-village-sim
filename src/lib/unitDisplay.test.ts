import assert from 'node:assert/strict';
import { DEFAULTS } from './defaults';
import { runSimulation, type ConversionAudit } from './simulation';
import { buildPhysicalLedgerRows } from './unitDisplay';

const result = runSimulation(DEFAULTS, 1);
const activeAcres = DEFAULTS.totalAcres * (1 - DEFAULTS.fallowPct / 100);
const oatsBu = activeAcres * (DEFAULTS.landSplit.oats / 100) * DEFAULTS.yields.oats;
const oatsKg = oatsBu * DEFAULTS.foodEnergyModel.densitiesKgPerBu.oats;

assert.equal(result.conversionAudit.foods.oatsReported.oatsKg, oatsKg);
assert.equal(result.conversionAudit.foods.oatsReported.oatsTonnes, oatsKg / 1000);
assert.equal(
  result.conversionAudit.foods.oatsReported.oatsHumanKcal,
  oatsKg * DEFAULTS.foodEnergyModel.energyKcalPerKg.oats
);
assert.equal(
  result.conversionAudit.foods.oatsReported.oatsAnimalFeedKcal,
  oatsKg * DEFAULTS.foodEnergyModel.metabolizableKcalPerKg.oatsForRuminants
);

const audit: ConversionAudit = {
  fuel: {
    annualGathered: { volumeM3: 0, massKg: 0, grossEnergyKcal: 0, usableHeatKcal: 0 },
    annualWinterDemand: { volumeM3: 0, massKg: 0, grossEnergyKcal: 0, usableHeatKcal: 0 },
  },
  foods: {
    wheat: { volumeM3: null, weightKg: 27.2, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
    barley: { volumeM3: null, weightKg: 21.8, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
    oats: { volumeM3: null, weightKg: 14.5, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
    oatsReported: { oatsKg: 14.5, oatsTonnes: 0.0145, oatsHumanKcal: 54063.0905, oatsAnimalFeedKcal: 37774.8635 },
    hay: { volumeM3: null, weightKg: 907.18474, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
    dairy: { volumeM3: null, weightKg: 7.8, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
    meat: { volumeM3: null, weightKg: 0.45359237, energy: { ruminantOnlyKcal: 0, animalDirectKcal: 0, humanProcessedKcal: 0, processingWasteAnimalKcal: 0, humanDirectKcal: 0 } },
  },
  physicalOutputs: {
    grainBushels: { wheat: 1, barley: 1, oats: 1 },
    hayTons: 1,
    woolLbs: 1,
    clothYards: 1,
    milkGallons: { cow: 1, ewe: 1 },
    meatLbs: { cattleAdult: 0, calf: 0, sheep: 1 },
  },
};

assert.equal(buildPhysicalLedgerRows(audit, 'extentImperial').find((row) => row.key === 'wheat')?.value, '1 bu');
assert.equal(buildPhysicalLedgerRows(audit, 'extentMetric').find((row) => row.key === 'wheat')?.value, '35 L');
assert.equal(buildPhysicalLedgerRows(audit, 'weightMetric').find((row) => row.key === 'oats')?.value, '15 kg');
assert.equal(buildPhysicalLedgerRows(audit, 'weightImperial').find((row) => row.key === 'sheepMeat')?.value, '1 lb');
assert.match(buildPhysicalLedgerRows(audit, 'extentImperial').find((row) => row.key === 'oats')?.sub ?? '', /not a changed allocation engine/);
