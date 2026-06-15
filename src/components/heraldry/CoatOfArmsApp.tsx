import { useMemo, useState } from 'react';
import { Download, Shield, Sparkles } from 'lucide-react';
import { Card, CardHeader, IconButton, StatLabel } from '../ui';
import { generateBlazon } from '../../heraldry/blazon';
import { DEFAULT_COAT } from '../../heraldry/defaults';
import { fieldShapes, shieldPath } from '../../heraldry/geometry';
import { tinctureFills, tinctureLabels, tinctureOptions } from '../../heraldry/tinctures';
import { ChargeArrangement, ChargeAttitude, ChargeType, CoatOfArms, FieldDivision, OrdinaryType, Position, ShieldShape, Tincture } from '../../heraldry/types';
import { validateCoat } from '../../heraldry/validation';

const shieldShapes: ShieldShape[] = ['heater', 'french', 'iberian', 'lozenge'];
const divisions: FieldDivision[] = ['plain', 'per_pale', 'per_fess', 'per_bend', 'per_bend_sinister', 'quarterly', 'per_saltire', 'barry', 'paly', 'chequy'];
const ordinaries: OrdinaryType[] = ['none', 'chief', 'pale', 'fess', 'bend', 'bend_sinister', 'chevron', 'cross', 'saltire', 'bordure', 'canton', 'pile'];
const charges: ChargeType[] = ['lion', 'eagle', 'fleur_de_lis', 'crosslet', 'mullet', 'crescent', 'tower', 'sword', 'rose', 'escallop'];
const attitudes: ChargeAttitude[] = ['default', 'rampant', 'passant', 'displayed', 'erect'];
const arrangements: ChargeArrangement[] = ['single', 'two', 'three', 'three_two_one'];
const positions: Position[] = ['center', 'chief', 'base', 'dexter', 'sinister', 'dexter_chief', 'sinister_chief', 'dexter_base', 'sinister_base'];

const positionMap: Record<Position, [number, number]> = {
  center: [100, 103], chief: [100, 58], base: [100, 145], dexter: [68, 103], sinister: [132, 103], dexter_chief: [66, 62], sinister_chief: [134, 62], dexter_base: [70, 142], sinister_base: [130, 142],
};

function label(value: string) {
  return value.replaceAll('_', ' ');
}

