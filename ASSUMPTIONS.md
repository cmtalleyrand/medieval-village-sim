# Assumptions Register — Medieval Village Economy Simulator

This document enumerates every implicit assumption baked into the simulation engine,
the planner, and the UI, along with a gap analysis comparing the **desired end state**
described in README.md to the **current implementation**.

---

## Part 1 — Implicit Assumptions by Subsystem

### 1.1 Calendar & Time

| # | Assumption | Where |
|---|-----------|-------|
| T1 | A year is always 365 days for kcal conversion (`DAYS_PER_YEAR = 365`), even though a seasonal cycle may be shorter or longer than 12 months. | `simulation.ts:100` |
| T2 | Monthly kcal requirement = annual ÷ 12, regardless of actual cycle length (`MONTHS_PER_YEAR = 12` constant). | `simulation.ts:117` |
| T3 | `calendarMonth` is derived from the cumulative absolute month counter modulo 12. When `growingMonths + winterMonths ≠ 12`, spring reproduction and shearing drift relative to the cycle position over multi-year runs. | `simulation.ts:242` |
| T4 | Spring reproduction fires when `calendarMonth === 1` **and** `!isWinter`. If the cycle is long enough, calendar month 1 can land inside winter, silently suppressing reproduction that year. | `simulation.ts:256` |
| T5 | Shearing fires when `calendarMonth === 3` and `!isWinter`. Same drift risk as T4. | `simulation.ts:279` |
| T6 | Simulation always runs exactly 5 years per iteration (`YEARS_PER_ITERATION = 5`). | `simulation.ts:157` |
| T7 | Crop maturation cycle is always 8 months (`CROP_MATURATION_MONTHS = 8`), independent of growing season length. A 7-month season harvests at 7/8 yield. | `simulation.ts:158–159` |
| T8 | `firstHarvestMonth` is `min(growingMonths, 8)`. At default settings this equals 7, so opening stocks are sized to bridge exactly 7 months. | `simulation.ts:159` |

---

### 1.2 Population & Caloric Demand

| # | Assumption | Where |
|---|-----------|-------|
| P1 | Population is **fixed** for the entire simulation. No births, no starvation-induced deaths, no demographic change across years or iterations. | `simulation.ts:150–154` |
| P2 | Household composition is homogeneous (every household has the same male/female/child split). | `defaults.ts:36` |
| P3 | Every adult male needs 2,500 kcal/day; every adult female 2,000 kcal/day; every child 1,600 kcal/day — uniform regardless of season or activity level. | `defaults.ts:37` |
| P4 | Monthly caloric need is annual need ÷ 12, not adjusted for cycle length. (See T2.) | `simulation.ts:150` |
| P5 | A caloric shortage greater than 20% of the monthly requirement in any single month constitutes "severe" famine for that year. | `simulation.ts:490` |

---

### 1.3 Crop System

| # | Assumption | Where |
|---|-----------|-------|
| C1 | Annual grain yields use a **log-normal distribution with a shared climate shock**. Wheat (sensitivity 0.8), barley (0.7), and oats (0.6) each combine the shared shock with an independent crop residual; cross-crop correlations are the product of sensitivities (wheat–barley ≈ 0.56, wheat–oats ≈ 0.48, barley–oats ≈ 0.42). Hay is drawn independently (no shared climate). | `simulation.ts` — `randomizeCorrelatedYield` |
| C2 | Yields are log-normal: strictly positive and mean-preserving by construction (`E[result] == base`). No truncation needed. The sensitivity constants (`WHEAT_CLIMATE_SENSITIVITY` etc.) are module-level and not currently user-configurable. | `simulation.ts` — constants above `randomizeCorrelatedYield` |
| C3 | Hay yield is randomised with the same variability percentage as grain crops, even though hay availability is physically more like a stock/access process. | `simulation.ts:230` |
| C4 | One-third of total acres is fallow (`fallowPct = 33.3`). Fallow land contributes nothing — no pasture benefit, no recovery credit, no secondary yield. | `defaults.ts:8` |
| C5 | All four crops (wheat, barley, oats, hay) share the same annual random yield draw per crop but the draw is independent across crops (no cross-correlation within a year). | `simulation.ts:227–230` |
| C6 | Tithe is deducted at harvest by a flat factor applied to gross yield. It is not modelled as a separate flow or delayed payment. | `simulation.ts:161, 304–308` |
| C7 | Seed reserves for wheat, barley, and oats are protected from consumption during the growing season by maintaining a `safeX` shadow variable. On planting day the seeds are physically removed from stocks. | `simulation.ts:310–318, 321–327` |
| C8 | Spoilage is applied at end of every month as a fixed geometric rate (3%/month grain, 5%/month hay), regardless of season or storage conditions. | `simulation.ts:587–598` |
| C9 | Preserved meat spoils at 15%/month — this rate is hardcoded, not a user-configurable parameter. | `simulation.ts:599` |
| C10 | A partial harvest is proportional to crop cycle progress (e.g. 7 months into an 8-month cycle → 87.5% yield). This applies when the growing season ends mid-cycle. | `simulation.ts:301–308` |
| C11 | Hay is never tithe-deducted (the `titheFactor` is only applied to wheat, barley, and oats at harvest). | `simulation.ts:304–308` |

