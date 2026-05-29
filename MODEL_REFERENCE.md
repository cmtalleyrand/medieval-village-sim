# Medieval Village Simulation — Consolidated Model Reference

> **Purpose.** A single source of truth for every key variable and equation in the model,
> laid out by subsystem, each variable defined and given a value, linked back to the
> underlying real-world concept. This document is the agreed reference *before* changes to
> `src/lib/simulation.ts`.
>
> **Value provenance tags:** `[code]` = current value in `simulation.ts`/`defaults.ts`;
> `[user-input]` = exposed slider/param the player sets; `[PROPOSED]` = a new or changed
> value not yet in code; `[DECIDED]` = a value fixed by review of this reference.
>
> **Modelling corrections captured here:** (1) spring-crop course = barley **+ oats +
> legumes**; (2) full sheep→wool→cloth chain modelled; (3) sheep graze normal (non-deep)
> winter plant growth; (4) spoilage rates revised down. Each is tagged where it appears.

---

## 0. Notation & core time units

| Symbol | Meaning | Value | Concept |
|---|---|---|---|
| `G` | growing months per sun-era | 9 `[user-input]` | length of the growing season |
| `W` | winter months per sun-era | 3 `[user-input]` | length of winter |
| `sunEraMonths` | one full seasonal cycle = `G + W` | 12 `[code]` | the simulation's fundamental period |
| `MONTHS_PER_YEAR` | calendar months for annual-rate conversion | 12 `[code]` | annual assumptions normalised to months |
| `DAYS_PER_YEAR` | days for kcal/day → kcal/year | 365 `[code]` | calorie accounting |
| `GU` | growth unit = 1 month of full-summer-equivalent growth | — | crop & wool maturation currency |

**Season classification (growing month `gm` ∈ 1..G):** `[code]`
```
springLen   = min(3, floor(G / 2))
autumnStart = G − springLen + 1
spring:      gm ∈ [1, springLen]
long_summer: gm ∈ [springLen+1, autumnStart−1]
autumn:      gm ∈ [autumnStart, G]
```
**Winter classification (winter month `wm` ∈ 1..W):** asymmetric; deep-winter only when
`W ≥ 6`, growing a core that widens with `W`; shoulder months are normal winter. `[code]`

---

## 1. Land

| Variable | Definition | Value | Concept |
|---|---|---|---|
| `totalAcres` | total village land | 1200 `[user-input]` | land endowment |
| `fallowPct` | % of arable resting each cycle | 33.3 `[user-input]` | 3-field rotation |
| `woodlandAcres` | managed coppice/scrub for fuel | 300 `[user-input]` | fuel supply |
| `meadowAcres` | permanently wet hay-meadow, never plowed | 60 `[user-input]` | flood-fed hay source |
| `meadowHayYieldPerAcre` | hay cut per meadow acre | 1.5 t/ac `[user-input]` | richer than arable hay |
| `pastureAcresPerSheep` | summer grazing land per sheep | 0.5 `[user-input]` | stocking density |
| `pastureAcresPerCattle` | summer grazing per ox/cow/bull | 1.0 `[user-input]` | stocking density |

**Land categories (permanent):** Arable (rotated), Permanent pasture, Meadowland, Woodland.
**Arable land split** (% of active, non-fallow arable) `[user-input]`:
wheat 30 / barley 20 / oats 20 / hay 30. **[PROPOSED]** the 40% "spring crops" block
(barley+oats) becomes **barley + oats + legumes** (see §3.1).

---

## 2. Crops

### 2.1 Crop set & course membership  **[PROPOSED — correction #1]**

| Course | Members | Notes |
|---|---|---|
| Winter-cereal | **wheat** | autumn-sown, overwinters |
| Spring-crop | **barley, oats, legumes** | spring-sown; barley driven by ale demand, oats residual/feed, legumes for soil + food |
| Fallow | — | rests / grazed / manured |

