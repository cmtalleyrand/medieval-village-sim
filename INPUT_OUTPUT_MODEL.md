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

The **steady-state flock composition** that emerges from these rules plus the §4.8/§4.9 biology is derived in §4.9.3: for the standard 80-sheep flock, ≈25 ewes / ≈1 ram / ≈54 wethers, with wethers turning over at ~42mo (3.5yr) — within the "3–4yr" range above.

### 4.7 Winter mortality — extended to all animals — [AGREED, monthly hazard]

Currently only winter-born lambs (§4.5) face a winter mortality roll; all
other animals (adult cattle, adult sheep, over-wintering calves/lambs born
earlier in the year) are immortal with respect to winter conditions —
inconsistent with the fact that winter (cold, reduced feed, reduced grazing)
is the dominant seasonal stressor for livestock.

**Research finding**: the only quantified medieval English livestock
mortality figures found are **epizootic crisis years** — the 1275–80 sheep
scab epidemic (demesne flocks down ~50%, ~43% of animals dying) and the
1319–21 cattle panzootic (~62% of bovines lost in England/Wales). These are
extraordinary, multi-year disease events, not representative of a "normal"
winter — they are cited here for context only, **not** as the baseline.

No normal-year baseline figure was found in the available sources. The rates
below are **reasoned estimates** [AGREED 2026-06-14], extending the same
well-fed/underfed structure already agreed for lambs in §4.5 (adults are more
cold-hardy and carry fat reserves, so adult rates are set lower than the lamb
rates; first-winter juveniles sit between the two).

**Expressed as a MONTHLY hazard, not a per-winter roll.** This is essential
to the model's variable-season purpose: a single per-winter roll would kill the
same fraction whether winter is 3 months or 12, which is wrong. Instead each
cohort has a per-winter-month death probability `m`; cumulative loss over a
winter of `W` months is `1 − (1 − m)^W`, so a longer winter (larger `W`, or a
larger deep-winter core) kills proportionally more — the required behaviour.
The monthly rates are calibrated so that a **standard 3-month winter** (`W=3`)
reproduces the accepted seasonal levels shown in the right-hand column:

| Cohort | Monthly hazard `m` — well-fed | Monthly hazard `m` — underfed (§6.4 shortfall) | (cumulative at standard `W=3`) |
|---|---|---|---|
| Adult cattle (cow/ox/bull, ≥36mo) | **0.67%/mo** | **2.74%/mo** | 2% / 8% |
| Juvenile cattle (12–36mo, first/second winter) | **1.01%/mo** | **3.45%/mo** | 3% / 10% |
| Adult sheep (ewe/ram/wether, ≥12mo) | **1.01%/mo** | **4.18%/mo** | 3% / 12% |
| Non-winter-born lambs <12mo in their first winter (born spring/summer same year) | **2.74%/mo** | **7.17%/mo** | 8% / 20% |

(Each `m = 1 − (1 − seasonal)^{1/3}`.) **Winter-born lambs are NOT in this
table**: their 30%/50% mortality (§4.5) is a **one-time neonatal birth event**
— a single roll at birth for being born into winter — not a recurring monthly
winter hazard, so it does not compound with `W` and stays exactly as §4.5
specifies.

Implementation: each **winter month** (`isWinter`), each eligible animal rolls
an independent death probability = its cohort's monthly hazard, with the
well-fed/underfed branch selected by that **month's** feed-balance state
(§6.4) — so a winter that starts well-fed and runs short mid-season switches
branches partway through, which a single seasonal roll could not represent.
Growing-season months carry no §4.7 roll. This hazard is **separate from and
additional to** age-based culling (§4.2/§4.4 max-age) and flock-management
culling — it represents death from cold/disease/malnutrition, not deliberate
slaughter.

**Natural extension, not imposed here**: deep-winter months (`deep_winter`,
per `classifyWinterMonth`) could carry a higher monthly hazard than
shoulder-winter months, mirroring the existing `deepWinterFeedMultiplier`
(1.25). Left at the uniform per-winter-month rate above for now (the accepted
levels carry no deep-winter-specific evidence); flagged for the user if a
harsher deep-winter core is wanted.

### 4.8 Reproduction model — monthly conception, seasonality & exposure — [AGREED]

**Supersedes** the current rigid model (`COW_MIN_CYCLE`/`EWE_MIN_CYCLE = 12mo`
hard annual gates, with conception/calving/lambing gated to `!isWinter`).
Replaced with **per-individual monthly conception probability rolls**,
year-round, with a seasonal modifier (not a hard gate) and a male
service-capacity cap.

#### 4.8.1 Monthly conception probability — [DERIVED]

For each fertile female (past breeding age, not currently pregnant, past her
postpartum-infertile window per §4.1/§4.3), each month is an independent
conception roll **if she is "exposed" (§4.8.3)**. The monthly probability is
**season-dependent**, expressed entirely through the existing season-TYPE
classification (`classifyMonth` / the `isWinter` flag) so it generalizes to
arbitrary growing/winter lengths (see the generalization note below).

The literature gives *modern, management-intensive* fertility (AI or
hand-mating, estrus detection, body-condition supplementation, veterinary
care). Medieval natural-service stock on seasonal feed achieved materially
less. We therefore take the cited modern **seasonal shape** as authoritative
but apply a single **medieval-husbandry discount scalar** per species, fixed
by requiring the standard village (G=9, W=3) to reproduce an evidence-anchored
**annual** conception→birth rate (§4.8.4). The scalar is back-solved from the
steady state of the monthly-roll process itself (a periodic Markov / renewal
chain over cycling→pregnant→postpartum states), so the monthly rolls and the
annual target are mutually consistent by construction.