---

### 1.4 Food Allocation & Diet

| # | Assumption | Where |
|---|-----------|-------|
| D1 | **Priority order**: dairy → meat (up to 15% cap) → ale/barley (up to 20% cap) → wheat → remaining barley → oats → extra meat → emergency sheep slaughter. | `simulation.ts:386–499` |
| D2 | Ale consumption is capped at exactly 20% of monthly caloric requirement. Any barley surplus beyond this cap is available for bread. | `simulation.ts:410` |
| D3 | Meat from the autumn cull is voluntarily capped at 15% of monthly kcal under normal circumstances. When all other sources are exhausted, remaining meat is consumed without limit. | `simulation.ts:401–406, 480–486` |
| D4 | Emergency sheep slaughter (last resort) only occurs during **winter months**. Growing-season starvation does not trigger livestock liquidation. | `simulation.ts:492` |
| D5 | Dairy output from cows: 0% before 36 months, 50% between 36–48 months, 100% at 48+ months. | `simulation.ts:388–392` |
| D6 | Exactly 50% of the sheep flock are assumed to be ewes for dairy calculation. | `simulation.ts:395` |
| D7 | Winter dairy output is 35% of summer output for both cows and sheep (`WINTER_DAIRY_OUTPUT_FACTOR = 0.35`). | `simulation.ts:102, 397` |
| D8 | Dairy contributes to `availableKcal` before the grain draw-down, so dairy offsets grain need exactly. There is no upper limit on how much dairy can substitute for grain. | `simulation.ts:399` |
| D9 | Fuel shortage raises caloric need proportionally: up to +30% in winter, +10% in summer, scaled by the fraction of the fuel deficit. Summer cooking fuel is otherwise free and untracked. | `simulation.ts:373–384` |

---

### 1.5 Livestock — Cattle

| # | Assumption | Where |
|---|-----------|-------|
| L1 | Initial herd contains exactly **2 bulls** (hardcoded, ages 48 and 72 months), regardless of household count or the `bullsPerCow` parameter. | `simulation.ts:206–207` |
| L2 | Initial herd contains cows and oxen with random ages between 36–106 months (uniform). Young replacements (3 cohorts × `neededPerYear`) are seeded at 6, 18, and 30 months. | `simulation.ts:208–216` |
| L3 | Cattle replacement demand is `ceil(totalCount / 6)` per year, implying an assumed productive lifespan of 6 years above 36 months (42 months total, or 3.5 years productive). | `simulation.ts:211–212` |
| L4 | Cattle calving rate is 80%. Each calf is independently 50% likely to become a cow or an ox. No bulls are ever born — calves are always typed as cow or ox. | `simulation.ts:264–268` |
| L5 | Maximum cattle lifespan is 120 months (10 years). Animals within 6 months of this limit plus winter are culled at the autumn harvest. | `simulation.ts:342–346` |
| L6 | Age multipliers for winter feed: calves (≤12 mo) eat 20% of adult ration; yearlings (<36 mo) eat 50%. | `simulation.ts:520–522` |
| L7 | Bulls receive the same winter feed schedule as oxen (oxenHay + oxenOats), even though bulls are not working draft animals. | `simulation.ts:523–527` |
| L8 | When oats run out, cattle die via `herd.pop()` — removing the last-pushed element regardless of age. This is LIFO order rather than age-based culling. | `simulation.ts:578–582` |
| L9 | Calves beyond replacement quota are culled for meat at the autumn slaughter. The quota is `neededCowsPerYear` cows and `neededOxenPerYear` oxen (applied to animals ≤12 months). | `simulation.ts:353–367` |
| L10 | When hay runs short, the cattle shortfall is converted to oats at **1 ton hay = 10 bushels oats**. This substitution rate is hardcoded. | `simulation.ts:565` |

