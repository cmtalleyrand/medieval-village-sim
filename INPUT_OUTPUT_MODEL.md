# Input–Output Model — Agreed Decisions Log

> **Status:** living document. Captures the *physical* (input–output) model of the village,
> built from first principles and agreed point by point. The **decision model** (planner,
> rotation choice, crop split, rationing, culling policy) is deliberately **out of scope
> here** and will be specified separately once this layer is solid.
>
> Supersedes the relevant parts of `MODEL_REFERENCE.md` where they conflict. Each entry is
> marked **[AGREED]** (confirmed with the owner) or **[DERIVED]** (a consequence of agreed
> primitives, not an independent choice).

---

## A. Architecture & scope

- **A1 [AGREED] Two-layer separation.** The *input–output (physical) model* is pure
  biophysics: given allocations and actions, what the village produces, consumes, and
  carries over. Deterministic transforms + conservation, **no choices inside it**. The
  *decision model* (which chooses those allocations) is separate and deferred.
- **A2 [AGREED] Exogenous inputs to the I/O model** (supplied by the decision layer):
  land allocation by use, crop choice per field, herd size & composition, cull/slaughter
  events, ration/allocation policy, and processing quantities (how much to bake/brew/spin).
- **A3 [AGREED] Processing efficiencies live inside the I/O model.** The biophysical
  conversions — grain→flour→bread, barley→ale, milk→storable dairy, wool→cloth — are
  physical yields set here; *how much* to process is a decision-layer input.
- **A4 [AGREED] In scope now:** land, crops, soil fertility, livestock biology,
  feed/forage, animal products (dairy/meat/wool→cloth), human diet/demand, fuel.
- **A5 [AGREED] Out of scope now, designed as clean seams for later:** human **labour
  budget**, **population dynamics**, **weather**. Further out still: markets/money, soil
  nutrient chemistry, disease. The model must not silently assume these away — they are
  explicit future extensions.

---

## B. Time & season

- **B1 [AGREED] Sun-era = G + W** (growing months + winter months); 9/3 is the baseline
  configuration, not a hard assumption.
- **B2 [AGREED] Spring is capped at `min(3, ⌊G/2⌋)` months;** any extra season length
  becomes *summer* (peak growth). Autumn mirrors spring. Intended.
- **B3 [AGREED] Deep-winter** exists only when `W ≥ 6`, with a core that widens with `W`;
  shoulder winter months are "normal winter."

---

## C. Land

- **C1 [AGREED] Four permanent categories:** arable (rotated), **permanent pasture**,
  meadow, woodland. Permanent pasture is a *separate* category with its own stock/dynamics
  (currently unimplemented in code; to be added).
- **C2 [AGREED] Fallow fraction is DERIVED** from the rotation/fertility balance — it is
  **not** a user input.
- **C3 [AGREED] No acres-per-animal constants.** Stocking density is an *output*, not a
  parameter (see Section D). Per-species land differences emerge from *which parcel an
  animal grazes × that parcel's yield*, i.e. from allocation, not a constant.

---

## D. Feed / forage subsystem (first-principles)

- **D1 [AGREED] Single feed currency: dry matter (kg DM) + an energy density
  (MJ/kg DM) per feed type.** This unifies grazing, hay, straw, and concentrate (oats)
  into one balance.
- **D2 [AGREED] Animal intake is derived from energetics, not a body-weight %.**
  Maintenance scales with metabolic weight: `MEm ≈ 0.5 MJ ME / kg^0.75 / day`, plus
  production/work increments. Gut-fill (~3% of body weight) is an upper cap.
  - **D2a [AGREED] Liveweights** (medieval, small): ox 500 kg, cow 400 kg, sheep 40 kg.
  - **D2b [AGREED] Increments:** lactation +~5 MJ/L of milk; late gestation +~10 MJ/day;
    working ox +25% intake during plough months.
- **D3 [AGREED] Feed energy densities (ME, MJ/kg DM):** grazed grass ~8.5, meadow hay
  ~8.0, straw ~6.0, oats (concentrate) ~12.
- **D4 [DERIVED] Annual intakes** (maintenance + average production/work, ÷ 8.5 grazed):
  - Cow ≈ 18,300 MJ/yr → **~2,150 kg DM/yr** (~5.9 kg/day)
  - Ox  ≈ 21,200 MJ/yr → **~2,500 kg DM/yr** (~6.8 kg/day)
  - Sheep ≈ 3,300 MJ/yr → **~390 kg DM/yr** (~1.07 kg/day)
  - **Intake ratio cow:ox:sheep ≈ 5.5 : 6.4 : 1.** A cow eats ~6 sheep's worth — matching
    the standard livestock-unit convention (validates the method; the flat 2.5%-body-weight
    rule wrongly gave ~10:1).
- **D5 [AGREED] Land DM yields (kg DM/acre/yr):** permanent pasture **~1,300** (~3.3 t/ha,
  unimproved medieval grassland); **meadow ~1.5× (~2,000)** — richer, flood-fed; rough/wood
  pasture much less.
- **D6 [AGREED] Grazing utilisation ~65%** of grown DM actually eaten (rest
  trampled/fouled/senesced). Hay-cut losses handled separately.
- **D7 [DERIVED] Stocking is an output.** At pasture 1,300 × 0.65 = 845 kg DM eaten/acre:
  cow ≈ 2.5 ac, ox ≈ 3.0 ac, sheep ≈ 0.46 ac (~2.2 sheep/ac). Land ratio = intake ratio =
  5.5:1 *by construction*. Cow ≈ 2.5 ac sits in the historical 2–3 ac/cow band — this is a
  validation **check**, never a model input.

---

## E. Open / next

Next subsystems to specify in the same physical-only framing: **crop production**
(land + fertility + season + weather → grain + straw + residue forage), **soil fertility
dynamics**, **livestock biology** (reproduction, growth, ageing, mortality), **animal
products** (dairy, meat, wool→cloth), **human demand**, **fuel**.
