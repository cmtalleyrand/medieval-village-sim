# Medieval Village Simulation — Model Specification

*Working document. Describes the intended model, what is currently implemented, what is wrong, and the implementation plan.*

---

## 1. Land Categories

Four permanent categories; areas are simulation parameters set before any run.

| Category | Description | Fertility model |
|---|---|---|
| **Arable** | Subject to rotation (crops + fallow). Plowed, sown, harvested. | Tracked per-parcel, depleted by crops, recovered by fallow |
| **Permanent pasture** | Never plowed. Provides summer grazing and can produce a hay cut when ungrazed. | Independent cohort model (growth rate by season) |
| **Meadowland** | Permanently wet, low-lying. Never plowed. Hay cut once at Midsummer; aftermath grazed in autumn. | Independent of arable model; maintained by seasonal flooding |
| **Woodland** | Managed coppice/scrub for fuel. | Fixed annual yield per acre |

**Temporary sub-category — arable pasture:** Arable land between courses (or after a course ends early within a very long growing season) can be laid to grass. Productivity = 80% of permanent pasture. This prevents pure-fallow waste for seasons much longer than historical.

---

## 2. The Rotation System

### 2.1 Terminology

- **Sun-era**: One full growing season + one full winter, starting on the first day of spring.
- **Course**: What a field does during one sun-era. A course has a crop type (or "fallow") and a within-sun-era schedule of monthly activities.
- **Rotation**: An ordered sequence of courses that a field cycles through, then repeats. Length 1–4 sun-eras.
- **Two parallel rotations** are allowed, each running on a different fraction of the arable land.

### 2.2 Monthly field activities

Every acre of arable land has exactly one activity per month. Activities are mutually exclusive (non-concurrent on a given acre). Each takes one calendar month.

| Activity | Requires traction | Prerequisites | Effect on fertility |
|---|---|---|---|
| **Plowing** | Yes (oxen) | Must have something to plow in: recent manure deposit (from grazing activity in prior month or two) or accumulated plant matter (fallow). Re-plowing a bare field the following month has no effect. | Converts accumulated plant matter / manure into fertility gain (realized when crop grows) |
| **Sowing/harrowing** | Yes (oxen) | Must immediately follow plowing | None directly; starts crop growth |
| **Harvesting** | No | Crop must have reached maturity threshold | None; resets field to stubble |
| **Stubble grazing** | No | Only in the 1–2 months immediately after harvest (stubble is exhausted after that) | Deposits manure |
| **Grazing (temporary pasture)** | No | Field not plowed/sown | Deposits manure; provides livestock feed |
| **Fallow (none)** | No | Any uncropped field | Accumulates plant matter slowly; no manure deposit |

**Key constraints:**
- Plowing is only productive if preceded (recently) by grazing or a fallow accumulation period. A field plowed bare without prior grazing/fallow wastes the effort.
- Stubble grazing transitions naturally to ordinary temporary-pasture grazing once the stubble is exhausted (~1 month). Functionally similar in the model; the distinction matters only for tracking.
- Traction demand: plowing is the bottleneck. One 8-ox team can plow roughly 1 acre/day ≈ 25–30 acres/month. Sowing/harrowing is lighter work on already-loosened soil.

### 2.3 Within-sun-era field schedule

**Wheat course** (9/3 standard season, using activities):

| Month | Activity | Notes |
|---|---|---|
| GM1–GM5 | *growing* (wheat) | Wheat sown last autumn; reaches maturity ~GM5 (5.95 GU) |
| GM5–GM6 | **Harvesting** | Harvest window; wait up to 1.0 GU past maturity |
| GM6 | **Stubble grazing** | 1 month — stubble exhausted after this |
| GM7 | **Grazing** (temporary pasture) | Further grazing deposits more manure |
| GM8 | **Plowing** | Something to plow in from 2 months of grazing |
| GM8–GM9 | **Sowing/harrowing** | Wheat sown for next sun-era's wheat course |
| W1–W3 | *growing* (wheat overwinters) | 0.15 GU/month (normal winter) |

