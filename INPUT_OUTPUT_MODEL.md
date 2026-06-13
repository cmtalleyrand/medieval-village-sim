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

## 3. Soil Fertility

### 3.1 Depletion and recovery mechanics

Each arable parcel carries a `fertility` scalar. Every month:

```
if cropped:    fertility -= d(crop, splitFraction) × CROP_GROWTH_RATE[crop][season]
if uncropped:  fertility += r × GU-equivalent[season/winterType] × (1 - fertility)
```

### 3.2 Per-crop depletion rates (d) — [PROVISIONALLY CONSISTENT]

| Crop | d (per GU) |
|---|---|
| Wheat | 0.040 |
| Barley | 0.028 |
| Oats | 0.022 |
| Arable hay (aftermath) | 0.010 |
| Legumes | `0.005 − 0.015 × splitFraction` (see 3.3) |

**[PROVISIONALLY CONSISTENT, final check deferred]**: these values (carried
over from `SIMULATION_MODEL.md` §3, wheat/barley/oats/hay-aftermath
unchanged) were sense-checked using the simplified §3.3-style equilibrium
method (see worked examples below) and produce a stable, non-degenerate
f* ≈ 0.60–0.66 across plausible spring-course mixes and legume
`splitFraction` values — not pinned at 0 or 1. The **exact** equilibrium f*
for the actual rotation requires the month-by-month activity ledger
(decision-making document, `SIMULATION_MODEL.md` §2); d-values and r may
receive a final tweak at that point if the exact f* turns out to need
adjustment. Until then, these values are usable for modelling purposes.

### 3.3 Legume depletion model — [AGREED]

```
d_legumes = 0.005 − 0.015 × splitFraction
```

where `splitFraction` ∈ [0, 1] = fraction of the legume crop grazed-in-field
or plowed-in-green (vs. harvested for grain). At splitFraction=0 (fully
harvested), d=+0.005 (slight net depletion — grain export removes some fixed
N despite nodule fixation). At splitFraction=1 (fully grazed/plowed-in),
d=−0.010 (net soil improvement). Linear interpolation in between — chosen over
the originally-proposed binary 50% threshold to avoid an unphysical
discontinuity.

**[AGREED]**: `splitFraction` is an **independent parameter**, on the same
footing as `permanentPastureAcres` (§1.2) — this document does not prescribe
its value. It is set either directly by the user (non-solver mode) or by the
planner/solver (solver mode), per the same interface pattern established in
§1.2.

### 3.4 Recovery rate (r) — [PROVISIONALLY CONSISTENT]

`r = 0.11` (carried over, uniform across all uncropped/fallow land).
Sense-checked jointly with the d-values above (see 3.6); not independently
revised. Final value deferred to the rotation/activity-ledger work, same as
3.2.

### 3.5 Equilibrium fertility (f*) and PLANNER_AVG_FERTILITY — [AGREED]

**[AGREED]**: `f*` (equilibrium fertility under a given rotation) and
`PLANNER_AVG_FERTILITY` are **not fixed constants in this I/O document**.
They are **emergent outputs of the decision-making/planner layer**, computed
by applying the depletion function `d(crop, GU, splitFraction)` (3.2–3.3) and
recovery function `r × GU-equivalent × (1−f)` (3.1, 3.4) to whatever rotation
the planner selects. This resolves the `SIMULATION_MODEL.md` §3.2 TODO:
instead of hardcoding `PLANNER_AVG_FERTILITY ≈ 0.70`, the planner computes it
from the chosen rotation's depletion/recovery balance.

### 3.6 Yield/fertility anchor — [AGREED]

**[AGREED — re-anchors the yield formula, no change to any agreed crop
value]**:

```
yield = baseYield × (fertility / f*)
```

(previously: `yield = baseYield × fertility`)

**Rationale**: the Batch 2 bu/acre figures (wheat=10, barley=12, oats=12,
legumes=9) were validated against *documented historical realized yields*.
With the old formula and f* ≈ 0.60–0.66, the model's long-run realized yield
would sit at ~60–66% of those figures (e.g. ~6 bu/acre wheat) — roughly 35%
below the historical record just used to validate them. Re-anchoring so that
`fertility = f*` (equilibrium) ⟺ `yield = baseYield` makes the Batch 2 figures
represent yield *at equilibrium*, consistent with how they were sourced.