---

### 1.6 Livestock — Sheep

| # | Assumption | Where |
|---|-----------|-------|
| S1 | Sheep are modelled as a **single aggregate count** with no sex structure. Ewes are inferred as exactly 50% of the flock for dairy. | `simulation.ts:154, 395` |
| S2 | Spring lambing adds 30% of the current flock size (survival already accounted for; no explicit lambing then mortality step). | `simulation.ts:258` |
| S3 | Surplus sheep beyond the initial flock size are culled at end of growing season. Sheep population is reset to `initialSheep` each autumn. | `simulation.ts:331–335` |
| S4 | Sheep forage for free during the first 3 winter months (no hay required). Half-rations from winter months 4–6. Full hay rations after winter month 6. | `simulation.ts:538–543` |
| S5 | Wool is sheared once per year at calendar month 3, tithe-deducted immediately. | `simulation.ts:279–282` |
| S6 | All sheep produce wool at the same per-head rate regardless of age or sex. | `defaults.ts:26` |

---

### 1.7 Fuel & Woodland

| # | Assumption | Where |
|---|-----------|-------|
| F1 | Woodland fuel harvest is **deterministic**: `woodlandAcres × fuelYieldPerAcre × (growingMonths / 12)`. No annual variability. This is intentional: managed woodland yield is relatively stable year-to-year compared to grain. | `simulation.ts` — `woodlandFuelYield` |
| F2 | All managed woodland fuel is harvested in a single batch at the last day of the growing season (`month === growingMonths`). | `simulation.ts` |
| F3 | Summer cooking fuel is "free" and untracked — a deliberate model simplification. Casual collection (hedgerow scraps, dung, fallen wood) throughout the growing season is assumed sufficient for non-winter cooking needs. The planner sizes the forest for winter fuel only, consistent with the simulator. | `simulation.ts` |
| F4 | Winter fuel shortage is proportional: the caloric penalty scales linearly with the fraction of unmet fuel need, up to a maximum of 30%. | `simulation.ts:379–383` |
| F5 | Fuel does not spoil or decay between the harvest and consumption. | _(no spoilage applied to `fuelStocks`)_ |

---

### 1.8 Clothing & Wool

| # | Assumption | Where |
|---|-----------|-------|
| W1 | Each woman can spin 1.5× her household's annual clothing need per year (uniformly spread across months). Excess spinning capacity is not banked beyond the wool stock. | `simulation.ts:184–185` |
| W2 | Clothing consumption is **doubled in winter** and single-rate in summer. The base rate is set so that `summerMonths × 1 + winterMonths × 2 = totalPeople × clothingNeedWoolLbs`. | `simulation.ts:187–188` |
| W3 | Clothing shortage is binary per year: any month where `clothStocks < 0` marks the year as a clothing-shortage year. | `simulation.ts:291–294` |
| W4 | Cloth does not degrade. Wool stocks also do not spoil. | _(no decay applied to `woolStocks` or `clothStocks`)_ |

---

### 1.9 Opening Stocks

| # | Assumption | Where |
|---|-----------|-------|
| O1 | Opening wheat stock = enough to feed the village entirely on wheat for `firstHarvestMonth` months plus seed. Dairy, ale, and meat contributions to the opening period are not credited — this overstates the wheat buffer. | `simulation.ts:175` |
| O2 | Opening barley stock = enough for 20% of caloric need for `firstHarvestMonth` months (ale share only) plus seed. | `simulation.ts:176` |
| O3 | Opening oat stock = seed only plus half an ox-month of draft oats. No human-food buffer. | `simulation.ts:177` |
| O4 | Opening hay stock = zero. Animals are assumed to be grazing freely and require no hay at simulation start. | `simulation.ts:178` |
| O5 | Opening fuel stock = zero. Fuel is not pre-stocked; the first winter draws from the first growing-season harvest. | `simulation.ts:201` |
| O6 | Opening wool and cloth stocks each equal half the annual village clothing need. | `simulation.ts:189, 190` |
| O7 | Opening meat stock = zero. | `simulation.ts:201` |

---

### 1.10 Simulation & Statistics