*The 2 GU inter-crop gap (between harvest and re-sow) is satisfied by: stubble grazing (GM6) + temporary pasture (GM7) + plowing (GM8) = 3 months, accumulating 0.7 + 0.7 + 0 = 1.4 GU of uncropped time. Together with winter (3 × 0.15 = 0.45 GU) the total uncropped period before next spring growth = 1.85 GU.*

*Note: the current code enforces the 2 GU gap using growth-unit accumulation, which implicitly requires this sequence to have occurred. The activity model will make it explicit.*

**Spring-crop course** (barley / oats mix):

| Month | Activity | Notes |
|---|---|---|
| W1–W3 | **Fallow** | Bare field from previous autumn's post-harvest work |
| GM1 | **Plowing** | Plow in accumulated plant matter from fallow winter |
| GM2 | **Sowing/harrowing** | Spring crop sown |
| GM2–GM6/7 | *growing* (barley or oats) | Oats: harvest ~GM6 (4.40 GU); Barley: harvest ~GM7 (5.10 GU) |
| GM6/7 | **Harvesting** | |
| GM7 | **Stubble grazing** | 1 month |
| GM8–GM9 | **Grazing** (temporary pasture) | Further manure deposit; field rests for next rotation step |

**Fallow course**:

| Month | Activity | Notes |
|---|---|---|
| W1–W3 | **Fallow** | Plant matter accumulates slowly |
| GM1 | **Plowing** | Plow in winter accumulation |
| GM2–GM4 | **Grazing** | Sheep and cattle deposit manure. Maximum fertility return. |
| GM5 | **Plowing** | Plow in spring grazing manure |
| GM6–GM8 | **Grazing** | Further manure |
| GM9 | **Plowing** | Final pre-winter preparation; plow in summer manure |

Three plowings per fallow year is the historical standard (winter, spring, summer). Each plowing is productive only because the preceding period deposited something to plow in.

### 2.4 Extra months — how additional growing capacity is used

When growing season length exceeds what the standard 3-field rotation needs (baseline: 9 months), the surplus capacity is absorbed in the following priority order. Each step requires the previous one to be in place first.

| Extra months accumulated | What the additional month goes to |
|---|---|
| +1 | **Extended growing**: leave crops in ground longer before harvest. Historically realised through later-maturing crop varieties. Direct yield gain. |
| +2 | **Additional post-harvest grazing**: one more month of temporary pasture after harvest, depositing more manure. Makes the next plowing more productive. |
| +3 | **Another growing extension**: another month of longer-season variety or waiting longer. |
| +4 | **Another post-harvest grazing month**: further manure accumulation. |
| +5 | **Additional plowing**: now worthwhile because two extra grazing months have deposited more than was there before. |
| +6 | **Additional fallow/grazing**: more resting and manuring before the rotation cycles. |
| +7 | **Entirely new crop cycle**: −1 month of grazing, −3 months of growing from the original crop, +5 months of a complete additional short-season crop (e.g., oats: 4.40 GU with more summer months). The yield gain from the extra crop exceeds the value of longer growth on the first crop. |

*This sequence is a working hypothesis derived from first principles (longer growth → more yield, but diminishing return; grazing → manure → plowing cycle has a fixed minimum duration; a full additional crop only pays off when there is enough remaining season for it to approach maturity). It should be tested against simulation outputs.*

The implication for rotation selection: instead of a fixed 3/4/5-course rule, the number of courses and fallow depth should emerge from the available season length and the economic trade-offs above. The current fixed-course selection is an approximation.

### 2.5 Barley/oats split on spring-crop course

Barley and oats are sown as a mix on the spring-crop course. The split is NOT determined by the rotation — it is a **demand-side constraint** driven by human ale consumption (see Section 7).

---

## 3. Soil Fertility Model

### 3.1 Current implementation

Each crop parcel carries a `fertility` scalar (0–1). Every month:

```
if cropped:  fertility -= d × CROP_GROWTH_RATE[cropType][season]
if uncropped: fertility += r × SEASON_GROWTH_RATE[season] × (1 - fertility)    [growing season]
             fertility += r × WINTER_FALLOW_RECOVERY[winterType] × (1 - fertility)  [winter]
```