Under this anchor: `fertilityFloor = 0.40` → yield ≈ `0.40/f* ≈ 65%` of
baseline (depleted soil); `initialFertility = 0.85` → yield ≈
`0.85/f* ≈ 137%` of baseline (fresh/good soil at simulation start) — both
physically sensible. This is a **formula change for the eventual code-change
phase**; no simulation.ts edits are made now (per process rules, §0.6).

### 3.7 Worked sense-check examples (for reference)

Using `f* = 1 − (wheat_depletion + spring_depletion) / (r × 8.1)`, extended to
3 spring-course crops:

| Spring mix scenario | spring_depletion | f* |
|---|---|---|
| 1/3 barley, 1/3 oats, 1/3 legumes, splitFraction=0.5 | 0.0750 | 0.65 |
| Same, splitFraction=1.0 | 0.0605 | 0.66 |
| Same, splitFraction=0.0 | 0.0895 | 0.63 |
| No legumes, 50/50 barley/oats (original 2-crop case) | 0.1198 | 0.60 |

The bottom row reproduces the original `SIMULATION_MODEL.md` §3.3 estimate
exactly, confirming the extension to 3 crops is consistent with the prior
2-crop derivation.

### 3.8 Legume end-use split — resolved

The scope question from §2.4 is resolved by 3.3 above: `splitFraction` is a
single independent parameter (solver/user-determined), used identically by
both the soil-fertility effect (this section) and any human-diet/feed
accounting that depends on how much legume grain reaches storage vs. stays in
the field (§5, §7).

---

## 4. Livestock Biology

Scope: species set (cattle — oxen/cows/bulls/calves; sheep — ewes/rams/lambs),
and for each: gestation length, lactation curve and duration, growth/
maturation timeline, mortality/lifespan, herd-composition ratios — as **pure
biology**, independent of cull policy (§5.3 of `SIMULATION_MODEL.md`, deferred
to the decision-making model).

### 4.1 Cattle reproductive biology — [AGREED, carried over]

| Parameter | Value | Source |
|---|---|---|
| Gestation (`COW_GESTATION`) | 9 months | Cattle gestation ≈ 283 days ≈ 9.3 months — standard bovine biology |
| Calf weaning (`COW_CALF_WEAN_MONTHS`) | 2 months | Calf nurses exclusively for 2 months; human milking begins month 3 |
| Lactation duration (`COW_LACTATION_MAX`) | 10 months | Matches the standard 305-day lactation |
| Lactation curve | Peak at month 3 (first month post-weaning), linear decline to dry at month 10 | `cowMilkKcal()` |
| Postpartum infertile period | **2 months** | See resolution below |
| Minimum calving interval (`COW_MIN_CYCLE`) | 12 months (annual calving) | Biological minimum is gestation+postpartum = 11 months; medieval practice was once-yearly calving |
| Breeding age (cow & bull) | 24 months (2 years) | `ageMonths >= 24` gate in reproduction logic |
| Calf sex ratio | 50/50 | Standard mammalian sex ratio |

**Postpartum-infertility resolution [AGREED, R7 — surfaced conflict]**: `SIMULATION_MODEL.md` §5.1 prose states "COW_POSTPARTUM ≈ 3 months," but the actual code constant `COW_POSTPARTUM_INFERTILE = 2` and the code's own derivation comment ("Biological minimum would be ... 9+2=11") both use 2 months. The 2-month figure is internally consistent and is also biologically standard (cows can resume cycling ~30-60 days postpartum). **The 3-month figure in `SIMULATION_MODEL.md` §5.1 is superseded** and should be corrected there.

Sourced: cow gestation (283 days) and standard 305-day lactation are well-established veterinary/dairy-science facts, not medieval-specific — used as-is.

### 4.2 Cattle growth, maturation & lifespan — [AGREED]