`legumes` (peas/beans/vetches) are a **new crop type**. Their soil effect and food/feed
value depend on end-use — see §3.2.

### 2.2 Growth-unit accumulation  `[code]`
Each month a growing parcel gains `CROP_GROWTH_RATE[type][season]` GU.

| Crop | spring | long_summer | autumn | winter | deep_winter |
|---|---|---|---|---|---|
| wheat | 0.7 | 1.0 | 0.7 | **0.15** | 0.0 |
| barley | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 |
| oats | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 |
| legumes | 0.7 | 1.0 | 0.7 | 0.0 | 0.0 `[PROPOSED]` |

`SEASON_GROWTH_RATE` (generic, for hay/fallow/wool timing): spring 0.7 / long_summer 1.0 /
autumn 0.7 / winter 0.0 / deep_winter 0.0. `[code]`

### 2.3 Maturity (GU to ripe)  `[code]`
| Crop | maturity GU | derivation (9/3 calendar, March = month 1) |
|---|---|---|
| wheat | 5.95 | 2×0.7 autumn + 3×0.15 winter + 3×0.7 spring + 2×1.0 summer |
| barley | 5.10 | 2×0.7 spring + 3×1.0 summer + 1×0.7 autumn |
| oats | 4.40 | 2×0.7 spring + 3×1.0 summer |
| legumes | **4.60** `[DECIDED]` | field beans/peas ripen between oats and barley (food + partial-soil role) |

### 2.4 Harvest timing & yield modifier  `[code]`
`delta = growthUnits − maturity`
```
delta < 0:        0.85^(−delta)              early (≈15%/GU penalty)
0 ≤ delta ≤ 1:    1.0 + delta×0.05
1 < delta ≤ 2:    1.05 + (delta−1)×0.03
2 < delta ≤ 3:    1.08 + (delta−2)×0.02      peak 1.10 at +3
delta > 3:        1.10 × 0.90^(delta−3)       overripe decline
```
Force-harvest once `delta > CROP_HARVEST_DELTA_MAX`: wheat 1.0, barley 0.7, oats 0.7.
Non-overwintering crops (barley, oats, legumes) force-harvested at last growing month.

### 2.5 Yields, seed, calorie density  `[user-input]`
| Crop | gross yield | seed rate | kcal/bushel | mass |
|---|---|---|---|---|
| wheat | 10 bu/ac | 2.5 bu/ac | 90,000 | 60 lb/bu × 1500 kcal/lb |
| barley | 12 bu/ac | 4 bu/ac | 75,000 | 50 lb/bu × 1500 kcal/lb |
| oats | 12 bu/ac | 4 bu/ac | 38,000 | 32 lb/bu × 1200 kcal/lb |
| legumes | 8 bu/ac `[DECIDED]` | 3 bu/ac `[DECIDED]` | 90,000 `[DECIDED]` | peas/field beans: energy + protein, ~57 lb/bu |
| hay (arable) | 1.2 t/ac | — | — | roughage |

**Net realised harvest** per acre:
```
harvest_bu = yield × fertility × harvestModifier × titheFactor × yieldShock
titheFactor = (100 − titheAndManufacturePct)/100,  titheAndManufacturePct = 15 [user-input]
```
**Yield shock:** log-normal, σ = `yieldVariability` = 15% `[user-input]`, with a **shared
climate shock** correlated across wheat/barley/oats (sensitivities 0.8 / 0.7 / 0.6)
`[code, per ASSUMPTIONS]`. Legume climate sensitivity = 0.6 `[DECIDED]`.

### 2.6 Straw  **[PROPOSED — not yet in code]**
`straw_tons = harvest_bu × bushelMassKg × STRAW_GRAIN_RATIO[crop] / 1000`
| Ratio | value | concept |
|---|---|---|
| `STRAW_GRAIN_RATIO[wheat]` | 1.5 | tall straw, thatch/bedding |
| `STRAW_GRAIN_RATIO[barley/oats]` | 1.2 | shorter straw |
| `STRAW_GRAIN_RATIO[legumes]` | 1.0 `[DECIDED]` | haulm; lower-value roughage, partly grazed |
Straw is stored as a winter **roughage** stock (§6).

