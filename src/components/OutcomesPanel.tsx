import React, { useMemo } from 'react';
import { Skull, Flame, Beef, Scissors, Wheat, AlertTriangle, ShieldCheck, ShieldAlert, Scroll, Snowflake } from 'lucide-react';
import { Card, CardHeader, RiskMeter, StatLabel, StatValue, Tooltip, Fleuron } from './ui';
import { SimParams, SimResult } from '../lib/simulation';

interface Props {
  results: SimResult;
  params: SimParams;
  isSimulating: boolean;
}

export function OutcomesPanel({ results, params, isSimulating }: Props) {
  const peopleTotal = params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child);
  const dailyKcal = params.households * (params.kcalPerDay.male * params.peoplePerHH.male + params.kcalPerDay.female * params.peoplePerHH.female + params.kcalPerDay.child * params.peoplePerHH.child);
  const yearlyKcal = dailyKcal * 365;

  const diet = useMemo(() => {
    const t = (results.diet.wheat + results.diet.barley + results.diet.oats + results.diet.dairy + results.diet.meat + results.diet.deficit) || 1;
    return {
      wheat: (results.diet.wheat / t) * 100,
      barley: (results.diet.barley / t) * 100,
      oats: (results.diet.oats / t) * 100,
      dairy: (results.diet.dairy / t) * 100,
      meat: (results.diet.meat / t) * 100,
      deficit: (results.diet.deficit / t) * 100,
    };
  }, [results.diet]);

  // Verdict synthesis
  const verdict = useMemo(() => synthesizeVerdict(results, diet, params), [results, diet, params]);

  return (
    <div className="space-y-4">
      {/* HERO VERDICT */}
      <div className="vellum p-5 rounded-sm relative overflow-hidden">
        <div className="absolute top-3 right-3 opacity-30">
          <Scroll className="w-10 h-10 text-[#b8860b]" />
        </div>
        <div className="text-[0.7rem] font-[var(--font-display)] uppercase tracking-[0.22em] text-[#b8860b] mb-2">
          The Steward's Verdict
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-3xl font-[var(--font-display)] font-bold" style={{ color: verdict.color }}>
            {verdict.headline}
          </span>
        </div>
        <p className="text-[0.92rem] text-[#e8d8b0] leading-relaxed italic font-[var(--font-serif)] max-w-2xl">
          {verdict.body}
        </p>
        {verdict.suggestions.length > 0 && (
          <ul className="mt-3 space-y-1 text-[0.78rem] text-[#c2a778]">
            {verdict.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[#b8860b]">❧</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {isSimulating && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 shimmer" />
        )}
      </div>

      {/* RISK GAUGES */}
      <Card>
        <CardHeader
          title="Tides of Fortune"
          subtitle={`Across 100 imagined fates, weighed across ${5} winters`}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <RiskMeter
            label="Famine"
            value={results.humanShortageObj * 100}
            tooltip="Share of simulated years in which villagers fell into caloric deficit."
          />
          <RiskMeter
            label="Severe Famine"
            value={results.severeShortageObj * 100}
            tooltip="Share of years with deficits exceeding 20% of monthly needs."
          />
          <RiskMeter
            label="Beast Loss"
            value={results.animalDeathObj * 100}
            tooltip="Share of years in which livestock starved or were emergency-culled."
          />
          <RiskMeter
            label="Cold Hearth"
            value={results.fuelShortageObj * 100}
            tooltip="Share of years with fuel shortage — driving heating-calorie penalties."
          />
        </div>
      </Card>

      {/* DIET — annual caloric attribution */}
      <Card>
        <CardHeader
          title="Annual Bread Basket"
          subtitle="Where each calorie of the village diet comes from"
          icon={<Wheat className="w-5 h-5" />}
          right={
            <Tooltip text={`Total demand: ~${(yearlyKcal / 1e6).toFixed(1)}M kcal/year for ${Math.round(peopleTotal)} souls`}>
              <span className="text-[0.68rem] text-[var(--color-ink-300)] cursor-help">
                ~{(yearlyKcal / 1e6).toFixed(1)}M kcal/yr
              </span>
            </Tooltip>
          }
        />

        <div className="space-y-2">
          <div className="w-full flex h-7 rounded-sm overflow-hidden border border-[var(--color-ink-200)] shadow-inner">
            <DietSegment color="#d9a93f" pct={diet.wheat} label="Wheat" />
            <DietSegment color="#c46a1a" pct={diet.barley} label="Ale" />
            <DietSegment color="#8fa848" pct={diet.oats} label="Oats" />
            <DietSegment color="#7da8c1" pct={diet.dairy} label="Dairy" />
            <DietSegment color="#9b1c1c" pct={diet.meat} label="Meat" />
            <DietSegment color="#2a1d10" pct={diet.deficit} label="Deficit" />
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 pt-2 text-[0.75rem]">
            <Legend dot="#d9a93f" label="Wheat bread" pct={diet.wheat} />
            <Legend dot="#c46a1a" label="Barley ale" pct={diet.barley} />
            <Legend dot="#8fa848" label="Oat gruel" pct={diet.oats} />
            <Legend dot="#7da8c1" label="Milk & cheese" pct={diet.dairy} />
            <Legend dot="#9b1c1c" label="Salt meat" pct={diet.meat} />
            <Legend dot="#2a1d10" label="Hunger" pct={diet.deficit} danger />
          </div>
        </div>

        <Fleuron>Spring Carry-over</Fleuron>

        <div className="grid grid-cols-3 gap-2">
          <CarryStat
            icon={<Wheat className="w-3.5 h-3.5" />}
            label="Wheat"
            value={Math.round(results.avgWheatRemaining)}
            unit="bu"
            color="#a17915"
          />
          <CarryStat
            icon={<Wheat className="w-3.5 h-3.5" />}
            label="Oats"
            value={Math.round(results.avgOatsRemaining)}
            unit="bu"
            color="#5a7026"
          />
          <CarryStat
            icon={<Scissors className="w-3.5 h-3.5" />}
            label="Wool"
            value={Math.round(results.avgWoolPerYear)}
            unit="lbs/yr"
            color="#5e4222"
            sub={`~${Math.floor(results.avgWoolPerYear / 3)} yds cloth`}
          />
        </div>
      </Card>
    </div>
  );
}

function DietSegment({ color, pct, label }: { color: string; pct: number; label: string }) {
  if (pct < 0.5) return null;
  return (
    <div
      className="h-full flex items-center justify-center text-[0.6rem] font-[var(--font-display)] tracking-wider text-white relative group cursor-help"
      style={{ width: `${pct}%`, background: color, minWidth: pct > 8 ? 'auto' : 0 }}
      title={`${label}: ${pct.toFixed(1)}%`}
    >
      {pct > 8 && <span className="opacity-80 mix-blend-screen">{pct.toFixed(0)}%</span>}
    </div>
  );
}

function Legend({ dot, label, pct, danger = false }: { dot: string; label: string; pct: number; danger?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-sm border border-[var(--color-ink-300)]" style={{ background: dot }} />
      <span className="text-[var(--color-ink-400)]">{label}</span>
      <span className={`ml-auto tabular-nums font-bold ${danger && pct > 1 ? 'text-[var(--color-crimson-500)]' : 'text-[var(--color-ink-500)]'}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function CarryStat({ icon, label, value, unit, color, sub }: { icon: React.ReactNode; label: string; value: number; unit: string; color: string; sub?: string }) {
  return (
    <div className="rounded-sm p-3 bg-[rgba(255,250,230,0.6)] border border-[rgba(120,80,30,0.30)]">
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {icon}
        <StatLabel>{label}</StatLabel>
      </div>
      <div className="font-[var(--font-display)] tabular-nums font-bold text-[var(--color-ink-500)] text-xl leading-none">
        {value.toLocaleString()}
        <span className="text-[0.55em] ml-1 font-normal text-[var(--color-ink-300)] uppercase tracking-wider">{unit}</span>
      </div>
      {sub && <div className="text-[0.62rem] text-[var(--color-ink-300)] italic mt-1">{sub}</div>}
    </div>
  );
}

function synthesizeVerdict(
  results: SimResult,
  diet: { wheat: number; barley: number; oats: number; dairy: number; meat: number; deficit: number },
  params: SimParams
): { headline: string; color: string; body: string; suggestions: string[] } {
  const famine = results.humanShortageObj * 100;
  const severe = results.severeShortageObj * 100;
  const beast = results.animalDeathObj * 100;
  const fuel = results.fuelShortageObj * 100;

  const totalSplit = params.landSplit.wheat + params.landSplit.barley + params.landSplit.oats + params.landSplit.hay;

  const suggestions: string[] = [];
  if (totalSplit > 101) suggestions.push('Your allotment exceeds 100% — fields cannot overlap.');
  if (totalSplit < 99) suggestions.push('Idle land remains — assign every acre to crop, hay, or fallow.');
  if (diet.oats > 8) suggestions.push('Villagers are eating oats — plant more wheat or barley.');
  if (diet.deficit > 1) suggestions.push('Hunger has reached the table — increase total acres or shift toward wheat.');
  if (beast > 10) suggestions.push('Livestock perish — sow more hay or fewer animals per household.');
  if (fuel > 5) suggestions.push('The hearth grows cold — extend woodland acres or improve gathering.');
  if (results.avgWheatRemaining < params.households * 5 && famine < 10) suggestions.push('Granary runs thin by spring — a poor harvest could ruin you.');

  let headline = '';
  let color = '#5a7745';
  let body = '';

  if (severe >= 30 || famine >= 60) {
    headline = 'A village on the brink.';
    color = '#9b1c1c';
    body = 'The fields will not yield enough. Most years end with the children eating oats, and many with empty bowls. The lord may seize the seed corn before winter is out.';
  } else if (famine >= 25 || beast >= 20) {
    headline = 'A precarious balance.';
    color = '#c46a1a';
    body = 'In good years the village will eat its fill; in lean years, the strong will survive and the weak will not. The pantry is thin and the byre vulnerable.';
  } else if (famine >= 8 || fuel >= 8) {
    headline = 'A watchful peace.';
    color = '#b8860b';
    body = 'The harvest holds in most seasons, though a hard winter or wet spring would force the village to fast. Stewardship of stores will matter.';
  } else {
    headline = 'A village in plenty.';
    color = '#5a7745';
    body = 'Bread, ale, and meat enough — the granary holds through Lent and the byre to spring. Surplus wool may even buy the lord a stained-glass window.';
  }

  return { headline, color, body, suggestions };
}