Constants: d = 0.03 (all crops), r = 0.11. `WINTER_FALLOW_RECOVERY`: normal winter = 0.3, deep winter = 0.0.

### 3.2 What is wrong

**What d means:** d is fertility depletion *per growth unit accumulated by the crop*. One GU represents one month of full-summer-equivalent growth. d therefore captures how much soil nutrient the crop extracts per unit of growing effort — independent of season length. A crop with more GU (longer season) depletes more in total; d controls whether it also depletes more *per unit of growth*.

**Uniform d across crops is incorrect.** Wheat depletes soil more than other cereals because:
- Deeper root system extracts nutrients from lower soil horizons — not captured by uniform d
- Heavier grain yield per acre at maturity exports more nutrients
- Straw removed for thatching/bedding, reducing organic matter return to field

**Proposed per-crop depletion rates:**

| Crop | d (per GU) | Rationale |
|---|---|---|
| Wheat | 0.040 | Deepest extraction, heaviest export |
| Barley | 0.028 | Moderate — shallower roots, shorter season |
| Oats | 0.022 | Least depleting of the main cereals |
| Legumes/pulses | *variable* | See note below |
| Arable hay (aftermath) | 0.010 | Roots remain; partly returns nutrients |

**Legumes — variable depletion depending on end use:**

Legumes fix atmospheric nitrogen via root nodules. How much benefit returns to the soil depends on what is done with the crop:

| Legume use | Soil effect |
|---|---|
| Plowed in green (entire crop) | Strongly negative d (large nitrogen return). Best for soil. |
| Grazed by animals in field | Moderate negative d. Animal manure returns nitrogen, but less than plowing-in. |
| Harvested for human food | Near-zero or slightly positive d. Nitrogen exported in grain; only root nodules remain. |

In practice, a mix of these occurred. A simple model: d_legumes = −0.010 if grazed/plowed-in fraction ≥ 50%, else d_legumes = +0.005. The legume-use fraction is a parameter to document and expose.

**Calibration to 3-field equilibrium (9/3 season):**

At steady state, total depletion per 3-sun-era cycle = total recovery per 3-sun-era cycle:

```
wheat_depletion + spring_depletion = fallow_recovery
(5.95 × 0.040) + (4.70 × 0.025_avg) = r × fallow_GU_equiv × (1 - f*)
0.238 + 0.118 = 0.891 × (1 - f*)    [fallow GU-equiv = 0.891 for 9/3 season, see below]
f* ≈ 0.60
```

Fallow GU-equivalent per sun-era (9 growing + 3 winter months, normal winter):
= 3×0.7 + 3×1.0 + 3×0.7 [growing] + 3×0.3 [winter]
= 2.1 + 3.0 + 2.1 + 0.9 = 8.1 GU-equiv per fallow sun-era (× r = recovery fraction)

**TODO:** Recalibrate d_wheat, d_barley, d_oats, and r so that the 3-field equilibrium lands at a historically reasonable f* ≈ 0.60–0.65. The current constants (d=0.03, r=0.11) give f* ≈ 0.65 with uniform d — that is accidentally close, but the per-crop differentiation must still be added.

**PLANNER_AVG_FERTILITY** should be the long-run mean of f over the oscillation cycle, which sits slightly above f* (minimum). With f* ≈ 0.60–0.65 and mean oscillation amplitude, PLANNER_AVG_FERTILITY ≈ 0.70 is reasonable and is what the code currently uses. This should be documented as derived, not magic.

---

## 4. Crop Model

### 4.1 Growth and maturity

Growth units (GU) accumulate each month based on season type and crop-specific rates:

```
CROP_GROWTH_RATE:
  wheat:  spring=0.7  long_summer=1.0  autumn=0.7  winter=0.15  deep_winter=0.0
  barley: spring=0.7  long_summer=1.0  autumn=0.7  winter=0.0   deep_winter=0.0
  oats:   spring=0.7  long_summer=1.0  autumn=0.7  winter=0.0   deep_winter=0.0

CROP_MATURITY (GU to reach full maturity):
  wheat:  5.95   [sown Oct (GM8), harvested Aug (GM6 next year) in 9/3 season]
  barley: 5.10   [sown Apr (GM2), harvested Sep (GM7)]
  oats:   4.40   [sown Apr (GM2), harvested Aug (GM6)]
```