---

## 3. Soil fertility

`fertility ∈ [fertilityFloor, 1]` per arable parcel. `initialFertility = 0.85`,
`fertilityFloor = 0.40` `[user-input]`.

**Current monthly model** `[code]`:
```
cropped:   fertility −= d × CROP_GROWTH_RATE[type][season]
uncropped: fertility += r × growthRate × (1 − fertility)
           growthRate = SEASON_GROWTH_RATE[season]      (growing)
                      = WINTER_FALLOW_RECOVERY[wtype]   (winter: 0.3 normal / 0.0 deep)
```

### 3.1 Depletion `d`
| | value | concept |
|---|---|---|
| current uniform `d` | 0.03 `[code]` | nutrient loss per GU grown |
| wheat | 0.040 `[PROPOSED]` | deepest roots, heaviest grain+straw export |
| barley | 0.028 `[PROPOSED]` | moderate |
| oats | 0.022 `[PROPOSED]` | least-depleting cereal |
| legumes | **−0.014** `[DECIDED]` | N-fixation, net of food export; from end-use blend (§3.2) |

### 3.2 Legume nitrogen return (end-use dependent)  **[PROPOSED — correction #1]**
| Use | soil effect |
|---|---|
| plowed in green | strongly negative `d` (max N return) |
| grazed in field | moderately negative `d` (manure N) |
| harvested for food | ≈ 0 / slightly positive (N exported in grain) |
**[DECIDED — food + partial-soil role]** end-use split: harvested-for-food 50% /
grazed 30% / plowed-in green 20%. Soil benefit blended **continuously** over the
grazed+plowed-in fraction (no threshold discontinuity):
```
returnFraction = grazedFrac×0.5 + plowedInFrac×1.0          = 0.30×0.5 + 0.20×1.0 = 0.35
d_legume = −D_LEGUME_MAX × returnFraction,  D_LEGUME_MAX = 0.040   ⇒  d_legume ≈ −0.014
```
So a mostly-food legume course still gives a net negative `d` (soil gain). The end-use
split is a documented tunable (could become a player slider later).

### 3.3 Recovery `r` and steady-state fertility
| | value | concept |
|---|---|---|
| `r` (recovery) | 0.11 `[code]` | fertility regained per uncropped GU-equiv |
| `WINTER_FALLOW_RECOVERY` | winter 0.3 / deep_winter 0.0 `[code]` | frost mineralisation vs frozen ground |
| `PLANNER_AVG_FERTILITY` | 0.70 `[code]` | steady-state mean used by planner |
| equilibrium `f*` | ≈ 0.62–0.68 `[PROPOSED target]` | 3-field steady state |

**[PROPOSED]** once per-crop `d` lands, recalibrate `r` so the 3-field 9/3 equilibrium gives
`f* ≈ 0.62`, and set `PLANNER_AVG_FERTILITY` to the *derived* long-run mean (not a magic
0.70). The equilibrium is a nonlinear fixed point (linear depletion vs saturating recovery),
so derive it numerically, not by a linear hand-balance.

---

## 4. Livestock

### 4.1 Cattle  `[code]`
| Variable | Value | Concept |
|---|---|---|
| `COW_GESTATION` | 9 mo | |
| `COW_LACTATION_MAX` | 10 mo | dry ~10 mo after calving |
| `COW_POSTPARTUM_INFERTILE` | 2 mo | |
| `COW_CALF_WEAN_MONTHS` | 2 mo | human milk from month 3 |
| `COW_MIN_CYCLE` | 12 mo | once-a-year calving |
| `CATTLE_MAX_LIFESPAN` | 120 mo | |
| `bullsPerCow` | 1/12 `[user-input]` | |
| `ACRES_PER_OX` | 15 `[code, planner]` | 8-ox team plows ~120 ac → traction bottleneck |
| calving rate | 0.80; calf survival to yr1 0.80; to working age 0.61 cumulative | demography |
| `COW_TO_OX_RATIO` | 0.60 `[PROPOSED]` | herd-stability cow:ox sizing for planner |

