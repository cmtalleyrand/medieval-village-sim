import React from 'react';

export function Assumptions() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-stone-900 mb-4 border-b pb-2">Methodology & Assumptions</h2>
        <p className="text-stone-600 mb-4">
          This simulation models a stylized northern European medieval village economy, blending historical estimates with simulation logic to model survival rates across varying winter and growing season lengths.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-stone-300 pl-3">Historical Sources & Frameworks</h3>
          <ul className="list-decimal pl-5 space-y-3 text-stone-600 text-sm">
            <li><strong>Bruce M. S. Campbell</strong>, <em>English Seigniorial Agriculture, 1250-1450</em><br/>Yield estimates, seeding rates, and land use. Default yields reflect typical 13th/14th-century averages before the Black Death.</li>
            <li><strong>Christopher Dyer</strong>, <em>Standards of Living in the Later Middle Ages</em><br/>Caloric requirements, dietary composition, brewing practices, consumption of ale, and dairy output.</li>
            <li><strong>Gregory Clark</strong>, <em>The Long March of History: Farm Wages, Population, and Economic Growth</em><br/>Labor calories and harvest variations.</li>
            <li><strong>John Munro</strong>, <em>Medieval Woollens</em><br/>Estimates of medieval sheep fleece weights averaging 1.5 to 2.5 lbs per sheep and cloth manufacturing requirements.</li>
            <li><strong>Stephen Broadberry et al.</strong>, <em>British Economic Growth, 1270–1870</em><br/>Estimates of non-agricultural output and tithe/tax burdens, typically absorbing 10-20% of agricultural surplus.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-emerald-500 pl-3">1. Demographics & Caloric Needs</h3>
          <ul className="list-disc pl-5 space-y-2 text-stone-600 text-sm">
            <li><strong>Household Composition:</strong> Modeled at 4.5 individuals per household (1 Male, 1 Female, 2.5 Children).</li>
            <li><strong>Human Caloric Burn:</strong> Men (2500 kcal/day), Women (2000 kcal/day), Children (1600 kcal/day average).</li>
            <li><strong>Total Needs:</strong> ~9000 kcal/household/day. Across the default 20 households, this equals ~5.4 million kcal per month.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-amber-500 pl-3">2. Animal Husbandry & Caloric Needs</h3>
          <p className="text-sm text-stone-600 mb-3">
             Animals are critical engines for plowing and fertilization, but they require massive caloric upkeep. During the growing season, they survive primarily on unenclosed commons, fallow fields, and pasture. In winter, they must be hand-fed from harvested stores.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-stone-600 text-sm">
            <li><strong>Herd/Flock Dynamics:</strong> The baseline holdings are ~2 oxen, ~2 cows, and ~4 sheep per household. The simulation maintains the population dynamically over multiple years.</li>
            <li><strong>Cattle Lifecycle:</strong> Cattle live to roughly 10 years and are culled beforehand. They become half-productive in their fourth year (age 3) and fully productive by their fifth year (age 4). The village herd replaces itself through calving (cows &gt;3yrs). The village supports 2 bulls for reproduction.</li>
            <li><strong>Cattle Culling (Winter):</strong> At the end of the work season, any cattle that have less than 6 months of working life left by the following spring (approx 9+ yr old) are culled for meat, as are any surplus calves born beyond the replacement needs of the herd.</li>
            <li><strong>Winter Feed:</strong> Due to their massive size and caloric burn, oxen require the heaviest feeding: ~3 bushels of oats and 0.5 tons of hay per month during the winter. Cows require ~2 bushels of oats.</li>
            <li><strong>Sheep & The Pasture Cycle:</strong> Sheep are hardy. For the first 3 months of winter, they survive by foraging on crop stubble and hardy pasture. For months 4-6 of winter, they are supplemented with half-rations of hay. Only in deep winter (month 7+) are they strictly stall-fed full rations (~0.1 tons of hay/month).</li>
            <li><strong>Feed Shortages:</strong> If hay runs out, cattle/oxen must consume 10x equivalent volume (by weight/energy) in oats. If oats run out, livestock die.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-amber-500 pl-3">3. Dairy, Meat & Byproducts</h3>
          <ul className="list-disc pl-5 space-y-2 text-stone-600 text-sm">
            <li><strong>Dairy Production:</strong> A fully-grown medieval cow produces roughly 35,000 digestible kcal per month in milk/cheese/butter during the growing season. Sheep herds (assuming ~50% ewes) produce significantly less, modeled at 2,500 kcal per month per producing ewe.</li>
            <li><strong>Winter Dairy Drop-off:</strong> Without fresh grass (and spending energy staying warm), <em>milk production drops by 65% during the winter months</em>.</li>
            <li><strong>Autumn Meat & Preserves:</strong> Autumn culls of old cattle and excess sheep/calves yield hundreds of thousands of calories in meat relative to the village population, which are safely "preserved" and eaten primarily to offset winter caloric deficits (at a 15% spoilage rate).</li>
            <li><strong>Emergency Culling:</strong> If humans face absolute starvation and run out of preserved meat, live sheep are culled dynamically for emergency meat yielding roughly 40,000 kcal per carcass.</li>
            <li><strong>Wool:</strong> Defaults to ~1.5 lbs per sheep annually, sheared in early summer.</li> 
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-amber-500 pl-3">4. Fuel & Heating</h3>
          <p className="text-sm text-stone-600 mb-3">
             Villagers require a constant supply of fuel (wood, peat, turf, or dung) for cooking, brewing, and surviving freezing winter temperatures.
          </p>
          <ul className="list-disc pl-5 space-y-2 text-stone-600 text-sm">
            <li><strong>Gathering:</strong> Fuel is gathered from common woodlands, yielding roughly 1.5 cartloads per acre annually during the harvest cycle.</li>
            <li><strong>Consumption:</strong> A household burns about 0.5 cartloads per month in the summer (primarily for cooking and brewing) and 1.5 cartloads per month in the winter (for heating).</li>
            <li><strong>Shortage Penalties:</strong> Freezing villagers require far more energy to maintain body temperature. A massive shortage of winter fuel drives caloric needs up by to 30%. A shortage of summer fuel creates a 10% penalty to caloric needs (simulating the biological inefficiency of eating raw grains or unsterilized forage).</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-stone-800 mb-3 border-l-4 border-orange-500 pl-3">5. Agriculture, Arable Land & Yields</h3>
          <p className="text-sm text-stone-600 mb-3">
             Land allocation accounts for the total boundaries of the village. The "Fallow %" represents land left idle to recover nitrogen (usually acting as summer pasture).
          </p>
          <ul className="list-disc pl-5 space-y-2 text-stone-600 text-sm">
            <li><strong>Crop Rotation:</strong> Assumes a standard three-field system where ~1/3 (33.3%) of land is left fallow each year. The "Active Acres" are split between Wheat, Barley, Oats, and cultivated Hay.</li>
            <li><strong>Wheat:</strong> ~8 bu/acre (60 lbs/bu @ 1500 kcal/lb) — The primary human staple grain.</li>
            <li><strong>Barley (and Ale):</strong> ~10 bu/acre (50 lbs/bu @ 1500 kcal/lb) — Consumed heavily as Ale. The simulation attempts to fulfill 20% of human caloric needs through ale if barley stores allow, otherwise it is consumed as coarse bread.</li>
            <li><strong>Oats:</strong> ~10 bu/acre (32 lbs/bu @ 1200 kcal/lb) — Primary animal feed, fallback for human consumption during starvation.</li>
            <li><strong>Hay:</strong> ~1.2 tons/acre — Cultivated strictly for winter animal fodder.</li>
            <li><strong>Seed Grain:</strong> Always deducted strictly from harvested stores (e.g., 2 bu/acre for wheat). "Safe" grain is protected from human consumption to guarantee the next planting.</li>
            <li><strong>Spoilage:</strong> Crops in loose/granary storage spoil at a modeled geometric decay of ~3% per month (Hay at ~5% due to rot/pests).</li>
            <li><strong>Monte Carlo Variability:</strong> Yields are randomized using a Box-Muller normal distribution with a default Standard Deviation of 15% to simulate historical weather variance (droughts, floods, late frosts) across 100 simulation lives.</li>
            <li><strong>Non-Agricultural Budget & Tithes:</strong> Tithes (roughly 10%) and non-cloth manufacturing requirements (smithing, leatherwork, construction, etc., taking up roughly 5% of surplus) are collectively modeled as a direct % deduction from gross grain and wool outputs (default 15%).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
