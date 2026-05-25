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
- **Course**: What a field does during one sun-era. A course has a crop type (or "fallow") and a within-sun-era schedule.
- **Rotation**: An ordered sequence of courses that a field cycles through, then repeats. Length 1–4 sun-eras.
- **Two parallel rotations** are allowed, each running on a different fraction of the arable land.

### 2.2 Within-sun-era schedule (the "extra months" question)

Each course covers an entire sun-era but a crop only occupies the field for part of it. The schedule for each course type:

**Wheat course** (autumn-sown):
- GM 1–6 (approximately): Field carries last season's wheat, still growing and awaiting harvest. Harvest fires around GM 5–6 when growth units reach maturity threshold (5.95 GU).
- GM 7–end: Post-harvest. Stubble grazed (≥ 2 growing-equivalent months = 2 GU needed before next sowing). Field plowed once or twice. Acts as temporary pasture.
- Next autumn (GM 8–9): Plowed again, wheat sown. This is the sowing for the NEXT sun-era's wheat course.
- Winter: Wheat overwinters growing at 0.15 GU/month (normal winter) or 0.0 (deep winter).

*Gap invariant:* At least 2 GU must accumulate on the field (in uncropped idle state) between any two crop sowings. This represents stubble grazing, manuring, and preparatory plowing. 2 GU at spring rate = ~2.9 months; at summer rate = 2 months.

**Spring-crop course** (barley / oats mix):
- GM 1–2 (early spring): Final preparatory plowing, sowing.
- GM 2–7 (approximately): Crop growing. Barley matures at 5.10 GU (harvested ~GM 7–8). Oats mature at 4.40 GU (harvested ~GM 6).
- GM 7/8–end: Post-harvest. Stubble grazed. Field plowed for following rotation step.
- Winter: Bare plowed field. Frost action on soil. No crop.

**Fallow course**:
- Entire growing season: Field is plowed 2–3 times (winter plowing, spring plowing, summer plowing). Grazed by sheep and cattle — this is where animal manure restores fertility. No crop sown.
- Winter: Bare.
- Fertility recovery applies every uncropped month.

### 2.3 Rotation selection

For the planner and for the initial simulation setup, the rotation is chosen based on growing-season length:

| Growing months | Rotation | Fallow fraction |
|---|---|---|
| ≤ 12 | 3-field: wheat → spring-crop → fallow | 1/3 |
| 13–24 | 4-field: wheat → barley → oats → fallow | 1/4 |
| > 24 | 5-course: wheat → barley → oats → second-grain → fallow | 1/5 |

For very long seasons (> 24 months), pure fallow for an entire sun-era is unnecessary and wasteful; the extra growing capacity first extends fallow quality (more plowings, more grazing), then supports an additional short-season grain crop or temporary pasture. *The minimum fallow is determined by depletion physics (Section 3), not by calendar convention.*

### 2.4 Barley/oats split on spring-crop course

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

**Uniform depletion rate across crops is incorrect.** Wheat depletes soil more than other cereals because:
- Longer growing period (5.95 GU vs 4.40–5.10 GU) — already captured by current formula
- Deeper root system and heavier nutrient extraction per GU — NOT captured
- Grain:straw ratio is exported; straw removed for thatching/bedding reduces organic matter return

**Proposed per-crop depletion rates:**

| Crop | d (per GU) | Rationale |
|---|---|---|
| Wheat | 0.040 | Deepest extraction, longest season |
| Barley | 0.028 | Moderate — shallower roots, shorter season |
| Oats | 0.022 | Least depleting of the main cereals |
| Legumes/pulses | −0.015 | Nitrogen fixation actively improves fertility |
| Arable hay (aftermath) | 0.010 | Hay left on field partly returns nutrients |

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

**Breeding cows for herd stability:**

Each working ox has a working lifespan of L_ox ≈ 6 years (age 4–10). To replace N working oxen:
- Required viable male calves per year = N / L_ox
- Each cow produces: calving_rate × calf_survival × male_fraction = 0.80 × 0.80 × 0.50 = 0.32 male calves per year surviving to age 1
- Fraction surviving to working age (4 years): cumulative survival ≈ 0.80 (above age-1 survival)
- Viable oxen per cow per year ≈ 0.32 × 0.80 = 0.256

```
min_cows_for_ox_replacement = ceil(oxen_needed / (L_ox × 0.256))
                             ≈ ceil(oxen_needed / 1.54) ≈ ceil(oxen / 1.5)
```

The cow herd also requires self-replenishment (cow working lifespan L_cow ≈ 8 productive years). Similar calculation adds ~20% to the cow count above.

**Practical ratio: 1 breeding cow per 1.5–2 working oxen.** (Current code uses `oxen / 2`, which is the conservative end of this range — appropriate given stochastic mortality.)

**Young stock pipeline (not currently tracked, needed for accurate winter feed projection):**
- Male calves growing to working age: ~4 years × replacement rate
- Female calves growing to breeding age: ~2 years × replacement rate

**TODO:** Track young stock explicitly as a third cattle category with their own feed needs and pre-winter cull eligibility.

**Bulls:** 1 per 12 cows. (Parameter `bullsPerCow`.)

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