### 4.2 Sheep  `[code]`
| Variable | Value | Concept |
|---|---|---|
| `EWE_GESTATION` | 5 mo | |
| `EWE_LACTATION_MAX` | 4 mo | |
| `EWE_POSTPARTUM_INFERTILE` | 2 mo | |
| `EWE_MIN_CYCLE` | 12 mo | annual lambing |
| conception prob. | 0.85; needs ≥1 ram, ≥12 mo old, non-winter | |

### 4.3 Herd composition (per household defaults)  `[user-input]`
oxen 2 / cows 2 / sheep 4.

### 4.4 Meat (cull yields)  `[user-input]`
sheep 40,000 kcal · adult cattle 350,000 · calf 75,000.

### 4.5 Pre-winter cull thresholds  **[PROPOSED]**
Cull animals that would die of old age within the next sun-era unless they can complete
one more useful cycle:
| Type | keep if remaining lifespan ≥ |
|---|---|
| Cow | `W + COW_GESTATION + 2` |
| Ewe | `W + EWE_GESTATION + 2` |
| Ox | `W + 3` (survive winter + spring plowing) |
| Bull | `W + 6` |
| Ram | `W + 2 × WOOL_CYCLE` |
Then **max-stocking cull**: if projected winter feed < available, cull oldest-first, never
below the clothing floor (sheep) or traction floor (oxen).

---

## 5. Sheep → Wool → Cloth chain  **[PROPOSED — correction #2: model the full chain]**

| Variable | Value | Concept |
|---|---|---|
| `WOOL_GROWTH_RATE` | spring 0.8 / summer 1.0 / autumn 0.6 / winter 0.3 / deep_winter 0.3 `[code]` | fleece grows year-round, slower in winter |
| `WOOL_SHEAR_ELIGIBLE` | 9.0 GU `[code]` | shear when eligible in spring/summer |
| `WOOL_SHEAR_URGENT` | 12.0 GU `[code]` | shear any non-winter month |
| `woolPerSheep` | 1.5 lb/yr `[user-input]` | fleece weight |
| `clothingNeedWoolLbs` | 1.5 lb/person/yr `[user-input]` | garment replacement |
| `SPINNING_CAPACITY_FACTOR` | 1.5 `[DECIDED]` | monthly spinning throughput = 1.5× the steady clothing need ⇒ headroom, but binds when the flock/wool surges |
| cloth seasonal use | winter ≈ 2× summer `[code, per ASSUMPTIONS]` | wear/exposure |

**Chain — explicit (spinning-capacity bottleneck `[DECIDED]`):**
```
flock fleece (GU) ──shear (≥9.0 / urgent ≥12.0)──▶ wool stock (lb)         [carries over]
spinCapMonthly = SPINNING_CAPACITY_FACTOR × (totalPeople × clothingNeedWoolLbs / 12)
cloth_made_this_month = min(wool stock, spinCapMonthly)                     [labour cap]
wool stock −= cloth_made_this_month                                        [unspun wool carries over]
cloth stock += cloth_made_this_month
cloth need/month = totalPeople × clothingNeedWoolLbs/12 × seasonWeight       (winter 2×, summer 1×)
cloth stock −= consumption;  if cloth stock < need ⇒ "Bare Backs" shortage
clothing floor (min flock) = ceil(totalPeople × clothingNeedWoolLbs / woolPerSheep),
   adjusted for wool already in stock + produced over the next sun-era.
```
Three things this models that "wool-limited only" did not: (a) a **spinning/labour ceiling**
so a wool surplus can't instantly become cloth; (b) **unspun wool carry-over**; (c) cloth as
a stock distinct from wool. Units of "cloth" are kept in wool-lb-equivalent for simplicity.