export function CoatOfArmsApp() {
  const [coat, setCoat] = useState<CoatOfArms>(DEFAULT_COAT);
  const blazon = useMemo(() => generateBlazon(coat), [coat]);
  const issues = useMemo(() => validateCoat(coat), [coat]);
  const set = <K extends keyof CoatOfArms>(key: K, value: CoatOfArms[K]) => setCoat((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid xl:grid-cols-[330px_minmax(420px,1fr)_340px] gap-5">
      <Card className="h-fit">
        <CardHeader icon={<Shield className="w-4 h-4" />} title="Armorial choices" subtitle="A finite heraldic grammar; every menu mutates one field in the coat data object." />
        <div className="space-y-4">
          <Select label="Shield" value={coat.shieldShape} options={shieldShapes} onChange={(shieldShape) => set('shieldShape', shieldShape)} />
          <Select label="Field division" value={coat.field.division} options={divisions} onChange={(division) => set('field', { ...coat.field, division })} />
          <div className="grid grid-cols-2 gap-3">
            <TinctureSelect label="Tincture I" value={coat.field.tinctures[0]} onChange={(t) => set('field', { ...coat.field, tinctures: [t, coat.field.tinctures[1]] })} />
            <TinctureSelect label="Tincture II" value={coat.field.tinctures[1]} onChange={(t) => set('field', { ...coat.field, tinctures: [coat.field.tinctures[0], t] })} />
          </div>
          {['barry', 'paly', 'chequy'].includes(coat.field.division) && (
            <Range label="Division count" value={coat.field.count} min={2} max={10} step={1} onChange={(count) => set('field', { ...coat.field, count })} />
          )}
          <div className="pt-3 border-t border-[rgba(120,80,30,0.22)] space-y-3">
            <Select label="Ordinary" value={coat.ordinary.type} options={ordinaries} onChange={(type) => set('ordinary', { ...coat.ordinary, type })} />
            <TinctureSelect label="Ordinary tincture" value={coat.ordinary.tincture} onChange={(tincture) => set('ordinary', { ...coat.ordinary, tincture })} />
          </div>
          <div className="pt-3 border-t border-[rgba(120,80,30,0.22)] space-y-3">
            <Select label="Charge" value={coat.charge.type} options={charges} onChange={(type) => set('charge', { ...coat.charge, type })} />
            <Select label="Attitude" value={coat.charge.attitude} options={attitudes} onChange={(attitude) => set('charge', { ...coat.charge, attitude })} />
            <Select label="Arrangement" value={coat.charge.arrangement} options={arrangements} onChange={(arrangement) => set('charge', { ...coat.charge, arrangement })} />
            <Select label="Position" value={coat.charge.position} options={positions} onChange={(position) => set('charge', { ...coat.charge, position })} />
            <TinctureSelect label="Charge tincture" value={coat.charge.tincture} onChange={(tincture) => set('charge', { ...coat.charge, tincture })} />
            <Range label="Charge scale" value={coat.charge.scale} min={0.35} max={0.95} step={0.01} onChange={(scale) => set('charge', { ...coat.charge, scale })} />
          </div>
          <div className="pt-3 border-t border-[rgba(120,80,30,0.22)] space-y-3">
            <Input label="Motto" value={coat.externalOrnaments.motto} onChange={(motto) => set('externalOrnaments', { ...coat.externalOrnaments, motto })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={coat.externalOrnaments.helm} onChange={(e) => set('externalOrnaments', { ...coat.externalOrnaments, helm: e.target.checked })} /> Helm and crest</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={coat.externalOrnaments.supporters} onChange={(e) => set('externalOrnaments', { ...coat.externalOrnaments, supporters: e.target.checked })} /> Supporters</label>
          </div>
        </div>
      </Card>

      <Card deep>
        <CardHeader icon={<Sparkles className="w-4 h-4" />} title="Shield preview" subtitle="SVG layers are rendered field → ordinary → charges → ornaments." right={<IconButton onClick={() => setCoat(DEFAULT_COAT)}>Reset</IconButton>} />
        <div className="flex justify-center"><HeraldicSvg coat={coat} /></div>
      </Card>

      <Card className="h-fit">
        <CardHeader icon={<Download className="w-4 h-4" />} title="Blazon and export" subtitle="Generated from the same state tree as the preview." />
        <StatLabel>Blazon</StatLabel>
        <p className="mt-2 text-xl font-[var(--font-display)] text-[var(--color-ink-500)]">{blazon}</p>
        <div className="mt-5"><StatLabel>Rule analysis</StatLabel></div>
        <div className="mt-2 space-y-2">{issues.length === 0 ? <p className="text-sm text-[var(--color-moss-600)]">No rule-of-tincture warnings.</p> : issues.map((issue) => <p key={issue.rule + issue.message} className="text-sm leading-relaxed">{issue.severity === 'warning' ? '⚠️' : 'ℹ️'} {issue.message}</p>)}</div>
        <div className="mt-5"><StatLabel>Design JSON</StatLabel></div>
        <pre className="mt-2 max-h-[360px] overflow-auto rounded bg-[#21160a] p-3 text-xs text-[#f3e8c8]">{JSON.stringify(coat, null, 2)}</pre>
      </Card>
    </div>
  );
}

function HeraldicSvg({ coat }: { coat: CoatOfArms }) {
  const path = shieldPath(coat.shieldShape);
  const shapes = fieldShapes(coat.field.division, coat.field.count);
  return <svg viewBox="-40 -45 280 290" className="w-full max-w-[620px] drop-shadow-2xl" role="img" aria-label={generateBlazon(coat)}>
    <Defs path={path} />
    {coat.externalOrnaments.helm && <g transform="translate(100 -18)"><path d="M-24 22 C-18 -6 18 -6 24 22 Z" fill="#d7d1bd" stroke="#3d2a15" strokeWidth="2"/><path d="M-18 16 H18 M-13 9 H13" stroke="#3d2a15" strokeWidth="2"/><path d="M0 -14 C-12 -4 -10 5 0 12 C10 5 12 -4 0 -14 Z" fill="#b51f2e" stroke="#3d2a15"/></g>}
    {coat.externalOrnaments.supporters && <g fill="#8a6308" stroke="#3d2a15" strokeWidth="2"><path d="M-5 76 C-32 84 -34 132 -10 156 C-24 120 -16 96 2 92 Z"/><path d="M205 76 C232 84 234 132 210 156 C224 120 216 96 198 92 Z"/></g>}
    <g clipPath="url(#shieldClip)">{shapes.map((shape, i) => <polygon key={i} points={shape.points} fill={tinctureFills[coat.field.tinctures[shape.tinctureIndex]]} />)}<OrdinaryShape ordinary={coat.ordinary.type} fill={tinctureFills[coat.ordinary.tincture]} /><ChargeShapes coat={coat} /></g>
    <path d={path} fill="none" stroke="#3d2a15" strokeWidth="3" />
    {coat.externalOrnaments.motto && <g transform="translate(100 220)"><path d="M-85 -13 H85 L76 0 L85 13 H-85 L-76 0 Z" fill="#f3e8c8" stroke="#3d2a15"/><text textAnchor="middle" y="4" fontSize="10" fontFamily="serif" fill="#3d2a15">{coat.externalOrnaments.motto}</text></g>}
  </svg>;
}

function Defs({ path }: { path: string }) { return <defs><clipPath id="shieldClip"><path d={path} /></clipPath><pattern id="heraldry-ermine" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#f8f4df"/><path d="M14 6 C10 13 10 17 14 22 C18 17 18 13 14 6 Z" fill="#151515"/><circle cx="9" cy="21" r="1.5"/><circle cx="19" cy="21" r="1.5"/></pattern><pattern id="heraldry-vair" width="32" height="24" patternUnits="userSpaceOnUse"><rect width="32" height="24" fill="#f8f4df"/><path d="M0 0 H16 L8 12 H0 Z M16 12 H32 V24 H16 L24 12 Z" fill="#1f5fae"/></pattern></defs>; }

function OrdinaryShape({ ordinary, fill }: { ordinary: OrdinaryType; fill: string }) { const props = { fill, stroke: '#3d2a15', strokeWidth: 1 };
  if (ordinary === 'none') return null; if (ordinary === 'chief') return <rect x="0" y="0" width="200" height="48" {...props} />; if (ordinary === 'pale') return <rect x="78" y="0" width="44" height="200" {...props} />; if (ordinary === 'fess') return <rect x="0" y="78" width="200" height="44" {...props} />; if (ordinary === 'bend') return <polygon points="-8,174 174,-8 208,26 26,208" {...props} />; if (ordinary === 'bend_sinister') return <polygon points="26,-8 208,174 174,208 -8,26" {...props} />; if (ordinary === 'chevron') return <path d="M20 150 L100 72 L180 150 L152 150 L100 101 L48 150 Z" {...props} />; if (ordinary === 'cross') return <path d="M78 0 H122 V78 H200 V122 H122 V200 H78 V122 H0 V78 H78 Z" {...props} />; if (ordinary === 'saltire') return <path d="M20 0 L100 76 L180 0 H200 V20 L124 100 L200 180 V200 H180 L100 124 L20 200 H0 V180 L76 100 L0 20 V0 Z" {...props} />; if (ordinary === 'bordure') return <path d="M0 0 H200 V200 H0 Z M24 24 V176 H176 V24 Z" fillRule="evenodd" {...props} />; if (ordinary === 'canton') return <rect x="0" y="0" width="68" height="68" {...props} />; return <polygon points="100,0 142,200 58,200" {...props} />; }

function ChargeShapes({ coat }: { coat: CoatOfArms }) { const points = arrangementPoints(coat.charge.arrangement, coat.charge.position); return <>{points.map(([x, y], i) => <g key={i} transform={`translate(${x} ${y}) scale(${coat.charge.scale})`} fill={tinctureFills[coat.charge.tincture]} stroke="#3d2a15" strokeWidth="2"><ChargeIcon type={coat.charge.type} /></g>)}</>; }
function arrangementPoints(arrangement: ChargeArrangement, position: Position): [number, number][] { const [x, y] = positionMap[position]; if (arrangement === 'two') return [[x - 28, y], [x + 28, y]]; if (arrangement === 'three') return [[x, y - 28], [x - 30, y + 24], [x + 30, y + 24]]; if (arrangement === 'three_two_one') return [[x - 42, y - 42], [x, y - 42], [x + 42, y - 42], [x - 22, y], [x + 22, y], [x, y + 42]]; return [[x, y]]; }
function ChargeIcon({ type }: { type: ChargeType }) { if (type === 'lion') return <path d="M-24 18 C-20 -18 5 -22 12 -6 L26 -19 L22 3 L34 8 L18 13 L25 32 L9 25 L-2 35 L-6 18 L-22 32 Z"/>; if (type === 'eagle') return <path d="M0 -32 L9 -8 L38 -24 L20 4 L38 18 L8 14 L0 35 L-8 14 L-38 18 L-20 4 L-38 -24 L-9 -8 Z"/>; if (type === 'fleur_de_lis') return <path d="M0 -35 C-18 -12 -7 -2 0 5 C7 -2 18 -12 0 -35 Z M-6 6 C-22 -8 -33 5 -22 20 C-15 14 -10 10 -6 6 Z M6 6 C22 -8 33 5 22 20 C15 14 10 10 6 6 Z M-18 24 H18 L12 34 H-12 Z"/>; if (type === 'crosslet') return <path d="M-6 -34 H6 V-18 H22 V-6 H6 V6 H22 V18 H6 V34 H-6 V18 H-22 V6 H-6 V-6 H-22 V-18 H-6 Z"/>; if (type === 'mullet') return <path d="M0 -35 L8 -10 L34 -10 L13 5 L21 31 L0 15 L-21 31 L-13 5 L-34 -10 L-8 -10 Z"/>; if (type === 'crescent') return <path d="M20 -32 C-18 -18 -18 18 20 32 C-2 12 -2 -12 20 -32 Z"/>; if (type === 'tower') return <path d="M-24 -30 H-10 V-18 H-4 V-30 H10 V-18 H24 V-30 H34 V34 H8 V12 C8 2 -8 2 -8 12 V34 H-34 V-30 Z"/>; if (type === 'sword') return <path d="M-4 -38 H4 L7 14 H20 V24 H5 L0 36 L-5 24 H-20 V14 H-7 Z"/>; if (type === 'rose') return <path d="M0 -30 C8 -18 22 -25 20 -8 C36 -6 25 8 14 10 C20 24 4 20 0 10 C-4 20 -20 24 -14 10 C-25 8 -36 -6 -20 -8 C-22 -25 -8 -18 0 -30 Z"/>; return <path d="M-30 -8 C-18 -34 18 -34 30 -8 C21 -12 16 0 22 12 C10 8 6 18 0 34 C-6 18 -10 8 -22 12 C-16 0 -21 -12 -30 -8 Z"/>; }

function Select<T extends string>({ label: text, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) { return <label className="block"><StatLabel>{text}</StatLabel><select value={value} onChange={(e) => onChange(e.target.value as T)} className="scriptorium mt-1 w-full bg-[#fff6de]/70 border border-[rgba(120,80,30,0.35)] rounded px-2 py-2 text-sm capitalize">{options.map((option) => <option key={option} value={option}>{label(option)}</option>)}</select></label>; }
function TinctureSelect({ label: text, value, onChange }: { label: string; value: Tincture; onChange: (value: Tincture) => void }) { return <Select label={text} value={value} options={tinctureOptions} onChange={onChange} />; }
function Range({ label: text, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) { return <label className="block"><div className="flex justify-between"><StatLabel>{text}</StatLabel><span className="font-mono text-xs">{value}</span></div><input className="quill mt-2 w-full" type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} /></label>; }
function Input({ label: text, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block"><StatLabel>{text}</StatLabel><input className="scriptorium mt-1" value={value} onChange={(e) => onChange(e.target.value)} /></label>; }
