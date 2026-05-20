import React from 'react';

interface VillageSceneProps {
  households: number;
  totalAcres: number;
  landSplit: { wheat: number; barley: number; oats: number; hay: number };
  woodlandAcres: number;
  sheep: number;
  cattle: number;
  granary: { wheat: number; barley: number; oats: number };
  granaryCapacity: number;
  hay: number;
  hayCapacity: number;
  fuel: number;
  fuelCapacity: number;
  meat: number;
  isWinter: boolean;
  monthInYear: number;
  year: number;
}

const CROP_COLORS: Record<string, { fill: string; stroke: string; label: string }> = {
  wheat:  { fill: '#d9a93f', stroke: '#8a6308', label: 'Wheat' },
  barley: { fill: '#c46a1a', stroke: '#6e3608', label: 'Barley' },
  oats:   { fill: '#8fa848', stroke: '#4a5824', label: 'Oats' },
  hay:    { fill: '#5a7745', stroke: '#2c3d22', label: 'Hay' },
  fallow: { fill: '#a89072', stroke: '#5e4222', label: 'Fallow' },
};

export function VillageScene(props: VillageSceneProps) {
  const { households, landSplit, sheep, cattle, isWinter, monthInYear, year } = props;

  // 3-field rotation: split active land into 3 wedges. Fallow is one wedge.
  // Distribute wheat/barley/oats/hay across remaining wedges proportionally,
  // arranged as a top-down village plan.

  // Build a "field strip" — we'll show 12 rectangular plots arranged around the village center.
  // Each plot is colored by crop and sized proportionally to land allocation.
  const fields: Array<{ crop: string; }> = [];
  const totalPlots = 12;
  const fallowPlots = 4; // 33% fallow
  const arablePlots = totalPlots - fallowPlots;
  const totalSplit = landSplit.wheat + landSplit.barley + landSplit.oats + landSplit.hay || 1;
  const cropPlots: Record<string, number> = {
    wheat:  Math.round((landSplit.wheat  / totalSplit) * arablePlots),
    barley: Math.round((landSplit.barley / totalSplit) * arablePlots),
    oats:   Math.round((landSplit.oats   / totalSplit) * arablePlots),
    hay:    Math.round((landSplit.hay    / totalSplit) * arablePlots),
  };
  let remaining = arablePlots - cropPlots.wheat - cropPlots.barley - cropPlots.oats - cropPlots.hay;
  // Adjust for rounding
  if (remaining > 0) cropPlots.wheat += remaining;
  if (remaining < 0) cropPlots.wheat = Math.max(0, cropPlots.wheat + remaining);

  // Interleave to make it look like a real field map (not all grouped)
  const cropTypes: string[] = ['wheat', 'barley', 'oats', 'hay'];
  const cropBuffers: Record<string, number> = { ...cropPlots };
  for (let i = 0; i < arablePlots; i++) {
    // Pick the crop with most remaining
    const choice = cropTypes.reduce((a, b) => (cropBuffers[a] >= cropBuffers[b] ? a : b));
    fields.push({ crop: choice });
    cropBuffers[choice] = Math.max(0, cropBuffers[choice] - 1);
  }
  for (let i = 0; i < fallowPlots; i++) fields.push({ crop: 'fallow' });

  // Shuffle deterministic
  const shuffled: typeof fields = [];
  const order = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];
  order.forEach(i => shuffled.push(fields[i] || { crop: 'fallow' }));

  // House cluster
  const houseCount = Math.min(households, 30);

  // Livestock display
  const sheepIcons = Math.min(20, Math.ceil(sheep / Math.max(1, sheep / 20)));
  const cattleIcons = Math.min(15, Math.ceil(cattle / Math.max(1, cattle / 15)));

  // Snow overlay during winter
  const snowOpacity = isWinter ? 0.35 : 0;

  return (
    <div className="relative">
      <svg viewBox="0 0 600 400" className="w-full h-auto block">
        <defs>
          {/* Hatching pattern for fallow */}
          <pattern id="hatch-fallow" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#a89072" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#5e4222" strokeWidth="0.6" opacity="0.4" />
          </pattern>
          <pattern id="hatch-wheat" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#d9a93f" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="#8a6308" strokeWidth="0.4" opacity="0.5" />
          </pattern>
          <pattern id="hatch-barley" patternUnits="userSpaceOnUse" width="4" height="4">
            <rect width="4" height="4" fill="#c46a1a" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="#6e3608" strokeWidth="0.4" opacity="0.5" />
          </pattern>
          <pattern id="hatch-oats" patternUnits="userSpaceOnUse" width="5" height="5">
            <rect width="5" height="5" fill="#8fa848" />
            <circle cx="2.5" cy="2.5" r="0.6" fill="#4a5824" opacity="0.5" />
          </pattern>
          <pattern id="hatch-hay" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#5a7745" />
            <line x1="0" y1="3" x2="6" y2="3" stroke="#2c3d22" strokeWidth="0.5" opacity="0.4" />
          </pattern>
          {/* Woodland */}
          <pattern id="woodland" patternUnits="userSpaceOnUse" width="14" height="14">
            <rect width="14" height="14" fill="#3e5530" />
            <circle cx="3" cy="4" r="2.5" fill="#2c3d22" />
            <circle cx="9" cy="9" r="2.5" fill="#2c3d22" />
            <circle cx="6" cy="2" r="1.4" fill="#5a7745" />
            <circle cx="12" cy="3" r="1.2" fill="#5a7745" />
          </pattern>
          <radialGradient id="parchmentBg" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#f4e6c1" />
            <stop offset="80%" stopColor="#e2cc97" />
            <stop offset="100%" stopColor="#c8ac72" />
          </radialGradient>
          <filter id="rough" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.2" />
          </filter>
        </defs>

        {/* Background */}
        <rect width="600" height="400" fill="url(#parchmentBg)" />

        {/* Compass rose */}
        <g transform="translate(550, 40)" opacity="0.55">
          <circle r="18" fill="none" stroke="#5e4222" strokeWidth="0.6" />
          <path d="M 0 -16 L 3 0 L 0 16 L -3 0 Z" fill="#5e4222" />
          <path d="M -16 0 L 0 3 L 16 0 L 0 -3 Z" fill="#5e4222" opacity="0.6" />
          <text textAnchor="middle" y="-21" fontSize="9" fontFamily="Cinzel, serif" fill="#5e4222" fontWeight="700">N</text>
        </g>

        {/* Woodland strip on left */}
        <g>
          <path d="M 10 60 Q 30 50, 60 80 Q 80 130, 50 200 Q 30 280, 70 340 L 10 340 Z" fill="url(#woodland)" stroke="#2c3d22" strokeWidth="1" />
          <text x="20" y="200" fontFamily="Cinzel, serif" fontSize="9" fill="#f3e8c8" letterSpacing="2" transform="rotate(-90 20 200)">WOODLAND</text>
        </g>

        {/* River bottom */}
        <path d="M 90 380 Q 200 360, 300 372 T 600 365 L 600 400 L 90 400 Z" fill="#7da8c1" opacity="0.55" />
        <path d="M 90 380 Q 200 360, 300 372 T 600 365" fill="none" stroke="#456a82" strokeWidth="0.8" opacity="0.6" />

        {/* Field grid: 4x3 plots */}
        <g transform="translate(110, 70)">
          {shuffled.map((field, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = col * 95;
            const y = row * 80;
            const pattern = `url(#hatch-${field.crop})`;
            const color = CROP_COLORS[field.crop];
            return (
              <g key={i}>
                <rect x={x} y={y} width="88" height="73" fill={pattern} stroke={color.stroke} strokeWidth="1.2" />
                {/* Subtle plot label */}
                <text x={x + 4} y={y + 10} fontSize="6" fontFamily="EB Garamond, serif" fill={color.stroke} opacity="0.7" letterSpacing="0.5">
                  {color.label.slice(0, 3).toUpperCase()}
                </text>
              </g>
            );
          })}
        </g>

        {/* Village in the center */}
        <g transform="translate(300, 200)">
          {/* Village wall ring */}
          <circle r="32" fill="#e6d4a6" stroke="#5e4222" strokeWidth="1.4" />
          <circle r="32" fill="none" stroke="#8a6a3f" strokeWidth="0.6" strokeDasharray="3 2" />
          {/* Houses (clustered) */}
          {Array.from({ length: houseCount }).map((_, i) => {
            const angle = (i / houseCount) * Math.PI * 2 + i * 0.4;
            const radius = 8 + (i % 3) * 6;
            const cx = Math.cos(angle) * radius;
            const cy = Math.sin(angle) * radius;
            return (
              <g key={i} transform={`translate(${cx}, ${cy})`}>
                <rect x="-2.2" y="-1.5" width="4.4" height="3" fill="#8b6914" stroke="#3d2a15" strokeWidth="0.3" />
                <polygon points="-2.6,-1.5 2.6,-1.5 0,-3.5" fill="#5a3a1a" stroke="#3d2a15" strokeWidth="0.3" />
              </g>
            );
          })}
          {/* Church (slightly larger structure at center-top) */}
          <g transform="translate(0, -2)">
            <rect x="-3.5" y="-3" width="7" height="7" fill="#c2a778" stroke="#3d2a15" strokeWidth="0.4" />
            <polygon points="-4,-3 4,-3 0,-6.5" fill="#5e4222" stroke="#3d2a15" strokeWidth="0.4" />
            <line x1="0" y1="-8.5" x2="0" y2="-6.5" stroke="#3d2a15" strokeWidth="0.6" />
            <line x1="-1" y1="-7.8" x2="1" y2="-7.8" stroke="#3d2a15" strokeWidth="0.6" />
          </g>
          {/* Smoke from cooking — animate during winter */}
          {[-15, -8, 5, 12].map((x, i) => (
            <circle key={i} cx={x} cy={-15 - i * 2} r="2.5" fill="#d8d0c2" opacity={isWinter ? 0.65 : 0.4} className="flicker" />
          ))}

          {/* Village label */}
          <text textAnchor="middle" y="46" fontSize="10" fontFamily="Cinzel, serif" fill="#3d2a15" letterSpacing="2" fontWeight="700">
            HEARTH
          </text>
        </g>

        {/* Livestock — cattle near top, sheep on far field side */}
        <g transform="translate(120, 50)">
          {Array.from({ length: cattleIcons }).map((_, i) => (
            <g key={i} transform={`translate(${i * 14}, ${(i % 2) * 4})`}>
              <ellipse cx="0" cy="0" rx="4.5" ry="2.6" fill="#6e2c1a" stroke="#3a1208" strokeWidth="0.4" />
              <circle cx="-4" cy="-1.5" r="1.8" fill="#6e2c1a" stroke="#3a1208" strokeWidth="0.4" />
            </g>
          ))}
        </g>
        <g transform="translate(485, 50)">
          {Array.from({ length: sheepIcons }).map((_, i) => (
            <g key={i} transform={`translate(${(i % 5) * 11}, ${Math.floor(i / 5) * 9})`}>
              <ellipse cx="0" cy="0" rx="3.2" ry="2.2" fill="#f0e8d0" stroke="#5e4222" strokeWidth="0.35" />
              <circle cx="-2.6" cy="-0.8" r="1.2" fill="#3d2a15" />
            </g>
          ))}
        </g>

        {/* Snow overlay */}
        {isWinter && (
          <g>
            <rect width="600" height="400" fill="#ffffff" opacity={snowOpacity} />
            {Array.from({ length: 40 }).map((_, i) => {
              const x = (i * 73) % 600;
              const y = (i * 41) % 400;
              return <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.4} fill="#ffffff" opacity="0.7" />;
            })}
          </g>
        )}

        {/* Season banner */}
        <g transform="translate(20, 20)">
          <rect width="180" height="26" fill="#2a1d10" stroke="#b8860b" strokeWidth="1.2" rx="2" />
          <text x="90" y="13" textAnchor="middle" dy="0.35em" fontFamily="Cinzel, serif" fontSize="9" letterSpacing="3" fill="#e5c373" fontWeight="700">
            YEAR {year} · MONTH {monthInYear} · {isWinter ? 'WINTER' : 'GROWING'}
          </text>
        </g>
      </svg>
    </div>
  );
}

export function FieldsLegend({ landSplit }: { landSplit: { wheat: number; barley: number; oats: number; hay: number } }) {
  const total = (landSplit.wheat + landSplit.barley + landSplit.oats + landSplit.hay) || 1;
  const entries = [
    { key: 'wheat',  label: 'Wheat',  pct: landSplit.wheat,  color: '#d9a93f' },
    { key: 'barley', label: 'Barley', pct: landSplit.barley, color: '#c46a1a' },
    { key: 'oats',   label: 'Oats',   pct: landSplit.oats,   color: '#8fa848' },
    { key: 'hay',    label: 'Hay',    pct: landSplit.hay,    color: '#5a7745' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 text-[0.7rem]">
      {entries.map(e => (
        <div key={e.key} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-[var(--color-ink-300)]" style={{ background: e.color }} />
          <span className="text-[var(--color-ink-400)] font-medium">{e.label}</span>
          <span className="tabular-nums text-[var(--color-ink-300)] ml-auto">{Math.round((e.pct / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