*Derivation of maturity values:* Calibrated to historical English harvest calendar with March = GM1.
- Wheat: 2 autumn months (0.7×2=1.4) + 3 winter months (0.15×3=0.45) + 3 spring months (0.7×3=2.1) + 2 early summer months (1.0×2=2.0) = 5.95 GU.
- Oats: 2 spring months (1.4) + 3 summer months (3.0) = 4.40 GU.
- Barley: 2 spring months (1.4) + 3 summer months (3.0) + 1 early autumn month (0.7) = 5.10 GU.

### 4.2 Harvest timing and yield modifier

Harvest fires when GU reaches maturity. Early/late harvest applies a modifier:

```
delta = growthUnits - CROP_MATURITY[type]
modifier = delta < 0  ? 0.85^(-delta)         [early: exponential penalty]
         : delta <= 2 ? 1.0 + delta × 0.05    [slight late bonus, max 10% at +2 GU]
         : 1.10 × 0.90^(delta - 2)            [overripe: declining]
```

Harvest at maturity is forced if `delta > CROP_HARVEST_DELTA_MAX` (wheat: 1.0, barley/oats: 0.7). At winter onset, non-winter-tolerant crops (barley, oats) are force-harvested regardless of growth stage.

### 4.3 Resow decision

After a harvest, a field is immediately available for resowing if the remaining growing-season growth potential ≥ 0.6 × CROP_MATURITY[type]. The decision compares expected total output of (harvest now + resow) vs (wait for maturity or let season end).

### 4.4 Cereal straw (currently missing)

Every grain harvest produces straw. Straw:grain ratio by weight:
- Wheat: ~1.5:1 (lbs straw per lb grain, dry weight)
- Barley/oats: ~1.2:1

Straw is stored for winter use as roughage. This is the primary reason the roughage minimum (Section 6.3) is almost never binding.

**TODO:** Add straw tracking to simulation. Store it with hay stocks. Track straw separately for display (it is distinct from hay and consumed differently).

---

## 5. Livestock Model

### 5.1 Cattle herd composition and stability

**Working oxen requirement:** Derived from arable area.
```
ACRES_PER_OX = 15   [medieval English: one 8-ox team works 120 acres → 15 acres/ox]
oxen_needed = ceil(arableAcres / ACRES_PER_OX)
```
*ACRES_PER_OX is a plowing capacity constraint — plowing is the bottleneck, not sowing. One 8-ox team plows ~1 acre/day ≈ 25 acres/month.*

**Breeding cows for herd stability — depends on reproductive cycles per sun-era:**

The minimum breeding herd is not a fixed ratio of oxen. It depends on how many viable calves each cow can produce per sun-era, which depends on season length (more growing months = more conception windows) and winter length (conception is blocked in winter).

Key parameters:
- Cow gestation: COW_GESTATION = 9 months
- Postpartum infertility: COW_POSTPARTUM ≈ 3 months before cow can conceive again
- Full biological cycle length: 9 + 3 = 12 months
- Calving rate per cycle: 0.80 (some fail)
- Calf survival to age 1: 0.80
- Male calf fraction: 0.50
- Calf survival from age 1 to working age (≈ 4 years): ~0.61 cumulative

**Calves per cow per sun-era:**

```
feasibleCycles   = floor(sunEraMonths / 12)   [one full cycle per 12 months]
calvesPerCowPerSunEra = feasibleCycles × 0.80 × 0.80   [calving rate × calf survival]
```
12-month sun-era: 0.64 calves/cow; 24-month: 1.28; 36-month: 1.92.

**Oxen replacements needed per sun-era:**

```
OX_WORKING_LIFESPAN = 72 months (6 years, ages 4–10)
oxen_replacements   = oxen_needed × sunEraMonths / OX_WORKING_LIFESPAN
```

**Minimum breeding cows (for ox replacement):**

```
viable_male_calves_per_cow = calvesPerCowPerSunEra × 0.50 × 0.61
cows_for_ox_replacement    = ceil(oxen_replacements / viable_male_calves_per_cow)
```

