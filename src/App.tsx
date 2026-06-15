import React, { useState } from 'react';
import { Map, ScrollText, BookOpen, RotateCcw } from 'lucide-react';
import { SimPanel } from './components/SimPanel';
import { Assumptions } from './components/Assumptions';
import { DEFAULTS } from './lib/defaults';
import { SimParams } from './lib/simulation';

type Tab = 'overview' | 'chronicle' | 'almanac';

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [params, setParams] = useState<SimParams>(DEFAULTS as SimParams);

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="vellum sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Crest />
            <div>
              <h1 className="font-[var(--font-blackletter)] text-3xl leading-none text-[#f3e8c8] tracking-wide">
                Fiefdom
              </h1>
              <p className="text-[0.7rem] text-[#b8860b] mt-1 font-[var(--font-display)] tracking-[0.22em] uppercase">
                A Winter Survival Planner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setParams(DEFAULTS as SimParams)}
              className="btn-wood text-[0.65rem] opacity-70 hover:opacity-100 transition-opacity"
              title="Restore all parameters to historical defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Restore Defaults</span>
            </button>
            <nav className="flex items-center gap-1 p-1 rounded-sm bg-[rgba(0,0,0,0.35)] border border-[rgba(184,134,11,0.25)]">
              <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')} icon={<Map className="w-3.5 h-3.5" />} label="Council" />
              <TabBtn active={tab === 'chronicle'} onClick={() => setTab('chronicle')} icon={<ScrollText className="w-3.5 h-3.5" />} label="Chronicle" />
              <TabBtn active={tab === 'almanac'} onClick={() => setTab('almanac')} icon={<BookOpen className="w-3.5 h-3.5" />} label="Almanac" />
            </nav>
          </div>
        </div>
        <div className="divider-rule" />
      </header>

      {/* MAIN */}
      <main className="max-w-[1400px] mx-auto px-5 py-5">
        {tab === 'almanac' ? (
          <Assumptions />
        ) : (
          <SimPanel view={tab as 'overview' | 'chronicle'} params={params} setParams={setParams} />
        )}
      </main>

      <footer className="max-w-[1400px] mx-auto px-5 py-6">
        <div className="fleuron">
          <span>Anno Domini · MMXXVI</span>
        </div>
      </footer>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`tab-btn ${active ? 'active' : ''} flex items-center gap-1.5`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Crest() {
  return (
    <div className="crest-glow">
      <svg viewBox="0 0 56 56" width="44" height="44" aria-hidden>
        <defs>
          <linearGradient id="crestG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5c373" />
            <stop offset="100%" stopColor="#8a6308" />
          </linearGradient>
        </defs>
        <path d="M 28 4 L 50 12 L 50 30 Q 50 46, 28 52 Q 6 46, 6 30 L 6 12 Z" fill="url(#crestG)" stroke="#3d2a15" strokeWidth="1.4" />
        <path d="M 28 8 L 46 14.5 L 46 30 Q 46 44, 28 48.5 Q 10 44, 10 30 L 10 14.5 Z" fill="none" stroke="#3d2a15" strokeWidth="0.6" opacity="0.6" />
        {/* Wheat sheaf */}
        <g transform="translate(28 30)" stroke="#3d2a15" strokeWidth="0.9" fill="#3d2a15">
          <line x1="0" y1="-12" x2="0" y2="12" />
          <path d="M 0 -10 Q -4 -8 -4 -4" fill="none" />
          <path d="M 0 -10 Q 4 -8 4 -4" fill="none" />
          <path d="M 0 -4 Q -5 -2 -5 4" fill="none" />
          <path d="M 0 -4 Q 5 -2 5 4" fill="none" />
          <path d="M 0 2 Q -4 4 -3 8" fill="none" />
          <path d="M 0 2 Q 4 4 3 8" fill="none" />
          <ellipse cx="0" cy="-12" rx="1" ry="2" />
          <ellipse cx="-4" cy="-4" rx="1" ry="2" transform="rotate(-25 -4 -4)" />
          <ellipse cx="4" cy="-4" rx="1" ry="2" transform="rotate(25 4 -4)" />
          <ellipse cx="-5" cy="4" rx="1" ry="2" transform="rotate(-25 -5 4)" />
          <ellipse cx="5" cy="4" rx="1" ry="2" transform="rotate(25 5 4)" />
        </g>
      </svg>
    </div>
  );
}

export default App;
