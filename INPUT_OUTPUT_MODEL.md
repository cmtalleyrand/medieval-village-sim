# Medieval Village — Input/Output (Physical) Model Specification

*Specification document. Defines the physical input–output model of the village
economy: stocks, flows, conversion rates, and biological/agronomic parameters —
independent of the decision-making layer (planner, rotation choice, rationing,
culling policy), which is deliberately deferred until this layer is agreed.*

---

## 0. Purpose, Scope, and Process

### 0.1 Purpose

This document specifies the **physical** model of the village economy: what
exists (land, crops, animals, people, stores), how it grows/produces/consumes
over time, and the conversion factors between physical quantities (acres,
bushels, tons, kg dry matter, MJ/kcal, head of livestock, lbs of wool, etc.).

It deliberately excludes **decisions**: which rotation to run, how much to
cull, how to ration stores under shortage, how land is allocated between
uses. Those live in a separate decision-making model (rotation/planner/
rationing/culling), to be specified only after this layer is solid. Where the
two layers interface (e.g. "rotation chooses how much arable land becomes
temporary pasture this month"), this document specifies the **physical
consequence** of that choice (e.g. "temporary arable pasture yields X% of
permanent pasture"), not the choice itself.

### 0.2 In Scope (this document)

- Land categories and area accounting
- Crops (growth, maturity, yield, straw)
- Soil fertility (depletion/recovery mechanics)
- Livestock biology (reproduction, growth, lifespan, lactation — as biology,
  not cull policy)
- Feed and forage (dry-matter and caloric currencies, intake requirements,
  pasture/hay/grain supply)
- Animal products: dairy → cheese, meat → salted meat, wool → cloth
- Human diet and caloric/material demand
- Fuel (woodland yield and consumption need)
- Storage and spoilage (cross-cutting)

### 0.3 Explicitly Out of Scope — Designed as Clean Future Seams

These are **not** silently omitted. Where they interface with the I/O model,
the interface is named so the seam can be filled in later without rework:

- **Human labour budget** (plowing capacity, spinning capacity, harvest
  labour, etc.) — currently treated as either unconstrained or as a fixed
  conversion-capacity parameter (e.g. spinning bottleneck in §6) until a full
  labour model exists.
- **Human population dynamics** (births, deaths, starvation-driven mortality)
  — population is an exogenous input to this model; diet/shortage outputs are
  designed to be consumable by a future demographic model.
- **Weather** — yield variability is currently an exogenous stochastic shock
  (see `ASSUMPTIONS.md` C1/C2); a physical weather model is a future seam.

### 0.4 Further Out (Not Yet Designed For)

- Soil nutrient chemistry (beyond the depletion/recovery scalar in §3)
- Disease (crops, livestock, humans)

### 0.5 Epistemic Status Tags

Every value or rule in this document carries one of the following tags:

| Tag | Meaning |
|---|---|
| **[AGREED]** | Confirmed by the user; locked unless explicitly revisited |
| **[DERIVED]** | Follows by calculation/logic from [AGREED] values; shown with derivation |
| **[PROPOSED]** | A candidate value/rule offered for the user's decision, with sourcing |
| **[CARRIED OVER]** | A value/rule that exists in `SIMULATION_MODEL.md`, `ASSUMPTIONS.md`, or `defaults.ts` but has **not yet been ratified** for this model — listed as a starting point for discussion, not a default |
| **[UNCONFIRMED]** | Open question, no candidate yet |
| **[PENDING]** | Section/topic not yet reached in the batch process |

### 0.6 Process Rules (restated for this document's maintenance)

- No changes to `simulation.ts` or other code until this document is complete
  and agreed.
- Subsystems are worked **batch by batch**: each batch presents current
  values + sources + first-principles derivation, then asks specific
  confirming questions. No bulk confirmation, no silent defaults.
- If the user appears to contradict an earlier [AGREED] item, ask for
  clarification rather than assume contradiction or silently overwrite.
- All agreed decisions are logged in Appendix C (Decision Log) with the date
  and a one-line rationale.

---

## 1. Land

### 1.1 Categories — [AGREED]

Four permanent land categories (carried over from `SIMULATION_MODEL.md` §1,
ratified for this model):

| Category | Physical role |
|---|---|
| **Arable** | Subject to rotation (crops + fallow). The only category whose *use* varies month to month and year to year. |
| **Permanent pasture** | Never plowed. Provides grazing (seasonal) and can yield a hay cut when ungrazed. **Newly added as a genuine independent category** — previously unimplemented. |
| **Meadowland** | Permanently wet, low-lying. Never plowed. One hay cut at Midsummer; aftermath grazed in autumn. Maintained by seasonal flooding (fertility independent of the arable fertility model). |
| **Woodland** | Managed coppice/scrub for fuel. Fixed annual yield per acre. |

**[AGREED]**: Meadowland's area is specified as a **fixed percentage of overall
village land**, not an independent absolute figure — i.e. it scales with
village size rather than being pinned to a constant acreage. The exact
percentage and the definition of "overall land" are open (Batch 1, below).

**[AGREED]**: Permanent pasture is a genuinely separate category from
meadowland and from arable-derived "temporary pasture" (fallow/stubble
grazing). Its area-determination rule is open (Batch 1, below).

### 1.2 Area Determination & Accounting — [AGREED]

**Accounting structure** [AGREED]: All four categories are independent area
parameters. Total village land is a pure accounting sum:

```
totalVillageLandAcres = arableAcres + permanentPastureAcres + meadowAcres + woodlandAcres
```

No category is a "target" to hit; this is bookkeeping only. (Note: `arableAcres`
corresponds to the current `totalAcres` parameter in `defaults.ts` — a naming
clarification for a future code change, not a modelling decision, and out of
scope for this document.)

**Meadow area** [AGREED]: `meadowPct = 7.5%` (midpoint of the previously cited
5–10% range). To avoid circularity (meadow being a % of a total that includes
meadow itself), meadow is defined as 7.5% of the *other three* categories
combined:

```
meadowAcres = meadowPct × (arableAcres + permanentPastureAcres + woodlandAcres)
            = 0.075 × (arableAcres + permanentPastureAcres + woodlandAcres)
```

[DERIVED — technical resolution, not a separate decision]: This differs from
a strict self-referential "7.5% of grand total" by less than 1 percentage
point (7.5% vs. ≈8.1% of the grand total), well within the precision implied
by choosing a range-midpoint. If this distinction ever matters it can be
revisited, but it is not load-bearing.

**Permanent pasture area** [AGREED]: `permanentPastureAcres` is an
independent area parameter, on equal footing with arable/meadow/woodland.
This document does **not** prescribe its numeric value or a fixed percentage.
Its value is determined outside this physical-model document, by one of two
modes (interface to the decision-making layer):

- **User-specified mode**: the scenario designer sets `permanentPastureAcres`
  directly, exactly as for the other three categories.
- **Solver mode**: the planner (deferred decision-making document) computes
  the minimum `permanentPastureAcres` such that the village's winter feed
  balance closes — i.e., total dry-matter/caloric supply from permanent
  pasture + meadow + arable hay/straw + grain (§5) meets total winter intake
  requirement for the target herd, without shortfall.

This is the formal seam between this document and the planner: §5 (Feed &
Forage) must define permanent pasture's DM/kcal yield per acre by season so
that the solver-mode objective function above is computable; this document
stops at defining that yield function, and does not run the solver.

**Woodland and arable areas**: both remain independent parameters as in the
current implementation (`woodlandAcres`, `arableAcres` ≡ current `totalAcres`)
— no change from current practice, restated here for completeness of the
accounting identity above.

### 1.3 Temporary Arable Pasture — [CARRIED OVER]

`SIMULATION_MODEL.md` §1 proposes: arable land between courses (or after a
course ends early in a long season) can be laid to grass; productivity = 80%
of permanent pasture. This is a **forage-yield** question, not a land-area
question — it will be addressed in the Feed & Forage batch (§5), where
permanent pasture's own yield is established first.

---

## 2. Crops — [AGREED]

**[AGREED]**: The spring-crop course has **three distinct members** — barley,
oats, and legumes — each with independent yield/growth/maturity parameters.
Legumes are not a residual of a barley/oats split; they are a first-class crop
with their own acreage.

### 2.1 Growth-unit rates and maturity — [AGREED]

| Crop | Spring | Long-summer | Autumn | Winter | Deep-winter | Maturity (GU) | Harvest timing (9/3 calendar) |
|---|---|---|---|---|---|---|---|
| Wheat | 0.7 | 1.0 | 0.7 | 0.15 | 0.0 | 5.95 | ~GM5–6 (sown previous autumn) |
| Barley | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 | 5.10 | ~GM7 |
| Oats | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 | 4.40 | ~GM6 |
| Legumes | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 | **5.80** | **~GM8** |

Wheat/barley/oats confirmed as-is (`[CARRIED OVER]` from `SIMULATION_MODEL.md`
§4.1, now ratified).

Legumes (peas/beans/vetches) **[AGREED, sourced]**: same seasonal GU pattern
as oats/barley (spring-sown, no overwintering). Maturity = 5.80 GU = 2 spring
months (1.4) + 3 summer months (3.0) + 2 autumn months (1.4), harvest ~GM8 —
**one month later than barley**. This reflects the historically documented
harvest order: wheat/rye first (~early Aug), barley/oats next (~mid–late
Aug), and **peas/beans/vetches harvested last** (~Sept), since their pods
needed full field-drying before lifting.

*Interface note to the decision-making layer*: a GM8 harvest leaves only GM9
before winter for stubble grazing/temporary pasture on legume fields,
compared to 2 months for barley. The rotation/scheduling document will need
to account for this.

### 2.2 Yield, caloric content, and seed rate — [AGREED]

| Crop | Yield (bu/acre, gross of seed) | kcal/bu | Seed rate (bu/acre) | Seed:yield ratio |
|---|---|---|---|---|
| Wheat | 10 | 90,000 (60 lb × 1500 kcal/lb) | 2.5 | 4:1 |
| Barley | 12 | 75,000 (50 lb × 1500 kcal/lb) | 4 | 3:1 |
| Oats | 12 | 38,000 (32 lb × ~1190 kcal/lb) | 4 | 3:1 |
| Legumes | **9** | **90,000** (60 lb × ~1500 kcal/lb) | **3** | **3:1** |

Wheat/barley/oats confirmed as-is (`[CARRIED OVER]`, now ratified) — their
3:1–4:1 seed:yield ratios match the commonly-cited medieval range (vs.
~20:1+ modern), a useful consistency check, and the underlying yields (10–12
bu/acre) fall within the documented historical range (wheat/barley/rye/oats
net yields spanning roughly 4–16 bu/acre across manors and years).

Legumes **[AGREED, sourced]**: yield = 9 bu/acre (midpoint of sourced 8.5–10
bu/acre range, itself derived from a 3 bu/acre seeding rate); seed rate = 3
bu/acre (directly sourced: "oats, peas and beans" conventionally sown at 3
bu/acre, vs. barley at 4); kcal/bu = 90,000, using the same 60 lb/bu × ~1500
kcal/lb basis as wheat (USDA dried peas/beans ≈ 1547 kcal/lb, close to the
1500 figure already used for wheat).

### 2.3 Straw/haulm ratios — [AGREED]

**[AGREED — revises prior carried-over figures]**: straw/haulm-to-grain
ratios by dry weight:

| Crop | Straw/haulm : grain |
|---|---|
| Wheat | 1.2 : 1 |
| Barley | 1.0 : 1 |
| Oats | 1.5 : 1 |
| Legumes | 1.8 : 1 |

This supersedes the `SIMULATION_MODEL.md` §4.4 figures (wheat 1.5:1,
barley/oats 1.2:1), which are now superseded — flagged per R7 (surface
conflicts, don't average): `SIMULATION_MODEL.md` §4.4 should be updated to
match this document when the two are reconciled.

### 2.4 Legume end-use split — scope open, deferred to §3

The legume end-use split (fraction of the crop grazed-in-field / plowed-in
green vs. harvested for grain) still needs its **scope** confirmed (single
village-wide parameter vs. field/rotation-specific) and its **numeric
value**. Both are deferred to the §3 (Soil Fertility) batch, where the
parameter's effect (on `d_legumes`) will be defined alongside it.

---

## 3. Soil Fertility — PENDING

`SIMULATION_MODEL.md` §3 contains a candidate depletion/recovery mechanic and
per-crop depletion rates (`[CARRIED OVER]`, not yet ratified for this model).
This batch depends on §2 (Crops, for per-crop depletion drivers) and §5
(Feed & Forage / Livestock, for grazing-manure recovery inputs), so it will be
addressed after those.

---

## 4. Livestock Biology — PENDING

Scope: species set (cattle — oxen/cows/bulls/calves/young stock; sheep —
ewes/rams/lambs), and for each: gestation length, lactation curve and
duration, growth/maturation timeline, mortality/lifespan, herd-composition
ratios (e.g. bulls per cow) — as **pure biology**, independent of cull policy.

`SIMULATION_MODEL.md` §5 contains relevant candidate values but mixes biology
with cull-policy rules (`[CARRIED OVER]`, to be separated before ratification).

---

## 5. Feed & Forage — Framework [AGREED], values PENDING

**[AGREED] — Two-currency model**: Every feed type (grain, hay, straw, pasture
grass, meadow grass/hay, winter plant growth) is characterized by:
1. kg dry matter (DM) per unit (e.g. per acre-month, per ton, per bushel)
2. MJ (or kcal) per kg DM

Animal intake requirements are expressed in **both** currencies
simultaneously (a kg-DM requirement and a caloric requirement), derived from
historical stocking density (acres of pasture per animal) and recorded winter
feed rations — not from a single abstracted "feed unit."

**[AGREED] — Sheep winter grazing offset**: Sheep can graze normal
(non-deep) winter plant growth, not just hay. This can offset:
- up to **100%** of the hay ration in a **normal winter** month
- **0%** of the hay ration in a **deep winter** month

(This revises the prior `S4` assumption in `ASSUMPTIONS.md`, which gave sheep
3 months of free foraging then half/full hay rations on a fixed timeline,
unrelated to actual winter-severity classification.)

Open (future batch, after §1 area accounting and §4 livestock biology are
settled): MJ/kg DM and kg DM per acre/ton for each feed type; per-species DM
and caloric intake requirements (including pregnant/lactating multipliers);
permanent-pasture and meadow DM yield by season; whether/how the winter-
grazing-offset logic extends to cattle (currently only specified for sheep);
the temporary-arable-pasture productivity factor (§1.3).

---

## 6. Animal Products — Chain scope [AGREED], values PENDING

**[AGREED]**: The full product chain is in scope and will be modelled
end-to-end:

```
Cow/ewe milk  →  Cheese (storage form)
Cull meat     →  Salted meat (storage form)
Wool          →  Cloth   (subject to a spinning-capacity bottleneck)
```

The spinning-capacity bottleneck means cloth output is constrained by
available spinning labour/capacity, not solely by wool supply — this is the
one place in this document where a labour-capacity parameter is treated as a
first-class I/O constraint (see §0.3 on the labour seam: here it's
operationalized as a fixed per-household/per-person conversion-capacity
parameter, pending the full labour model).

Open (future batch): milk→cheese conversion ratio and the storage
profile of cheese vs. raw milk (spoilage rates differ — see §9); meat→salted
meat conversion ratio, salt input requirement, and storage life; wool→cloth
conversion rate and the spinning-capacity parameter's value and seasonality.

---

## 7. Human Diet & Demand — PENDING

Candidate starting points exist (`[CARRIED OVER]`, not yet ratified):
- Per-capita daily kcal by demographic: male 2500, female 2000, child 1600
  (`defaults.ts`)
- Diet composition / food-priority order and caps (bread, ale ≤20%, dairy,
  meat ≤15%, gruel) — `SIMULATION_MODEL.md` §7, `ASSUMPTIONS.md` §1.4. Note:
  some of these caps (e.g. the ale demand range) may belong to the
  decision-making layer rather than the physical I/O model — to be examined
  when this batch is reached.

---

## 8. Fuel — PENDING

Candidate starting points exist (`[CARRIED OVER]`, not yet ratified):
woodland fuel yield per acre, per-household fuel demand by season
(summer/winter/deep-winter cartloads/month), fuel energy content / cartload
definition, non-spoiling storage (`defaults.ts`, `ASSUMPTIONS.md` §1.7).

---

## 9. Storage & Spoilage (cross-cutting) — Partially [AGREED]

**[AGREED]**: Spoilage rates are revised down from the prior 3%/month (grain)
and 5%/month (hay) to more realistic figures:

| Stock | Old rate (`[CARRIED OVER]`, superseded) | New rate **[AGREED]** |
|---|---|---|
| Grain (wheat/barley/oats) | 3%/month | **~0.7%/month** |
| Hay | 5%/month | **~2%/month** |

Open (future batch): spoilage rates for the new product forms introduced in
§6 (cheese, salted meat — both are *preservation* forms expected to spoil
**more slowly** than their raw inputs, which is part of their economic
rationale) and for straw, wool, and cloth (currently zero/undocumented per
`ASSUMPTIONS.md` C9, W4).

---

## Appendix A — Future Seams (restated, see §0.3)

- Human labour budget
- Human population dynamics
- Weather

## Appendix B — Further Out (restated, see §0.4)

- Soil nutrient chemistry
- Disease

## Appendix C — Decision Log

*Chronological record of agreed decisions. Each entry: date, section, decision, one-line rationale.*

| Date | Section | Decision | Rationale |
|---|---|---|---|
| 2026-06-13 | §2 | Spring-crop course = barley + oats + legumes, three distinct members | Legumes are agronomically and nutritionally distinct (N-fixation, food/feed/fertility role); modelling as a residual of barley/oats would hide this |
| 2026-06-13 | §6 | Full dairy→cheese, meat→salted meat, wool→cloth chains in scope, incl. spinning bottleneck | These are the actual storage/consumption forms historically used; raw milk/fresh meat are not viable stores |
| 2026-06-13 | §5 | Sheep winter grazing offsets hay ration: 100% in normal winter, 0% in deep winter | Sheep graze short swards that cattle cannot exploit efficiently; normal-winter plant growth (already tracked by the model) is a real feed source |
| 2026-06-13 | §9 | Spoilage revised to ~0.7%/month grain, ~2%/month hay | Prior 3%/5% rates were too high for properly stored medieval grain/hay and would understate viable stock-carrying capacity |
| 2026-06-13 | §1.1 | Permanent pasture added as a genuine independent land category; meadow area = fixed % of overall land | Permanent pasture was previously absent from the model entirely; meadow's area should scale with village size rather than being pinned |
| 2026-06-13 | §1.2 | All four land categories are independent parameters; total village land = sum of all four (pure accounting identity) | Geography (land categories) is fixed independently of rotation/herd decisions; conflating "total" with a target or residual would blur the I/O vs. decision-making split |
| 2026-06-13 | §1.2 | meadowPct = 7.5% of (arable + permanent pasture + woodland) | Midpoint of the previously cited 5-10% range; defined non-circularly against the other three categories |
| 2026-06-13 | §1.2 | permanentPastureAcres is an independent parameter with no prescribed value/%; set either directly by the user or by the planner solver to satisfy the §5 winter feed balance | Permanent pasture's "correct" size is fundamentally a feed-sufficiency question (how much grazing land does the target herd need to survive winter), which belongs to §5 + the decision-making layer, not a geographic ratio fixed here |
| 2026-06-13 | §2.1/2.2 | Wheat/barley/oats GU rates, maturity (5.95/5.10/4.40), yields (10/12/12 bu/acre), seed rates (2.5/4/4), kcal/bu (90000/75000/38000) confirmed as-is | Seed:yield ratios (4:1/3:1/3:1) match the documented medieval 3:1-4:1 range; yields fall within documented historical 4-16 bu/acre range |
| 2026-06-13 | §2.1 | Legume maturity = 5.80 GU, harvest ~GM8 (one month after barley), same GU pattern as oats/barley | Sourced harvest-order evidence: peas/beans/vetches were historically the LAST crop harvested, after wheat and after barley/oats |
| 2026-06-13 | §2.2 | Legume yield = 9 bu/acre, kcal/bu = 90,000, seed rate = 3 bu/acre | Sourced: 8.5-10 bu/acre from 3 bu/acre seed (midpoint=9); 60 lb/bu matches wheat; USDA dried peas/beans ≈ 1547 kcal/lb ≈ wheat's 1500 basis |
| 2026-06-13 | §2.3 | Straw/haulm:grain ratios revised to wheat 1.2:1, barley 1.0:1, oats 1.5:1, legumes 1.8:1 | User-specified, supersedes SIMULATION_MODEL.md §4.4 figures (wheat 1.5:1, barley/oats 1.2:1) — flagged for reconciliation in that document |