The cow herd replaces itself too (COW_PRODUCTIVE_LIFESPAN ≈ 96 months = 8 years):
```
cow_replacements           = total_cows × sunEraMonths / 96
viable_female_per_cow      = calvesPerCowPerSunEra × 0.50 × 0.73
cows_for_self_replacement  = ceil(cow_replacements / viable_female_per_cow)
```

Total minimum breeding cows = max(cows_for_ox_replacement + cows_for_self_replacement). Cows serve both purposes simultaneously (the same cow produces both male and female calves).

**Stochastic mortality buffer:** Add +20% above the deterministic minimum to buffer against years of poor calving or high calf mortality.

**Young stock pipeline (not currently tracked, needed for winter feed):**
- Young males growing to working age (0–4 years): at equilibrium ≈ `oxen_needed × 4 / OX_WORKING_LIFESPAN_YEARS`
- Young females growing to breeding age (0–2 years): ≈ `total_cows × 2 / COW_PRODUCTIVE_LIFESPAN_YEARS`
Feed needs: ~50% of adult for calves < 12 months; ~75% for year 1–3.

**TODO:** Track young stock explicitly. Pre-winter cull and winter feed projection must include them.

**Bulls:** 1 per 12 cows (parameter `bullsPerCow`).

### 5.2 Sheep flock

**Clothing floor (minimum flock):**
```
clothingFloor = ceil(totalPeople × clothingNeedWoolLbs / woolPerSheep)
```
The floor is dynamic: it accounts for wool already in stock and for wool each sheep produces over the next sun-era. Pre-winter cull never reduces below this floor.

**Wool accumulation:** GU-weighted by season.
```
WOOL_GROWTH_RATE: spring=0.8  long_summer=1.0  autumn=0.6  winter=0.3
Shear when woolGrowthUnits ≥ WOOL_SHEAR_ELIGIBLE (9.0) in spring/summer,
       or  ≥ WOOL_SHEAR_URGENT (12.0) in any non-winter month.
```

**Reproduction:** Biological timer. Ewe breeds when not pregnant, ≥ 12 months old, ≥ EWE_CYCLE_LENGTH (12 months) since last parturition, at least one ram present, and not winter. 85% conception probability.

### 5.3 Pre-winter culling decision rules

**Principle (user-stated):** The *minimum* pre-winter cull removes every animal that would die of old age within the next sun-era, *unless* it can complete one more useful cycle.

"One more useful cycle" defined as:

| Type | Minimum remaining lifespan to keep |
|---|---|
| **Cow** | W + COW_GESTATION + 2 months (survive winter, complete one more calving) |
| **Ewe** | W + EWE_GESTATION + 2 months (survive winter, complete one more lambing) |
| **Ox** | W + 3 months (survive winter + spring plowing period, which is the heaviest work) |
| **Bull** | W + 6 months (survive winter + one full breeding season) |
| **Ram** | W + 2 × WOOL_CYCLE (two more shearings; one shearing cycle ≈ WOOL_SHEAR_ELIGIBLE GU / mean_annual_rate) |

Animals below these thresholds are culled regardless of feed status. Animals above these thresholds are culled only if feed shortfall is projected.

**Maximum stocking:** After minimum cull, additional culling occurs if projected winter feed (using per-animal monthly needs × winterMonths × deepWinterFeedMultiplier) exceeds available stocks. Surplus animals are culled in order: oldest first, never below clothing floor (sheep) or minimum traction floor (oxen).

**Current implementation issues:**
- Cattle cull uses `CATTLE_MAX_LIFESPAN - W - COW_GESTATION` which approximates the principle above but does not distinguish cow vs ox vs bull
- Does not check whether an animal already mid-gestation can complete it before culling
- Young stock pipeline not tracked — cull logic uses `neededCowsPerYear` and `neededOxenPerYear` as fixed constants derived from initial herd size, not from current arable demand

---

## 6. Winter Feed Model

### 6.1 Energy requirements

Per animal per winter month (base values, before deep-winter multiplier):

