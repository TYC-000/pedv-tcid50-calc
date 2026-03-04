
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calculator as CalcIcon, FlaskConical, AlertCircle, CheckCircle2, RefreshCw, Grid3X3, Trash2 } from 'lucide-react';
import { calculateReedMuench, CalculationResult, DilutionData } from '../utils/reedMuench';

// 96-well plate constants
const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const COLS = Array.from({ length: 12 }, (_, i) => i + 1);
const DILUTIONS = COLS.map(c => `10^-${c + 8}`); // 10^-9 to 10^-20

export default function Calculator() {
  // Plate state: true = positive (CPE), false = negative
  const [plate, setPlate] = useState<boolean[][]>(
    Array.from({ length: 8 }, () => Array(12).fill(false))
  );
  
  const [inoculumVolume, setInoculumVolume] = useState(0.1);
  const [isResetting, setIsResetting] = useState(false);
  const [result, setResult] = useState<{
    calculation: CalculationResult | null;
    data: DilutionData[];
  }>({
    calculation: null,
    data: []
  });

  const toggleWell = (rIdx: number, cIdx: number) => {
    const newPlate = [...plate.map(row => [...row])];
    newPlate[rIdx][cIdx] = !newPlate[rIdx][cIdx];
    setPlate(newPlate);
  };

  const selectColumn = (cIdx: number) => {
    const newPlate = [...plate.map(row => [...row])];
    
    // Check if all are currently selected in this column
    const allSelected = Array.from({ length: 8 }, (_, i) => newPlate[i][cIdx]).every(v => v);
    
    // Toggle: if all selected, deselect all. Otherwise, select all.
    for (let i = 0; i < 8; i++) {
      newPlate[i][cIdx] = !allSelected;
    }
    setPlate(newPlate);
  };

  const handleReset = () => {
    setIsResetting(true);

    // Create a completely fresh 2D array reference to force re-render
    const freshPlate = Array.from({ length: 8 }, () => Array(12).fill(false));
    setPlate(freshPlate);

    // Force reset calculation results state
    setResult({
      calculation: null,
      data: []
    });

    // Visual feedback duration
    setTimeout(() => setIsResetting(false), 500);
  };
  
  const handleCalculate = () => {
    // Process single sample (Rows A-H)
    const sampleData: DilutionData[] = COLS.map((col, cIdx) => {
      let positive = 0;
      for (let rIdx = 0; rIdx < 8; rIdx++) {
        if (plate[rIdx][cIdx]) positive++;
      }
      return { dilution: DILUTIONS[cIdx], positiveWells: positive, totalWells: 8 };
    });

    setResult({
      calculation: calculateReedMuench(sampleData, inoculumVolume),
      data: sampleData.filter(d => d.positiveWells > 0 || d.totalWells > 0)
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <FlaskConical size={28} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">PEDV TCID50 計算機</h1>
              <p className="text-slate-500 text-xs md:text-sm">單一樣品 (8 重複) • Reed-Muench 方法</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">接種量 (mL)</label>
              <input 
                type="number" 
                step="0.01"
                value={inoculumVolume}
                onChange={(e) => setInoculumVolume(parseFloat(e.target.value) || 0)}
                className="w-12 text-center font-mono font-bold text-blue-600 focus:outline-none text-sm"
              />
            </div>
            <motion.button 
              type="button"
              onClick={handleReset}
              animate={isResetting ? { scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] } : {}}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-3 rounded-xl transition-all cursor-pointer z-10 flex items-center justify-center ${
                isResetting 
                  ? 'text-red-600 bg-red-100 ring-2 ring-red-200' 
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100'
              }`}
              title="清空孔盤"
            >
              <Trash2 size={20} />
            </motion.button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left: 96-Well Plate (Span 2) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 p-4 md:p-8 overflow-x-auto"
            >
              <div className="min-w-[850px] px-2">
                <div className="grid grid-cols-[44px_repeat(12,1fr)] gap-2 mb-4">
                  <div /> {/* Corner spacer */}
                  {COLS.map((c, i) => (
                    <div key={c} className="text-center">
                      <div className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">稀釋度</div>
                      <div className="text-[11px] font-mono font-bold text-slate-700">{DILUTIONS[i]}</div>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <div className="absolute -left-10 top-0 bottom-0 flex items-center">
                    <div className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/40">8 Replicates</div>
                  </div>
                  <div className="space-y-2">
                    {ROWS.map((row, rIdx) => (
                      <div key={row} className="grid grid-cols-[44px_repeat(12,1fr)] gap-2 items-center">
                        <div className="text-sm font-bold text-slate-300 text-center">{row}</div>
                        {COLS.map((col, cIdx) => (
                          <button
                            key={`${row}-${col}`}
                            onClick={() => toggleWell(rIdx, cIdx)}
                            className={`w-11 h-11 rounded-full border-2 transition-all duration-200 flex items-center justify-center mx-auto ${
                              plate[rIdx][cIdx] 
                                ? 'bg-red-500 border-red-600 shadow-inner scale-90' 
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {plate[rIdx][cIdx] && <div className="w-2 h-2 rounded-full bg-white/40" />}
                          </button>
                        ))}
                      </div>
                    ))}
                    {/* Select All Row */}
                    <div className="grid grid-cols-[44px_repeat(12,1fr)] gap-2 mt-2">
                      <div />
                      {COLS.map((_, cIdx) => (
                        <button 
                          key={`select-${cIdx}`}
                          onClick={() => selectColumn(cIdx)}
                          className="text-[9px] font-bold text-slate-400 hover:text-blue-500 uppercase tracking-tighter py-2"
                        >
                          全選
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <button
              onClick={handleCalculate}
              className="w-full py-5 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-lg shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.99] mb-4 lg:mb-0"
            >
              <CalcIcon size={24} />
              計算 TCID50
            </button>
          </div>

          {/* Right: Results */}
          <div className="flex flex-col gap-6 md:gap-8">
            <ResultCard title="綜合實驗結果" result={result.calculation} data={result.data} color="blue" />
          </div>

        </div>
      </div>
    </div>
  );
}

function ResultCard({ title, result, data, color }: { title: string, result: CalculationResult | null, data: DilutionData[], color: 'blue' | 'emerald' }) {
  if (!result && data.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-400 gap-4 h-64">
        <Grid3X3 size={32} className="opacity-20" />
        <p className="text-sm font-medium uppercase tracking-widest text-slate-300">等待數據輸入</p>
      </div>
    );
  }

  const colorClass = color === 'blue' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50';
  const accentClass = color === 'blue' ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden w-full"
    >
      <div className={`px-6 py-4 flex items-center justify-between border-b border-slate-100 ${colorClass}`}>
        <h3 className="font-black uppercase tracking-widest text-xs">{title}</h3>
        <CheckCircle2 size={16} />
      </div>

      <div className="p-6">
        {result?.error ? (
          <div className="flex flex-col items-center gap-3 text-red-500 py-4">
            <AlertCircle size={32} />
            <p className="text-xs font-bold text-center leading-relaxed">{result.error}</p>
          </div>
        ) : (
          <div className="text-center mb-8">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">TCID50 / mL</div>
            <div className="text-4xl font-mono font-black text-slate-900 tracking-tighter">
              {result?.tcid50PerMl 
                ? result.tcid50PerMl.toExponential(2).replace('e+', ' × 10^')
                : '---'}
            </div>
            
            {result?.tcid50PerMl && (
              <div className="mt-4 pt-4 border-t border-slate-50">
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimated PFU / mL</div>
                <div className="text-2xl font-mono font-bold text-slate-600 tracking-tight">
                  {(result.tcid50PerMl * 0.69).toExponential(2).replace('e+', ' × 10^')}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 mt-4">
              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">LOG10: {result?.logTcid50PerMl?.toFixed(2)}</span>
              <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">PD: {result?.details?.pd.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <div className="grid grid-cols-3 text-[9px] font-black text-slate-300 uppercase tracking-widest mb-2 px-2">
            <div>Dilution</div>
            <div className="text-center">Pos</div>
            <div className="text-right">Total</div>
          </div>
          {data.map((row, i) => (
            <div key={i} className="grid grid-cols-3 text-xs font-mono py-2 px-3 bg-slate-50 rounded-lg items-center">
              <div className="font-bold text-slate-700">{row.dilution}</div>
              <div className="text-center">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${row.positiveWells === 8 ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  {row.positiveWells}
                </span>
              </div>
              <div className="text-right text-slate-400 font-bold">{row.totalWells}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
