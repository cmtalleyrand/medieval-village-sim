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

  useEffect(() => {
    setIsSimulating(true);
    const t = setTimeout(() => {
      const r = runSimulation(params);
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
        <CouncilPanel params={params} setParams={setParams} />
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
