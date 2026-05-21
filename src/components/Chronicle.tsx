import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, FastForward, Snowflake, Sun, Wheat, Sparkles, AlertTriangle, Scissors } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea as ReferenceAreaRaw, ReferenceLine, Legend } from 'recharts';
const ReferenceArea = ReferenceAreaRaw as any;
import { VillageScene } from './VillageScene';
import { Card, CardHeader, Tooltip } from './ui';
import { MonthHistory, SimParams } from '../lib/simulation';

interface ChronicleProps {
  history: MonthHistory[];
  params: SimParams;
}

type ChartFocus = 'grain' | 'hay' | 'fuel' | 'livestock' | 'cloth' | 'all';

export function Chronicle({ history, params }: ChronicleProps) {
  const [currentMonth, setCurrentMonth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(900);
  const [focus, setFocus] = useState<ChartFocus>('all');

  const monthsPerYear = params.growingMonths + params.winterMonths;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCurrentMonth(prev => {
        if (prev >= history.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [playing, speed, history.length]);

  // Reset playback when history changes (new sim)
  useEffect(() => { setCurrentMonth(0); setPlaying(false); }, [history]);

  if (!history || history.length === 0) return null;
  const cur = history[currentMonth] || history[0];
  const monthInYear = ((cur.month - 1) % monthsPerYear) + 1;
  const isWinter = monthInYear > params.growingMonths;
  const isHarvest = monthInYear === params.growingMonths;
  const isPlanting = monthInYear === 1;
  const isShearing = !isWinter && monthInYear === 3;
  const hayCutMonth = Math.ceil(params.growingMonths / 2);
  const isHayCut = !isWinter && monthInYear === hayCutMonth;
  const isSpring = !isWinter && monthInYear <= 3;
  const isAutumn = !isWinter && monthInYear >= Math.max(4, params.growingMonths - 2) && !isHarvest;

  // Granary capacities (max ever reached) for scale
  const maxValues = useMemo(() => {
    let mw = 0, mb = 0, mo = 0, mh = 0, mf = 0, mm = 0, mc = 0, ms = 0, mwool = 0, mcloth = 0;
    for (const r of history) {
      if (r.wheat > mw) mw = r.wheat;
      if (r.barley > mb) mb = r.barley;
      if (r.oats > mo) mo = r.oats;
      if (r.hay > mh) mh = r.hay;
      if (r.fuel > mf) mf = r.fuel;
      if (r.meatStock > mm) mm = r.meatStock;
      if (r.cattleCount > mc) mc = r.cattleCount;
      if (r.sheep > ms) ms = r.sheep;
      if (r.woolStocks > mwool) mwool = r.woolStocks;
      if (r.clothStocks > mcloth) mcloth = r.clothStocks;
    }
    return { wheat: mw, barley: mb, oats: mo, hay: mh, fuel: mf, meat: mm, cattle: mc, sheep: ms, wool: mwool, cloth: mcloth };
  }, [history]);

  // Events derived from current row
  const events: { icon: React.ReactNode; text: string; tone: 'good' | 'bad' | 'neutral' }[] = [];
  if (isPlanting) events.push({ icon: <Sparkles className="w-3 h-3" />, text: 'Ploughing and sowing · seed deducted', tone: 'neutral' });
  if (cur.lambCount > 0) events.push({ icon: <span className="text-[0.7rem]">🐑</span>, text: `${cur.lambCount} lambs born`, tone: 'good' });
  if (isShearing && cur.wool > 0) events.push({ icon: <Scissors className="w-3 h-3" />, text: `Shearing · ${cur.wool} lbs wool`, tone: 'good' });
  if (isHayCut && cur.hHay > 0) events.push({ icon: <span className="text-[0.7rem]">🌿</span>, text: `Meadows cut · ${cur.hHay} tons hay stored`, tone: 'good' });
  if (isHarvest) events.push({ icon: <Wheat className="w-3 h-3" />, text: 'Harvest · grain into the granary', tone: 'good' });
  if (cur.preWinterSheepCull > 0) events.push({ icon: <span className="text-[0.7rem]">🔪</span>, text: `${cur.preWinterSheepCull} sheep culled before winter`, tone: 'neutral' });
  if (cur.deficit > 0) events.push({ icon: <AlertTriangle className="w-3 h-3" />, text: `Hunger · ${Math.round(cur.deficit / 1000)} k‑cal short`, tone: 'bad' });
  if (cur.spoilCol > 30) events.push({ icon: <span className="text-[0.6rem]">🪲</span>, text: `${cur.spoilCol} bu lost to spoilage`, tone: 'bad' });

  // Chart data — bound the full series
  const chartData = useMemo(
    () => history.map(h => ({ ...h, idx: h.month })),
    [history]
  );

  return (
    <div className="space-y-4">
      {/* Top scene + playhead */}
      <Card>
        <CardHeader
          title={`Chronicle of Year ${cur.year}`}
          subtitle={
            monthInYear === 1 ? 'Candlemas · the plough turns, seed goes into the earth' :
            isShearing ? 'Whitsuntide · shearing and the first warmth of summer' :
            isHayCut ? 'Midsummer · the meadows are cut and hay stored' :
            isHarvest ? 'Lammas · grain and livestock culled before the cold' :
            isAutumn ? `Michaelmas · autumn month ${monthInYear - (params.growingMonths - 3)} · fields lie stubble` :
            isSpring ? `Eastertide · spring month ${monthInYear} · the land quickens` :
            isWinter ? `Deep winter · month ${monthInYear - params.growingMonths} of ${params.winterMonths}` :
            `High summer · month ${monthInYear} of the growing season`
          }
          icon={isWinter ? <Snowflake className="w-5 h-5 text-[var(--color-frost-500)]" /> : <Sun className="w-5 h-5 text-[var(--color-gold-500)]" />}
        />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 vellum p-3 rounded-sm">
            <VillageScene
              households={params.households}
              totalAcres={params.totalAcres}
              landSplit={params.landSplit}
              woodlandAcres={params.woodlandAcres}
              sheep={cur.sheep}
              cattle={cur.cattleCount}
              granary={{ wheat: cur.wheat, barley: cur.barley, oats: cur.oats }}
              granaryCapacity={maxValues.wheat + maxValues.barley + maxValues.oats}
              hay={cur.hay}
              hayCapacity={maxValues.hay}
              fuel={cur.fuel}
              fuelCapacity={maxValues.fuel}
              meat={cur.meatStock}
              isWinter={isWinter}
              monthInYear={monthInYear}
              year={cur.year}
            />
          </div>

          <div className="lg:col-span-2 space-y-3">
            <StockJar label="Wheat" value={cur.wheat} unit="bu" color="#d9a93f" max={maxValues.wheat} icon="🌾" />
            <StockJar label="Barley" value={cur.barley} unit="bu" color="#c46a1a" max={maxValues.barley} icon="🍺" />
            <StockJar label="Oats" value={cur.oats} unit="bu" color="#8fa848" max={maxValues.oats} icon="🐂" />
            <StockJar label="Hay" value={cur.hay} unit="tons" color="#5a7745" max={maxValues.hay} icon="🌿" />
            <StockJar label="Fuel" value={cur.fuel} unit="carts" color="#6b4423" max={maxValues.fuel} icon="🪵" />
            <StockJar label="Preserved Meat" value={cur.meatStock / 1000} unit="kkcal" color="#9b1c1c" max={maxValues.meat / 1000} icon="🥩" />
            <StockJar label="Cattle" value={cur.cattleCount} unit="head" color="#7a3a1c" max={maxValues.cattle} icon="🐄" />
            <StockJar label="Sheep" value={cur.sheep} unit="head" color="#8a7a60" max={maxValues.sheep} icon="🐑" />
            <StockJar label="Wool Store" value={cur.woolStocks} unit="lbs" color="#c8b090" max={maxValues.wool} icon="🧶" />
            <StockJar label="Cloth Store" value={cur.clothStocks} unit="lbs" color="#9b7eb8" max={maxValues.cloth} icon="🧵" />
          </div>
        </div>

        {/* Events ribbon */}
        <div className="mt-4 min-h-[28px] flex flex-wrap items-center gap-2">
          {events.length === 0 ? (
            <span className="text-xs text-[var(--color-ink-300)] italic">A quiet month in the village.</span>
          ) : events.map((e, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[0.7rem] font-medium border ${
              e.tone === 'bad' ? 'bg-[rgba(155,28,28,0.10)] border-[rgba(155,28,28,0.35)] text-[var(--color-crimson-500)]' :
              e.tone === 'good' ? 'bg-[rgba(90,119,69,0.12)] border-[rgba(90,119,69,0.35)] text-[var(--color-moss-700)]' :
              'bg-[rgba(120,80,30,0.10)] border-[rgba(120,80,30,0.30)] text-[var(--color-ink-400)]'
            }`}>
              {e.icon}{e.text}
            </span>
          ))}
        </div>

        {/* Playback */}
        <div className="mt-4 pt-4 border-t border-[rgba(120,80,30,0.25)]">
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setCurrentMonth(0)} className="btn-wood" title="To beginning">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCurrentMonth(m => Math.max(0, m - 1))} className="btn-wood" title="Step back">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPlaying(p => !p)} className="btn-wood primary" title={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{playing ? 'Pause' : 'Unfold the Year'}</span>
            </button>
            <button onClick={() => setCurrentMonth(m => Math.min(history.length - 1, m + 1))} className="btn-wood" title="Step forward">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSpeed(s => s === 900 ? 400 : s === 400 ? 150 : 900)}
              className={`btn-wood ${speed < 400 ? 'primary' : ''}`}
              title="Toggle speed"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>{speed === 150 ? 'Fast' : speed === 400 ? 'Normal' : 'Slow'}</span>
            </button>
            <span className="ml-auto font-[var(--font-mono)] text-[0.75rem] text-[var(--color-ink-300)] tabular-nums">
              {cur.month} / {history.length}
            </span>
          </div>

          <TimeRibbon
            history={history}
            current={currentMonth}
            onSeek={setCurrentMonth}
            params={params}
          />
        </div>
      </Card>

      {/* Time series — focus-mode charts */}
      <Card>
        <CardHeader
          title="Five-Year Chronicle"
          subtitle="The stocks rise at harvest, drain through winter"
          icon={<Wheat className="w-5 h-5" />}
          right={
            <div className="flex gap-1">
              {(['all', 'grain', 'hay', 'fuel', 'livestock', 'cloth'] as ChartFocus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFocus(f)}
                  className={`px-2 py-0.5 rounded-sm text-[0.62rem] font-[var(--font-display)] uppercase tracking-wider transition-colors border ${
                    focus === f
                      ? 'bg-[rgba(184,134,11,0.25)] border-[rgba(184,134,11,0.6)] text-[#b8860b]'
                      : 'border-transparent text-[var(--color-ink-300)] hover:text-[var(--color-ink-400)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />

        {(focus === 'all' || focus === 'grain') && (
          <div className="h-56 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="gradWheat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d9a93f" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#d9a93f" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradBarley" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c46a1a" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c46a1a" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradOats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8fa848" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8fa848" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#8a6a3f" opacity={0.18} />
                <XAxis dataKey="month" tickFormatter={(v) => {
                  const y = Math.floor((v - 1) / monthsPerYear) + 1;
                  const m = ((v - 1) % monthsPerYear) + 1;
                  return m === 1 ? `Y${y}` : '';
                }} tick={{ fill: '#5e4222', fontSize: 11, fontFamily: 'Cinzel, serif' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <YAxis tick={{ fill: '#8a6a3f', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <RechartsTooltip contentStyle={{ background: '#2a1d10', border: '1px solid #b8860b', borderRadius: 3, fontFamily: 'EB Garamond, serif', color: '#f3e8c8', fontSize: 12 }} labelStyle={{ color: '#e5c373', fontFamily: 'Cinzel, serif', letterSpacing: 1 }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReferenceArea key={`winter-g-${i}`} x1={i * monthsPerYear + params.growingMonths + 1} x2={(i + 1) * monthsPerYear} fill="#b8d0e0" fillOpacity={0.18} strokeOpacity={0} />
                ))}
                <ReferenceLine x={cur.month} stroke="#9b1c1c" strokeWidth={1.5} strokeDasharray="2 3" />
                <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1.4, color: '#5e4222' }} iconType="square" />
                <Area type="monotone" dataKey="wheat" name="Wheat" stroke="#a17915" fill="url(#gradWheat)" strokeWidth={2} />
                <Area type="monotone" dataKey="barley" name="Barley" stroke="#8e4a0d" fill="url(#gradBarley)" strokeWidth={2} />
                <Area type="monotone" dataKey="oats" name="Oats" stroke="#5a7026" fill="url(#gradOats)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {(focus === 'all' || focus === 'hay') && (
          <div className={`-ml-3 ${focus === 'all' ? 'h-36 mt-3' : 'h-56'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="gradHay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5a7745" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#5a7745" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#8a6a3f" opacity={0.18} />
                <XAxis dataKey="month" tickFormatter={(v) => {
                  const y = Math.floor((v - 1) / monthsPerYear) + 1;
                  const m = ((v - 1) % monthsPerYear) + 1;
                  return m === 1 ? `Y${y}` : '';
                }} tick={{ fill: '#5e4222', fontSize: 11, fontFamily: 'Cinzel, serif' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <YAxis tick={{ fill: '#8a6a3f', fontSize: 10 }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <RechartsTooltip contentStyle={{ background: '#2a1d10', border: '1px solid #b8860b', borderRadius: 3, fontFamily: 'EB Garamond, serif', color: '#f3e8c8', fontSize: 12 }} labelStyle={{ color: '#e5c373' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReferenceArea key={`winter-h-${i}`} x1={i * monthsPerYear + params.growingMonths + 1} x2={(i + 1) * monthsPerYear} fill="#b8d0e0" fillOpacity={0.18} strokeOpacity={0} />
                ))}
                <ReferenceLine x={cur.month} stroke="#9b1c1c" strokeWidth={1.5} strokeDasharray="2 3" />
                <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1.4, color: '#5e4222' }} iconType="square" />
                <Area type="monotone" dataKey="hay" name="Hay (tons)" stroke="#3d5c30" fill="url(#gradHay)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {(focus === 'all' || focus === 'fuel') && (
          <div className={`-ml-3 ${focus === 'all' ? 'h-36 mt-3' : 'h-56'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="gradFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6b4423" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#6b4423" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#8a6a3f" opacity={0.18} />
                <XAxis dataKey="month" tickFormatter={(v) => {
                  const y = Math.floor((v - 1) / monthsPerYear) + 1;
                  const m = ((v - 1) % monthsPerYear) + 1;
                  return m === 1 ? `Y${y}` : '';
                }} tick={{ fill: '#5e4222', fontSize: 11, fontFamily: 'Cinzel, serif' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <YAxis tick={{ fill: '#8a6a3f', fontSize: 10 }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <RechartsTooltip contentStyle={{ background: '#2a1d10', border: '1px solid #b8860b', borderRadius: 3, fontFamily: 'EB Garamond, serif', color: '#f3e8c8', fontSize: 12 }} labelStyle={{ color: '#e5c373' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReferenceArea key={`winter-f-${i}`} x1={i * monthsPerYear + params.growingMonths + 1} x2={(i + 1) * monthsPerYear} fill="#b8d0e0" fillOpacity={0.18} strokeOpacity={0} />
                ))}
                <ReferenceLine x={cur.month} stroke="#9b1c1c" strokeWidth={1.5} strokeDasharray="2 3" />
                <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1.4, color: '#5e4222' }} iconType="square" />
                <Area type="monotone" dataKey="fuel" name="Fuel (carts)" stroke="#4a2e10" fill="url(#gradFuel)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {(focus === 'all' || focus === 'livestock') && (
          <div className={`-ml-3 ${focus === 'all' ? 'h-36 mt-3' : 'h-56'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#8a6a3f" opacity={0.18} />
                <XAxis dataKey="month" tickFormatter={(v) => {
                  const y = Math.floor((v - 1) / monthsPerYear) + 1;
                  const m = ((v - 1) % monthsPerYear) + 1;
                  return m === 1 ? `Y${y}` : '';
                }} tick={{ fill: '#5e4222', fontSize: 11, fontFamily: 'Cinzel, serif' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <YAxis tick={{ fill: '#8a6a3f', fontSize: 10 }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <RechartsTooltip contentStyle={{ background: '#2a1d10', border: '1px solid #b8860b', borderRadius: 3, fontFamily: 'EB Garamond, serif', color: '#f3e8c8', fontSize: 12 }} labelStyle={{ color: '#e5c373' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReferenceArea key={`winter-l-${i}`} x1={i * monthsPerYear + params.growingMonths + 1} x2={(i + 1) * monthsPerYear} fill="#b8d0e0" fillOpacity={0.18} strokeOpacity={0} />
                ))}
                <ReferenceLine x={cur.month} stroke="#9b1c1c" strokeWidth={1.5} strokeDasharray="2 3" />
                <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1.4, color: '#5e4222' }} iconType="square" />
                <Line type="stepAfter" dataKey="cattleCount" name="Cattle" stroke="#9b1c1c" strokeWidth={2} dot={false} />
                <Line type="stepAfter" dataKey="sheep" name="Sheep" stroke="#3d2a15" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {(focus === 'cloth') && (
          <div className="h-56 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="gradWool" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8b090" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#c8b090" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="gradCloth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#9b7eb8" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#9b7eb8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#8a6a3f" opacity={0.18} />
                <XAxis dataKey="month" tickFormatter={(v) => {
                  const y = Math.floor((v - 1) / monthsPerYear) + 1;
                  const m = ((v - 1) % monthsPerYear) + 1;
                  return m === 1 ? `Y${y}` : '';
                }} tick={{ fill: '#5e4222', fontSize: 11, fontFamily: 'Cinzel, serif' }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <YAxis tick={{ fill: '#8a6a3f', fontSize: 10 }} axisLine={{ stroke: '#8a6a3f' }} tickLine={{ stroke: '#8a6a3f' }} />
                <RechartsTooltip contentStyle={{ background: '#2a1d10', border: '1px solid #b8860b', borderRadius: 3, fontFamily: 'EB Garamond, serif', color: '#f3e8c8', fontSize: 12 }} labelStyle={{ color: '#e5c373' }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <ReferenceArea key={`winter-c-${i}`} x1={i * monthsPerYear + params.growingMonths + 1} x2={(i + 1) * monthsPerYear} fill="#b8d0e0" fillOpacity={0.18} strokeOpacity={0} />
                ))}
                <ReferenceLine x={cur.month} stroke="#9b1c1c" strokeWidth={1.5} strokeDasharray="2 3" />
                <Legend wrapperStyle={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1.4, color: '#5e4222' }} iconType="square" />
                <Area type="monotone" dataKey="woolStocks" name="Raw Wool (lbs)" stroke="#a08060" fill="url(#gradWool)" strokeWidth={2} />
                <Area type="monotone" dataKey="clothStocks" name="Finished Cloth (lbs)" stroke="#7a5ea0" fill="url(#gradCloth)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function TimeRibbon({ history, current, onSeek, params }: { history: MonthHistory[]; current: number; onSeek: (n: number) => void; params: SimParams }) {
  const monthsPerYear = params.growingMonths + params.winterMonths;
  return (
    <div>
      {/* Year/season strip */}
      <div className="flex h-3 rounded-sm overflow-hidden border border-[var(--color-ink-200)]">
        {history.map((h, i) => {
          const m = ((h.month - 1) % monthsPerYear) + 1;
          const isWinter = m > params.growingMonths;
          const isHarvest = m === params.growingMonths;
          const isPlanting = m === 1;
          return (
            <button
              key={i}
              onClick={() => onSeek(i)}
              title={`Y${h.year} M${m}${isWinter ? ' ❄' : ''}`}
              className="flex-1 cursor-pointer transition-opacity hover:opacity-70"
              style={{
                background:
                  isPlanting ? '#5a7745' :
                  isHarvest ? '#d9a93f' :
                  isWinter ? '#6a8da6' :
                  '#a8b878',
                borderRight: m === monthsPerYear ? '1px solid #3d2a15' : 'none',
              }}
            />
          );
        })}
      </div>
      {/* Playhead */}
      <input
        type="range"
        min={0}
        max={history.length - 1}
        value={current}
        onChange={e => onSeek(Number(e.target.value))}
        className="quill w-full mt-2"
      />
      <div className="flex justify-between text-[0.6rem] text-[var(--color-ink-300)] uppercase tracking-[0.14em] mt-1 font-[var(--font-display)]">
        <span>Year 1</span>
        <span>Year 2</span>
        <span>Year 3</span>
        <span>Year 4</span>
        <span>Year 5</span>
      </div>
    </div>
  );
}

function StockJar({ label, value, unit, color, max, icon }: { label: string; value: number; unit: string; color: string; max: number; icon?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="bg-[rgba(255,250,230,0.6)] rounded-sm p-2.5 border border-[rgba(120,80,30,0.25)]">
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-base">{icon}</span>}
          <span className="font-[var(--font-display)] uppercase tracking-[0.14em] text-[0.65rem] font-semibold text-[var(--color-ink-400)]">
            {label}
          </span>
        </div>
        <span className="font-[var(--font-mono)] tabular-nums text-[0.78rem] font-bold text-[var(--color-ink-500)]">
          {value > 1000 ? `${(value / 1000).toFixed(1)}k` : Math.round(value).toLocaleString()}
          <span className="text-[0.7em] ml-1 opacity-65 font-normal">{unit}</span>
        </span>
      </div>
      <div className="h-2.5 bg-[rgba(120,80,30,0.18)] rounded-sm overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
        />
      </div>
    </div>
  );
}