| # | Assumption | Where |
|---|-----------|-------|
| M1 | Each of the 100 iterations starts from the **same deterministic opening state** (O1–O7). Stocks do not carry over between iterations; inter-iteration variance comes solely from yield randomisation. | `simulation.ts:194–203` |
| M2 | The Chronicle tab and all history arrays record only **iteration 0**. Risk percentages are averaged across all 100 iterations, but the visual playback represents a single run. | `simulation.ts:601` |
| M3 | Shortage probabilities are computed as fraction of *years* (out of 100 × 5 = 500 year-events) that experienced a shortage, not fraction of months. A single bad month makes the entire year a "shortage year". | `simulation.ts:629–633, 643–644` |
| M4 | Diet breakdown is averaged per household per simulated year across all iterations. Deficit is included as a separate diet component. | `simulation.ts:640–661` |
| M5 | `avgWheatRemaining` and `avgOatsRemaining` are measured at end of the final year of the final iteration, not averaged over years. | `simulation.ts:636–638` |

---

### 1.11 Planner

| # | Assumption | Where |
|---|-----------|-------|
| PL1 | The planner targets barley at exactly **10% of crop calories** (hardcoded `barleyShareTarget = 0.10`), regardless of the user's land split. | `simulation.ts:759` |
| PL2 | Planner cows = `ceil(oxen / 2)`, independent of the user's `animalsPerHH.cows` setting. | `simulation.ts:751` |
| PL3 | Planner uses deterministic yields (no variability draw); the only safety margin is a flat user-configurable risk buffer percentage applied to all needs. | `simulation.ts:738, 747–748` |
| PL4 | Planner derated yield = `yield × titheFactor × (1 − spoilageRate/100)`. This subtracts one month of spoilage regardless of average storage duration. | `simulation.ts:741` |
| PL5 | Planner fuel need includes summer fuel (`fuelNeedsSummer × growingMonths`) even though the simulation treats summer fuel as free. This creates an inconsistency: the planner over-sizes the forest, and the simulation never actually draws from summer fuel stocks. | `simulation.ts:748` vs `simulation.ts:273` |
| PL6 | Animal dairy contribution to the caloric budget uses a "dairy months equivalent" helper that weights winter output at 35% — but applies it uniformly to both cattle and sheep. | `simulation.ts:754–755` |
| PL7 | The planner assumes 10% of sheep contribute annual meat (cull yield), an implicit assumption not derived from any user parameter. | `simulation.ts:755` |

---

## Part 2 — Desired End State vs. Current State

The README defines six near-term deliverables. The table below maps each goal to its
current implementation status and identifies the gap.

### 2.1 Goal — Correlated, Non-negative Yield Model

**Desired**: Replace independent normal shocks with a strictly non-negative stochastic
model that includes a shared climate shock across wheat, barley, and oats, with
crop-specific sensitivity coefficients. Hay and fuel dynamics kept physically
interpretable separately.

**Implemented.** Wheat, barley, and oats now draw from a shared annual climate shock
with crop-specific sensitivities (0.8 / 0.7 / 0.6) via a log-normal, mean-preserving
transform. Hay uses an independent log-normal draw. Fuel yield remains deterministic
by design (see F1/F3). See `randomizeCorrelatedYield` in `simulation.ts`.

---

### 2.2 Goal — Normalise Annual Assumptions Through Monthly Conversion Pathways

**Desired**: Every annual figure (caloric need, dairy output, wool production, fuel
consumption) should pass through a documented, explicit monthly conversion step.

**Current state**: The monthly kcal requirement divides the annual total by 12
regardless of actual cycle length (T2). Fuel summer needs are included in the planner
but never consumed in the simulator (PL5). Dairy output is a flat monthly figure with
a seasonal factor but no documented derivation of how the 35,000 kcal/cow/month
figure was annualised then re-divided. The `getDairyMonthsEquivalent` helper is
correct in intent but the derivation from historical annual milk yields is not shown
anywhere.

**Gap**:
- Monthly caloric requirement does not scale with actual cycle length.
- No conversion pathway document linking historical annual figures to monthly
  simulation inputs.
- Planner and simulator diverge on summer fuel treatment (PL5).
- Meat spoilage rate (15%/month — C9) and clothing consumption weight (2× winter —
  W2) are undocumented in sources.

---

### 2.3 Goal — Document Food Allocation Order Exactly As Implemented

**Desired**: The full priority order for human food consumption should be documented
with explicit priority rules matching the code.

**Current state**: `Assumptions.tsx` lists the priority order at a high level but
omits several implicit rules:

- The 20% ale cap (D2) is not mentioned.
- The 15% voluntary meat cap (D3) is not mentioned.
- The fact that emergency sheep slaughter only fires in winter (D4) is not documented.
- The detail that remaining barley (after ale) is used for bread (D1) is absent.
- The interaction between `safeX` shadow variables and seed protection is not documented.
- Meat consumption has two stages (capped first-pass, then unlimited fallback) that
  appear as a single step in the Almanac.

