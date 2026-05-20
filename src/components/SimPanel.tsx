import React, { useState, useEffect } from 'react';
import { DEFAULTS } from '../lib/defaults';
import { runSimulation, autoAllocateLand, solveMinimumAcres, SimParams, SimResult } from '../lib/simulation';
import { ShieldAlert, Wheat, Target, AlertTriangle, Settings, ChevronDown, ChevronRight, Activity, Info, Play, Pause, FastForward, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceArea } from 'recharts';

export function SimPanel() {
  const [params, setParams] = useState<SimParams>(DEFAULTS);
  const [results, setResults] = useState<SimResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    // Run simulation whenever params change
    setIsSimulating(true);
    const timer = setTimeout(() => {
      const res = runSimulation(params);
      setResults(res);
      setIsSimulating(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [params]);

  const handleParamChange = (key: keyof SimParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleNestedParamChange = (category: keyof SimParams, key: string, value: number) => {
    setParams(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [key]: value
      }
    }));
  };

  const handleLandSplitChange = (crop: keyof SimParams['landSplit'], value: number) => {
    setParams(prev => {
      let val = Math.max(0, Math.min(100, value));
      const others = (['wheat', 'barley', 'oats', 'hay'] as const).filter(c => c !== crop);
      const otherSum = others.reduce((sum, c) => sum + prev.landSplit[c], 0);
      
      let newOtherSum = 100 - val;
      const newSplit: any = { ...prev.landSplit, [crop]: val };
      
      if (otherSum === 0) {
        others.forEach(c => newSplit[c] = newOtherSum / 3);
      } else {
        others.forEach(c => newSplit[c] = prev.landSplit[c] * (newOtherSum / otherSum));
      }
      
      return { ...prev, landSplit: newSplit };
    });
  };

  const handleAutoAllocate = () => {
    setParams(prev => ({ ...prev, landSplit: autoAllocateLand(prev) as any }));
  };

  const handleSolveAcres = () => {
    setParams(prev => {
      const minAcres = solveMinimumAcres(prev);
      const newParams = { ...prev, totalAcres: minAcres };
      return { ...newParams, landSplit: autoAllocateLand(newParams) as any };
    });
  };

  const activeLand = Math.round(params.totalAcres * (1 - DEFAULTS.fallowPct / 100));
  const totalSplit = Math.round(params.landSplit.wheat + params.landSplit.barley + params.landSplit.oats + params.landSplit.hay);

  let dietPct = { wheat: 0, barley: 0, oats: 0, dairy: 0, meat: 0, deficit: 0 };
  if (results && results.diet) {
     const t = results.diet.wheat + results.diet.barley + results.diet.oats + results.diet.dairy + results.diet.meat + results.diet.deficit;
     if (t > 0) {
        dietPct.wheat = (results.diet.wheat / t) * 100;
        dietPct.barley = (results.diet.barley / t) * 100;
        dietPct.oats = (results.diet.oats / t) * 100;
        dietPct.dairy = (results.diet.dairy / t) * 100;
        dietPct.meat = (results.diet.meat / t) * 100;
        dietPct.deficit = (results.diet.deficit / t) * 100;
     }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Inputs */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-emerald-600" />
            Demographics & Seasons
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-600">Households (20 default)</label>
              <input type="number" value={params.households} onChange={e => handleParamChange('households', Number(e.target.value))} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2 border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-stone-600">Growing (mths)</label>
                <input type="number" value={params.growingMonths} onChange={e => handleParamChange('growingMonths', Number(e.target.value))} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600">Winter (mths)</label>
                <input type="number" value={params.winterMonths} onChange={e => handleParamChange('winterMonths', Number(e.target.value))} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-stone-800 flex items-center">
              <Wheat className="w-5 h-5 mr-2 text-emerald-600" />
              Land & Crops
            </h2>
            <button onClick={handleAutoAllocate} className="text-xs bg-stone-100 hover:bg-stone-200 font-medium px-3 py-1.5 rounded text-stone-700 border border-stone-300 transition-colors">
              Auto-Allocate
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-stone-600">Total Acres</label>
                <button onClick={handleSolveAcres} className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded">
                  Solve Minimum Needed
                </button>
              </div>
              <input type="number" value={params.totalAcres} onChange={e => handleParamChange('totalAcres', Number(e.target.value))} className="mt-1 block w-full rounded-md border-stone-300 shadow-sm sm:text-sm p-2 border" />
              <p className="text-xs text-stone-500 mt-1">Active Land (w/o Falllow): {activeLand} acres</p>
            </div>
            
            <div className="bg-stone-50 p-4 rounded-lg border border-stone-100">
               <div className="flex justify-between mb-2">
                 <span className="text-sm font-semibold text-stone-700">Land Allocation Split (%)</span>
                 <span className={`text-xs font-bold ${totalSplit > 100 ? 'text-red-500' : totalSplit < 100 ? 'text-amber-500' : 'text-emerald-500'}`}>
                   Total: {totalSplit}%
                 </span>
               </div>
               
               <div className="space-y-3">
                 {['wheat', 'barley', 'oats', 'hay'].map((crop) => (
                   <div key={crop} className="flex items-center">
                     <label className="w-20 text-sm capitalize text-stone-600">{crop}</label>
                     <input 
                       type="range" min="0" max="100" step="1"
                       value={params.landSplit[crop as keyof typeof params.landSplit]} 
                       onChange={e => handleLandSplitChange(crop as keyof typeof params.landSplit, Number(e.target.value))}
                       className="flex-1 mx-3"
                     />
                     <span className="text-sm w-10 text-right font-medium">{Math.round(params.landSplit[crop as keyof typeof params.landSplit])}%</span>
                   </div>
                 ))}
               </div>
            </div>

            <div>
              <label className="text-sm font-medium text-stone-600">Yield Variability (Std Dev %)</label>
              <input type="range" min="0" max="50" value={params.yieldVariability} onChange={e => handleParamChange('yieldVariability', Number(e.target.value))} className="w-full" />
              <div className="text-right text-sm text-stone-600">{params.yieldVariability}%</div>
            </div>
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-5 bg-stone-50 hover:bg-stone-100 transition-colors focus:outline-none"
          >
            <h2 className="text-sm font-bold text-stone-800 flex items-center">
              <Settings className="w-4 h-4 mr-2 text-stone-600" />
              Advanced Settings
            </h2>
            {showAdvanced ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
          </button>
          
          {showAdvanced && (
            <div className="p-5 space-y-6 border-t border-stone-200">
              <div>
                <h3 className="font-semibold text-stone-700 mb-3 text-sm">Spoilage Rates (%/mth)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500">Grain / Ale</label>
                    <input type="number" step="0.1" value={params.spoilageRate} onChange={e => handleParamChange('spoilageRate', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Hay</label>
                    <input type="number" step="0.1" value={params.haySpoilageRate} onChange={e => handleParamChange('haySpoilageRate', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-700 mb-3 text-sm">Fuel Economy</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-stone-500">Woodland (acres)</label>
                    <input type="number" step="10" value={params.woodlandAcres} onChange={e => handleParamChange('woodlandAcres', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Yield (carts/acre/yr)</label>
                    <input type="number" step="0.1" value={params.fuelYieldPerAcre} onChange={e => handleParamChange('fuelYieldPerAcre', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Summer Need/Mth</label>
                    <input type="number" step="0.1" value={params.fuelNeedsSummer} onChange={e => handleParamChange('fuelNeedsSummer', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Winter Need/Mth</label>
                    <input type="number" step="0.1" value={params.fuelNeedsWinter} onChange={e => handleParamChange('fuelNeedsWinter', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-700 mb-3 text-sm">Production & Tithes</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500">Tithe & Manufactures (%)</label>
                    <input type="number" step="1" value={params.titheAndManufacturePct} onChange={e => handleParamChange('titheAndManufacturePct', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Wool (lbs/sheep/yr)</label>
                    <input type="number" step="0.1" value={params.woolPerSheep} onChange={e => handleParamChange('woolPerSheep', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-700 mb-3 text-sm">Base Yields</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-stone-500">Wheat (bu/acre)</label>
                    <input type="number" value={params.yields.wheat} onChange={e => handleNestedParamChange('yields', 'wheat', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Barley (bu/acre)</label>
                    <input type="number" value={params.yields.barley} onChange={e => handleNestedParamChange('yields', 'barley', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Oats (bu/acre)</label>
                    <input type="number" value={params.yields.oats} onChange={e => handleNestedParamChange('yields', 'oats', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Hay (tons/acre)</label>
                    <input type="number" step="0.1" value={params.yields.hay} onChange={e => handleNestedParamChange('yields', 'hay', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-stone-700 mb-3 text-sm">Household Members</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-stone-500">Males</label>
                    <input type="number" step="0.1" value={params.peoplePerHH.male} onChange={e => handleNestedParamChange('peoplePerHH', 'male', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Females</label>
                    <input type="number" step="0.1" value={params.peoplePerHH.female} onChange={e => handleNestedParamChange('peoplePerHH', 'female', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500">Children</label>
                    <input type="number" step="0.1" value={params.peoplePerHH.child} onChange={e => handleNestedParamChange('peoplePerHH', 'child', Number(e.target.value))} className="mt-1 block w-full rounded border-stone-300 shadow-sm sm:text-sm p-1.5 border" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Outcomes */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 h-full">
           <h2 className="text-xl font-bold text-stone-800 mb-6 border-b pb-2">Simulation Outcomes (100 runs)</h2>
           
           {!results || isSimulating ? (
             <div className="h-[600px] flex items-center justify-center text-stone-400">
               Calculating harvest probabilities...
             </div>
           ) : (
             <div className="space-y-8">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col items-center justify-center text-center">
                   <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Human Shortage</div>
                   <div className={`text-4xl font-black ${(results.humanShortageObj * 100) > 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                     {(results.humanShortageObj * 100).toFixed(1)}%
                   </div>
                   <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Years w/ Deficit</p>
                 </div>
                 
                 <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col items-center justify-center text-center">
                   <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Animal Attrition</div>
                   <div className={`text-4xl font-black ${(results.animalDeathObj * 100) > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                     {(results.animalDeathObj * 100).toFixed(1)}%
                   </div>
                   <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Years w/ Starvation</p>
                 </div>

                 <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 flex flex-col items-center justify-center text-center">
                   <div className="text-stone-500 text-xs font-semibold uppercase tracking-wider mb-1">Fuel Shortage</div>
                   <div className={`text-4xl font-black ${(results.fuelShortageObj * 100) > 5 ? 'text-orange-500' : 'text-emerald-500'}`}>
                     {(results.fuelShortageObj * 100).toFixed(1)}%
                   </div>
                   <p className="text-[10px] text-stone-500 mt-1 uppercase tracking-wider">Years w/ Freezing</p>
                 </div>

                 <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200 flex flex-col items-center justify-center text-center">
                   <div className="text-indigo-500 text-xs font-semibold uppercase tracking-wider mb-1">Wool / Cloth</div>
                   <div className={`text-4xl font-black text-indigo-700`}>
                     {Math.round(results.avgWoolPerYear)}<span className="text-sm font-medium text-indigo-500">lbs</span>
                   </div>
                   <p className="text-[10px] text-indigo-600 mt-1">~{Math.floor(results.avgWoolPerYear / 3)} yds Cloth P.A.</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                 <div>
                    <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4 flex items-center">
                       Dietary Calorie Sources
                       <div className="group relative ml-2">
                           <Info className="w-4 h-4 text-stone-400 cursor-help" />
                           <div className="absolute left-0 bottom-full mb-2 hidden w-48 p-2 bg-stone-800 text-white text-[10px] rounded shadow-lg group-hover:block z-10">
                              Average aggregate caloric output over 100 iterations.
                           </div>
                       </div>
                    </h3>
                    
                    <div className="mt-2 space-y-4">
                       <div className="w-full flex h-4 rounded-full overflow-hidden bg-stone-100 shadow-inner">
                          <div className="bg-amber-500" style={{ width: `${dietPct.wheat}%` }} title="Wheat" />
                          <div className="bg-orange-500" style={{ width: `${dietPct.barley}%` }} title="Barley/Ale" />
                          <div className="bg-lime-500" style={{ width: `${dietPct.oats}%` }} title="Oats" />
                          <div className="bg-blue-500" style={{ width: `${dietPct.dairy}%` }} title="Dairy" />
                          <div className="bg-red-500" style={{ width: `${dietPct.meat}%` }} title="Meat" />
                          <div className="bg-stone-800" style={{ width: `${dietPct.deficit}%` }} title="Deficit" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs w-full pt-2">
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-amber-500 mr-2" />Wheat <span className="ml-auto font-medium">{dietPct.wheat.toFixed(1)}%</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-orange-500 mr-2" />Barley/Ale <span className="ml-auto font-medium">{dietPct.barley.toFixed(1)}%</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-lime-500 mr-2" />Oats <span className="ml-auto font-medium">{dietPct.oats.toFixed(1)}%</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-blue-500 mr-2" />Dairy <span className="ml-auto font-medium">{dietPct.dairy.toFixed(1)}%</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-red-500 mr-2" />Meat <span className="ml-auto font-medium">{dietPct.meat.toFixed(1)}%</span></div>
                          <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-stone-800 mr-2" />Deficit <span className="ml-auto font-medium">{dietPct.deficit.toFixed(1)}%</span></div>
                       </div>
                    </div>
                 </div>

                 <div>
                   <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-4 flex items-center">
                      Average Spring Carry-over
                   </h3>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                       <span className="font-medium text-sm text-stone-700 flex items-center">
                         <Wheat className="w-4 h-4 mr-2 text-amber-600" />
                         Wheat / Flour
                       </span>
                       <span className="font-bold text-sm text-stone-800">{Math.round(results.avgWheatRemaining)} bu</span>
                     </div>
                     <div className="flex justify-between items-center p-3 bg-lime-50 rounded-lg border border-lime-100">
                       <span className="font-medium text-sm text-stone-700 flex items-center">
                         <ShieldAlert className="w-4 h-4 mr-2 text-lime-600" />
                         Oats Stocks
                       </span>
                       <span className="font-bold text-sm text-stone-800">{Math.round(results.avgOatsRemaining)} bu</span>
                     </div>
                     <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-500 italic">
                        Seed-grain is strictly protected from consumption to ensure next year's crop.
                     </div>
                   </div>
                 </div>
               </div>

               <div className="mt-8 border-t border-stone-200 pt-8">
                 <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide mb-6 flex items-center">
                   <Activity className="w-5 h-5 mr-2 text-stone-400" />
                   Sample 5-Year History
                 </h3>
                 <SimulationPlayer history={results.history} growingMonths={params.growingMonths} />
                 {/* 
                 <div className="space-y-4">
                   <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={results.history} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="colorWheat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorBarley" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorOats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#65a30d" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#65a30d" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                          <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} stroke="#a8a29e" fontSize={10} minTickGap={30} tickLine={false} axisLine={false} />
                          <YAxis stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip 
                             contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          {Array.from({ length: 5 }).map((_, i) => (
                            <ReferenceArea key={`winter-${i}`} x1={(i * 12) + params.growingMonths} x2={(i + 1) * 12} fill="#bae6fd" fillOpacity={0.15} strokeOpacity={0} />
                          ))}
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                          <Area type="monotone" dataKey="wheat" stroke="#d97706" fill="url(#colorWheat)" name="Wheat (bu)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                          <Area type="monotone" dataKey="barley" stroke="#ea580c" fill="url(#colorBarley)" name="Barley/Ale (bu)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                          <Area type="monotone" dataKey="oats" stroke="#65a30d" fill="url(#colorOats)" name="Oats/Feed (bu)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                   </div>
                   
                   <div className="h-40 w-full mt-4">
                       <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={results.history} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                            <defs>
                               <linearGradient id="colorSheep" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                               </linearGradient>
                               <linearGradient id="colorCattle" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} stroke="#a8a29e" fontSize={10} minTickGap={30} tickLine={false} axisLine={false} />
                            <YAxis stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                               contentStyle={{ borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                            />
                            {Array.from({ length: 5 }).map((_, i) => (
                              <ReferenceArea key={`winter-${i}`} x1={(i * 12) + params.growingMonths} x2={(i + 1) * 12} fill="#bae6fd" fillOpacity={0.15} strokeOpacity={0} />
                            ))}
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                            <Area type="step" dataKey="sheep" stroke="#4f46e5" fill="url(#colorSheep)" name="Flock Size (Sheep)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                            <Area type="step" dataKey="cattleCount" stroke="#dc2626" fill="url(#colorCattle)" name="Herd Size (Cattle)" strokeWidth={2} activeDot={{ r: 4, strokeWidth: 0 }} />
                          </AreaChart>
                       </ResponsiveContainer>
                   </div>
                 </div>
                 */}
                 <div className="mt-6">
                   <button 
                     onClick={() => setShowTable(!showTable)}
                     className="text-emerald-700 hover:text-emerald-800 text-sm font-medium flex items-center transition-colors"
                   >
                     {showTable ? 'Hide Detailed Tables' : 'Show Detailed Monthly Log'}
                     {showTable ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                   </button>
                   
                   {showTable && (
                     <div className="mt-4 border border-stone-200 rounded-lg overflow-hidden">
                       <div className="max-h-96 overflow-y-auto">
                         <table className="min-w-full divide-y divide-stone-200 text-xs">
                           <thead className="bg-stone-50 sticky top-0 shadow-sm z-10">
                             <tr>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Mth</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Wheat</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Barley</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Oats</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Fuel</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Hum (Wh/Ba/Oa)</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Anim (Oa/Ha)</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Spoiled/Seed</th>
                               <th scope="col" className="px-3 py-2 text-left font-medium text-stone-500 uppercase tracking-wider">Animals (Sh/Ca)</th>
                             </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-stone-200">
                             {results.history.map((row, idx) => (
                               <tr key={idx} className={row.month % 12 === 1 ? "bg-emerald-50/50" : (row.month % 12 > params.growingMonths || row.month % 12 === 0 ? "bg-stone-50/50" : "")}>
                                 <td className="px-3 py-2 whitespace-nowrap text-stone-900 font-medium whitespace-nowrap">Y{row.year}M{row.month%12 || 12}</td>
                                 <td className="px-3 py-2 whitespace-nowrap text-amber-700">{row.wheat}</td>
                                 <td className="px-3 py-2 whitespace-nowrap text-orange-600">{row.barley}</td>
                                 <td className="px-3 py-2 whitespace-nowrap text-lime-700">{row.oats}</td>
                                 <td className="px-3 py-2 whitespace-nowrap text-stone-700 font-medium">{row.fuel}</td>
                                 <td className="px-3 py-2 whitespace-nowrap text-stone-600">
                                    {row.hWheat}/{row.hBarley}/{row.hOats}
                                 </td>
                                 <td className="px-3 py-2 whitespace-nowrap text-stone-600">
                                    {row.aOats}/{row.aHay}
                                 </td>
                                 <td className="px-3 py-2 whitespace-nowrap text-red-700 whitespace-nowrap">
                                    {row.spoilCol} / {row.seedCol}
                                 </td>
                                 <td className="px-3 py-2 whitespace-nowrap text-indigo-700 font-medium">
                                    {row.sheep} / <span className="text-red-500" title="Cattle">C:{row.cattleCount ?? 0}</span> {row.wool > 0 ? ` (+${row.wool} lbs wool)` : ''}
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                       <div className="p-2 border-t border-stone-200 bg-stone-50 text-center text-[10px] text-stone-500 uppercase tracking-wide">
                         Showing all 60 months of the sample iteration
                       </div>
                     </div>
                   )}
                 </div>
               </div>

             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function SimulationPlayer({ history, growingMonths }: { history: any[], growingMonths: number }) {
  const [currentMonth, setCurrentMonth] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentMonth(prev => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed, history.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentMonth(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentMonth(parseInt(e.target.value));
  };

  if (!history || history.length === 0) return null;
  const currentData = history[currentMonth];
  const isWinter = currentData.month > growingMonths;

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wide flex items-center">
             <Activity className="w-5 h-5 mr-2 text-stone-400" />
             Animated Year {currentData.year} - Month {currentData.month}
           </h3>
           <p className={`text-xs mt-1 font-semibold ${isWinter ? 'text-blue-500' : 'text-emerald-600'}`}>
             {isWinter ? 'Winter (Consumption & Attrition)' : 'Growing Season (Pasture & Gathering)'}
             {currentData.month === growingMonths && ' - HARVEST MONTH'}
           </p>
        </div>
        
        <div className="flex items-center space-x-2">
           <button onClick={() => setSpeed(speed === 500 ? 150 : 500)} className={`p-1.5 rounded border transition-colors ${speed === 150 ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-stone-300 text-stone-600'}`} title="Fast Forward">
             <FastForward className="w-4 h-4" />
           </button>
           <button onClick={resetPlayback} className="p-1.5 rounded border bg-white border-stone-300 text-stone-600 transition-colors hover:bg-stone-100" title="Restart">
             <RotateCcw className="w-4 h-4" />
           </button>
           <button onClick={() => setCurrentMonth(Math.max(0, currentMonth - 1))} className="p-1.5 rounded border bg-white border-stone-300 text-stone-600 transition-colors hover:bg-stone-100">
             <SkipBack className="w-4 h-4" />
           </button>
           <button onClick={togglePlay} className="p-2 rounded border bg-indigo-600 border-indigo-700 text-white transition-colors hover:bg-indigo-700">
             {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
           </button>
           <button onClick={() => setCurrentMonth(Math.min(history.length - 1, currentMonth + 1))} className="p-1.5 rounded border bg-white border-stone-300 text-stone-600 transition-colors hover:bg-stone-100">
             <SkipForward className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="mb-6">
        <input 
          type="range" 
          min="0" 
          max={history.length - 1} 
          value={currentMonth} 
          onChange={handleSeek}
          className="w-full accent-indigo-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-stone-400 mt-1 uppercase tracking-wider">
           <span>Start</span>
           <span>End of 5 Years</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         {/* Granary */}
         <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 border-b pb-2">Granary Stocks</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-700 font-medium tracking-tight">Wheat</span>
                <span className="font-mono text-stone-700">{currentData.wheat} bu</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-orange-600 font-medium tracking-tight">Barley</span>
                <span className="font-mono text-stone-700">{currentData.barley} bu</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-lime-700 font-medium tracking-tight">Oats</span>
                <span className="font-mono text-stone-700">{currentData.oats} bu</span>
              </div>
            </div>
         </div>

         {/* Non Grain Resources */}
         <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 border-b pb-2">Village Stores</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-700 font-medium tracking-tight">Fuel</span>
                <span className="font-mono text-stone-700 flex items-center">{currentData.fuel} <span className="text-[10px] ml-1 text-stone-400">carts</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-700 font-medium tracking-tight">Winter Hay</span>
                <span className="font-mono text-stone-700 flex items-center">{currentData.hay} <span className="text-[10px] ml-1 text-stone-400">tons</span></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-stone-700 font-medium tracking-tight">Cured Meat</span>
                <span className="font-mono text-stone-700 flex items-center">{currentData.meatStock > 0 ? (currentData.meatStock / 1000).toFixed(1) : 0} <span className="text-[10px] ml-1 text-stone-400">kCal</span></span>
              </div>
            </div>
         </div>

         {/* Human Consumption */}
         <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm col-span-2">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3 border-b pb-2">Monthly Human Deficit (Wheat/Barley/Oat)</h4>
            <div className="flex items-end space-x-2 h-16 mt-2">
                <div title={`Wheat Consumed: ${currentData.hWheat} bu`} className="bg-amber-500 rounded-t w-1/4 transition-all duration-300" style={{ height: `${Math.min(100, Math.max(5, (currentData.hWheat/40)*100))}%` }}></div>
                <div title={`Barley Consumed: ${currentData.hBarley} bu`} className="bg-orange-500 rounded-t w-1/4 transition-all duration-300" style={{ height: `${Math.min(100, Math.max(5, (currentData.hBarley/40)*100))}%` }}></div>
                <div title={`Oats Consumed: ${currentData.hOats} bu`} className="bg-lime-500 rounded-t w-1/4 transition-all duration-300" style={{ height: `${Math.min(100, Math.max(5, (currentData.hOats/40)*100))}%` }}></div>
                <div title={`Deficit`} className="bg-red-500 rounded-t w-1/4 transition-all duration-300" style={{ height: `${currentData.deficit > 0 ? 100 : 5}%` }}></div>
            </div>
            {currentData.deficit > 0 && <p className="text-xs text-red-600 font-bold mt-2">Starvation state: Deficit logged!</p>}
         </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Livestock */}
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-center items-center">
           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Cattle Herd</span>
           <span className="text-3xl font-black text-rose-600">{currentData.cattleCount}</span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-stone-200 shadow-sm flex flex-col justify-center items-center">
           <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Sheep Flock</span>
           <span className="text-3xl font-black text-indigo-600">{currentData.sheep}</span>
        </div>
        
        {/* Animal Consumption (Winter primarily) */}
        <div className="bg-white p-4 col-span-2 rounded-lg border border-stone-200 shadow-sm">
           <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 border-b pb-2">Animal Consumption</h4>
           <div className="flex justify-around items-center h-full">
              <div className="text-center">
                <span className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">Oats</span>
                <span className="font-mono text-stone-700">{currentData.aOats} <span className="text-[10px] text-stone-400">bu</span></span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">Hay</span>
                <span className="font-mono text-stone-700">{currentData.aHay} <span className="text-[10px] text-stone-400">tons</span></span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] text-stone-400 uppercase tracking-wider mb-1">Status</span>
                <span className={`font-mono font-bold ${(currentData.aOats > 0 || currentData.aHay > 0) ? 'text-blue-600' : 'text-emerald-600'}`}>
                  {(currentData.aOats > 0 || currentData.aHay > 0) ? 'Stall Fed' : 'Foraging'}
                </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

