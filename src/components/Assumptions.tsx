import React from 'react';
import { Wheat, Beef, Flame, Users, Sprout, ScrollText, BookOpen } from 'lucide-react';
import { Card, CardHeader, Fleuron } from './ui';

export function Assumptions() {
  return (
    <div className="space-y-5">
      <Card>
        <div className="ornate-border">
          <div className="text-center py-4">
            <div className="text-[0.7rem] font-[var(--font-display)] uppercase tracking-[0.24em] text-[var(--color-crimson-500)] mb-1">
              The Almanac
            </div>
            <h2 className="text-3xl font-[var(--font-blackletter)] text-[var(--color-ink-500)] mb-2">
              Methodology &amp; Assumptions
            </h2>
            <p className="text-[var(--color-ink-300)] italic max-w-3xl mx-auto px-6 text-[0.95rem] leading-relaxed">
              This planner blends historical estimate with stochastic simulation to model survival across uncertain
              harvests, brittle winters and the slow drain of tithes. The default parameters reflect a stylised
              northern‑European fiefdom around the cusp of the 14th century.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={<BookOpen className="w-5 h-5" />}
          title="Historical Sources"
          subtitle="The shoulders this simulation stands upon"
        />
        <ul className="space-y-3 text-[0.88rem] text-[var(--color-ink-400)]">
          {[
            { author: 'Bruce M. S. Campbell', work: 'English Seigniorial Agriculture, 1250–1450', note: 'Yield estimates, seed rates, three‑field rotation.' },
            { author: 'Christopher Dyer', work: 'Standards of Living in the Later Middle Ages', note: 'Caloric requirements, ale consumption, dairy output.' },
            { author: 'FAO', work: 'Energy Systems and Animal Nutrition manuals', note: 'Gross vs metabolizable feed energy and ruminant digestion factors.' },
            { author: 'USDA', work: 'FoodData Central + grain standards', note: 'Modern proximate composition and bushel mass conversions used for unit transforms.' },
            { author: 'Engineering Toolbox / legal cord definitions', work: 'Stacked wood volume standards', note: 'Cord-to-volume conversion basis for replacing vague cartloads.' },
            { author: 'Gregory Clark', work: 'The Long March of History', note: 'Labour calories and harvest variation.' },
            { author: 'John Munro', work: 'Medieval Woollens', note: 'Sheep fleece weights and cloth manufacture.' },
            { author: 'Stephen Broadberry et al.', work: 'British Economic Growth, 1270–1870', note: 'Tithe and tax burdens (~10–20 % of surplus).' },
          ].map((s, i) => (
            <li key={i} className="flex gap-3 dropcap-row">
              <span className="font-[var(--font-display)] text-[var(--color-gold-700)] tabular-nums text-sm w-6 pt-0.5">{String.fromCharCode(8544 + i)}</span>
              <div>
                <span className="font-semibold text-[var(--color-ink-500)]">{s.author}</span>
                <span className="italic text-[var(--color-ink-400)]"> — {s.work}.</span>
                <span className="text-[var(--color-ink-300)] text-[0.82rem]"> {s.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Section icon={<Users className="w-5 h-5" />} title="I · The Souls" tone="green">
        <p className="dropcap">
          <strong>F</strong>our and a half souls per hearth — a man and a woman with two and a half children on average — burning
          their flour at 2,500, 2,000 and 1,600 kcal per day respectively. Across the default twenty households,
          this is some <span className="font-mono text-[var(--color-ink-500)]">5.4 million kcal each month</span>, the sum
          of which the granary must answer. Hunger is calculated monthly; persistent deficit is recorded as <em>severe</em>
          when it exceeds a fifth of caloric need.
        </p>
      </Section>

      <Section icon={<Beef className="w-5 h-5" />} title="II · The Beasts of Burden" tone="amber">
        <p>
          Each household keeps roughly two oxen, two cows and four sheep — engines of the plough and the dairy pail.
          In the growing months they walk to the commons, fallow and pasture; in the winter, every mouthful must come
          from harvested hay and oats.
        </p>
        <ul className="mt-3 space-y-2 list-none">
          <FactRow term="Cattle lifecycle" def="Cows calve at 3; productive at 4. Maximum age ~10 years. Old or surplus cattle are culled at autumn; calves beyond replacement are slaughtered for meat." />
          <FactRow term="Winter feed" def="A grown ox demands 3 bushels of oats and ½ ton of hay each month. A cow, 2 bushels of oats and ½ ton of hay. Calves and yearlings, less." />
          <FactRow term="Sheep cycle" def="Sheep forage on stubble for the first three winter months, then receive half hay rations, and finally full stall‑feeding in deep winter." />
          <FactRow term="Feed shortfall" def="When the hay runs out, cattle must consume 10× equivalent in oats. When the oats run out — livestock perish." />
        </ul>
      </Section>

      <Section icon={<Sprout className="w-5 h-5" />} title="III · Dairy, Meat & Wool" tone="amber">
        <ul className="space-y-2 list-none">
          <FactRow term="Dairy" def="A producing cow yields ~35,000 kcal/month in milk, butter and cheese in summer. Sheep ewes about 2,500 kcal/month. Winter milk drops by 65%." />
          <FactRow term="Autumn cull" def="The autumn slaughter of old and surplus animals preserves hundreds of thousands of kcal as salted, smoked or potted meat — eaten through the winter at 15 %/mo spoilage." />
          <FactRow term="Emergency cull" def="When all stores are exhausted, sheep are slaughtered live for 40,000 kcal each — a desperate last measure." />
          <FactRow term="Wool" def="1.5 lbs per sheep per year, sheared at Whitsuntide. Roughly 3 lbs yields a yard of broadcloth." />
        </ul>
      </Section>

      <Section icon={<Flame className="w-5 h-5" />} title="IV · Hearth & Fuel" tone="amber">
        <p>
          Cooking, brewing and surviving freezing nights all demand fuel — gathered as wood, peat, turf or dung from
          the lord's common woodland. Fuel is measured in stacked volume (m³, i.e., stere), then converted to energy:
          <span className="font-mono text-[var(--color-ink-500)]"> 1 m³ × 340 kg/m³ × 15,000 kJ/kg = 5.1 GJ gross</span>.
          Only 45% is treated as usable household heat in a medieval hearth, so default useful heat is
          <span className="font-mono text-[var(--color-ink-500)]"> ~2.3 GJ/m³</span>.
        </p>
        <p className="mt-2 italic text-[var(--color-ink-300)]">
          When the wood pile fails, the body must heat itself with food: winter caloric needs rise by up to 30 % in
          a cold hearth, and 10 % in a summer one starved of fire for cooking.
        </p>
      </Section>

      <Section icon={<Wheat className="w-5 h-5" />} title="V · The Furrows" tone="orange">
        <ul className="space-y-2 list-none">
          <FactRow term="Three‑field rotation" def="One third of all arable lies fallow each year. The remaining 'active acres' are split between wheat, barley, oats and cultivated hay-meadow." />
          <FactRow term="Wheat" def="~8 bu/ac at 60 lbs and 1500 kcal/lb — the bread grain." />
          <FactRow term="Barley" def="~10 bu/ac — brewed into ale that supplies the village's daily ration of liquid calories (~20 % of intake)." />
          <FactRow term="Oats" def="~10 bu/ac — primary animal feed; a humble human fallback in famine." />
          <FactRow term="Hay" def="~1.2 tons/ac — cut from meadow strictly for winter feed." />
          <FactRow term="Seed grain" def="Strictly protected from consumption. Wheat: 2 bu/ac, barley: 2.5, oats: 4. The next year's harvest depends on it." />
          <FactRow term="Spoilage" def="Geometric decay in storage — 3 %/month for grain, 5 %/month for hay." />
          <FactRow term="Tithe & manufactures" def="Tithes (~10%) and non‑cloth manufactures (~5%) absorb a default 15 % of every grain and wool harvest." />
          <FactRow term="Fuel unit" def="The simulator now uses stacked cubic metres instead of cartloads. For comparison: 1 cord ≈ 3.62 m³ stacked wood." />
          <FactRow term="Fuel to heat" def="Gross wood energy is reduced by combustion and transfer losses; net usable household heat defaults to 45% of gross energy." />
          <FactRow term="Monte Carlo variability" def="Yields randomise yearly via Box–Muller normal distribution with default σ = 15%. The simulation runs 100 independent five‑year lives." />
        </ul>
      </Section>

      <Section icon={<Wheat className="w-5 h-5" />} title="VI · Food, Fodder & Energy Accounting" tone="green">
        <ul className="space-y-2 list-none">
          <FactRow term="Mass conversion" def="All grains are convertible to weight using standard bushel masses (wheat 60 lb, barley 48 lb, oats 32 lb)." />
          <FactRow term="Volume conversion" def="Plant foods (grain, hay, pulses where present) are convertible to volume and mass; meat and dairy remain mass/energy only due to product heterogeneity." />
          <FactRow term="Animal energy classes" def="Feed energy is partitioned into ruminant-only (fibrous hay), animal-usable without processing (oats, screenings), and human-only pathways." />
          <FactRow term="Human processing" def="Barley-to-ale applies a configurable processing loss (default 12% energy loss); 85% of processing residue is counted as animal-usable waste feed." />
          <FactRow term="Human direct energy" def="Wheat and part of barley are convertible to direct human food energy without brewing; model tracks this separately from processed pathways." />
        </ul>
      </Section>

      <Card>
        <CardHeader title="The Simulator's Inner Workings" subtitle="A monthly tick of the manorial clock" icon={<ScrollText className="w-5 h-5" />} />
        <ol className="space-y-2 text-[0.86rem] text-[var(--color-ink-400)] list-decimal pl-5 marker:font-bold marker:text-[var(--color-crimson-500)] marker:font-[var(--font-display)]">
          <li><strong>Age the herd</strong> and, in spring, calve cows and lamb ewes.</li>
          <li><strong>Plant seed</strong> in month 1: the seed corn is locked away from human consumption.</li>
          <li><strong>Shear sheep</strong> in early summer (month 3) for wool, taxed at the tithe rate.</li>
          <li><strong>Harvest</strong> at the close of the growing season: yields multiplied by a random factor and tithe deducted.</li>
          <li><strong>Autumn cull</strong> of old cattle and surplus calves into preserved meat.</li>
          <li><strong>Burn fuel</strong> for the household. If short, caloric needs rise.</li>
          <li><strong>Eat dairy and meat</strong> first; then ale (up to 20 % of need); then wheat; then barley; then oats; then emergency sheep.</li>
          <li><strong>Feed livestock</strong> in winter — hay first, then oats. Shortfall kills beasts.</li>
          <li><strong>Spoilage</strong> takes its share of all stores.</li>
          <li><strong>Record</strong> the month, advance the clock.</li>
        </ol>
      </Card>
    </div>
  );
}

function Section({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: 'green' | 'amber' | 'orange'; children: React.ReactNode }) {
  const accent = tone === 'green' ? '#5a7745' : tone === 'amber' ? '#b8860b' : '#c46a1a';
  return (
    <div className="parchment ornate-border">
      <div className="relative p-5">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[rgba(120,80,30,0.25)]" style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 12 }}>
          <span style={{ color: accent }}>{icon}</span>
          <h3 className="font-[var(--font-display)] uppercase tracking-[0.16em] text-[0.9rem] font-bold text-[var(--color-ink-500)]">{title}</h3>
        </div>
        <div className="text-[0.92rem] text-[var(--color-ink-400)] leading-relaxed space-y-2">{children}</div>
      </div>
    </div>
  );
}

function FactRow({ term, def }: { term: string; def: string }) {
  return (
    <li className="flex gap-3 items-baseline">
      <span className="text-[var(--color-gold-700)] mt-1">❧</span>
      <div>
        <span className="font-[var(--font-display)] uppercase tracking-[0.08em] text-[0.78rem] font-semibold text-[var(--color-ink-500)]">{term}</span>
        <span className="text-[var(--color-ink-400)]"> — {def}</span>
      </div>
    </li>
  );
}
