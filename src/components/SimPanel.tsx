import React, { useState, useEffect, useMemo } from 'react';
import { runSimulation, SimParams, SimResult } from '../lib/simulation';
import { Map } from 'lucide-react';
import { CouncilPanel } from './CouncilPanel';
import { OutcomesPanel } from './OutcomesPanel';
import { Chronicle } from './Chronicle';
import { VillageScene, FieldsLegend } from './VillageScene';
import { Card, CardHeader } from './ui';

type View = 'overview' | 'chronicle';

interface Props {
  view: View;
  params: SimParams;
  setParams: React.Dispatch<React.SetStateAction<SimParams>>;
}

export function SimPanel({ view, params, setParams }: Props) {
  const [results, setResults] = useState<SimResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [draftParams, setDraftParams] = useState<SimParams>(params);
  const [isDraft, setIsDraft] = useState(false);

  const clamp = (value: number, min: number, max?: number) => {
    const base = Math.max(min, Number.isFinite(value) ? value : min);
    return max === undefined ? base : Math.min(max, base);
  };
  const clampParams = (next: SimParams): SimParams => ({
    ...next,
    households: Math.floor(clamp(next.households, 1)),
    growingMonths: Math.floor(clamp(next.growingMonths, 1, 24)),
    winterMonths: Math.floor(clamp(next.winterMonths, 1, 24)),
    totalAcres: clamp(next.totalAcres, 1),
    woodlandAcres: clamp(next.woodlandAcres, 0),
    yieldVariability: clamp(next.yieldVariability, 0, 100),
    fallowPct: clamp(next.fallowPct, 0, 100),
    spoilageRate: clamp(next.spoilageRate, 0, 100),
    haySpoilageRate: clamp(next.haySpoilageRate, 0, 100),
    titheAndManufacturePct: clamp(next.titheAndManufacturePct, 0, 100),
    woolPerSheep: clamp(next.woolPerSheep, 0),
    clothingNeedWoolLbs: clamp(next.clothingNeedWoolLbs, 0),
    fuelYieldPerAcre: clamp(next.fuelYieldPerAcre, 0),
    fuelNeedsSummer: clamp(next.fuelNeedsSummer, 0),
    fuelNeedsWinter: clamp(next.fuelNeedsWinter, 0),
    m3PerCartload: clamp(next.m3PerCartload, 0.000001),
    plannerRiskBufferPct: clamp(next.plannerRiskBufferPct, 0),
    bullsPerCow: clamp(next.bullsPerCow, 0),
    pastureAcresPerSheep: clamp(next.pastureAcresPerSheep, 0),
    pastureAcresPerCattle: clamp(next.pastureAcresPerCattle, 0),
    landSplit: {
      wheat: clamp(next.landSplit.wheat, 0, 100),
      barley: clamp(next.landSplit.barley, 0, 100),
      oats: clamp(next.landSplit.oats, 0, 100),
      hay: clamp(next.landSplit.hay, 0, 100),
    },
    yields: {
      wheat: clamp(next.yields.wheat, 0.000001),
      barley: clamp(next.yields.barley, 0.000001),
      oats: clamp(next.yields.oats, 0.000001),
      hay: clamp(next.yields.hay, 0.000001),
    },
    kcalPerDay: {
      male: clamp(next.kcalPerDay.male, 1),
      female: clamp(next.kcalPerDay.female, 1),
      child: clamp(next.kcalPerDay.child, 1),
    },
    cropStats: {
      wheat: {
        kcalPerBu: clamp(next.cropStats.wheat.kcalPerBu, 1),
        seedRate: clamp(next.cropStats.wheat.seedRate, 0),
      },
      barley: {
        kcalPerBu: clamp(next.cropStats.barley.kcalPerBu, 1),
        seedRate: clamp(next.cropStats.barley.seedRate, 0),
      },
      oats: {
        kcalPerBu: clamp(next.cropStats.oats.kcalPerBu, 1),
        seedRate: clamp(next.cropStats.oats.seedRate, 0),
      },
    },
    peoplePerHH: {
      male: clamp(next.peoplePerHH.male, 0),
      female: clamp(next.peoplePerHH.female, 0),
      child: clamp(next.peoplePerHH.child, 0),
    },
    animalsPerHH: {
      oxen: clamp(next.animalsPerHH.oxen, 0),
      cows: clamp(next.animalsPerHH.cows, 0),
      sheep: clamp(next.animalsPerHH.sheep, 0),
    },
  });

  const commitParams: Props['setParams'] = (updater) => {
    setParams(prev => {
      const proposed = typeof updater === 'function' ? updater(prev) : updater;
      return clampParams(proposed);
    });
  };

  useEffect(() => {
    setDraftParams(params);
    setIsDraft(false);
  }, [params]);

  const setDraftParamsTracked: React.Dispatch<React.SetStateAction<SimParams>> = (updater) => {
    setDraftParams(updater);
    setIsDraft(true);
  };

  const commitDraft = () => {
    commitParams(draftParams);
    setIsDraft(false);
  };

  useEffect(() => {
    setIsSimulating(true);
    const t = setTimeout(() => {
      const r = runSimulation(clampParams(params));
      setResults(r);
      setIsSimulating(false);
    }, 80);
    return () => clearTimeout(t);
  }, [params]);

  // Summary stats for the overview snapshot scene
  const snapshot = useMemo(() => {
    if (!results || results.history.length === 0) return null;
    // Pick a "mid-summer" snapshot to show the village in green abundance
    const monthsPerYear = params.growingMonths + params.winterMonths;
    const midSummerIdx = results.history.findIndex(h => h.year === 2 && ((h.month - 1) % monthsPerYear) + 1 === Math.ceil(params.growingMonths / 2));
    const idx = midSummerIdx >= 0 ? midSummerIdx : Math.floor(results.history.length / 2);
    const h = results.history[idx];
    const monthInYear = ((h.month - 1) % monthsPerYear) + 1;
    return { h, monthInYear, isWinter: monthInYear > params.growingMonths };
  }, [results, params.growingMonths, params.winterMonths]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
      <div className="xl:col-span-5 space-y-5">
        <CouncilPanel
          params={draftParams}
          setParams={setDraftParamsTracked}
          commitParams={commitDraft}
          setAndCommitParams={commitParams}
          hasPendingDraft={isDraft}
        />
      </div>

      <div className="xl:col-span-7 space-y-5">
        {view === 'overview' && (
          <>
            <Card>
              <CardHeader
                title="The Village at a Glance"
                subtitle="A bird's-eye view of your fiefdom in midsummer"
                icon={<Map className="w-5 h-5" />}
              />
              {snapshot && (
                <div className="vellum p-3 rounded-sm">
                  <VillageScene
                    households={params.households}
                    totalAcres={params.totalAcres}
                    landSplit={params.landSplit}
                    woodlandAcres={params.woodlandAcres}
                    sheep={snapshot.h.sheep}
                    cattle={snapshot.h.cattleCount}
                    granary={{ wheat: snapshot.h.wheat, barley: snapshot.h.barley, oats: snapshot.h.oats }}
                    granaryCapacity={1}
                    hay={snapshot.h.hay}
                    hayCapacity={1}
                    fuel={snapshot.h.fuel}
                    fuelCapacity={1}
                    meat={snapshot.h.meatStock}
                    isWinter={snapshot.isWinter}
                    monthInYear={snapshot.monthInYear}
                    year={snapshot.h.year}
                  />
                </div>
              )}
              <div className="mt-3">
                <FieldsLegend landSplit={params.landSplit} />
              </div>
            </Card>

            {results && <OutcomesPanel results={results} params={params} isSimulating={isSimulating} />}

            {!results && (
              <Card>
                <div className="h-64 flex items-center justify-center text-[var(--color-ink-300)] italic">
                  The scribe consults the omens…
                </div>
              </Card>
            )}
          </>
        )}

        {view === 'chronicle' && results && (
          <Chronicle history={results.history} params={params} />
        )}
        {view === 'chronicle' && !results && (
          <Card>
            <div className="h-64 flex items-center justify-center text-[var(--color-ink-300)] italic">
              The scribe consults the omens…
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