| Species | Seasonal driver & in-season window | Cited modern in-season monthly rate | Discount | Calibrated monthly conception probability | Annual rate (G=9,W=3) |
|---|---|---|---|---|---|
| Cattle | **Body-condition / feed** (non-seasonal breeder; fertility tracks nutrition). In-season = growing-season months, winter months reduced via the existing ×0.5 modifier ([beefrepro.org](https://beefrepro.org/wp-content/uploads/2020/09/04-michael-smith.pdf), [Iowa Beef Center](https://www.iowabeefcenter.org/estrussynch/BullSync.pdf)) | ≈55% growing / ≈27.5% winter | **×0.294** | **16.2%** growing-season month / **8.1%** winter month | **0.667** (≈ "2 calves in 3 years") |
| Sheep | **Photoperiod** (short-day seasonal breeder; rut triggered by shortening days, largely management-independent). In-season = season-type **`autumn`** (the decreasing-daylength shoulder); all other season types out-of-season ([NMSU](https://aces-newmexicosheep.nmsu.edu/breeding/reproduction.html), [Ontario](https://www.ontario.ca/page/sheep-reproduction-basics-and-conception-rates)) | ≈75% autumn / ≈11% other | **×0.541** | **40.6%** autumn month / **5.95%** other month | **0.880** |

The two discounts differ for a principled reason: cattle fertility is
*management-dependent* (the cited 55% assumes estrus detection / BCS
management medieval husbandry lacks → large discount), whereas the sheep rut
is an *innate photoperiod response* that medieval ewes retained → smaller
discount.

**Seasonality is keyed to season *type*, not calendar month** — this corrects
an earlier fixed-calendar "Sep–Jan / Feb–Aug" framing that silently assumed a
12-month year. The cattle winter modifier keys off `isWinter` (`month > G`);
the sheep rut keys off the `autumn` type from `classifyMonth`. Because
`autumn` is always the last ≤3 growing-season months regardless of G, and
`isWinter` covers exactly the W winter months regardless of W, both rates
behave correctly when winter or summer is made arbitrarily long: **a longer
winter does not extend the sheep rut** (the photoperiod window stays fixed) —
it merely adds out-of-season months. This is precisely the behaviour the
variable-season design requires.

Births are not gated by month — only **conception** probability varies — and
gestation length (§4.1/§4.3) sets the birth month, which can fall in any
season. `COW_MIN_CYCLE`/`EWE_MIN_CYCLE = 12mo` are **removed** as hard gates;
the **postpartum-infertile period** (§4.1: 2mo cows, §4.3: 2mo ewes) remains
the only hard block immediately post-partum. With the calibrated
probabilities the *emergent* mean interval is **longer** than 12 months
(cattle ≈18mo; sheep ≈13–14mo) — the evidence-anchored replacement for the old
rigid annual gate. (The earlier undiscounted ≈55% / ≈75% figures, taken at
face value, implied a biologically impossible >1 birth/female/year; that error
is corrected here.)

#### 4.8.2 Male service-capacity cap — [AGREED]

| Species | Capacity cited in literature | `maxConceptionsPerMalePerMonth` [AGREED] | Current ratio (`bullsPerCow=1/12`, `ewesPerRam≈40`) | Binding? |
|---|---|---|---|---|
| Cattle (bull) | ~25–35 cows/60–70-day season ≈ 11–17.5/month | **12** | 12 cows/bull | At the boundary — not binding at expected ≈55% conception rate (≈6.6 actual conceptions/month/bull) |
| Sheep (ram) | ≥5 ewes/day ⇒ up to ~150/34-day season | **40** | 40 ewes/ram | Not binding (40 ≪ 150) |

Each month, total conceptions for a species are capped at
`numMales × maxConceptionsPerMalePerMonth`; if the number of females rolling
a successful conception in a given month would exceed this cap, the excess
are reduced back to "not conceived this month" (re-rolled next month). At
the current herd-composition ratios (§4.6, `bullsPerCow=1/12`,
`ewesPerRam≈40`), this cap is set **equal to or above** the expected monthly
demand and so has **no effect under normal circumstances** — it exists as a
correctness safeguard for scenarios where bull/ram numbers fall
disproportionately (e.g. heavy culling), at which point it would
realistically throttle the herd's growth rate, which is the correct
behaviour.

#### 4.8.3 "Exposure" — decision-layer seam — [AGREED]

New solver-interface boolean parameter, analogous to `permanentPastureAcres`/
`splitFraction` (§0.3): **`breedingExposure`** (per species — `cattle` and
`sheep` — independently settable per month). When `true` (the **default** in
non-solver mode, preserving "always-on" breeding as the baseline), fertile,
non-pregnant, eligible females are exposed to males per §4.8.1–4.8.2 and roll
for conception that month. When `false`, **conception probability for that
species that month = 0** regardless of season/cycling status — males and
females are kept apart (historically: rams/bulls penned separately from the
flock/herd outside the desired breeding window).

This gives the future planner/solver a lever to, e.g., concentrate sheep
conceptions into the autumn natural window (by setting
`breedingExposure.sheep = false` outside `autumn`-type months, which costs
little since the out-of-season probability is already low) or to suppress
cattle breeding during a feed-constrained period — without requiring any
change to the biological probability tables above.

#### 4.8.4 Annual-rate evidence anchors — [AGREED targets; DERIVED monthly probabilities]

The calibration targets in §4.8.1 are not free parameters; each is anchored:

- **Cattle = 0.667 calvings/cow/year ("two calves in three years").**
  Medieval/early cattle were spring-calving *seasonal* breeders — year-round
  fertility presupposes year-round good nutrition, which winter denies
  ([prehistoric cattle calving, *Nature Sci. Rep.* 2021](https://www.nature.com/articles/s41598-021-87674-1)).
  A 9-month gestation plus a suckled cow's nutritionally-extended postpartum
  anestrus and winter body-condition loss push a large fraction of cows onto
  an **~18-month calving interval**. 0.667 is the user-directed target and
  sits at the lower-fertility end appropriate to extensive, winter-constrained
  husbandry. *Crucially it is well below modern AI-managed rates (~0.85–0.90) —
  the sanity bound an earlier ≈0.917 derivation violated.*
- **Sheep = 0.88 lambings/ewe/year.** The 5-month gestation + photoperiod-
  locked autumn rut give the ewe all summer to rebuild condition before
  tupping, so — unlike the cow — she faces **no interval squeeze** and lambs
  near-annually; medieval manorial evidence records that "ewes typically
  produced one lamb per year" ([BAHS, *Statistics of Sheep in Medieval
  England*](https://bahs.org.uk/AGHR/ARTICLES/07n2a2.pdf)). 0.88 is decomposed
  from the historical **"lambs reared per ewe ≈ 0.7" ÷ pre-weaning survival
  0.80 (§4.4) ≈ 0.88** conception-to-live-birth; the 0.80 mortality is then
  applied *separately* downstream so the product (~0.70 reared) reproduces the
  historical figure. This supersedes the prior implicit "once-yearly" gate
  (§4.3) — sheep are *more* fertile per year than cattle, the opposite of what
  a single shared rate would have implied.

### 4.9 Steady-state offtake (cull) model — [DERIVED]

**Scope.** This section specifies the *physical* steady-state annual offtake:
how many animals of each cohort/sex/castration class leave the herd per year,
and the meat/offal/fat that yields. It does **not** set the cull *policy*
(which animals a given player/solver chooses to cull in a given month) — that
is decision-layer (§0.2). It assumes only the historically-universal physical
pattern that surplus stock is removed before winter to conserve feed, and
computes the steady-state implied by the §4.2–4.8 biology. All figures are for
the **standard village** (20 households → 80 cattle, 80 sheep, pop 90).

#### 4.9.1 Principle — cull young to save winter feed

Overwintering an animal only to cull it later spends scarce winter feed on it
twice over; the physically efficient (and historically attested) pattern is:

- **Surplus young** (calves/lambs beyond replacement need) are culled at the
  **first autumn**, ~6–8 months old, at a *fraction* of mature weight (§4.9.4).
- **Only the replacement-sized cohort overwinters** to breeding/working age.
- **Worn-out breeding/working stock** is culled at max age (§4.2/§4.4) at
  **full mature weight**. This is the steady-state "old-age cull."

#### 4.9.2 Cattle offtake — 40 cows + 40 oxen/bulls

| Quantity | Value | Derivation |
|---|---|---|
| Calves surviving to autumn (~7mo) | **24.00** (12.0 F / 12.0 M) | 40 cows × 0.667 (§4.8.4) × 0.90 pre-wean survival (§4.4) |
| Replacement need, net of natural death | cows 40/8−0.02·40 = 4.00/yr; oxen 40/7−0.02·40 = 4.91/yr | max age 96mo (cow) / 84mo (ox), §4.2; adult winter mortality 2%, §4.7 |
| Replacements *selected* at autumn | 4.40 F / 5.30 M | net need ÷ further juvenile survival to breeding age (0.97^1.5 F→24mo, 0.97^2.5 M→36mo; §4.7) |
| **Surplus culled young (~7mo)** | **14.30** | calves − replacements selected |
| **Old-age cull (full weight)** | **9.11** | = net replacement need (cull = intake at steady state) |

#### 4.9.3 Sheep offtake — 80 sheep, wool economy

Sheep exist for wool, not milk (§4.6), so the flock carries the **minimum ewe
count** needed to replace itself plus a small safety margin; the remaining
capacity is wethers. Solving the steady state (ewes E, rams R = E/40 per
`ewesPerRam`, wethers = 80−E−R; replacement need = E/8 + Wth/3.5yr + R/8, each
net of 3% adult winter mortality; lamb survivors = E × 0.88 × 0.80; lambs
sized to (1 + 0.10 margin) × replacement need):

| Quantity | Value |
|---|---|
| Solved composition | **25.4 ewes / 0.6 rams / 54.0 wethers** |
| Lambs surviving to autumn (~7mo) | 17.90 |
| Replacement need (ewe 2.42 + wether 13.79 + ram 0.06) | 16.27 |
| **Surplus lambs culled young (~7mo)** | **1.63** |
| **Old-age cull (full weight)** | **16.27** |

Wethers dominate (~68% of the flock) and turn over at **~42mo (3.5yr)**, within
§4.6's "3–4yr" range; the small surplus-lamb count reflects a wool flock
sized for replacement, not meat production.

#### 4.9.4 Weight-at-cull as a fraction of mature weight — [DERIVED + corroborated]

The young (~6–8mo) cull animals are **not** at mature weight. Their weight
fraction is derived from a **Brody growth curve** `W(t)/A = 1 − b·e^(−Kt)`
fitted through two anchors — birth weight (cattle 7%, sheep 8% of mature,
[cited](https://www.ksre.k-state.edu/news/stories/2023/05/cattle-chat-birth-weight-variablity.html))
and the physiological puberty/breeding threshold (~60% of mature,
[cited](https://www.feedlotmagazine.com/news/cow_calf_corner/percentage-of-mature-weight-at-puberty-in-heifers/article_9fa71c1c-7db8-5c76-befa-7b7b3b8e6114.html))
reached at the model's **already-agreed breeding ages** (cattle 24mo, sheep
12mo). Medieval slow maturation enters *only* through those late ages (fitted
K: cattle ~3.5%/mo, sheep ~8%/mo). **Self-validation:** feeding the fit a
*modern* 14-month breeding age recovers K ≈ 6.0%/mo — squarely in the
published Brody range (5.4–6.6%/mo).

| Species | Brody (6–8mo) | Achieved-weight corroboration (unimproved analogue) | **Adopted** |
|---|---|---|---|
| Cattle | 0.25–0.30 | **Highland** calf weans at 154kg / 450kg cow = **34%** at ~6.7mo (1957–60; research-station nutrition → upper bound) | **0.27** |
| Sheep | 0.43–0.52 | **Soay** lamb ≈ **50% of dam by August** (~4mo; feral, unfed) | **0.48** |

The achieved-weight analogues **bracket the derivation from above** — correct,
since both are better-fed than medieval stock. (Brody assumes maximal growth
*at birth* and so mildly over-states young weight; a Gompertz fit with an
inflection would sit slightly lower — i.e. these are conservative-to-central,
not optimistic.) Old-age-cull animals take the full Pals weight (frac = 1.0).

#### 4.9.5 Yields and steady-state totals (Pals zooarchaeological factors)

Per-animal yields ([J.P. Pals](#), via user): cow 250kg → 65 meat / 31 offal /
25 fat (kg) — i.e. the meat+offal+fat = 48% of liveweight (the other ~52% is
bone, hide, horn, hoof, tendon, blood and gut-fill, removed at slaughter);
**bulls/oxen 300kg → 78 / 37.2 / 30** (the cow's 26%/12.4%/10% liveweight
fractions applied to the heavier male bodyweight — males weighed more than
cows, per user direction 2026-06-14); sheep 30kg → 7.8 / 3.75 / 3.0. Young
animals yield `frac ×` these.

The cattle cull splits by sex: of the 14.30 young culls, 7.60 F / 6.70 M
(§4.9.2); of the 9.11 old-age culls, 4.09 F / 5.02 M (split by the
cow:ox replacement-need ratio 4.00:4.91). Full-weight-equivalent animals:
**6.14 cows** (= 7.60×0.27 + 4.09) and **6.83 bulls/oxen** (= 6.70×0.27 + 5.02).

| | Meat (kg) | Offal (kg) | Fat (kg) |
|---|---|---|---|
| Cattle — cows @250kg (6.14 full-equiv) | 399.2 | 190.4 | 153.6 |
| Cattle — bulls/oxen @300kg (6.83 full-equiv) | 532.7 | 254.0 | 204.9 |
| Sheep (1.63 young @0.48 + 16.27 full, 30kg) | 133.0 | 63.9 | 51.2 |
| **Total annual cull** | **1064.9** | **508.3** | **409.7** |

#### 4.9.6 Residual uncertainties — [flagged]

- **Single biggest lever is the old-age cull headcount**, not the young weight:
  the surplus-young cohort is culled so light that the YOUNG_FRAC band
  (cattle 0.25–0.30, sheep 0.43–0.52) moves the §6.2 cap by only ±2.5%.
- **[RESOLVED 2026-06-14]** Bulls/oxen are now yielded at **300kg** (cows at
  **250kg**), per user direction that males weighed more than cows — replacing
  the prior single-cow-factor-for-both-sexes simplification. The 48% usable
  fraction (meat/offal/fat of liveweight) is unchanged; only the male
  bodyweight anchor was raised (×1.2).
- **Remaining inconsistency flagged for future reconciliation**: §5.2.1's
  *feed* bodyweights (cow 400kg / ox 500kg) and §4.9.5's *yield* liveweights
  (cow 250kg / bull-ox 300kg) describe the **same animals** at different
  weights. This is a genuine internal inconsistency (a cow has one liveweight),
  not merely "different statistics," and should be unified when feed and yield
  are reconciled — the medieval-cattle-liveweight literature spans ~250–400kg.
  Logged, not resolved here, per user direction to proceed.

---

## 5. Feed & Forage

### 5.1 Two-currency feed conversion table — [AGREED]

**[AGREED] — Two-currency model**: every stored feed type (hay, oats, straw)
is characterized by kg dry matter (DM) per natural unit, and kcal per kg DM.
kcal remains the model's primary energy currency (ties feed directly to the
existing hay/oats stock-and-balance logic and to human diet/animal-product
accounting); kg DM is a secondary currency used only for the §6.3
roughage-minimum check (a mass ratio, not an energy ratio).

| Feed | Unit | kg DM/unit | kcal/kg DM | kcal/unit | Status |
|---|---|---|---|---|---|
| Hay (meadow or arable) | cartload | 250 (`cartloadToKgHay`, treated as DM mass — hay is already dried, ~85-90% DM, so kg≈kg DM to first order) | 2160 (`GRASS_TO_HAY_KCAL_RATIO`×`grassKcalPerKg` = 3.6×600) | 540,000 (`hayKcalPerCartload`, existing) | [AGREED, carried over] |
| Oats (grain) | bushel | ~13 (32 lb/bu × ~89% DM ≈ 12.9 kg DM/bu) | ~2,920 (38,000÷13) | 38,000 (`cropStats.oats.kcalPerBu`, existing §2.2) | [DERIVED] |
| Straw (any cereal) | per bushel of **grain** harvested | bushel-weight(kg) × straw:grain ratio (§2.3) × ~85% DM | **~1,300** [AGREED] | kg DM × 1,300 | mixed |

**Straw mass derivation** — bushel weights are already implicit in the §2.2 kcal/bu figures (kcal/bu ÷ ~1500 kcal/lb for wheat/barley/legumes, ÷ ~1187.5 kcal/lb for oats, converted to kg):

| Crop | Bushel weight | Straw:grain ratio (§2.3) | Straw kg per bu of grain harvested | Straw kg DM per bu (×0.85) |
|---|---|---|---|---|
| Wheat | 60 lb ≈ 27.2 kg | 1.2 | 32.7 | 27.8 |
| Barley | 50 lb ≈ 22.7 kg | 1.0 | 22.7 | 19.3 |
| Oats | 32 lb ≈ 14.5 kg | 1.5 | 21.8 | 18.5 |
| Legumes | 60 lb ≈ 27.2 kg | 1.8 | 49.0 | 41.6 |

**[AGREED]** `strawKcalPerKgDM ≈ 1,300` — straw is mostly structural fibre with low digestibility; typical straw metabolizable energy is ~5.5-6.5 MJ/kg DM versus hay's ~9 MJ/kg DM (the model's existing 2,160 kcal/kg ≈ 9.04 MJ/kg, itself a plausible hay figure). 1,300 kcal/kg DM ≈ 5.4 MJ/kg DM ≈ ~60% of hay's energy density — consistent with `SIMULATION_MODEL.md` §6.3's framing of straw as "low nutrient density but very high volume." Adopted as the central value (the 5.4 MJ/kg figure sits just below the cited 5.5–6.5 MJ/kg band, conservative for low-quality medieval straw); revisitable if a digestibility-specific source warrants.

### 5.2 Per-animal feed requirements — bodyweight/metabolic derivation — [AGREED, revises carried-over figures]

The carried-over `feedNeedsWinter` table (oats/hay per animal type) was never
grounded in animal bodyweight, dry-matter (DM) intake, or kcal requirements —
it was an opaque balance figure. Per the user's explicit requirement, this
section rebuilds per-animal requirements from first principles in **both
currencies** (kg DM and kcal), using a bodyweight → metabolic-rate →
activity-level chain that is **species-parameterized** so a future species
(e.g. horses, which have different DM%BW ceilings and digestive physiology)
can be added by adding a row, not by restructuring the model.

#### 5.2.1 Reference bodyweights — [AGREED] (cow 400 kg confirmed)

Bodyweights are anchored to **living unimproved-breed analogues at the
zooarchaeologically-attested medieval withers height**, not to modern improved
stock. Medieval English cattle stood ~**110 cm** at the withers ([*Cattle in
the Middle Ages*](http://www.personal.utulsa.edu/~marc-carlson/history/cattle.html);
[London livestock size, AD 1220–1900](https://www.sciencedirect.com/science/article/abs/pii/S0305440313000885))
— close to a modern **Highland cow (105 cm, 450 kg)** and a **Dexter cow
(~105 cm, ~325 kg)** ([Highland cattle](https://en.wikipedia.org/wiki/Highland_cattle),
[Dexter cattle](https://en.wikipedia.org/wiki/Dexter_cattle)). Medieval sheep
stood ~**57–60 cm** ([Cameron et al., *Internet Archaeol.* 52](https://intarch.ac.uk/journal/issue52/1/9-1-6.html)),
"small and stunted" ([French sheep morphology 9th–19th c.](https://www.sciencedirect.com/science/article/abs/pii/S0305440318301018)),
bracketing the primitive **Shetland ewe (~35–45 kg)** below and the improved
**Southdown ewe (~60 cm, 59–68 kg)** above.

| Animal | Bodyweight (kg) | Basis (living analogue at medieval withers height) |
|---|---|---|
| Ox / working bull | 500 | Castrated males / bulls carry more frame than cows and draught oxen were selectively the largest available; 500 kg sits between the Highland cow (450) and Highland bull (650), at the top of the medieval-sized band. |
| Cow (mature, dairy/dual-purpose) | 400 | Between the Dexter cow (325) and Highland cow (450) at ~105–110 cm withers; leans to the lower/unimproved end since non-draught cows were not size-selected. **Could defensibly be 450** (full Highland-cow analogue) — see decision note. |
| Ram | 55 | A ram carries ~35–40% more frame than an ewe of the same breed; 55 kg sits above the Shetland-analogue ewe to reflect that, while staying well below improved post-medieval rams (Cotswold/Lincoln 120–160 kg are 18th–19th c. products). |
| Ewe | 40 | Shetland ewe (~35–45 kg) is the closest living analogue to unimproved medieval wool sheep at the attested 57–60 cm withers; a stunted/slender medieval ewe weighs less than a compact improved Southdown of the same height, so 40 kg leans to the middle of the Shetland band. |
| Wether | 50 | Between ewe and ram — castrated males grow a larger frame than ewes but lack a ram's continued masculine growth. |

Growing animals (calves <24 months, lambs <12 months) do not get separate
bodyweight figures — the existing age-multiplier tiers in §5.2.3 scale the
**adult** base ration down, as a proportional simplification (a growing
animal's lower absolute requirement is approximated via the age multiplier
rather than via an explicit growth curve).

**[AGREED 2026-06-14]**: cow confirmed at **400 kg** (unimproved-leaning, the
Dexter–Highland midpoint); ox 500 / ram 55 / ewe 40 / wether 50 confirmed as
listed. Residual uncertainty is ±~10–15% (bounded by the analogue spread, e.g.
cow 325–450 kg) — should higher-resolution medieval liveweight data later
warrant a shift (e.g. cow → 450, the full Highland-cow analogue), every figure
below rescales mechanically off this table.

#### 5.2.2 Base metabolic energy requirement — Kleiber's law

Basal metabolic rate scales with bodyweight to the power 0.75 (Kleiber's
law, a standard zoological/physiological relationship, not medieval-specific):

```
BMR (kcal/day) = 70 × BW(kg)^0.75
```

| Animal | BW (kg) | BMR (kcal/day) |
|---|---|---|
| Ox/bull | 500 | 7,400 |
| Cow | 400 | 6,260 |
| Ram | 55 | 1,410 |
| Ewe | 40 | 1,110 |
| Wether | 50 | 1,320 |

**`WINTER_ACTIVITY_FACTOR` = 2.5×BMR — [DERIVED, validated against measured
maintenance ME]** — the energy multiple for a non-pregnant, non-lactating
adult in winter (cold exposure, routine activity, no grazing). This is **not**
a free pick: published suckler-cow maintenance metabolizable-energy is
**0.596 MJ/kg⁰·⁷⁵/day** (mean; range 0.389–0.796) ([*Energy Requirements of
Beef Cattle*, MDPI *Animals* 2021](https://www.mdpi.com/2076-2615/11/6/1642)).
For a 400 kg cow (BW⁰·⁷⁵ = 89.4): 0.596 × 89.4 = 53.3 MJ/day ≈ **12,700 kcal
ME/day** at thermoneutral maintenance — i.e. **≈2.0×BMR** (12,700 ÷ 6,260).
Adding the standard cold-stress increment for an unhoused winter animal below
its lower critical temperature (~+20–30%, [NRC *Effect of Environment on
Nutrient Requirements*](https://www.ncbi.nlm.nih.gov/books/NBK232316/)) lands
at **≈2.4–2.6×BMR** — so **2.5×BMR is the measured cold-stressed maintenance
of a real dry cow**, not a guess. It also leaves headroom for the §5.2.3
multipliers (pregnancy/lactation/deep-winter) to compose toward — but not past
— the ~5×BMR ceiling associated with sustained peak lactation. The same 2.5×
is applied across species absent species-specific cold-maintenance data; this
is the proportional simplification flagged in §5.2.7 (a future species can
override it).

| Animal | Base winter kcal/day (BMR × 2.5) | Base winter kcal/month |
|---|---|---|
| Ox/bull | 18,500 | 555,000 |
| Cow | 15,650 | 469,500 |
| Ram | 3,530 | 105,900 |
| Ewe | 2,780 | 83,500 |
| Wether | 3,290 | 98,700 |

#### 5.2.3 Multiplier table — [AGREED, carried over from Batch 4 derivation]

Combine as `ageMult × max(pregnantMult, lactMult) × deepWinterMult`, applied
to the §5.2.2 base:

| Factor | Multiplier | Condition |
|---|---|---|
| Age | ×0.2 | < 12 months |
| Age | ×0.5 | 12–36 months |
| Age | ×1.0 | ≥ 36 months (adult) |
| Pregnant cow | ×1.3 | `pregnancyMonths ≥ 6` (final trimester of 9-month gestation) |
| Lactating cow | ×1.2 | `lactationMonths` 1–6 |
| Pregnant ewe | ×1.5 | `pregnancyMonths ≥ 3` (final 2 months of 5-month gestation) |
| Lactating ewe | ×1.3 | any `lactationMonths ≥ 1` |
| Deep winter | ×`deepWinterFeedMultiplier` (1.25) | applies to the combined total, all animals |

**Composability check**: the worst case (lactating ewe, deep winter) =
2.5 × 1.3 × 1.25 = 4.06×BMR — comfortably under the ~5×BMR physiological
ceiling. ✓ These multipliers already align with the §4 reproductive-biology
timelines agreed in Batch 4 and require no change.

#### 5.2.4 DM intake ceiling — [AGREED]

A second, independent constraint: ruminants can only physically process a
bounded amount of dry matter per day regardless of its energy density —
typically **~3% of bodyweight/day** for forage-based winter diets (general
ruminant nutrition range ~2–4%BW, narrowing toward the lower end for
low-quality winter roughage). This ceiling is the basis for the §6.3
roughage-minimum check (it bounds how much *bulk* feed an animal can take,
independent of how many kcal that bulk supplies).

| Animal | BW (kg) | DM ceiling (kg/day) | DM ceiling (kg/month) |
|---|---|---|---|
| Ox/bull | 500 | 15.0 | 450 |
| Cow | 400 | 12.0 | 360 |
| Ram | 55 | 1.65 | 49.5 |
| Ewe | 40 | 1.20 | 36 |
| Wether | 50 | 1.50 | 45 |

**Self-consistency cross-check**: an ewe's §5.2.2 base ration (83,500
kcal/month), if supplied entirely from hay (2,160 kcal/kg DM), requires
≈38.7 kg DM/month — vs. a 36 kg/month ceiling, i.e. ≈108% of ceiling. For
cattle, the equivalent all-hay figures (257 kg DM/month for an ox vs. a
450 kg ceiling; 217 kg vs. 360 kg for a cow) sit comfortably under ceiling.
This is the expected pattern: **sheep are gut-fill-bound** (their ration is
capped by bulk, not energy) while **cattle are energy-bound** (their ration
is capped by kcal need, with DM capacity to spare) — a real, documented
distinction in ruminant nutrition, and a good sign that the BW=40kg/factor=2.5
combination for sheep is close to the physical limit rather than wildly off
in either direction.

#### 5.2.5 R7/R9 — Surfaced finding: carried-over figures imply ~2.4× this derivation

| Animal | Carried-over base (kcal/month) | §5.2.2-derived base (kcal/month) | Ratio |
|---|---|---|---|
| Ox/bull | 1,194,000 (3bu oats + 2 cartloads hay) | 555,000 | 2.15× |
| Cow | 1,156,000 (2bu oats + 2 cartloads hay) | 469,500 | 2.46× |
| Ewe | 216,000 (0.4 cartloads hay) | 83,500 | 2.59× |

The carried-over figures imply a baseline (non-pregnant, non-lactating adult)
energy expenditure of **~5.4–6.5×BMR** — a sustained level normally associated
with *peak lactation in high-yield dairy cattle*, not a routine winter
baseline for a dry adult. This is a uniform ~2.1–2.6× overstatement across
**all three** animal types (not just sheep, as the earlier §5.1 sense-check
suggested in isolation) — consistent with the carried-over figures simply
never having been derived from bodyweight at all.

**Two independent disqualifying arguments against the carried-over figures**
(not merely "they look high"):

1. **Energy.** A cow's carried-over ration (38,530 kcal/day) is **3.0× the
   measured thermoneutral maintenance** of a 400 kg suckler cow (12,700
   kcal/day, §5.2.2) and **2.5× even the cold-stressed winter figure** (15,650
   kcal/day). 3× maintenance, sustained all winter on a *dry* animal, has no
   physiological basis.
2. **Gut capacity — decisive, and independent of energy.** The carried-over
   **2 cartloads of hay/month = 500 kg DM/month = 16.7 kg DM/day**. A 400 kg
   cow's physical dry-matter intake ceiling is ~3%BW = **12 kg DM/day = 360
   kg/month** (§5.2.4). The hay ration *alone* is **139% of the cow's intake
   ceiling** — before adding the 2 bu of oats. **A medieval-sized cow cannot
   physically eat the carried-over ration**, regardless of its energy content.
   (Ox: carried-over hay 500 kg/month vs. a 450 kg/month ceiling = 111%, plus
   3 bu oats — also over ceiling.)

**Resolution (user decision needed, but argument 2 forecloses option (b))**:
- **(a) — recommended.** Adopt the §5.2.2 bodyweight-derived baseline (≈ half
  the carried-over figures). This is a significant reduction in modelled winter
  feed demand and will materially loosen the village's winter feed balance
  (§6.4) versus the current simulation — but it is the *physically correct*
  demand for medieval-sized stock, and the carried-over figures were
  un-eatable, so the current sim's feed balance was tightened by an artifact.
- **(b) — not viable.** Keeping the carried-over figures would require
  bodyweights of ~850–1,100 kg cattle / ~110 kg sheep (to make the rations
  both energetically and *physically* eatable). Those are well outside any
  sourced medieval — or even modern unimproved — range (cf. the Highland bull
  at 650 kg, §5.2.1), and would contradict the zooarchaeological withers-
  height evidence. Listed only for completeness.

#### 5.2.6 Revised ration table — [AGREED] (option (a) adopted)

Option (a) adopted (§5.2.5). Expressed in the existing oats/hay units (rounded
to practical fractions; oats retain their current ~10% share of total kcal for
ox/cow, reflecting historical grain-supplementation of working/dairy
animals). These are the **housed, no-grazing-offset** baseline rations; §5.3
then reduces the hay component for stock that winter-graze:

| Animal | Oats (bu/month) | Hay (cartloads/month) | kcal/month | DM (kg/month) | vs. DM ceiling |
|---|---|---|---|---|---|
| Ox/bull | 1.5 | 1.0 | 597,000 | 269.5 | 60% |
| Cow | 1.0 | 0.85 | 497,000 | 226 | 63% |
| Ram | 0 | 0.2 | 108,000 | 50 | 101% |
| Ewe | 0 | 0.15 | 81,000 | 37.5 | 104% |
| Wether | 0 | 0.18 | 97,200 | 45 | 100% |

Sheep figures sit right at the DM ceiling (as expected per §5.2.4); cattle
figures sit well under, with the kcal total close to the §5.2.2 derived
baseline. **`feedNeedsWinter` would be replaced/extended with per-sex sheep
rows (ram/ewe/wether) instead of a single `sheepHay` figure**, consistent
with §4.6's wether addition.

#### 5.2.7 Horse-extensibility note — [PROPOSED, design constraint only]

This bodyweight → BMR → activity-factor → DM-ceiling chain is the
extensibility seam for horses: a horse row would add `bodyweightKg` (~400–550
for a medieval draught/pack horse), its own activity factor (horses at hard
draught work can sustain higher multiples than cattle — commonly cited up to
~4–5×BMR), and a **lower DM ceiling** (~2–2.5%BW/day vs. ruminants' ~3%, since
horses are hindgut fermenters with less digestive capacity for fibrous bulk
and rely on a higher proportion of concentrate/grain). No horse values are
proposed now — this is noted so §5.2's table structure (not its content) is
already shaped to accept a horse row without rework.

### 5.3 Winter grazing — productivity-bounded offset with cold-exposure cost — [AGREED, refines the prior binary rule]

**Supersedes the earlier "100% normal winter / 0% deep winter" binary
multiplier** (Appendix C, 2026-06-13). Two physical realities, raised by the
user, make a flat hay-ration multiplier wrong:

1. **The offset is a *maximum*, capped by what the winter pasture actually
   grows.** Grazing can only replace hay to the extent there is grazeable
   forage in the field that month. The model **already quantifies** this:
   pasture/meadow grow at `WINTER_GRASS_GROWTH_RATE = 0.2` GU/month in a
   normal-winter month versus **0 in deep winter** (`simulation.ts:289, 975`)
   — i.e. winter growth is ~20–30% of the growing-season rate (0.7–1.0), and
   the grazeable supply per month is that growth × the available grazing area,
   in the grass-kcal currency (`grassKcalPerKg`). This is the same physical
   pool (`storedGrass`) the summer grazing draws on; winter simply adds little
   to it.
2. **Winter grazing is not free — it carries a cold-exposure cost.** An animal
   out in an open field is exposed to more cold than one housed in a byre
   (shelter + shared body heat), so its maintenance requirement rises modestly
   for the months it grazes out. This partially offsets the hay it saves.

**Mechanic (replaces the flat multiplier; applies to all grazing stock —
sheep/wethers/rams, and the dry cattle of §5.4)**:

```
# 1. Cold-exposure increment for an animal out grazing this winter month:
maintenance_grazing = maintenance_base(§5.2.2–§5.2.3) × WINTER_GRAZING_COLD_FACTOR

# 2. Grazeable energy it can actually obtain, bounded by BOTH its class cap
#    AND its share of this month's real winter pasture growth:
grazed_kcal = min( offsetCap_class × maintenance_grazing ,
                   animal_share_of( winterPastureGrowth_kcal_this_month ) )

# 3. Remainder drawn from hay stores:
hayRation_effective = max(0, maintenance_grazing − grazed_kcal) expressed in cartloads
```

| Parameter | Value | Status / basis |
|---|---|---|
| `WINTER_GRAZING_COLD_FACTOR` | **1.10** (a +10% maintenance increment while grazing out) | [AGREED 2026-06-14] — the weather-averaged region of the 1.00–1.22 coat-LCT range (a winter mixing soaked days near +20% with dry days near 0%), per user. |
| `offsetCap_class` — sheep (ewe/wether/ram) | **1.0** (up to 100% of maintenance grazeable) | [AGREED] — sheep dig through snow to reach grass that cattle cannot ([Cornell Small Farms](https://smallfarms.cornell.edu/2015/01/considerations-for-winter-grazing-your-sheep/)); but realized only up to the pasture-supply bound in step 2. |
| `offsetCap_class` — dry cattle (§5.4) | **0.30** | [AGREED] — see §5.4. |
| `offsetCap_class` — working oxen/bulls, lactating/late-pregnant cows | **0** (housed, fully hay-fed, no cold increment) | [AGREED] — see §5.4. |

**Derivation of `WINTER_GRAZING_COLD_FACTOR` — [AGREED, value 1.10]**. The physical
mechanism is the **coat-insulation Lower Critical Temperature (LCT)**, from the
NRC framework ([SD State Extension](https://extension.sdstate.edu/how-does-cold-stress-affect-energy-needs-cattle),
[NRC *Effect of Environment*](https://www.ncbi.nlm.nih.gov/books/NBK232316/)):
maintenance rises ~1%/°F that effective temperature falls below LCT, and LCT
is set by the coat:

- **Dry winter coat, sheltered** (≈ a housed byre animal): LCT ≈ **18°F**.
- **Wet / mud-matted coat** (≈ an exposed grazing animal): LCT ≈ **59°F** — a
  soaked coat loses most of its insulation, so cold stress begins at a far
  *milder* ambient temperature.

A typical English lowland winter day sits around **35–45°F**. At those temps a
**dry, sheltered** animal is *above* its 18°F LCT ⇒ **~0% cold increment**,
while a **soaked, exposed** animal is ~15–24°F below its 59°F LCT ⇒
**~+15–24%**. So the housed-vs-grazing differential is driven not by hard
freezes but by **whether the grazing animal is wet** — and the point value
therefore depends on how wet a typical English grazing winter is assumed to
be:

- **~1.20** — exposed stock are wet/muddy most of the winter (full wet-coat
  penalty; England is wet).
- **~1.08–1.15** — weather-averaged over a mix of soaked days and dry-cold
  days.
- **~1.00–1.05** — coats stay mostly dry; only a small wind-chill increment
  over a sheltered animal.

(The earlier draft of this section anchored the ratio to NRC's single *17°F*
worked example — an atypical hard freeze, not a representative English winter
temperature — and is **withdrawn**; the LCT/coat mechanism above, which
applies across the realistic 35–45°F range, is the correct basis.) Sheep show
the same pattern via wool (dry 2.5″ wool LCT 28°F → wet 59°F; wind-chill
increment doubles 1%/°F→2%/°F — [AHDB](https://ahdb.org.uk/news/managing-sheep-in-cold-weather),
[OSU](https://u.osu.edu/sheep/2023/01/10/adjusting-feed-requirements-for-cold-weather/)),
though wool sheds water better, so sheep reach the wet-coat case less readily
than cattle. **Adopted: `WINTER_GRAZING_COLD_FACTOR = 1.10`**
[AGREED 2026-06-14] — the weather-averaged region of the 1.00–1.22 range (a
winter mixing soaked days near +20% with dry days near 0%), per user.

**Emergent consequences (why this is better than the binary rule)**: in deep
winter, winter growth = 0 ⇒ `grazed_kcal = 0` ⇒ full hay ration applies
automatically — the old "0% in deep winter" rule is now an *emergent*
property, not a hardcoded special case, and it generalizes correctly to
arbitrarily long/severe winters and to any stocking density. At high stocking
density (large herd, little pasture), the supply bound in step 2 throttles the
offset below the class cap even in a normal winter — exactly the
"field-productivity-dependent maximum" the user required. The cold factor in
step 1 means the net hay saved is always slightly less than the gross grazed
energy. **R7 note**: this makes winter grazing *balance-bounded* (by forage
energy), in deliberate contrast to §5.5's *land-area-bounded* summer grazing —
correct, because forage is the binding constraint in winter and land area is
the binding constraint in summer.

This mechanic applies to all three sheep types (ewes, rams, wethers, per §4.6)
with `offsetCap = 1.0`; oat rations (cattle only) are unaffected throughout
(oats are a stored-grain supplement, not a grazing substitute).

### 5.4 Cattle winter-grazing — partial offset for dry stock only — [AGREED]

**Revises the earlier "not extended to cattle" position.** Sheep can dig
through snow to reach grass beneath and cattle cannot
([Cornell Small Farms](https://smallfarms.cornell.edu/2015/01/considerations-for-winter-grazing-your-sheep/)),
so cattle do **not** get sheep's full (cap = 1.0) offset. But a **partial**
offset for **dry (non-lactating, non-late-pregnant) cattle** is historically
defensible: pre-industrial mixed farming widely distinguished "yeld" (dry)
stock — wintered on rough pasture/aftermath with reduced supplementary feeding
— from milking/working/late-pregnant animals, which were housed and fully
hay-fed (general pre-industrial northern-European pattern,
[Hurstwic](https://www.hurstwic.org/history/articles/daily_living/text/Villages.htm)).
The model already tracks lactation/pregnancy state per cow (the §5.2.3
multiplier tiers), so this distinction is free to express via `offsetCap_class`
in the §5.3 mechanic:

| Cattle state | `offsetCap_class` | Notes |
|---|---|---|
| Dry adult cow (multiplier tier ×1.0 — not pregnant ≥6mo, not lactating) | **0.30** | Goes out to grass; subject to the §5.3 pasture-supply bound and the §5.3 ×1.10 cold factor. |
| Lactating or late-pregnant (≥6mo) cow; oxen/bulls (working) | **0** | Housed, fully hay-fed, no cold increment. |

The **30%** cap is the user-confirmed **maximum** (not a guaranteed offset):
smaller than sheep's 100% because cattle need more total DM and lack
snow-digging ability, but non-zero because dry cattle were the
lowest-feeding-priority class. As with sheep, the *realized* offset is the
lesser of this cap and the actual winter pasture supply (§5.3 step 2), so in a
hard winter or at high stocking density a dry cow may get well under 30% in
practice. Oat rations are unaffected for all cattle.

### 5.5 Grazing-area stocking densities (growing season) — [AGREED, carried over]

| Parameter | Value | Role |
|---|---|---|
| `pastureAcresPerSheep` | 0.5 | Acres of permanent pasture per sheep, growing season |
| `pastureAcresPerCattle` | 1 | Acres of permanent pasture per ox/cow/bull, growing season |

During the growing season, pasture/meadow grazing is treated as **land-area-bounded, not DM/kcal-balance-bounded**: these stocking-density ratios are the interface used to derive `permanentPastureAcres` (§1.2) from herd composition. The existing `storedGrass`/intense-grazing mechanic in `simulation.ts` (overgrazing pressure, hay-cut timing) is an internal simulation detail for *how* a pasture parcel responds to grazing pressure, not part of this I/O contract — it is not revisited here.

### 5.6 Temporary arable pasture productivity — [AGREED, carried over from §1.3]

Temporary arable pasture (arable land under a grass/ley course rather than permanent pasture) provides **80%** of permanent pasture's grazing capacity per acre — i.e., 1 acre of temporary arable pasture counts as 0.8 acres toward the §5.5 stocking-density requirement.

---

## 6. Animal Products — Chain scope [AGREED], conversions [DERIVED]

### 6.1 Chain scope — [AGREED]

The full product chain is in scope and will be modelled end-to-end:

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
profile of cheese vs. raw milk (spoilage rates differ — see §9); wool→cloth
conversion rate and the spinning-capacity parameter's value and seasonality.

### 6.2 Meat-product consumption cap and preservation — [DERIVED cap; AGREED preservation rules]

**Maximum monthly meat-product consumption cap — [DERIVED, §4.9]**:

```
cap_value          = offal_kg + (2/3)·meat_kg + (1/2)·fat_kg
mealCap_per_capita = cap_value / population
```

Applying the §4.9.5 steady-state cull totals (meat 1064.9, offal 508.3, fat
409.7 kg) for the standard village (pop 90):

```
cap_value          = 508.3 + (2/3)·1064.9 + (1/2)·409.7 = 1423.1 kg
mealCap_per_capita = 1423.1 / 90 ≈ 15.8 kg / person / month
```

This is a solver-layer ceiling: no more than `mealCap_per_capita × population`
kg of meat-product (meat + the fat fraction bound to it, see below) may be
*consumed* in a single month, regardless of how much is in store. It is **not**
a statement of total annual production. The `⅔ meat / ½ fat` weighting reflects
the preservation/binding rules below (only part of each can be stored or
separated). **15.8 kg/person/month** is derived end-to-end from §4.9 (cull
yields anchored to cow 250kg / bull-ox 300kg liveweights, §4.9.5); the figure
is robust to ±2.5% across the full §4.9.4 weight-fraction band (~15.4–16.2 kg).
This is a *consumption ceiling* (~0.52 kg/person/day of meat+offal+fat), above
a typical medieval person's *average* intake (e.g. late-medieval Barcelona
~0.35 kg/day, [Medievalists.net](https://www.medievalists.net/2020/11/medieval-europeans-meat-consumption/)),
which is correct for a ceiling. It supersedes the earlier 14.5/12 figures
(which used a uniform 250kg cattle weight; the bull/ox uplift to 300kg raises
it modestly).

**Preservation rules — [AGREED]** (apply to the cull's meat/offal/fat output):

1. **Fat — bound vs. rendered**: half of the cull's fat **cannot be separated
   from the meat** and must be consumed with it (counts as part of "meat" for
   the cap above). The other half is **rendered** (with a **20% conversion
   loss**) into a separate store (tallow/rendered fat), consumed **year-round**
   — not subject to `mealCap_per_capita` — with spoilage **lower than, but
   more variable than,** grain's §9 baseline (~0.7%/month). Exact rate
   [UNCONFIRMED, deferred to §9].
2. **Offal preservation**: up to **20%** of offal can be preserved
   (salted/dried); spoilage **somewhat higher and more variable** than grain.
   Exact rate [UNCONFIRMED, deferred to §9].
3. **Meat preservation**: up to **50%** of meat can be preserved (salted);
   spoilage **somewhat higher and more variable** than grain. Exact rate
   [UNCONFIRMED, deferred to §9].
4. **Overflow rule**: meat-product (meat + bound fat + offal) arising from a
   cull in a given month, in excess of `mealCap_per_capita × population`, is
   preserved per (2)/(3) rather than consumed fresh — i.e. the cap bounds
   *consumption*, and preservation (up to its own 20%/50% limits) absorbs the
   surplus. What happens to any remainder beyond those preservation limits is
   a rationing/decision-layer question (§0.2), not addressed here.

### 6.3 Meat → salted meat conversion & salt input — [DERIVED]

Standard whole-muscle dry-curing uses **2–3% salt by weight of the meat**,
with ~2.25% as a commonly-cited "sweet spot"
([ScienceInsights — salt curing ratios](https://scienceinsights.org/how-much-salt-to-cure-meat-ratios-methods/)).
For a storage-grade (not just lightly-seasoned) cure, **at least ~30% weight
loss** through moisture removal is typical for the milder end of long-term
preservation, rising to 40%+ for harder/drier cures
([EatCuredMeat — dry curing](https://eatcuredmeat.com/dry-curing/how-to-dry-cure-meat-traditional/)).

**Adopted**: for the up-to-50% fraction of cull meat that §6.2 allows to be
preserved,

```
salt_input_kg     = 0.025 × meat_kg_to_be_salted   (2.5% of pre-cure weight)
salted_meat_kg    = 0.70  × meat_kg_to_be_salted   (30% moisture-loss weight reduction)
```

i.e. **100 kg of fresh meat → 70 kg of salted meat, consuming 2.5 kg of
salt**. The 30% figure is taken from the *low* end of the "storage-grade"
range (30–40%+) — appropriate because this product still needs to be
*edible food*, not a maximally-dried, rock-hard preserve; 2.5% sits in the
middle of the cited 2–3% whole-muscle range. Salt itself is treated as an
**external input** (purchased/traded, not produced by the village) — its
supply is out of scope per §0.3, but the *demand* for it (2.5% of salted
meat's pre-cure weight) is a physical conversion fact recorded here.

The same ratios are adopted for **salted offal** (§6.2 item 2, up to 20%
preservable) — offal is comparable lean tissue, and no offal-specific curing
literature was found to justify a different figure; flagged as
[PROPOSED — offal-specific] if a future source warrants revision.

**Tallow** (§6.2 item 1, the rendered-fat half) is **not salted** — rendering
itself (with its stated 20% conversion loss) is the preservation step; no
additional salt input applies.

### 6.4 Milk → cheese conversion — [DERIVED]

Modern cheesemaking conversion for hard cheese (cheddar) is **~9.5–10.5
litres of milk per kg of cheese**
([DairyCraftPro — cheese yield](https://dairycraftpro.com/how-to-calculate-cheese-yield-from-milk-the-complete-guide-for-cheesemakers/)).
No medieval-specific yield figure was found; medieval cheesemaking (less
standardized milk, simpler presses) plausibly extracted *somewhat* less
solids per litre than modern controlled processes, which would mean *more*
milk per kg of cheese than the modern figure — but absent a sourced
correction factor, the modern hard-cheese ratio is adopted as the
best-available central estimate, at the **conservative (more milk required)**
end of the cited 9.5–10.5 range:

```
cheese_kg = milk_litres / 10
```

**Storage profile**: cheese is the dairy preservation form *specifically
because* it is shelf-stable for months — hard cheeses were aged in cool
cellars for extended periods ([Cheese Grotto — history of cheese
storage](https://cheesegrotto.com/blogs/journal/history-of-cheese-part-3-packaging);
[Brewminate — medieval food storage](https://brewminate.com/medieval-food-storage-before-refrigeration/)),
in deliberate contrast to raw milk's near-zero shelf life (the entire reason
§7.3's lactation-curve milk is consumed same-month, with no raw-milk storage
in the model). No precise %/month figure for medieval cheese exists in the
sources found, but the multi-month-to-multi-year aging window documented
there is **categorically longer** than grain's. **Adopted, §9**: cheese
spoilage = **0.5%/month** — set *below* grain's 0.7%/month baseline (§9),
consistent with cheese's documented long-aging role, while remaining
non-zero (mould/rind loss does occur over a year). Flagged
[PROPOSED — directional only] for the exact figure, since no source gives a
%/month directly; the *direction* (cheese ≤ grain) is well-supported.

### 6.5 Wool → cloth — scope decision: not introduced as a separate currency — [PROPOSED, decisive call]

§6.1 listed "wool → cloth (spinning-capacity bottleneck)" as in-scope. On
inspection, the **existing model (`ASSUMPTIONS.md` W1/W2,
`simulation.ts:184–188`) already operates entirely in wool-lbs**: clothing
*need* is expressed in `clothingNeedWoolLbs` per person, wool *supply* in
`woolPerSheep` lbs/sheep/year, and the spinning-capacity bottleneck (W1: each
woman can spin 1.5× her household's annual need) is already a wool-lbs-based
constraint. There is no other consumer in this model — no trade, no market,
no separate "cloth" stock — that would need wool expressed in a different
unit ("yards of cloth", say).

Introducing a distinct `cloth` currency would require (a) a wool-weight→cloth
conversion factor (genuinely hard to source — cloth weight per yard varied
enormously by weave/quality, and the search above found labour-intensity data
but no weight-conversion figure) and (b) a second spinning *and weaving*
capacity parameter, **for no model behaviour that currently depends on it**.
Per R3 (proportional simplicity), this would be complexity added without a
consumer.

**Decision**: "cloth" is **not** introduced as a separate tracked good. The
existing wool-lbs accounting (supply via `woolPerSheep`, demand via
`clothingNeedWoolLbs` × W2's winter-doubling, bottleneck via W1's 1.5×
spinning-capacity multiplier) **is** this document's "wool → clothing"
physical conversion, at the level of abstraction the model actually uses. If
a future batch adds inter-village trade or a market for finished cloth
(§0.3/§0.4 territory), a wool→cloth weight conversion would become a genuine
new requirement at that point — revisit then. **This is a scope-narrowing
call made now without an open item carried forward**; flagged [PROPOSED] for
override if a concrete future use for a separate "cloth" unit is already
anticipated.

---

## 7. Human Diet & Demand

### 7.1 Per-capita caloric requirements — [AGREED]

Ratified as-is from `defaults.ts`:

| Demographic | kcal/day |
|---|---|
| Adult male | 2,500 |
| Adult female | 2,000 |
| Child | 1,600 |

These are standard dietary-energy figures for the respective body-weight/
activity classes; caloric *need* is physiology, not period, so no medieval-
specific adjustment is sourced or applied. `getDailyKcalRequirement`/
`getAnnualKcalRequirement`/`getMonthlyKcalRequirement` (`simulation.ts:406–420`)
consume these values unchanged.

### 7.2 Ale & draff — physical barley→ale/draff conversion — [AGREED]

**Scope split (per the "split it" direction, retained)**: the *demand-side*
question — what fraction of a person's monthly calories should come from ale,
i.e. the existing `≤20%` target (`D2`, `ASSUMPTIONS.md` §1.4) — remains a
rationing/decision-layer **lever**, exactly like `permanentPastureAcres`/
`splitFraction` (§0.3): a future planner *sets* it, it is not a physical fact,
and its value is **not** specified here. What this document specifies is the
**physical conversion** that planner's choice acts through.

**[AGREED — R7, supersedes an earlier volume-based draft]**: an earlier draft
of this subsection derived `aleKcalPerBushelBarley` from a brewing-yield
figure (7.5 gal ale/bushel, from 1333-34 Clare-household accounts: 60 gal per
8-bushel quarter) times ale's *drinking* caloric density (~100 kcal/pint,
explicitly called "debated" by its own source), giving only 6–12% of the
grain's bread-grain value. That figure is **rejected**: malting and brewing
instead **partitions** a bushel of barley's gross caloric content (75,000
kcal/bu, §2.2) roughly **50/50** between two output streams — the partition
framing accounts for **all** of the grain's energy, not just what ends up in
the liquid that is drunk:

| Output stream | kcal/bu (of input barley) | Form | Storable? |
|---|---|---|---|
| **Ale** (`aleKcalPerBushelBarley`) | **37,500** (50%) | Liquid, human-consumed | Per §9 (open, see below) |
| **Draff** (`draffKcalPerBushelBarley`) | **37,500** (50%) | Wet spent grain, animal feed | **No** — must be fed out the same month it's produced |

This is consistent with malting/brewing being primarily a **mass partition**
(wort/ale fraction vs. spent-grain fraction) with comparatively modest true
energy loss to the fermentation process itself — ethanol (~7 kcal/g) is more
energy-dense per gram than the starch/sugar fermented to produce it, which
offsets much of the mass/energy carried away as CO₂.

**Production pattern — [AGREED]**: barley is malted and brewed **continuously
throughout the year** at a smooth rate (not seasonally/batch), drawn from the
storable barley stock (§9, ~0.7%/month spoilage) — this provides a steady ale
supply rather than one tied to the harvest calendar.

**Draff as a feed input — [DERIVED, new §5 feed-ledger entry]**: every bushel
of barley brewed yields 37,500 kcal of draff, added to that **same month's**
animal-feed supply (§5.1's kcal currency) as a non-storable supplement —
unlike hay/oats/straw, any draff not consumed by livestock within the month
it is produced is **lost**, not carried to stock. The amount of draff
available in a given month is directly proportional to that month's
barley-to-ale throughput (itself a function of the decision layer's ale-share
target and the consumption shape below) — full integration into the §5
feed-balance ledger (which animals draw on draff, in what priority) is a
near-term follow-up once §5 is revisited, but the conversion factor itself is
recorded here as it is squarely physical.

**Consumption shape — [AGREED]**: ale consumption is **not** flat across the
year — winter consumption runs **up to 50% higher** than the summer baseline
(bounded above by whatever overall annual ale-share target the decision layer
sets, §7.4). The annual *target share* (`≤20%` etc.) remains a decision-layer
parameter (per the scope split above); this records only its **seasonal
shape**, in the same spirit as §4.1/§4.3's winter dairy ×0.35 factor (§7.3)
and §0.2's fuel seasonal-demand scaling (D9) — both already-accepted examples
of seasonally-shaped *demand* being in-scope for this document.

**Ale storage profile — [AGREED, resolved in §9]**: medieval (unhopped) ale
soured within **3–4 days** — 1446 Elmley Castle manorial regulations
prohibited alebrewers from selling ale more than four days old
([Recreating Medieval English Ales](https://www.cs.cmu.edu/~pwp/tofi/medieval_english_ale.html)).
Against this model's one-month timestep, a multi-day shelf life is
indistinguishable from **zero cross-month storage** — exactly like draff
above. Ale therefore needs **no spoilage-rate parameter**: it is produced
continuously (per "Production pattern" above) and consumed within the same
month, full stop. Any ale brewed in a month but not consumed that month is
lost, the same as draff. This closes the "open" item below without
introducing a new decay-rate parameter.

### 7.3 Dairy availability — reconciled with §4.1/§4.3 lactation curves — [AGREED, R7 resolved]

`ASSUMPTIONS.md` §1.4 records two dairy-availability rules from an earlier
code state:
- **D5**: "Dairy output from cows: 0% before 36 months, 50% between 36–48
  months, 100% at 48+ months" (cited as `simulation.ts:388–392`).
- **D7**: "Winter dairy output is 35% of summer output for both cows and
  sheep" (cited as `simulation.ts:102, 397`).

Checked against the **current** `simulation.ts` [EXECUTED — grep across the
whole file for `lactationMonths`/age-banded milk multipliers]:

- **D5 is absent.** The cited lines (388–392, and the file as a whole)
  contain no 36/48-month age-banded milk-output multiplier. Dairy output is
  driven *entirely* by `c.lactationMonths`/`s.lactationMonths` via
  `cowMilkKcal()`/`eweMilkKcal()` (`simulation.ts:493–505` — the §4.1/§4.3
  lactation curves: cow peak at month 3 post-weaning declining to dry at
  month 10; ewe full yield months 1–2, half months 3–4). `lactationMonths` is
  set to 1 only on a successful birth, itself gated by the §4.1/§4.3
  breeding-age thresholds (cow/bull 24mo, ewe/ram 12mo) and the §4.8
  conception model — **not** by age 36/48mo. **D5 is stale/superseded** by a
  prior code refactor and should be removed from `ASSUMPTIONS.md` (R7).
- **D7 is present and retained.** `simulation.ts:1173,1179`:
  `dairyKcal += isWinter ? raw * 0.35 : raw`, applied on top of the §4.1/§4.3
  lactation-curve output for both cow and ewe milk — compatible with (not in
  conflict with) the lactation curves.

**Resolution**: §4.1 + §4.3's lactation curves (already [AGREED]) **plus**
the D7 winter-×0.35 factor (retained) together **constitute the complete
dairy-availability rule**: monthly milk kcal = lactation-curve value ×
(0.35 if `isWinter`, else 1). No new parameter is introduced. `ASSUMPTIONS.md`
D5 is flagged for removal as describing a no-longer-existent code path.

### 7.4 Diet composition, food-priority order & consumption caps — decision-layer (out of scope here) — [DERIVED]

`ASSUMPTIONS.md` §1.4 also records:
- **D1**: consumption priority order — dairy → meat (≤15%) → ale/barley
  (≤20%) → wheat → remaining barley → oats → extra meat → emergency sheep
  slaughter.
- **D3**: meat capped at 15% of monthly kcal under normal circumstances.

Per §0.1, **the order in which stores are drawn down, and any target/cap
expressed as "≤X% of monthly kcal," is a rationing decision** — the same
category as the ale-share `D2` cap that §7.2 just placed in the
decision-layer future seam (per the "split it" direction). By the same
reasoning, D1's ordering and D3's 15% meat figure are **also** decision-layer
parameters, not part of this physical model.

What **is** physical, and **is** specified in this document, is the
*ceiling* the decision layer allocates within:
- §6.2's `mealCap_per_capita ≈ 14.5 kg/person/month` — the physical upper
  bound on meat-product consumption (yield-derived from the §4.9 cull model).
  It bounds whatever "meat share" policy the decision layer runs (formerly
  D3's 15%), but is not itself that policy.
- §7.2's `aleKcalPerBushelBarley` — the physical conversion the decision
  layer's ale-share policy (formerly D2's 20%) must apply when deciding how
  much barley to brew.
- §4.1/§4.3 + D7 (§7.3) — the physical dairy supply the decision layer's
  consumption order draws from.

This subsection makes no further claims here: D1/D2/D3 are flagged for
removal/relocation from `ASSUMPTIONS.md` into the future decision-making
model's specification once it exists.

---

## 8. Fuel

### 8.1 Cartload definition — [DERIVED]

The model tracks fuel in "cartloads" (`fuelStocks`, `fuelYieldPerAcre`,
`fuelNeedsSummer/Winter/DeepWinter`) but, unlike hay (`cartloadToKgHay = 250`),
has no explicit weight conversion for fuel. A genuine physical figure can be
derived from the historical English "load" of wood:

- A **"load of unhewn (roundwood) wood"** was a recognised English unit equal
  to 1⅔ cord-feet ≈ 26⅔ cubic feet ≈ **0.755 m³** of *stacked* volume
  ([Load (unit), Wikipedia](https://en.wikipedia.org/wiki/Load_(unit))). This
  is the natural historical referent for a cart's load of firewood — "as much
  as could be conveyed in a cart with one horse."
- Stacked roundwood (irregular branches/poles, not split billets) is roughly
  **50–65% solid wood by volume**, the rest air gaps — a standard range in
  firewood/cordwood literature. Midpoint ≈ 0.575 → solid wood per cartload ≈
  0.755 × 0.575 ≈ **0.43 m³**.
- Air-dried (seasoned, ~20% moisture content) UK hardwood density is
  typically **500–700 kg/m³** (practical estimate for an unknown species mix —
  [Century Wood](https://centurywood.uk/2020/12/29/firewood-numbers/),
  [EngineeringToolbox](https://www.engineeringtoolbox.com/wood-density-d_40.html),
  [Wooduweigh](https://www.wooduweigh.com/cubic-metre-wood-weight-calculator/)).
  Midpoint ≈ 600 kg/m³, appropriate for the mixed oak/ash/hazel/elm coppice
  and pollard species typical of medieval English woodland.
- **Mass per cartload ≈ 0.43 m³ × 600 kg/m³ ≈ 260 kg.**

This lands within ~5% of the model's existing `cartloadToKgHay = 250`,
despite being derived independently for a completely different material
(stacked roundwood vs. baled/loose hay). That convergence is not a
coincidence: a cart's load limit is set by the draft animal's pulling
capacity (a **weight** limit), not by the material's bulk density, so a
roughly material-independent "**cartload ≈ 250 kg**" is physically sensible
as the model's general cart-capacity unit. **Adopted**: fuel cartloads use the
same ≈250 kg figure as `cartloadToKgHay` (no new parameter needed; if a future
batch needs an explicit fuel-energy currency, `cartloadToKgFuel = 250` can
alias `cartloadToKgHay`).

### 8.2 Woodland fuel yield per acre — [AGREED, ceiling identified]

`fuelYieldPerAcre = 1.5` cartloads/acre/year ≈ 375 kg/acre/year (nominal,
before the §8.2.1 growing-season scaling below).

**Comparison ceiling**: a well-stocked, intensively-managed mixed-broadleaf
**coppice** yields roughly 3 tonnes air-dried wood/hectare/year ≈ **1.25
tons/acre/year ≈ 5 cartloads/acre/year**
([ScienceDirect — Coppicing](https://www.sciencedirect.com/topics/agricultural-and-biological-sciences/coppicing),
[Treeplantation — Coppicing guide](https://treeplantation.com/coppicing)).
The model's 1.5 cartloads/acre/year is **~30% of this dedicated-coppice
ceiling**.

That gap is consistent with what `woodlandAcres` actually represents.
`defaults.ts` labels it **"woodland/commons"** — and medieval English commons
were characteristically **multi-use**: villagers held simultaneous rights to
graze livestock (pasture), gather fallen wood and prunings for fuel
(**estovers**), and pasture pigs (pannage) on the same ground
([Woodpasture, heathland and common rights](https://www.mercian-as.co.uk/commonrights.html),
[Medieval Wood Pasture — RuralHistoria](https://ruralhistoria.com/2023/11/12/medieval-wood-pasture-what-is-it/),
[Common land — CAMPOP](https://www.campop.geog.cam.ac.uk/blog/2025/02/06/common-land/)).
Grazed wood-pasture used **pollarding** rather than coppicing — trees were cut
above browsing height and regrew more slowly than protected coppice stools,
because dedicated coppice required fencing livestock *out* during regrowth,
which is incompatible with simultaneous grazing rights. A multi-use
wood-pasture/common therefore produces durably less fuel per acre than a
fenced, single-purpose coppice — **30% of the intensive-coppice ceiling is a
defensible figure for shared estovers-and-grazing common land**, and is
adopted as-is. (The 5 cartloads/acre/year figure remains useful as the
*upper bound* if a future scenario models a dedicated, enclosed coppice
instead of common wood-pasture — a land-use choice, not a physical constant.)

#### 8.2.1 Growing-season scaling (F1) — [AGREED]

`woodlandFuelYield = woodlandAcres × fuelYieldPerAcre × (growingMonths / 12)`
(`simulation.ts` — `woodlandFuelYield`). Coppice/pollard regrowth is wood
*biomass growth*, which — like crop and grass growth elsewhere in this model —
occurs during the growing season. A shorter growing season (`G < 12`)
therefore produces proportionally less annual increment, exactly as it does
for §2's crops and §5.5's pasture. Scaling the annual yield figure by `G/12`
is the correct generalization to arbitrary `G`, consistent with the rest of
the model's season-type architecture. No separate citation needed beyond the
general growth-season principle already established for §2/§5.

### 8.3 Household fuel needs (summer/winter/deep-winter) — [AGREED]

**Per-capita benchmark**: subsistence firewood-consumption estimates
(ethnographic analogy, early-modern archival data) for pre-industrial Europe
range from **roughly 1–2 m³ solid wood per person per year**
([Intensive woodland management in the Middle Ages, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5424077/)).
At §8.1's ≈600 kg/m³ solid-wood density, that is **≈0.6–1.2 tons/person/year**.

**Model total**: with defaults (`G=9`, `W=3`, all 3 winter months classify as
plain `winter` — `winterMonths < 6` means no `deep_winter` core, per
`classifyWinterMonth`):

```
summer:  fuelNeedsSummer (0.5/mo) × G (9)  =  4.5 cartloads
winter:  fuelNeedsWinter (1.5/mo) × W (3)  =  4.5 cartloads
                                     total  =  9.0 cartloads/household/year
                                            ≈ 2.25 tons/household/year
```

`peoplePerHH = {male:1, female:1, child:2.5}` → 4.5 people/household →
**≈0.5 tons/person/year ≈ 0.83 m³/person/year** (at 600 kg/m³).

This sits just **below** the 1–2 m³/person benchmark's low end. Two reasons
this is appropriate rather than a shortfall:

1. The benchmark range spans **Mediterranean to northern-European** climates;
   England is colder than the low end of that range's source climates, which
   would argue for *more* fuel — but
2. **F3 (free summer fuel, §8.4)** means the tracked total *understates* true
   consumption: actual summer cooking fuel is gathered "for free" outside this
   ledger, so total physical wood use is somewhat higher than 0.83 m³/person —
   bringing it closer to the middle of the 1–2 m³ band once untracked summer
   gathering is included.

**Seasonal shape**: winter need (1.5 cartloads/month, heating + cooking) is
**3× summer need** (0.5 cartloads/month, cooking only) — directionally
correct, since space heating (absent in summer) is the dominant winter fuel
use. `fuelNeedsDeepWinter = 2.0` is **+33% over normal winter**, for the
colder core of long winters (`W ≥ 6`, per `classifyWinterMonth`) — directionally
consistent with fuel need scaling with heating degree-days (more severe cold
→ proportionally more heating fuel), the same physical driver behind §5.3's
cold-exposure increment for animals, though humans partially offset cold via
clothing (§1.8, W2's winter-doubling) rather than pure metabolic increase.
**Adopted as-is** — directionally sound, within the plausible band, no
unsupported multiplier introduced.

### 8.4 Free summer fuel (F3) — [AGREED]

A manorial tenant gathering fallen branches and deadwood could collect on the
order of **250 kg in a good day**, representing roughly **1,000 kWh** of
thermal energy
([Thundersaid Energy — Wood fuel history](https://thundersaidenergy.com/downloads/energy-history-how-much-wood-can-be-cut-in-a-day/)).
The summer cooking-only need is 0.5 cartloads/month ≈ 125 kg/month — **under
half a single day's casual gathering**. F3's framing — that hedgerow scraps,
fallen wood, and dung casually collected through the growing season are
sufficient for non-winter cooking without drawing on the managed
woodland/commons allocation (§8.2) — is therefore physically realistic, not
merely a bookkeeping convenience. **Confirmed as-is.**

### 8.5 No fuel spoilage (F5) — [AGREED]

Seasoned firewood is dimensionally and energetically stable across a single
annual storage cycle (the entire premise of "seasoning" wood is that, once
dried to equilibrium moisture content, it does not degrade further in normal
dry storage). Unlike grain (§9, spoilage from pests/damp) or hay (§9, mould),
there is no comparable physical decay mode operating on the relevant
timescale. **No spoilage rate required — confirmed as-is.**

### 8.6 Fuel-shortage response (F4/D9) — decision-layer, out of scope here

The *physical* I/O of this section ends at: fuel produced (§8.2,
`woodlandFuelYield`) vs. fuel consumed (§8.3, household need by season). A
shortfall (`fuelNeeded > fuelStocks`) is itself a physical quantity and stays
in scope. **What happens as a result of a shortfall** — raising the affected
households' caloric requirement to model "burning more food-energy to stay
warm" (`F4`/`D9`, up to +30% winter / +10% summer) — is a **behavioral
rationing response**, not a physical conversion, and belongs in the
decision-layer per the §0.1 scope split (the same treatment given to D1/D3 in
§7.4). `ASSUMPTIONS.md` G10 already flags an implementation issue with this
mechanic (the uplift is computed on the full baseline rather than the
remaining deficit) — that is a simulation-mechanic bug for a future batch, not
a physical-model question, and is noted here only for completeness.

---

## 9. Storage & Spoilage (cross-cutting) — Partially [AGREED]

**[AGREED]**: Spoilage rates are revised down from the prior 3%/month (grain)
and 5%/month (hay) to more realistic figures:

| Stock | Old rate (`[CARRIED OVER]`, superseded) | New rate **[AGREED]** |
|---|---|---|
| Grain (wheat/barley/oats) | 3%/month | **~0.7%/month** |
| Hay | 5%/month | **~2%/month** |

### 9.1 New product-form spoilage rates — [PROPOSED, directional rationale documented]

The §6 product chain introduces new storable forms. No source gives a direct
%/month figure for any of these (medieval storage-duration anecdotes describe
*total* shelf life in months/years, not monthly decay rates), so each figure
below is **derived directionally relative to the §9 grain/hay baselines**,
using the qualitative preservation-vs-raw-input relationship already
established in §6.2/§6.4 as the ordering constraint. All are tagged
[PROPOSED] — the *direction and rough magnitude* are evidenced, the second
decimal place is not.

| Stock | Rate | Basis |
|---|---|---|
| Cheese | **0.5%/month** | §6.4 — below grain's 0.7%, reflecting cheese's documented multi-month-to-multi-year cellar aging (categorically longer-lived than its raw-milk input, which has ~zero shelf life). |
| Salted meat | **1.2%/month** | §6.2 item 3 — "somewhat higher and more variable than grain." Salt larders reliably carried meat through a 4–6 month winter with some rancidity but remaining edible; 1.2%/month ⇒ ~7% cumulative loss over 6 months, consistent with "noticeable but not prohibitive" degradation. |
| Salted offal | **1.2%/month** | §6.2 item 2 — same basis as salted meat (comparable lean tissue, same cure per §6.3); no offal-specific source found to differentiate. |
| Tallow (rendered fat) | **0.5%/month** | §6.2 item 1 — "lower than grain's baseline" per §6.2's own framing; rendered fat was historically valued precisely for long storage (candles, cooking fat carried across seasons). Set equal to cheese's rate as a similarly "well-preserved, but not indefinitely" form. "More variable than grain" (rancidity is condition-sensitive) is a qualitative caveat on top of this central value, not a separate parameter. |
| Straw | **0.3%/month** | Dry, bulky, low-nutrient material — less attractive to pests/rot than grain, but (unlike seasoned fuel wood, §8.5) can mould if damp, so non-zero. Set below grain, well above hay's 2% (straw is far less digestible/nutrient-dense than hay, so less microbially active). |
| Wool (raw) | **0.2%/month** | Archaeological wool textiles survive centuries under reasonable conditions, indicating very slow decay; moth damage is the primary risk and is slow/condition-dependent. Lowest of the new figures — wool is not a food product and has no microbial spoilage pathway. |
| Ale | **N/A — non-storable** | §7.2/§7.3 — unhopped ale sours in 3–4 days, indistinguishable from zero cross-month storage at this model's monthly timestep. No spoilage *rate* applies; any ale unconsumed in its production month is simply lost (same rule as draff). |
| Cloth | **N/A — not a tracked good** | §6.5 — "cloth" is not introduced as a separate currency; wool-lbs (above) is the relevant stock. |

`ASSUMPTIONS.md` C9/W4 (currently zero/undocumented spoilage for straw/wool)
are **superseded** by the straw/wool rows above (R7).

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
| 2026-06-13 | §4.9 | Steady-state offtake/cull model deferred to a future batch; full model must track cohorts by month with a medieval-realistic per-month weight-growth curve | A seasonal-conception derivation gave an implausible 0.917 calvings/cow/yr (exceeds well-managed *modern* rates); a single-snapshot steady-state calc can't honestly resolve cull headcount, timing, and weight together — needs proper monthly cohort tracking |
| 2026-06-13 | §6.2 | Meat-product consumption cap set to placeholder 12 kg/person/month; fat/offal/meat preservation rules (50% fat bound to meat, remaining fat rendered w/ 20% loss, ≤20% offal & ≤50% meat preservable, all vs. grain spoilage baseline) recorded as [AGREED] | Cap derivation depends on the deferred §4.9 cull model; preservation fractions are user-specified inputs for the solver and don't depend on that derivation |
| 2026-06-14 | §4.8.1 | Conception probabilities recalibrated and re-keyed to season *type* (not calendar): cattle 16.2% growing / 8.1% winter month → 0.667/yr; sheep 40.6% `autumn`-type / 5.95% other → 0.88/yr. Derived by discounting cited modern rates (×0.294 cattle, ×0.541 sheep) and back-solving to the annual targets via the renewal-chain steady state. **Supersedes** the 2026-06-13 §4.9-deferral entry's "needs sourcing" caveat and the prior fixed-calendar "Sep–Jan/Feb–Aug" sheep framing | Undiscounted modern rates (55%/75%) implied >1 birth/female/yr (impossible); fixed-calendar windows broke the variable-G/W design. Season-type keying keeps the sheep rut a fixed window under arbitrarily long winters |
| 2026-06-14 | §4.8.4 | Annual fertility targets anchored: cattle 0.667/yr (spring-calving seasonal breeder, ~18mo interval, below modern AI rates), sheep 0.88/yr (decomposed from medieval "≈0.7 lambs reared" ÷ 0.80 survival). Sheep are *more* fertile/yr than cattle | Different reproductive constraints (cattle interval-limited by 9mo gestation + winter condition; sheep photoperiod-locked to a comfortable annual cycle by 5mo gestation) — a single shared rate was biologically wrong |
| 2026-06-14 | §4.9 | Steady-state offtake model **completed** (supersedes 2026-06-13 deferral): cull young-to-save-feed; standard village annual cull ≈23.4 cattle + 17.9 sheep → 976/466/376 kg meat/offal/fat. Young weight-at-cull derived via Brody curve (cattle 0.27, sheep 0.48) anchored on birth% + agreed breeding ages, corroborated by achieved weights of unimproved analogues (Highland cattle 34% at ~7mo, Soay lamb ~50% by Aug) | A single-snapshot steady state *is* sufficient once fertility (0.667/0.88) is fixed and weight is derived rather than guessed; Brody self-validates (recovers modern K=6%/mo from a modern breeding age) |
| 2026-06-14 | §4.9.3/§4.6 | Steady-state sheep composition derived as ≈25 ewes / ≈1 ram / ≈54 wethers (wool economy, minimal ewe flock + 10% lamb safety margin), wether turnover ~42mo | Sheep exist for wool not milk; ewe flock sized only to self-replace. Confirms §4.6's "wethers dominant" within its 3–4yr turnover range |
| 2026-06-14 | §6.2 | `mealCap_per_capita` placeholder (12 kg/person/month) replaced by derived value ≈14.5 kg/person/month (1304.9 kg cap_value ÷ 90 people), robust ±2.5% | Derived end-to-end from §4.9's cull totals via `cap_value = offal + (2/3)·meat + (1/2)·fat`; the closeness to the old 12 kg placeholder is a sanity check, not a basis |
| 2026-06-14 | §7.1 | Per-capita kcal/day (male 2500 / female 2000 / child 1600) ratified as-is, no medieval-specific adjustment | Caloric need is physiology, not period; figures are already standard dietary-energy values for the respective demographic classes |
| 2026-06-14 | §7.3 | Dairy availability = §4.1/§4.3 lactation curves × (0.35 if winter, else 1); `ASSUMPTIONS.md` D5 (36/48mo age-banded milk %) flagged as stale/superseded, D7 (winter ×0.35) retained | Grep of current `simulation.ts` shows milk output driven solely by `lactationMonths` via `cowMilkKcal`/`eweMilkKcal`, gated by the §4.1/§4.3 breeding ages — D5's age bands no longer exist in code; D7 is present and compatible |
| 2026-06-14 | §7.2 | Ale/draff: barley→ale/draff is a 50/50 kcal partition (37,500/37,500 of the 75,000 kcal/bu bread-grain value), not a lossy 6–12% conversion; draff is a new non-storable same-month animal-feed byproduct; brewing is continuous year-round; ale consumption runs up to 50% higher in winter (bounded by the decision-layer's annual ale-share target) | User-directed correction (R7): the prior volume-based derivation (7.5 gal/bu × ~100 kcal/pint ⇒ 6–12%) relied on ale's "debated" drinking-density figure; the partition framing accounts for all of the grain's energy (ale + draff), consistent with brewing being primarily a mass split with modest true fermentation loss |
| 2026-06-14 | §7.4 | D1 (priority order) and D3 (15% meat kcal-share) confirmed as decision-layer/rationing parameters, out of scope for this document; §6.2/§7.2/§4.1+4.3 supply the physical ceilings those policies must respect | Same reasoning the user already accepted for D2 (ale-share %, "split it") applies symmetrically to D1/D3 — consumption ordering and %-of-kcal caps are rationing choices, not physical facts |
| 2026-06-14 | §5.2.1 | Reference bodyweights AGREED: ox 500 / cow 400 / ram 55 / ewe 40 / wether 50 kg, anchored to living unimproved analogues at the medieval withers height (cattle ~110cm → Dexter 325–Highland 450; sheep 57–60cm → Shetland 35–45) | Replaces the prior "no medieval liveweight data found, ±15–20%" hand-wave with zooarchaeological-withers-height + living-analogue evidence; cow chosen at 400 (unimproved-leaning) over the 450 Highland-cow option |
| 2026-06-14 | §5.2.2 | `WINTER_ACTIVITY_FACTOR = 2.5×BMR` validated, not guessed: measured suckler-cow maintenance ME = 0.596 MJ/kg⁰·⁷⁵/day ≈ 2.0×BMR thermoneutral, +20–30% cold-stress → ≈2.4–2.6×BMR | Upgrades the figure from "within a broad 2–5× range" to a match against measured maintenance-energy data for a real dry cow |
| 2026-06-14 | §5.2.5/§5.2.6 | Option (a) adopted: replace the carried-over `feedNeedsWinter` with the bodyweight-derived rations (~half the kcal). Carried-over figures rejected on two independent grounds — 3× a real cow's thermoneutral maintenance, AND hay alone = 139% of a 400kg cow's physical gut-fill ceiling (un-eatable) | Carried-over figures were never derived from bodyweight; option (b) would require impossible ~850–1100kg cattle. Loosens the winter feed balance vs the current sim, which was tightened by an un-eatable-ration artifact |
| 2026-06-14 | §5.1 | `strawKcalPerKgDM = 1,300` adopted (≈5.4 MJ/kg ≈ 60% of hay's ME), conservative low end of the cited 5.5–6.5 MJ/kg straw range | Well-grounded and uncontentious; decided directly rather than escalated |
| 2026-06-14 | §5.3/§5.4 | Winter-grazing offset reworked from a flat hay-ration multiplier to a productivity-bounded, cold-costed mechanic: realized offset = min(class cap, animal's share of actual winter pasture growth); grazing animals incur a ×1.20 cold-exposure maintenance increment. Class caps: sheep/wethers/rams 1.0, dry cattle 0.30, working/lactating/late-pregnant 0. Supersedes the 2026-06-13 binary "100% normal / 0% deep winter" rule | User refinement: winter grazing is a *maximum* bounded by field productivity (already tracked via `WINTER_GRASS_GROWTH_RATE`, 0 in deep winter so the deep-winter→0 case becomes emergent) and is not free (cold exposure raises maintenance). Generalizes correctly to arbitrary winter length/severity and stocking density |
| 2026-06-14 | §5.3 | `WINTER_GRAZING_COLD_FACTOR` 1.20 [DERIVED] **withdrawn** — its derivation was anchored to NRC's 17°F worked example, an atypical hard freeze, not a representative English winter (35–45°F). Re-stated as [PENDING — user decision] over range 1.00–1.22, driven by the coat-LCT mechanism (wet exposed coat LCT 59°F vs dry sheltered coat LCT 18°F) and the assumed English-winter wetness | User flag: 17°F is not typical. Point value is a genuine modeling judgment (wetness assumption) the user must make; not set on their behalf |
| 2026-06-14 | §4.9.5/§4.9.6/§6.2 | Bull/ox cull yield bodyweight raised to 300kg (cows kept at 250kg), per user direction that males weighed more. Pals 48% usable fraction unchanged; male factors ×1.2 → 78/37.2/30 kg. Cattle+sheep cull totals → meat 1064.9 / offal 508.3 / fat 409.7 kg; §6.2 consumption cap → **15.8 kg/person/month** (was 14.5). Feed-weight (§5.2.1: 400/500) vs yield-weight (250/300) inconsistency logged for future reconciliation | User decision; resolves the single-cow-factor-for-both-sexes simplification. The same-animal weight mismatch between feed and yield sides remains a genuine open inconsistency, flagged not resolved |
| 2026-06-14 | §6.2 | Meat-product consumption cap derived: `(offal + ⅔ meat + ½ fat)/pop = 1304.9/90 ≈ 14.5 kg/person/month`, replacing the 12 kg placeholder (robust to ±2.5% over the weight-fraction band) | Now derived end-to-end from §4.9; the placeholder's closeness (12 vs 14.5) is a sanity check |
| 2026-06-14 | §8.1 | Cartload ≈ 250 kg adopted for fuel (reusing `cartloadToKgHay`'s value), derived independently from the historical "load of unhewn wood" (0.755 m³ stacked) × 50–65% solid fraction × 500–700 kg/m³ UK hardwood density ≈ 260 kg | Convergence with the existing hay figure (250 kg) supports treating "cartload" as a roughly material-independent, weight-limited cart-capacity unit; no new parameter needed |
| 2026-06-14 | §8.2 | `fuelYieldPerAcre = 1.5` cartloads/acre/yr (≈375 kg/acre, ≈30% of the 5 cartloads/acre/yr intensive-coppice ceiling) confirmed as-is for `woodlandAcres` = multi-use "woodland/commons" (estovers + grazing rights, pollarding not coppicing); `G/12` growing-season scaling (F1) confirmed as the correct generalization, by analogy to §2/§5.5 growth-season scaling | "Commons" framing in `defaults.ts` implies shared, lower-intensity use than dedicated enclosed coppice — 30% of the intensive ceiling is the physically appropriate range, not a shortfall |
| 2026-06-14 | §8.3 | `fuelNeedsSummer/Winter/DeepWinter` (0.5/1.5/2.0 cartloads/household/month) confirmed as-is: total 9 cartloads/household/yr ≈ 0.83 m³/person/yr, just below the 1–2 m³/person/yr pre-industrial benchmark — gap explained by F3's untracked free summer gathering; winter:summer 3:1 ratio and deep-winter +33% are directionally consistent with heating degree-day scaling | Within the cited benchmark band once untracked summer fuel is accounted for; no unsupported multiplier introduced |
| 2026-06-14 | §8.4/8.5 | F3 (free summer fuel) and F5 (no fuel spoilage) confirmed as-is — F3 validated against a ~250kg/day casual-gathering benchmark (≈2x the entire monthly summer need in one day); F5 is physically uncontroversial for seasoned wood | Both well-grounded and uncontentious; decided directly rather than escalated |
| 2026-06-14 | §8.6 | Fuel-shortage caloric-penalty response (F4/D9) classified as decision-layer (behavioral rationing response to a physical shortfall), out of scope for this document, per the §0.1 split already applied to D1/D3 in §7.4 | Consistent scope treatment; G10's implementation bug noted but left for a future batch |
| 2026-06-14 | §7.2 | Ale spoilage resolved: no decay-rate parameter — unhopped ale soured in 3–4 days (1446 Elmley Castle records), indistinguishable from zero cross-month storage at this model's monthly timestep; ale follows draff's "produced and consumed same month, else lost" rule | Closes §7.2's "open" item without inventing a new parameter; direct citation available unlike the rejected 1.10 cold factor |
| 2026-06-14 | §6.3 | Meat→salted-meat conversion adopted: 100kg fresh meat → 70kg salted meat + 2.5kg salt input (2.5% salt by pre-cure weight, 30% moisture-loss weight reduction). Same ratios applied to salted offal; tallow unaffected (rendering is its own preservation step, no salt) | 2.5% sits mid-range of the cited 2-3% whole-muscle dry-cure ratio; 30% is the low/conservative end of the cited 30-40%+ storage-grade weight-loss range, appropriate for an edible (not maximally-dried) preserve |
| 2026-06-14 | §6.4 | Milk→cheese conversion adopted: `cheese_kg = milk_litres / 10`, the conservative (more-milk-required) end of the modern hard-cheese 9.5-10.5 L/kg range, absent medieval-specific data | Best available figure; medieval cheesemaking plausibly less efficient than modern, so the conservative end of the modern range is the safer adoption |
| 2026-06-14 | §6.5 | "Cloth" not introduced as a separate tracked currency — wool-lbs (existing W1/W2 accounting) remains the model's wool→clothing conversion at its current level of abstraction; revisit only if trade/market mechanics are added | No model behaviour currently consumes a "cloth" unit; adding one (and its unsourceable wool-per-yard conversion) would be complexity without a consumer (R3) |
| 2026-06-14 | §9.1 | New product-form spoilage rates adopted (all [PROPOSED], directional): cheese 0.5%/mo, salted meat 1.2%/mo, salted offal 1.2%/mo, tallow 0.5%/mo, straw 0.3%/mo, wool 0.2%/mo; ale and cloth marked N/A (non-storable / not tracked, see §7.2/§6.5). Supersedes `ASSUMPTIONS.md` C9/W4's zero/undocumented straw and wool rates | No source gives direct %/month figures for these forms; each rate is ordered relative to the §9 grain (0.7%)/hay (2%) baselines using the preservation-vs-raw-input relationships already established in §6 — direction and rough magnitude are evidenced, precision is not |
| 2026-06-14 | §5.3 | `WINTER_GRAZING_COLD_FACTOR` set to **1.10** [AGREED], within the corrected coat-LCT range 1.00–1.22 (weather-averaged English winter) | User decision after the 17°F-anchored 1.20 derivation was withdrawn |
| 2026-06-14 | §4.7 | All-animal winter mortality [PROPOSED]→[AGREED], and reformulated from a single per-winter roll to a **MONTHLY hazard** (`m` per winter month, cumulative `1−(1−m)^W`): adult cattle 0.67%/2.74% per mo, juvenile cattle 1.01%/3.45%, adult sheep 1.01%/4.18%, lambs<12mo 2.74%/7.17% (well-fed/underfed), calibrated so `W=3` reproduces the accepted 2%/8%, 3%/10%, 3%/12%, 8%/20% seasonal levels. Winter-born lambs keep §4.5's one-time neonatal 30%/50% (not monthly). Feed branch evaluated per-month | Accepted as-is, then user-corrected: a per-winter roll wouldn't scale with winter length — the model's whole purpose is arbitrary-length winters/summers, so mortality must compound monthly. Deep-winter-specific uplift flagged as a future option, not imposed |
| 2026-06-14 | §4.8 / §4.8.2 | Reproduction model [PROPOSED]→[AGREED]; male service-capacity caps ratified at bull 12/mo, ram 40/mo (both within cited literature ranges, non-binding at current herd ratios — a safeguard for disproportionate male culling) | User decision; caps are evidence-backed and low-stakes |
| 2026-06-14 | §3.2 / §3.4 | Soil depletion `d` (wheat 0.040 / barley 0.028 / oats 0.022 / hay-aftermath 0.010) and recovery `r=0.11` deliberately **left [PROVISIONALLY CONSISTENT]**, not ratified | Their final calibration depends on the month-by-month rotation/activity ledger, which lives in the out-of-scope decision-making model; locking them here would be premature. Stable and usable as-is (f*≈0.60–0.66) |