---

## 6. Winter feed & grazing

### 6.1 Per-animal winter feed (monthly, before deep-winter multiplier)  `[user-input]`
| Animal | oats (bu/mo) | hay (cartloads/mo) |
|---|---|---|
| ox | 3 | 2 |
| cow | 2 | 2 |
| sheep | 0 | 0.4 |
Modifiers: deep-winter ×`deepWinterFeedMultiplier` = 1.25 `[user-input]`; pregnant hay ×1.5,
oats ×1.3; lactating hay ×1.3. `[code]`

### 6.2 Sheep winter grazing  **[PROPOSED — correction #3]**
`WINTER_GRASS_GROWTH_RATE = 0.2` `[code]` already exists for grassland cohorts. **Change:**
sheep may **graze normal (non-deep) winter plant growth** as roughage, reducing their hay
draw in shoulder-winter months. **[DECIDED]** grazing offsets **up to 100%** of `sheepHay`
in normal winter when standing grass ≥ demand (capped by actual standing grass when it is
short); **deep winter forces full hay (0% offset)**. Grass consumed this way is drawn from
the pasture/meadow cohort `storedGrass`, so it competes with hay-cut and cattle grazing.

### 6.3 Hay / roughage sources (summed)  `[code]` + straw `[PROPOSED]`
1. Meadow hay = `meadowAcres × meadowHayYieldPerAcre`
2. Arable hay (rotation hay fields / aftermath)
3. **Straw** (§2.6) — high volume, low density
4. Permanent-pasture hay cut (long_summer, ungrazed)
Conversions: `cartloadToKgHay` = 250 kg `[user-input]`; `grassKcalPerKg` = 600 `[user-input]`;
`GRASS_TO_HAY_MASS_RATIO` = 0.25; `GRASS_TO_HAY_KCAL_RATIO` = 3.6 `[code]`.
Grass cohort thresholds: first-cut 1.0 GU, regrowth-cut 2.0 GU, post-mow residual ×0.5,
intense-grazing trigger 0.03 / max share 0.6 `[code]`.

### 6.4 Roughage minimum
≥ 50% of dry-matter intake must be roughage. **Almost never binding** once straw is added
(§6.3) — so model the *stock* and check it, but do **not** build heavy fraction-enforcement
machinery. `[PROPOSED scope limit]`

### 6.5 Feed balance closure  `[code]`
```
hay_available = meadow + arable + straw + pasture-cut       (− sheep winter grazing offset)
hay_needed    = Σ animal_hay × W × deepWinterMult × (preg/lact mods)
oats_available = oat_stocks − human_oat_need
oats_needed    = Σ animal_oats × W × deepWinterMult
shortfall ⇒ hay↔oats substitution (1 ton hay ≈ 10 bu oats) then emergency cull.
```

---

## 7. Human diet & demand

### 7.1 Population & calories  `[user-input]`
peoplePerHH male 1 / female 1 / child 2.5 (4.5 souls/HH). kcal/day male 2500 / female 2000 /
child 1600. `annual_kcal_need = Σ people × kcal/day × 365`.

### 7.2 Calorie sources & allocation order  `[code, per ASSUMPTIONS D1–D9]`
dairy → meat (≤15% of kcal) → barley ale (10–20% of kcal) → wheat bread → remaining barley
→ oats → extra meat → emergency winter slaughter.
| Source | target | type |
|---|---|---|
| wheat bread | 60–70% | rotation-driven |
| barley ale | 10–20% | **demand-side** (not rotation) |
| oat gruel | residual | oats after feed |
| legumes (pottage) | residual food after ale/wheat, ~5% `[DECIDED]` | new food source; surplus to fodder |
| dairy | 10–15% | animal |
| meat | ~5% | cull events |

### 7.3 Barley (ale) demand constraint  `[PROPOSED]`
```
barleyKcalTarget ∈ [0.10, 0.20] × totalKcalNeed
barleyAcres = clamp(target/barleyNetKcalPerAcre, min, min(max, springCropAcres))
oats/legumes share the rest of the spring-crop course
```