**Implemented.** `Assumptions.tsx` step 7 now states the full eight-step priority with
explicit caps (15% meat, 20% ale) and the winter-only constraint on emergency sheep
slaughter. The seed-protection shadow-variable mechanism remains documented here only.

---

### 2.4 Goal — Sheep Sex-Structured State

**Desired**: Split the sheep population by sex; track ewes and rams separately to
enable more realistic lambing rates, culling policies, and dairy yields.

**Current state**: `currentSheep` is a single aggregate integer. Ewes are assumed to
be exactly 50% for dairy (S1). Lambing adds 30% of the total flock (S2). No rams are
tracked; no differential culling exists.

**Gap**: Full sex-structured sheep model not started. Implementing it would require:
a separate `ewes` / `rams` count or structured object; a calving/lambing step for ewes
only; differential cull logic to preserve ewes for dairy; and updated planner to size
the flock by ewe count rather than total count.

---

### 2.5 Goal — Human Reproduction Dynamics

**Desired**: Extend the human end-state to include reproduction (births) in addition
to shortage/mortality channels, so that population itself is a simulation output.

**Current state**: Population is fixed at `households × peoplePerHH` throughout every
iteration and across all five years (P1). Starvation has no demographic consequence
beyond the immediate kcal deficit counter.

**Gap**: No reproduction or mortality model exists. Adding it would require:
a per-year birth rate and death rate (at minimum), starvation-induced mortality
scaling, and dynamic recalculation of caloric demand and livestock ratios as population
changes. This is a significant architectural change to the monthly tick loop.

---

### 2.6 Goal — Cycle-Based Horizon Language

**Desired**: Update all scenario descriptions and output labels to reflect the
"seasonal cycle" framing rather than "annual" framing, because the simulation cycle
is variable-length.

**Partially implemented.** `OutcomesPanel.tsx` risk-gauge subtitle, all five risk
tooltips, the verdict driver line, and the "Bread Basket" section title have been
updated to "per-cycle" / "cycle" language. Remaining surface: `SimResult` field names
(`avgWoolPerYear`), `Chronicle.tsx` chart header, and `Assumptions.tsx` prose still
use "year" in places. Those are lower-stakes and deferred.

---

## Part 3 — Additional Gaps Not in README

The following issues were found during this audit that are not captured in the current
roadmap:

| ID | Issue | File | Severity |
|----|-------|------|----------|
| G1 | Bulls are initialised as a hardcoded pair (ages 48 & 72 mo), not derived from `bullsPerCow` and household count. Planner and simulation use different bull counts. | `simulation.ts:206–207` | Medium |
| G2 | ~~Cattle die by `herd.pop()` (LIFO).~~ **Fixed**: oat-shortage culling now sorts by age descending and splices from the front, preserving younger breeding stock. | `simulation.ts` — oat-shortage cull | — |
| G3 | ~~Planner over-sized forest by including summer fuel.~~ **Fixed**: planner fuel need now covers winter months only, matching the simulator's free-summer-fuel treatment (see F3). | `simulation.ts` — `planVillageResources` | — |
| G4 | Opening stocks do not credit dairy, meat, or ale contributions during the pre-harvest bridge period, overstating the required wheat opening stock. | `simulation.ts:175` | Low |
| G5 | `avgWheatRemaining` is measured at end of final iteration only, not averaged across iterations — the field name implies a mean but it is effectively a single sample. | `simulation.ts:636–638` | Low |
| G6 | `@google/genai` is in `package.json` and `GEMINI_API_KEY` is referenced in `vite.config.ts` but no Gemini functionality exists in the codebase. | `package.json`, `vite.config.ts` | Low |
| G7 | `express` appears in `package.json` but no server code exists. Likely scaffolding residue. | `package.json` | Low |
| G8 | Meat spoilage (15%/month) and cloth/wool decay (none) are not user-configurable and are not listed in `SimParams`. | `simulation.ts:599`, `W4` | Low |
| G9 | The Chronicle records only iteration 0; risk statistics are from all 100 iterations. A particularly lucky or unlucky first iteration can make the playback unrepresentative of the displayed risk percentages. | `simulation.ts:601` | Low |
| G10 | Caloric penalty for fuel shortage is computed on `monthlyKcalReq` (before dairy subtraction), meaning the 30% heat-calories uplift is always applied to the full baseline, not to the remaining deficit. This can produce impossibly high apparent caloric demands in extreme winters. | `simulation.ts:379–383` | Medium |
