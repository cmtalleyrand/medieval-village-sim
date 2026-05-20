import React, { useEffect, useRef, useState } from 'react';
import { Castle, Wheat, Trees, Settings2, ChevronDown, ChevronRight, Sparkles, Calculator, Users, Sprout, Beef, Flame } from 'lucide-react';
import { Card, CardHeader, Fleuron, Tooltip, IconButton } from './ui';
import { SimParams, autoAllocateLand, solveMinimumAcres } from '../lib/simulation';

interface Props {
  params: SimParams;
  setParams: React.Dispatch<React.SetStateAction<SimParams>>;
  commitParams: () => void;
  setAndCommitParams: React.Dispatch<React.SetStateAction<SimParams>>;
}

export function CouncilPanel({ params, setParams, commitParams, setAndCommitParams }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const sliderCommitTimer = useRef<number | null>(null);

  type NumericFieldKeys = {
    [K in keyof SimParams]: SimParams[K] extends number ? K : never;
  }[keyof SimParams];
  type NumericNestedKeys = {
    [K in keyof SimParams]: SimParams[K] extends Record<string, number> ? K : never;
  }[keyof SimParams];

  const setField = <K extends NumericFieldKeys>(k: K, v: SimParams[K]) =>
    setParams(prev => ({ ...prev, [k]: v }));

  const setNested = <K extends NumericNestedKeys, P extends keyof SimParams[K]>(
    cat: K,
    key: P,
    v: SimParams[K][P]
  ) =>
    setParams(prev => ({ ...prev, [cat]: { ...prev[cat], [key]: v } }));

  const setLandSplit = (crop: 'wheat' | 'barley' | 'oats' | 'hay', value: number) => {
    setParams(prev => {
      const val = Math.max(0, Math.min(100, value));
      const others = (['wheat', 'barley', 'oats', 'hay'] as const).filter(c => c !== crop);
      const otherSum = others.reduce((sum, c) => sum + prev.landSplit[c], 0);
      const newOtherSum = 100 - val;
      const newSplit: typeof prev.landSplit = { ...prev.landSplit, [crop]: val };
      if (otherSum === 0) {
        others.forEach(c => (newSplit[c] = newOtherSum / 3));
      } else {
        others.forEach(c => (newSplit[c] = prev.landSplit[c] * (newOtherSum / otherSum)));
      }
      return { ...prev, landSplit: newSplit };
    });
  };

  const queueSliderCommit = () => {
    if (sliderCommitTimer.current !== null) {
      window.clearTimeout(sliderCommitTimer.current);
    }
    sliderCommitTimer.current = window.setTimeout(() => {
      commitParams();
      sliderCommitTimer.current = null;
    }, 400);
  };

  useEffect(() => () => {
    if (sliderCommitTimer.current !== null) {
      window.clearTimeout(sliderCommitTimer.current);
    }
  }, []);

  const handleAuto = () => {
    setAndCommitParams(prev => ({ ...prev, landSplit: autoAllocateLand(prev) }));
  };

  const handleSolveAcres = () => {
    setAndCommitParams(prev => {
      const min = solveMinimumAcres(prev);
      const np = { ...prev, totalAcres: min };
      return { ...np, landSplit: autoAllocateLand(np) };
    });
  };

  const activeAcres = Math.round(params.totalAcres * (1 - params.fallowPct / 100));
  const fallowAcres = params.totalAcres - activeAcres;
  const totalSplit = Math.round(params.landSplit.wheat + params.landSplit.barley + params.landSplit.oats + params.landSplit.hay);

  const totalSouls = Math.round(
    params.households * (params.peoplePerHH.male + params.peoplePerHH.female + params.peoplePerHH.child)
  );
  const totalCattle = params.households * (params.animalsPerHH.oxen + params.animalsPerHH.cows);
  const totalSheep = params.households * params.animalsPerHH.sheep;

  return (
    <div className="space-y-4">
      {/* DEMOGRAPHICS */}
      <Card>
        <CardHeader
          icon={<Castle className="w-5 h-5" />}
          title="The Manor"
          subtitle="Households, seasons & souls under the lord's keep"
        />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <NumberField
            label="Households"
            tooltip="Number of family hearths in the village. Each averages 4.5 souls."
            value={params.households}
            onChange={v => setField('households', v)}
            onCommit={commitParams}
          />
          <NumberField
            label="Growing Mths"
            tooltip="Months from spring planting through autumn harvest."
            value={params.growingMonths}
            onChange={v => setField('growingMonths', v)}
            onCommit={commitParams}
          />
          <NumberField
            label="Winter Mths"
            tooltip="Months of frost, when nothing grows and livestock must be hand-fed."
            value={params.winterMonths}
            onChange={v => setField('winterMonths', v)}
            onCommit={commitParams}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-[rgba(120,80,30,0.18)]">
          <Stat icon={<Users className="w-3.5 h-3.5" />} label="Souls" value={totalSouls} />
          <Stat icon={<Beef className="w-3.5 h-3.5" />} label="Cattle" value={totalCattle} />
          <Stat icon={<span className="text-[10px]">🐑</span>} label="Sheep" value={totalSheep} />
        </div>
      </Card>

      {/* LAND */}
      <Card>
        <CardHeader
          icon={<Wheat className="w-5 h-5" />}
          title="Lands & Furrows"
          subtitle="Arable fields and crop allotment"
          right={
            <div className="flex gap-1.5">
              <Tooltip text="Compute the smallest plot that can feed the village.">
                <button onClick={handleSolveAcres} className="btn-wood text-[0.6rem]">
                  <Calculator className="w-3 h-3" /> Solve
                </button>
              </Tooltip>
              <Tooltip text="Reallocate fields for survival using the same 365-day year and 12 equal planning months as the simulator.">
                <button onClick={handleAuto} className="btn-wood primary text-[0.6rem]">
                  <Sparkles className="w-3 h-3" /> Allot
                </button>
              </Tooltip>
            </div>
          }
        />
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label tooltip="Total acreage including fallow. One-third lies fallow each year under the three-field rotation.">
                Total Acres
              </Label>
              <input
                type="number"
                className="scriptorium mt-1"
                value={params.totalAcres}
                onChange={e => setField('totalAcres', Number(e.target.value))}
                onBlur={commitParams}
                onKeyDown={e => e.key === 'Enter' && commitParams()}
              />
            </div>
            <div className="flex-1 pb-1">
              <div className="text-[0.65rem] text-[var(--color-ink-300)] uppercase tracking-[0.14em] mb-1">Composition</div>
              <div className="flex h-4 rounded-sm overflow-hidden border border-[var(--color-ink-200)]">
                <div className="bg-[#a89072]" style={{ flex: `0 0 ${(fallowAcres / params.totalAcres) * 100}%` }} title={`Fallow ${fallowAcres} ac`} />
                <div className="bg-gradient-to-r from-[#d9a93f] via-[#c46a1a] to-[#5a7745]" style={{ flex: `1 1 auto` }} title={`Active ${activeAcres} ac`} />
              </div>
              <div className="flex justify-between text-[0.6rem] text-[var(--color-ink-300)] mt-1 tabular-nums">
                <span>Fallow {fallowAcres} ac</span>
                <span>Active {activeAcres} ac</span>
              </div>
            </div>
          </div>

          <div className="parchment-deep rounded-sm p-3 -mx-1">
            <div className="flex justify-between items-baseline mb-2">
              <span className="font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.65rem] text-[var(--color-ink-400)] font-semibold">
                Crop Allotment of Active Land
              </span>
              <span
                className={`text-[0.65rem] font-bold tabular-nums tracking-wider ${
                  totalSplit > 100 ? 'text-[var(--color-crimson-500)]' : totalSplit < 100 ? 'text-[var(--color-gold-700)]' : 'text-[var(--color-moss-600)]'
                }`}
              >
                {totalSplit}%
              </span>
            </div>

            {(['wheat', 'barley', 'oats', 'hay'] as const).map(crop => {
              const cropColors: Record<string, string> = {
                wheat: '#d9a93f', barley: '#c46a1a', oats: '#8fa848', hay: '#5a7745',
              };
              const tip: Record<string, string> = {
                wheat: 'Primary bread grain. ~8 bu/ac. Highest kcal per bushel.',
                barley: 'Brewed into ale (~20% of monthly kcal demand under the 365/12 planning basis). ~10 bu/ac.',
                oats: 'Animal feed first; emergency human food. ~10 bu/ac.',
                hay: 'Cultivated meadow for winter livestock feed. ~1.2 tons/ac.',
              };
              const acres = Math.round((activeAcres * params.landSplit[crop]) / 100);
              const pct = params.landSplit[crop];
              return (
                <div key={crop} className="flex items-center gap-3 my-2">
                  <Tooltip text={tip[crop]}>
                    <span className="w-14 text-[0.78rem] capitalize text-[var(--color-ink-400)] font-medium font-[var(--font-display)] tracking-wider cursor-help">
                      {crop}
                    </span>
                  </Tooltip>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pct}
                    onChange={e => {
                      setLandSplit(crop, Number(e.target.value));
                      queueSliderCommit();
                    }}
                    className="quill flex-1"
                    style={{ accentColor: cropColors[crop] }}
                  />
                  <span className="w-20 text-right text-[0.75rem] tabular-nums text-[var(--color-ink-400)]">
                    <span className="font-bold">{Math.round(pct)}%</span>
                    <span className="text-[var(--color-ink-300)] ml-1">· {acres}ac</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div>
            <Label tooltip="Random year-to-year weather variation. Higher = more boom-and-bust harvests.">
              Yield Variability
            </Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="range"
                min={0}
                max={50}
                value={params.yieldVariability}
                onChange={e => {
                  setField('yieldVariability', Number(e.target.value));
                  queueSliderCommit();
                }}
                className="quill flex-1"
              />
              <span className="w-12 text-right text-[0.78rem] tabular-nums font-bold text-[var(--color-ink-500)]">
                ±{params.yieldVariability}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* FUEL */}
      <Card>
        <CardHeader
          icon={<Trees className="w-5 h-5" />}
          title="Hearth & Woodland"
          subtitle="Common-right woodland & burning fuel"
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Woodland (ac)" tooltip="Acres of common woodland where peasants gather wood, peat, or turf."
            value={params.woodlandAcres} onChange={v => setField('woodlandAcres', v)} onCommit={commitParams} />
          <NumberField label="Yield/ac/yr" tooltip="Cartloads gathered per acre per year."
            step={0.1} value={params.fuelYieldPerAcre} onChange={v => setField('fuelYieldPerAcre', v)} onCommit={commitParams} />
          <NumberField label="Summer need" tooltip="Cartloads per household per month, for cooking only."
            step={0.1} value={params.fuelNeedsSummer} onChange={v => setField('fuelNeedsSummer', v)} onCommit={commitParams} />
          <NumberField label="Winter need" tooltip="Cartloads per household per month for cooking + heating."
            step={0.1} value={params.fuelNeedsWinter} onChange={v => setField('fuelNeedsWinter', v)} onCommit={commitParams} />
        </div>
      </Card>

      {/* Advanced */}
      <div className="parchment ornate-border">
        <button
          onClick={() => setShowAdvanced(s => !s)}
          className="w-full flex items-center justify-between p-4 hover:bg-[rgba(184,134,11,0.06)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-[var(--color-crimson-500)]" />
            <span className="font-[var(--font-display)] uppercase tracking-[0.16em] text-[0.78rem] font-semibold text-[var(--color-ink-400)]">
              The Steward's Ledger
            </span>
            <span className="text-[0.66rem] text-[var(--color-ink-300)] italic">(advanced)</span>
          </div>
          {showAdvanced ? <ChevronDown className="w-4 h-4 text-[var(--color-ink-300)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-ink-300)]" />}
        </button>
        {showAdvanced && (
          <div className="px-5 pb-5 pt-2 space-y-5 border-t border-[rgba(120,80,30,0.18)]">
            <Subsection icon={<Sprout className="w-4 h-4" />} title="Base Yields">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Wheat (bu/ac)" value={params.yields.wheat} onChange={v => setNested('yields', 'wheat', v)} onCommit={commitParams} />
                <NumberField label="Barley (bu/ac)" value={params.yields.barley} onChange={v => setNested('yields', 'barley', v)} onCommit={commitParams} />
                <NumberField label="Oats (bu/ac)" value={params.yields.oats} onChange={v => setNested('yields', 'oats', v)} onCommit={commitParams} />
                <NumberField step={0.1} label="Hay (tons/ac)" value={params.yields.hay} onChange={v => setNested('yields', 'hay', v)} onCommit={commitParams} />
              </div>
            </Subsection>

            <Subsection icon={<Flame className="w-4 h-4" />} title="Spoilage & Tithes">
              <div className="grid grid-cols-2 gap-3">
                <NumberField step={0.1} label="Grain spoil %/mo" value={params.spoilageRate} onChange={v => setField('spoilageRate', v)} onCommit={commitParams} />
                <NumberField step={0.1} label="Hay spoil %/mo" value={params.haySpoilageRate} onChange={v => setField('haySpoilageRate', v)} onCommit={commitParams} />
                <NumberField label="Tithe & mfg %" value={params.titheAndManufacturePct} onChange={v => setField('titheAndManufacturePct', v)} onCommit={commitParams} />
                <NumberField step={0.1} label="Wool lbs/sheep/yr" value={params.woolPerSheep} onChange={v => setField('woolPerSheep', v)} onCommit={commitParams} />
              </div>
            </Subsection>

            <Subsection icon={<Users className="w-4 h-4" />} title="Household Composition">
              <div className="grid grid-cols-3 gap-3">
                <NumberField step={0.1} label="Males" value={params.peoplePerHH.male} onChange={v => setNested('peoplePerHH', 'male', v)} onCommit={commitParams} />
                <NumberField step={0.1} label="Females" value={params.peoplePerHH.female} onChange={v => setNested('peoplePerHH', 'female', v)} onCommit={commitParams} />
                <NumberField step={0.1} label="Children" value={params.peoplePerHH.child} onChange={v => setNested('peoplePerHH', 'child', v)} onCommit={commitParams} />
              </div>
            </Subsection>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  return (
    <label className="flex items-center gap-1 font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.66rem] font-semibold text-[var(--color-ink-400)]">
      {children}
      {tooltip && (
        <Tooltip text={tooltip}>
          <span className="text-[var(--color-ink-300)] cursor-help text-[0.7rem]">ⓘ</span>
        </Tooltip>
      )}
    </label>
  );
}

function NumberField({ label, value, onChange, onCommit, step, tooltip }: { label: string; value: number; onChange: (v: number) => void; onCommit?: () => void; step?: number; tooltip?: string }) {
  return (
    <div>
      <Label tooltip={tooltip}>{label}</Label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        onBlur={onCommit}
        onKeyDown={e => e.key === 'Enter' && onCommit?.()}
        className="scriptorium mt-1"
      />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-[var(--color-ink-300)]">
        {icon}
        <span className="font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.6rem] font-semibold">{label}</span>
      </div>
      <div className="font-[var(--font-display)] text-xl font-bold text-[var(--color-ink-500)] tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Subsection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 text-[var(--color-crimson-500)]">
        {icon}
        <span className="font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.7rem] font-semibold text-[var(--color-ink-400)]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
