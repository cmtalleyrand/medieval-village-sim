import React, { useState } from 'react';
import { Settings, BarChart2, BookOpen } from 'lucide-react';
import { SimPanel } from './components/SimPanel';
import { Assumptions } from './components/Assumptions';

function App() {
  const [activeTab, setActiveTab] = useState<'sim' | 'assumptions'>('sim');

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans pb-12">
      <header className="bg-stone-900 text-stone-100 p-6 shadow-md border-b-4 border-emerald-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fiefdom Winter Survival Planner</h1>
            <p className="text-stone-400 mt-1">Medieval Village Economy & Crop Simulation</p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setActiveTab('sim')}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'sim' ? 'bg-emerald-700 text-white' : 'bg-stone-800 hover:bg-stone-700'}`}
            >
              <BarChart2 className="w-4 h-4 mr-2" />
              Simulation
            </button>
            <button 
              onClick={() => setActiveTab('assumptions')}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'assumptions' ? 'bg-emerald-700 text-white' : 'bg-stone-800 hover:bg-stone-700'}`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Assumptions
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto mt-8 px-6">
        {activeTab === 'sim' ? <SimPanel /> : <Assumptions />}
      </main>
    </div>
  );
}

export default App;