### 7.4 Dairy  `[code/user-input]`
cow 60 L/mo peak, sheep 4 L/mo peak, 600 kcal/L. Seasonal:
`dairyMonthsEquivalent = (12 − W) + W × 0.35` (winter dairy factor 0.35).

---

## 8. Fuel & clothing demand

| Variable | Value | Concept |
|---|---|---|
| `fuelYieldPerAcre` | 1.5 cartloads/ac/yr `[user-input]` | woodland regrowth (deterministic) |
| fuel need summer | 0.5 cartload/HH/mo `[user-input]` | cooking |
| fuel need winter | 1.5 `[user-input]` | heating (shoulder) |
| fuel need deep-winter | 2.0 `[user-input]` | full heating |
Fuel shortage ⇒ "Cold Hearth" + caloric penalty. Clothing chain in §5.

---

## 9. Spoilage  **[correction #4: rates revised down]**

| Stock | current `[code]` | new default `[DECIDED]` | rationale |
|---|---|---|---|
| grain (granary) | 3% / mo | **0.7% / mo** (~8%/yr) | sealed/dry granary loss is low; 3%/mo ⇒ ~31%/yr was implausibly high |
| hay | 5% / mo | **2% / mo** (~22%/yr) | rick hay loses leaf/quality; 5%/mo ⇒ ~46%/yr was too steep |
These are player-facing slider **defaults** (`spoilageRate`, `haySpoilageRate`); players can
still adjust them.

---

## 10. Planner (resource sizing) — variables it derives  `[code]`

Inputs: population, `G`, `W`, land areas, physical constants. Outputs: arable acres,
rotation structure, oxen/cows/bulls/sheep, pasture, forest.
Key planner constants: `plannerRiskBufferPct` = 5% `[user-input]`; `PLANNER_AVG_FERTILITY`
(see §3.3); `ACRES_PER_OX` = 15. **[PROPOSED]** cows from herd-stability (`COW_TO_OX_RATIO`),
not the current meadow-constrained formula; barley from demand-side range (§7.3); straw in
hay budget; rotation/fallow derived not hardcoded.

---

## 11. Status of values

**Fixed by review (`[DECIDED]`):**
1. **Legumes** — food + partial-soil role: maturity 4.60 GU, 8 bu/ac, seed 3, 90,000 kcal/bu,
   climate sensitivity 0.6, straw 1.0, end-use 50/30/20 (food/grazed/plowed-in) ⇒ `d ≈ −0.014`,
   diet share ~5% residual. (§2.3, §2.5, §2.6, §3.1, §3.2, §7.2)
2. **Spoilage** — grain 0.7%/mo, hay 2%/mo defaults. (§9)
3. **Sheep winter grazing** — up to 100% hay offset in normal winter, 0% deep winter. (§6.2)
4. **Sheep→wool→cloth** — spinning-capacity bottleneck (factor 1.5), unspun wool carries over,
   cloth a distinct stock, winter 2× consumption. (§5)

**Secondary tunables (defaults set, revisit later, non-blocking):**
- `D_LEGUME_MAX` = 0.040 (scales legume soil benefit); legume end-use split could become a slider.
- Legume `winter`/`deep_winter` growth = 0 (no overwintering) — revisit if an autumn-sown
  legume variety is wanted.
- `equilibrate` target `f* ≈ 0.62` and the derived `PLANNER_AVG_FERTILITY` (computed once
  per-crop `d` lands).

**Still `[PROPOSED]` (i.e. in this reference but not yet in code):** per-crop fertility
depletion (§3.1), straw tracking (§2.6), pre-winter cull rules (§4.5), spinning chain (§5),
sheep winter grazing (§6.2), barley demand constraint (§7.3), planner herd-stability sizing
(§10). These are the implementation backlog for `simulation.ts` once this reference is agreed.