| Animal | Oats (bu/month) | Hay (cartloads/month) |
|---|---|---|
| Ox | 3 | 2 |
| Cow | 2 | 2 |
| Sheep | 0 | 0.4 |

Deep-winter multiplier: all feeds scaled by `deepWinterFeedMultiplier` (default 1.25) during deep-winter months. Deep-winter classification is asymmetric (see `classifyWinterMonth`).

Pregnant animals: hay × 1.5, oats × 1.3. Lactating animals: hay × 1.3.

### 6.2 Hay sources

Winter roughage comes from multiple sources summed together:

1. **Meadow hay**: `meadowAcres × meadowHayYieldPerAcre` (tons). Cut once per growing season at Midsummer threshold. Independent of arable fertility.
2. **Arable hay**: From dedicated hay fields within rotation, or from late-season cutting of aftermath on fallow fields.
3. **Cereal straw**: Byproduct of grain harvest. Straw:grain ≈ 1.5:1 for wheat, 1.2:1 for barley/oats. Stored and used as roughage. Low nutrient density but very high volume.
4. **Permanent pasture hay**: Pasture cohorts can produce a hay cut during long_summer months when not being grazed.

*Meadow is NOT the only hay constraint.* The binding constraint is total roughage from all sources against total roughage demand.

### 6.3 Roughage minimum

Ruminants require at least 50% of dry matter intake by weight to be roughage (hay, straw, or grazed grass). Oats and other concentrate feeds can supply the rest.

**In practice this constraint is almost never binding** because cereal straw is abundant. A village harvesting 5,000 bushels of wheat at 60 lbs/bu = 150 tons grain produces ~225 tons of straw — far exceeding the roughage need of a typical cattle herd.

The constraint must be checked and enforced, but it should rarely restrict livestock numbers. If it is binding, the limiting factor is concentrate feed (oats), not roughage.

### 6.4 Feed balance closure

Winter feed balance (must close):

```
total_hay_available = meadow_hay + arable_hay + straw
total_hay_needed    = Σ(animal_hay_need × winterMonths × deepWinterMultiplier)

total_oats_available = oat_stocks - human_oat_need
total_oats_needed    = Σ(animal_oats_need × winterMonths × deepWinterMultiplier)
```

If hay or oats are insufficient, the simulation triggers emergency culling (minimum beyond the pre-winter decision) and records an animal death event.

---

## 7. Human Diet Model

### 7.1 Calorie sources

| Source | Target fraction | Type |
|---|---|---|
| Wheat bread | ~60–70% | Rotation-driven (from wheat course acreage) |
| Barley ale | 10–20% | Demand-side constraint (see 7.2) |
| Oat gruel | Residual | Oats surplus after animal feed |
| Dairy (cow + sheep) | ~10–15% | Animal-product |
| Meat | ~5% | Animal-product (mainly from cull events) |

### 7.2 Barley demand constraint

Barley is consumed primarily as ale, not bread. Historical English evidence places ale at approximately **10–20% of daily caloric intake** across the social spectrum (10% minimum = subsistence ale ration; 20% maximum = prosperous village with feasts and tithe-ale obligations).

This is a **demand-side, not rotation-driven** constraint:
```
barleyKcalTarget_min = totalKcalNeed × 0.10
barleyKcalTarget_max = totalKcalNeed × 0.20
barleyAcresMin = barleyKcalTarget_min / barleyNetKcalPerAcre
barleyAcresMax = barleyKcalTarget_max / barleyNetKcalPerAcre
```

Barley and oats are sown together on the spring-crop course. The barley fraction within that course is:
```
barleyAcres = clamp(barleyAcresTarget, barleyAcresMin, min(barleyAcresMax, springCropAcres))
oatAcres    = springCropAcres - barleyAcres
```

Oat surplus after animal feed goes to human food (oat gruel/porridge).

---

## 8. Season and Time Model

### 8.1 Season classification

Growing months classified by position within the season:
```
springLen   = min(3, floor(growingMonths / 2))
autumnStart = growingMonths - springLen + 1
spring:       GM 1 .. springLen
long_summer:  GM springLen+1 .. autumnStart-1
autumn:       GM autumnStart .. growingMonths
```

