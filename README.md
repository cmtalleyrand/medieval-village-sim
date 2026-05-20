# Medieval Village Economy Simulator

A simulation-first application for testing whether a fantasy medieval village economy can remain viable under explicit structural assumptions.

This is **not designed as a conventional game objective loop**. It uses game-like presentation (panels, scene, chronicle, outcome summaries) to make complex multi-factor dynamics legible.

## Modeling Intent

The model is intended for **feasibility stress testing**:

- Given a parameterized village structure, estimate whether the system can sustain food, fuel, clothing, and livestock over repeated seasonal cycles.
- Surface constraints and trade-offs rather than optimize a single win condition.
- Preserve multiple outcome dimensions simultaneously (human shortage, severe shortage, animal death, fuel shortage, clothing shortage, remaining stocks).

## Time Semantics

The simulation uses a dual-time interpretation:

1. **Calendar year is fixed at 12 months** for annual-rate interpretation.
2. **A full seasonal cycle is variable length** and may be shorter or longer than 12 months.
3. Simulation horizon is represented operationally as repeated cycles (currently five loops per iteration in core logic).

Implementation rule: annual assumptions are converted to monthly equivalents where needed; seasonal behavior is driven by cycle position (growing vs winter), not by requiring a 12-month cycle.

## Core State Variables

Primary state includes:

- Human population proxies (household counts and per-household composition inputs).
- Crop stocks: wheat, barley, oats, hay.
- Animal stocks: cattle herd structure plus sheep counts.
- Material stocks: wool, cloth, fuel, meat.
- Flow tracking per month (human consumption, animal feed, seed allocation, spoilage, deficits).

Complexity note: most stock updates are constant-time per monthly step; herd operations scale with herd size. Per simulation run, dominant cost is proportional to:

`iterations × cycles × months_per_cycle × herd_state_size`

## Seasonal and Production Structure

- Land is split across wheat/barley/oats/hay on active acreage.
- Planting, maturation, and harvest dynamics are season-position dependent.
- Seed reserves are modeled explicitly and treated as hard reserves.
- Fuel demand is seasonally asymmetric (winter > summer).
- Clothing is modeled as wool -> cloth -> consumption with weighted winter usage.

## Yield Variation Assumption (Planned Direction)

Current implementation uses a normal shock with non-negativity truncation for annual yields.

Planned documentation assumption:

- Use a strictly non-negative stochastic model for crop yields.
- Include shared climate shock correlation at least across wheat, barley, and oats (with crop-specific sensitivity coefficients).
- Keep hay/fuel dynamics physically interpretable as stock/access processes rather than naive “annual productivity randomness” where inappropriate.

## Livestock and Demography Scope

Current scope includes explicit cattle cohort structure and aggregate sheep count.

Planned direction from product requirements:

- Split sheep population by sex.
- Extend human end-state dynamics to include reproduction in addition to shortage/mortality channels.

## Intervention Surface

The intended controllable decision surface includes:

- Land split vector.
- Livestock mix.
- Seasonal structure parameters.
- Reserve/ration policy settings.
- Tithe/manufacture extraction rates.
- Exogenous shock injection.

## Outputs

The app reports a vector of outcomes, not a single scalar objective. Typical outputs include:

- Human shortage probability.
- Severe shortage probability.
- Animal death probability.
- Fuel shortage probability.
- Clothing shortage probability.
- Remaining key stocks and diet breakdown summaries.

## Project Plan (Near-term)

1. Replace yield distribution with a non-negative correlated model for wheat/barley/oats.
2. Normalize annual assumptions through explicit monthly conversion pathways.
3. Document full food allocation order exactly as implemented (including implicit priority rules).
4. Add sheep sex-structured state.
5. Add human reproduction dynamics to end-state reporting.
6. Update scenario and output descriptions to reflect cycle-based horizon language.

## Running Locally

Prerequisite: Node.js

1. Install dependencies:
   `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`.
3. Run:
   `npm run dev`
