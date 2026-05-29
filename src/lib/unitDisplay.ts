import type { ConversionAudit } from './simulation';

export type UnitDisplayMode = 'weightMetric' | 'weightImperial' | 'extentMetric' | 'extentImperial';

export interface LedgerDisplayRow {
  key: string;
  label: string;
  value: string;
  sub?: string;
}

const KG_PER_LB = 0.45359237;
const KG_PER_SHORT_TON = 907.18474;
const LITERS_PER_US_BUSHEL = 35.23907016688;
const LITERS_PER_US_GALLON = 3.785411784;
const METERS_PER_YARD = 0.9144;
const MILK_KG_PER_GALLON = 3.9;

export function buildPhysicalLedgerRows(audit: ConversionAudit, mode: UnitDisplayMode): LedgerDisplayRow[] {
  const outputs = audit.physicalOutputs;
  const oatsReport = audit.foods.oatsReported;

  return [
    grainRow('wheat', 'Wheat', outputs.grainBushels.wheat, audit.foods.wheat.weightKg, mode),
    grainRow('barley', 'Barley', outputs.grainBushels.barley, audit.foods.barley.weightKg, mode),
    {
      ...grainRow('oats', 'Oats', outputs.grainBushels.oats, oatsReport.oatsKg, mode),
      sub: `Energy views: human-edible ${formatInteger(oatsReport.oatsHumanKcal)} kcal; ruminant-feed metabolizable ${formatInteger(oatsReport.oatsAnimalFeedKcal)} kcal. These are parallel characterizations of the same oats stock under current model assumptions, not a changed allocation engine.`,
    },
    massRow('hay', 'Hay', audit.foods.hay.weightKg, mode, { imperialNative: outputs.hayTons, imperialNativeUnit: 'tons' }),
    milkRow('cowMilk', 'Cow milk', outputs.milkGallons.cow, mode),
    milkRow('eweMilk', 'Ewe milk', outputs.milkGallons.ewe, mode),
    massRow('wool', 'Wool', outputs.woolLbs * KG_PER_LB, mode),
    clothRow(outputs.clothYards, mode),
    massRow('sheepMeat', 'Sheep meat', outputs.meatLbs.sheep * KG_PER_LB, mode),
  ];
}

function grainRow(key: string, label: string, bushels: number, kg: number, mode: UnitDisplayMode): LedgerDisplayRow {
  if (mode === 'weightMetric') return { key, label, value: formatMetricMass(kg) };
  if (mode === 'weightImperial') return { key, label, value: formatImperialMass(kg) };
  if (mode === 'extentMetric') return { key, label, value: formatMetricVolume(bushels * LITERS_PER_US_BUSHEL) };
  return { key, label, value: `${formatInteger(bushels)} bu` };
}

function massRow(
  key: string,
  label: string,
  kg: number,
  mode: UnitDisplayMode,
  native?: { imperialNative: number; imperialNativeUnit: string }
): LedgerDisplayRow {
  if (mode === 'weightMetric' || mode === 'extentMetric') return { key, label, value: formatMetricMass(kg) };
  if (native && mode === 'extentImperial') return { key, label, value: `${formatInteger(native.imperialNative)} ${native.imperialNativeUnit}` };
  return { key, label, value: formatImperialMass(kg) };
}

function milkRow(key: string, label: string, gallons: number, mode: UnitDisplayMode): LedgerDisplayRow {
  if (mode === 'weightMetric') return { key, label, value: formatMetricMass(gallons * MILK_KG_PER_GALLON) };
  if (mode === 'weightImperial') return { key, label, value: formatImperialMass(gallons * MILK_KG_PER_GALLON) };
  if (mode === 'extentMetric') return { key, label, value: `${formatInteger(gallons * LITERS_PER_US_GALLON)} L/yr` };
  return { key, label, value: `${formatInteger(gallons)} gal/yr` };
}

function clothRow(yards: number, mode: UnitDisplayMode): LedgerDisplayRow {
  if (mode === 'weightMetric') return { key: 'cloth', label: 'Cloth', value: formatMetricMass(yards * 3 * KG_PER_LB), sub: 'wool equivalent' };
  if (mode === 'weightImperial') return { key: 'cloth', label: 'Cloth', value: `${formatInteger(yards * 3)} lb wool eq.` };
  if (mode === 'extentMetric') return { key: 'cloth', label: 'Cloth', value: `${formatInteger(yards * METERS_PER_YARD)} m` };
  return { key: 'cloth', label: 'Cloth', value: `${formatInteger(yards)} yd` };
}

function formatMetricMass(kg: number): string {
  if (kg >= 1000) return `${formatDecimal(kg / 1000, 1)} t`;
  return `${formatInteger(kg)} kg`;
}

function formatImperialMass(kg: number): string {
  const lb = kg / KG_PER_LB;
  if (kg >= KG_PER_SHORT_TON) return `${formatDecimal(kg / KG_PER_SHORT_TON, 1)} tons`;
  return `${formatInteger(lb)} lb`;
}

function formatMetricVolume(liters: number): string {
  if (liters >= 1000) return `${formatDecimal(liters / 1000, 1)} m³`;
  return `${formatInteger(liters)} L`;
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatDecimal(value: number, fractionDigits: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}