Winter months classified asymmetrically — shoulder months (early/late winter) are normal winter; only the core months are deep winter. Deep winter is only classified for `winterMonths ≥ 6`. The deep-winter core grows slowly with total winter length.

### 8.2 Sun-era metrics

The simulation runs `YEARS_PER_ITERATION` sun-eras per Monte Carlo iteration. One sun-era = `growingMonths + winterMonths` months. All shortage rates are reported per sun-era.

---

## 9. Planner Model

### 9.1 Inputs and outputs

**Inputs (exogenous):**
- Population: `households × peoplePerHH`
- Season: `growingMonths`, `winterMonths`
- Land areas: `meadowAcres`, `woodlandAcres`, `totalAcres` (in fixed-land mode)
- Physical constants: yields, feed needs, kcal densities, etc.

**Outputs (all derived):**
- Total arable acres needed
- Rotation structure (fallow %, crop fractions)
- Number of oxen, cows, bulls, sheep
- Pasture acres, forest acres
- Crop-type acreage breakdown

**Not inputs to the planner** (derived, not assumed):
- `fallowPct` — comes from rotation
- `animalsPerHH` — comes from land capacity
- Animal numbers — come from traction requirements and herd stability

### 9.2 Planner logic (proposed revised approach)

**Step 1 — Choose rotation:** `numCourses` = 3, 4, or 5 based on `growingMonths`.

**Step 2 — Oxen from traction:** `n = 1/ACRES_PER_OX` oxen per arable acre.

**Step 3 — Cows from herd stability:** `cows = ceil(oxen × COW_TO_OX_RATIO)` where COW_TO_OX_RATIO ≈ 0.6 (1 cow per 1.5–1.7 oxen, covering both ox and cow herd replacement).

**Step 4 — Hay balance:** Total winter hay demand = cows × cowHayW + oxen × oxenHayW + sheep × sheepHayW. Total hay available = meadow hay + arable hay + straw. The minimum hay supply constrains the maximum herd size, but the primary driver is traction (oxen) not feed.

**Step 5 — Barley acres from demand constraint:** barleyAcres = barleyTarget / barleyNetKcalPerAcre.

**Step 6 — Calorie closure:** Solve for total arable acres such that:
```
A × k_food + animalKcal(A) = totalKcalNeed
```
where k_food = food kcal per arable acre (from wheat + barley + residual oats).

**Step 7 — Land total:** total = arable + pasture + forest + meadow. In min-land mode, this is the objective. In fixed-land mode, report feasibility.

### 9.3 What is wrong with the current planner

| Problem | Status |
|---|---|
| `fallowPct` exogenous | Fixed: now derived from rotation |
| Animals from `animalsPerHH` | Partially fixed: oxen now from traction. But cows still use `C0 − C1·A` (meadow-constrained), not herd-stability logic |
| Meadow as binding cattle constraint | Wrong: meadow is one hay source. Cows overwintered are determined by herd stability, not meadow capacity |
| PLANNER_AVG_FERTILITY magic constant | Documented but still magic. Should be derived from equilibrium equation |
| No straw in hay budget | Missing entirely |
| Barley as fixed 10% of crop calories | Should be a demand-side range (10–20%) separate from rotation |
| Per-crop depletion rates uniform | Not implemented in planner |

---

## 10. What the Simulation Currently Has (Correctly)

| Feature | Status |
|---|---|
| Growth-unit crop system with per-season rates | ✓ Implemented |
| Crop maturity thresholds calibrated to 9/3 calendar | ✓ Implemented |
| Asymmetric deep-winter classification | ✓ Implemented |
| Wheat grows in normal winter (0.15/month) | ✓ Implemented |
| Early/late harvest yield modifier | ✓ Implemented |
| Resow decision (shouldHarvestEarlyForResow) | ✓ Implemented |
| Per-parcel fertility with depletion/recovery | ✓ Implemented (uniform d — wrong) |
| Individual livestock with biological timers | ✓ Implemented |
| Grassland cohort model (meadow + pasture) | ✓ Implemented |
| Multi-cut hay from growth thresholds | ✓ Implemented |
| Wool accumulation and shearing by GU threshold | ✓ Implemented |
| Deep-winter feed multiplier | ✓ Implemented |
| Dynamic clothing floor | ✓ Implemented |
| Pre-winter cull (basic structure) | ✓ Implemented (rules wrong — see §5.3) |
| Sun-era metrics and converters | ✓ Implemented |