Three different lifespan/maturation figures previously existed across the codebase and were mutually inconsistent (`simulation.ts`'s shared `CATTLE_MAX_LIFESPAN=120mo` for cows/oxen/bulls; `SIMULATION_MODEL.md` §5.1 prose's "ages 4–10" / `COW_PRODUCTIVE_LIFESPAN≈96mo`; and historical evidence of a ~7-year working-ox lifecycle). Per [Medievalists.net — Horse vs Ox in Medieval Times](https://www.medievalists.net/2023/02/horse-ox-medieval-times/), steers were bought/trained at ~3 years, worked ~4 years, and sold for beef at ~7 years — a working ox's effective lifespan is **shorter** than a breeding cow's because hard labour wears the animal down faster than it biologically ages.

**[AGREED]** — oxen/bulls and cows have **distinct** maturation/lifespan parameters, resolving both the historical mismatch and the internal inconsistency (the old 120mo cull age silently contradicted the herd-stability formula's own 96mo assumption):

| Parameter | Value | Rationale |
|---|---|---|
| `OX_BULL_WORKING_AGE` | 36 months (3 yr) | Matches code's existing "active oxen" gate and the historical "bought at ~3yr" evidence |
| `OX_BULL_MAX_AGE` (cull age) | 84 months (7 yr) | Matches historical "worked ~4yr, sold for beef at ~7yr" — oxen are physically used up faster than cows age |
| `COW_MAX_AGE` (cull age) | 96 months (8 yr) | Restores consistency with the herd-stability formula's existing `COW_PRODUCTIVE_LIFESPAN=96mo`, which the old 120mo cull age silently contradicted |

`CATTLE_MAX_LIFESPAN=120` and `SIMULATION_MODEL.md` §5.1's "ages 4–10" / `OX_WORKING_LIFESPAN=72mo` framing are superseded by this table (R7 — surfaced conflict, flagged for correction in `SIMULATION_MODEL.md`).

### 4.3 Sheep reproductive biology — [AGREED, carried over]

| Parameter | Value | Source |
|---|---|---|
| Gestation (`EWE_GESTATION`) | 5 months | ≈147 days — standard ovine gestation |
| Lactation duration (`EWE_LACTATION_MAX`) | 4 months | Within the documented 90–150 day (3–5 month) range for non-dairy ewes ([Penn State Extension](https://extension.psu.edu/milking-sheep-production)) |
| Lactation curve | Full yield months 1–2, half yield months 3–4, then dry | `eweMilkKcal()` |
| Postpartum infertile period (`EWE_POSTPARTUM_INFERTILE`) | 2 months | Biological minimum cycle = gestation+postpartum = 7 months |
| Minimum lambing interval (`EWE_MIN_CYCLE`) | 12 months (annual lambing) | Medieval practice was once-yearly lambing, well above the 7-month biological minimum |
| Breeding age (ewe & ram) | 12 months (1 year) | Modern intensively-fed breeds can conceive at 7–9 months ([NMSU](https://aces-newmexicosheep.nmsu.edu/breeding/reproduction.html)), but slower-maturing medieval/hardy breeds and the desire for a once-yearly cycle make 12 months a reasonable floor — first lambing occurs at ~17 months |
| Lamb sex ratio | 50/50 | Standard mammalian sex ratio |
| Winter-born lamb exposure mortality | 30% | Already implemented; applies only to lambs born during winter months |

### 4.4 Sheep lifespan & baseline survival — [AGREED]

Previously, sheep had **no biological age limit** at all (only flock-size and feed-shortfall culling), and there was **no baseline (non-winter) mortality** for lambs or calves — every non-winter birth survived with certainty, even though `SIMULATION_MODEL.md` §5.1's herd-stability *formula* already assumes a calf-survival rate (0.80 to age 1) that the simulation itself never applied.

**[AGREED]**:
- `SHEEP_MAX_AGE = 96 months` (8 years), applied to both ewes and rams — a pure-biology cull trigger alongside (not replacing) the existing flock-management cull, consistent with `COW_MAX_AGE`.
- **Species-differentiated baseline pre-weaning survival**, applied as an **independent per-individual random roll at birth** (not a deterministic multiplier on litter size — consistent with how winter-lamb mortality is already implemented via `Math.random()`):
  - Cattle calves: **0.90** survival (≈9.2–14% modern calf mortality range — [Hadgu et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8407976/))
  - Lambs (non-winter births): **0.80** survival (≈14.9–33.5% modern lamb mortality range, same source)

Cattle calving/breeding is already gated to non-winter months (`!isWinter`), so calves never face the winter-mortality modifier below — only the 0.90 baseline applies.

### 4.5 Winter-lamb mortality modifier — [AGREED]

The existing flat 30% winter-born-lamb mortality (`Math.random() > 0.30` survival roll) is **retained as the well-fed baseline**, but is **not feed-independent**: neonatal-lamb research identifies starvation and cold-stress/exposure as the dominant causes of winter losses — "starvation was associated with 58.3% of lamb deaths" and "hypothermia can account for nearly half of all perinatal lamb losses" ([neonatal lamb mortality literature](https://www.cambridge.org/core/blog/?p=54633)), and these interact: the "starvation-mismothering-exposure complex" describes how cold + inadequate milk/feed compound.

**[AGREED]**:
- **Well-fed winter**: 30% mortality (70% survival) — unchanged from current behaviour.
- **Underfed winter** (i.e. the village experienced a feed shortfall per §6.4's feed-balance closure for that winter): mortality rises to **50%** (50% survival) — reflecting the literature's finding that starvation/exposure compounds and can account for the majority of losses under poor conditions.
- This winter modifier does **not compound** with the 0.80 non-winter-lamb baseline from §4.4 — winter-born lambs use the winter rate (30%/50%) **in place of** the 0.80 baseline, since the winter rate already represents the dominant risk (starvation/exposure) for that cohort. (The 0.80 baseline in §4.4 applies only to lambs born in non-winter months.)
- Implementation remains a per-individual random roll, with the feed-shortfall flag (already computed for emergency culling, §6.4) selecting which probability (30% vs 50%) to use for that winter's births.

### 4.6 Herd composition ratios & wethers — [AGREED]

| Parameter | Value | Status |
|---|---|---|
| `bullsPerCow` | 1/12 | [CARRIED OVER] from `defaults.ts` — confirmed as a reasonable herd-composition ratio |
| Ram:ewe ratio | previously none — rams emerged purely from the 50/50 lamb sex split | superseded below |

**Research finding**: castrated males (**wethers**) were historically the *dominant* component of medieval English wool flocks — "a full wether flock makes the most sense in eras and locations with high wool prices, such as medieval England" ([Wether — Wikipedia](https://en.wikipedia.org/wiki/Wether_(ruminant))). Wethers produce more wool of better quality than rams or ewes, are easier to manage in large flocks (no fighting), and were historically "castrated and kept on the hill until 3 or 4 years old, sheared each year, then sold for mutton" ([Medievalists.net — Sheep-Rearing in Medieval France](https://www.medievalists.net/2021/01/sheep-rearing-medieval-france/); [Abbey Cwmhir — Medieval sheep farming](https://abbeycwmhir.org/discussion/medieval-sheep-farming/)).

**[AGREED]** — this is **more historically accurate** than a simple ram-population cap, and answers where the "surplus" male lambs go: add **`wether`** as a third sheep type/sex alongside `ewe`/`ram`:
- At/shortly after birth, male lambs are assigned: a small fraction remain entire as **rams** (sized to maintain `ewesPerRam ≈ 40`, mirroring `bullsPerCow`'s role — within the traditional 1:40–50 ram:ewe mating-ratio range from [Woolshed1](http://woolshed1.blogspot.com/2009/01/sheep-farm-husbandry-reproduction-and.html?m=1)); the remainder become **wethers**.
- Wethers: grow, are shorn annually (same wool-growth mechanics as ewes/rams — §6 will specify whether their per-head wool yield differs), and are raised for wool/mutton, sold/culled at ~3–4 years (consistent with `OX_BULL_MAX_AGE`-style "working/productive lifespan" framing, but for wool rather than draught).
- `SHEEP_MAX_AGE=96mo` from §4.4 applies to ewes and rams; wethers are expected to be culled for mutton well before 96mo (~36–48mo) as part of normal flock-composition turnover — this turnover age is a cull-policy/decision-layer parameter, not specified further here.

This supersedes the earlier `ewesPerRam`-as-population-cap framing: `ewesPerRam≈40` is retained, but now determines the ram/wether split among male lambs rather than capping/culling an already-existing ram population.

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
| 2026-06-13 | §3.5 | f* and PLANNER_AVG_FERTILITY are planner-derived emergent outputs, not fixed I/O constants | Equilibrium fertility depends on the rotation/activity mix chosen by the decision layer; hard-coding it in the I/O model would be circular — resolves SIMULATION_MODEL.md §3.2 TODO |
| 2026-06-13 | §3.3 | Legume fertility depletion = continuous linear interpolation, d_legumes = 0.005 − 0.015 × splitFraction | Legumes' fertility effect ranges from mildly depleting (fully harvested) to net-restorative (fully grazed/plowed-in green); a continuous function avoids an arbitrary discrete cutover |
| 2026-06-13 | §3.3/§3.8 | splitFraction (grazed-in-field/plowed-in-green vs. harvested legumes) is a single independent parameter, solver/user-determined, shared by §3 fertility and §5/§7 feed-and-diet accounting | Same "solver interface" pattern as permanentPastureAcres — the physically correct split depends on feed sufficiency, which is a decision-layer question |
| 2026-06-13 | §3.2/§3.4 | Per-crop d-values (wheat 0.040, barley 0.028, oats 0.022, arable-hay-aftermath 0.010) and r=0.11 marked [PROVISIONALLY CONSISTENT] | Sense-check against the historical three-field rotation gives f* in 0.60-0.66 across plausible spring-course mixes, a plausible range; final calibration deferred until the rotation/activity-month ledger is built in the decision-making model |
| 2026-06-13 | §3.6 | Yield/fertility anchor re-defined: yield = baseYield × (fertility / f*), replacing yield = baseYield × fertility | Under the old anchor, equilibrium fertility (~0.60-0.66) would depress realized yields ~35% below the Batch 2 historical figures just agreed; re-anchoring to f* preserves those figures while keeping the fertility model internally consistent. Formula change deferred to code-change phase |
| 2026-06-13 | §4.1 | Cattle reproductive biology confirmed as-is (gestation 9mo, lactation 10mo/curve, weaning 2mo, postpartum infertile 2mo, min cycle 12mo, breeding age 24mo) | Cow gestation (283 days) and 305-day lactation are standard bovine biology; 12-month cycle matches documented medieval once-yearly calving practice |
| 2026-06-13 | §4.1 | COW_POSTPARTUM_INFERTILE = 2 months confirmed; SIMULATION_MODEL.md §5.1's "≈3 months" figure superseded | The code constant and its own derivation comment (9+2=11) already use 2 months and are internally consistent; 3 months was a doc-only discrepancy |
| 2026-06-13 | §4.2 | Cattle given distinct lifespan/maturation parameters: OX_BULL_WORKING_AGE=36mo, OX_BULL_MAX_AGE=84mo, COW_MAX_AGE=96mo, replacing shared CATTLE_MAX_LIFESPAN=120mo | Sourced: medieval oxen bought ~3yr, worked ~4yr, sold for beef ~7yr — oxen are physically used up faster than cows age. Also restores consistency with the herd-stability formula's existing 96mo cow-productive-lifespan assumption, which the old 120mo cull age silently contradicted |
| 2026-06-13 | §4.3 | Sheep reproductive biology confirmed as-is (gestation 5mo, lactation 4mo/curve, postpartum infertile 2mo, min cycle 12mo, breeding age 12mo, winter-born lamb base mortality 30%) | Gestation (≈147 days) and lactation duration (90-150 day range) are standard ovine biology; 12-month cycle matches medieval once-yearly lambing practice |
| 2026-06-13 | §4.4 | Added SHEEP_MAX_AGE=96mo (ewes/rams) as a pure-biology cull trigger; added species-differentiated baseline pre-weaning survival as per-individual random rolls: cattle calves 0.90, non-winter lambs 0.80 | Consistent with COW_MAX_AGE; survival rates sourced from modern mixed crop-livestock mortality data (calves 9.2-14%, lambs 14.9-33.5%), matching the rate the herd-stability formula already assumed but the simulation never applied |
| 2026-06-13 | §4.5 | Winter-born lamb mortality: 30% if winter feed balance is sufficient, 50% if the village experienced a feed shortfall that winter (replaces the flat 30% rate; does not compound with the §4.4 non-winter baseline) | Neonatal lamb mortality literature identifies starvation/cold-exposure (the "starvation-mismothering-exposure complex") as the dominant cause of winter lamb losses, and shows this risk compounds sharply when feed is inadequate |
| 2026-06-13 | §4.6 | Added `wether` as a third sheep type: most male lambs become wethers (wool/mutton), with `ewesPerRam≈40` determining how many remain entire as breeding rams | Castrated wethers were historically the dominant component of medieval English wool flocks (better/more wool, easier management) — more accurate than a ram-population cap, and explains where surplus male lambs go |