---

## 11. Implementation Plan

### Phase A — Fertility fix (high priority, model correctness)
1. Replace uniform `FERTILITY_DEPLETION_RATE` with a per-crop table: `FERTILITY_DEPLETION: Record<cropType, number>` = {wheat: 0.040, barley: 0.028, oats: 0.022, legumes: -0.015}
2. Recalibrate `r` (FERTILITY_RECOVERY_RATE) so that 3-field equilibrium in 9/3 season gives f* ≈ 0.62
3. Document the equilibrium derivation inline with constants
4. Update `PLANNER_AVG_FERTILITY` with the derived mean

### Phase B — Straw tracking
1. On each grain harvest, compute straw: `strawTons = harvestedBushels × densityKgPerBu × strawGrainRatio / 1000`
2. Add `strawStocks` to simulation state
3. Include straw in winter roughage budget check
4. Display in physical outputs

### Phase C — Pre-winter cull rules (medium priority)
1. Replace current cull-age thresholds with the principle from §5.3
2. Add pregnant/lactating status checks: don't cull a cow mid-gestation unless feed forces it
3. Add young-stock pipeline tracking (calves, heifers) as a separate cattle category
4. Cow count target: derived from `oxen × COW_TO_OX_RATIO` not from `animalsPerHH`

### Phase D — Planner redesign (medium priority)
1. Cows: use herd-stability formula (Phase C result), not meadow-constraint formula
2. Add straw to hay budget
3. Barley: demand-side range (10–20%), not rotation fraction
4. Per-crop depletion in yield calculation
5. Export rotation structure (numCourses, fractionFallow, etc.) to SimResult for display

### Phase E — Spring wheat and legumes (lower priority)
1. Add `spring_wheat` as a crop type (same GU rates as wheat but no winter growth; maturity ~4.0 GU)
2. Add `legumes` as a course type (nitrogen-fixing, negative depletion rate)
3. Allow legumes as one course in 4- and 5-field rotations

### Phase F — Temporary arable pasture
1. When a field completes its course early (surplus growing months) and resow would not be beneficial: classify it as temporary arable pasture
2. Productivity = 80% of permanent pasture cohort model
3. Can produce one hay cut per season

---

## 12. Key Constants Reference

```
ACRES_PER_OX             = 15     [medieval English: 8-ox team per 120 acres]
COW_TO_OX_RATIO          = 0.60   [1 cow per ~1.67 working oxen for herd stability]
L_OX_WORKING_LIFESPAN    = 6      [years, age 4–10]
L_COW_PRODUCTIVE_LIFESPAN= 8      [years, age 2–10]
CALVING_RATE             = 0.80   [fraction of cows producing live calf per year]
CALF_SURVIVAL_TO_YEAR1   = 0.80
CALF_SURVIVAL_TO_WORK    = 0.80   [fraction surviving year 1 to working/breeding age]

STRAW_GRAIN_RATIO_WHEAT  = 1.5    [lbs straw per lb grain, dry weight]
STRAW_GRAIN_RATIO_OTHER  = 1.2

ROUGHAGE_MIN_FRACTION    = 0.50   [minimum roughage as fraction of total dry matter intake]

BARLEY_KCAL_SHARE_MIN    = 0.10   [demand-side: ale floor]
BARLEY_KCAL_SHARE_MAX    = 0.20   [demand-side: ale ceiling]

PRE_WINTER_CULL_GAP_COW  = winterMonths + COW_GESTATION + 2
PRE_WINTER_CULL_GAP_EWE  = winterMonths + EWE_GESTATION + 2
PRE_WINTER_CULL_GAP_OX   = winterMonths + 3    [spring plowing period]
PRE_WINTER_CULL_GAP_BULL = winterMonths + 6
PRE_WINTER_CULL_GAP_RAM  = winterMonths + 2 × WOOL_CYCLE_MONTHS
```
