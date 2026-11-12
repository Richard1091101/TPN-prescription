import React, { useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Droplets,
  Calculator,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  CompoundingEvaluation,
  ClinicalCalculatorInputs,
  ClinicalCalculatorResults,
} from '../types/tpn';
import {
  calculateCorrectedCa,
  calculateNaDeficit,
  calculateSerumNaDelta,
} from '../utils/tpnCalculations';

interface CompoundingInspectorProps {
  proposedEvaluation: CompoundingEvaluation;
  currentEvaluation: CompoundingEvaluation;
  proposedMainName: string;
  patientWeight: number;
  proposedInfusateNaMeqPerL: number;
}

export const CompoundingInspector: React.FC<CompoundingInspectorProps> = ({
  proposedEvaluation,
  currentEvaluation,
  proposedMainName,
  patientWeight,
  proposedInfusateNaMeqPerL,
}) => {
  const [showIngredientsTable, setShowIngredientsTable] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  // Clinical Calculator State
  const [calcInputs, setCalcInputs] = useState<ClinicalCalculatorInputs>({
    serumAlbumin: 3.0,
    serumCa: 8.0,
    serumNa: 128,
    desiredNa: 135,
    patientWeight: patientWeight || 60,
  });

  const calcResults: ClinicalCalculatorResults = {
    correctedCa: calculateCorrectedCa(calcInputs.serumCa, calcInputs.serumAlbumin),
    naDeficitMmol: calculateNaDeficit(
      calcInputs.desiredNa,
      calcInputs.serumNa,
      calcInputs.patientWeight
    ),
    serumNaDelta: calculateSerumNaDelta(
      proposedInfusateNaMeqPerL,
      calcInputs.serumNa,
      calcInputs.patientWeight
    ),
  };

  const evalItem = proposedEvaluation;
  const isOverflow = evalItem.isVolumeOverflow;
  const hasBarriers = evalItem.barrierIssues.length > 0;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-2xs text-white ${
              hasBarriers ? 'bg-rose-600' : 'bg-teal-600'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              藥局原料實際調配模擬與相容性檢查
              <span className="text-xs font-normal text-slate-500 hidden sm:inline">
                (Compounding Feasibility & Incompatibility)
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              模擬醫院無菌調配室 (Cleanroom) 抽取原料體積，並標記「無法調出」或「沉澱/破乳無法進食」狀態
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-teal-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-teal-600" />
            <span>{showCalculator ? '收合校正公式' : '臨床校正小工具'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Status Banner */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          evalItem.statusBadge.level === 'danger'
            ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-200/60'
            : evalItem.statusBadge.level === 'warning'
            ? 'bg-amber-50/80 border-amber-300'
            : 'bg-emerald-50/80 border-emerald-300'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs md:text-sm font-black px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-2xs ${
                  evalItem.statusBadge.level === 'danger'
                    ? 'bg-rose-600 text-white'
                    : evalItem.statusBadge.level === 'warning'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {evalItem.statusBadge.level === 'danger' ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {evalItem.statusBadge.text}
              </span>
              <span className="text-xs font-bold text-slate-800">
                針對處方：{proposedMainName}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed pt-0.5">
              {evalItem.statusBadge.summary}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/80 p-2.5 rounded-lg border border-slate-200/80">
            <div className="text-center px-2">
              <span className="block text-[10px] text-slate-500 font-medium">原料總量</span>
              <span className="text-xs font-black tabular-nums text-slate-900">
                {evalItem.totalIngredientVol} ml
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center px-2">
              <span className="block text-[10px] text-slate-500 font-medium">注射用水空間</span>
              <span
                className={`text-xs font-black tabular-nums ${
                  isOverflow ? 'text-rose-600' : 'text-teal-700'
                }`}
              >
                {evalItem.waterVol} ml
              </span>
            </div>
          </div>
        </div>

        {/* Barrier List if Any */}
        {evalItem.barrierIssues.length > 0 && (
          <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-1.5">
            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              調配阻礙與無法進食使用之致命警示 (Must Resolve Before Compounding):
            </span>
            <ul className="list-disc pl-5 space-y-1 text-xs text-rose-800">
              {evalItem.barrierIssues.map((issue, idx) => (
                <li key={idx} className="leading-relaxed font-semibold">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning Notes if Any */}
        {evalItem.warningNotes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-1">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              調劑順序與生化監控提醒:
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-800">
              {evalItem.warningNotes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Volume Visual Meter Bar */}
      <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-teal-600" />
            1000 ml 總容量原料佔比量表 (Compounding Volume Gauge)
          </span>
          <span className="tabular-nums">
            {evalItem.totalIngredientVol} / 1000 ml ({((evalItem.totalIngredientVol / 1000) * 100).toFixed(1)}%)
          </span>
        </div>

        <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex relative">
          <div
            style={{ width: `${Math.min(100, (evalItem.totalIngredientVol / 1000) * 100)}%` }}
            className={`h-full transition-all ${
              isOverflow ? 'bg-rose-600 animate-pulse' : 'bg-teal-600'
            }`}
          />
          {isOverflow && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white bg-rose-600/90 tracking-wider">
              容量破表 (OVERFLOW +{Math.abs(evalItem.waterVol)} ml)
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>0 ml</span>
          <span className="text-slate-600 font-semibold">
            {isOverflow
              ? `原料總計 ${evalItem.totalIngredientVol} ml（超出容器物理極限）`
              : `尚餘 ${evalItem.waterVol} ml 容納滅菌注射用水`}
          </span>
          <span>1000 ml</span>
        </div>
      </div>

      {/* Raw Ingredients Recipe Breakdown Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowIngredientsTable(!showIngredientsTable)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-teal-700 transition-colors"
          >
            <span>藥局原料抽取清單 (每 1000 ml 調配明細)</span>
            {showIngredientsTable ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          <span className="text-[11px] text-slate-400">
            依據 2018 藥局修訂版規格與原料濃度自動換算
          </span>
        </div>

        {showIngredientsTable && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
            <table className="w-full text-left whitespace-nowrap text-xs">
              <thead className="bg-slate-800 text-white text-[11px]">
                <tr>
                  <th className="py-2 px-3 font-semibold">原料名稱</th>
                  <th className="py-2 px-3 font-semibold">濃度規格</th>
                  <th className="py-2 px-3 font-bold text-teal-300 text-right">抽取體積 (ml)</th>
                  <th className="py-2 px-3 font-normal text-slate-300">調劑備註與作用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {evalItem.ingredients.map((ing, idx) => {
                  const isWater = ing.name.includes('Water');
                  return (
                    <tr
                      key={idx}
                      className={
                        isWater
                          ? isOverflow
                            ? 'bg-rose-50 font-bold text-rose-800'
                            : 'bg-teal-50/40 font-bold text-teal-900'
                          : 'hover:bg-slate-50 transition-colors'
                      }
                    >
                      <td className="py-2 px-3 font-medium text-slate-800">{ing.name}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{ing.spec}</td>
                      <td className="py-2 px-3 font-bold tabular-nums text-right text-slate-900">
                        {ing.volumeMl} ml
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{ing.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical Formula Tools Modal/Collapse (Corrected Ca, Na Deficit, Serum Na Delta) */}
      {showCalculator && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
            <Calculator className="w-4 h-4 text-teal-600" />
            <span>知識庫臨床校正公式小工具 (Clinical Formulas from Knowledge Base)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tool 1: Corrected Calcium */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                1. 校正白蛋白血鈣 (Corrected Ca)
              </span>
              <p className="text-[10px] text-slate-500">
                公式: 0.8 × (4.0 - Albumin g/dL) + Serum Ca
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="text-slate-500 block">白蛋白 (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcInputs.serumAlbumin}
                    onChange={(e) =>
                      setCalcInputs({ ...calcInputs, serumAlbumin: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border rounded p-1 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block">血鈣值 (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcInputs.serumCa}
                    onChange={(e) =>
                      setCalcInputs({ ...calcInputs, serumCa: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border rounded p-1 text-center font-bold"
                  />
                </div>
              </div>
              <div className="pt-1 text-center">
                <span className="text-[10px] text-slate-500 block">校正後血鈣值</span>
                <span className="text-sm font-black text-teal-800 tabular-nums">
                  {calcResults.correctedCa} mg/dL
                </span>
              </div>
            </div>

            {/* Tool 2: Na Deficit */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                2. 鈉離子缺損量 (Na Deficit)
              </span>
              <p className="text-[10px] text-slate-500">
                公式: (Na_desired - Na_observed) × 0.6 × 體重 (kg)
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <label className="text-slate-500 block">實測血鈉 (mEq/L)</label>
                  <input
                    type="number"
                    value={calcInputs.serumNa}
                    onChange={(e) =>
                      setCalcInputs({ ...calcInputs, serumNa: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border rounded p-1 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block">目標血鈉 (mEq/L)</label>
                  <input
                    type="number"
                    value={calcInputs.desiredNa}
                    onChange={(e) =>
                      setCalcInputs({ ...calcInputs, desiredNa: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full border rounded p-1 text-center font-bold"
                  />
                </div>
              </div>
              <div className="pt-1 text-center">
                <span className="text-[10px] text-slate-500 block">需補充鈉總量</span>
                <span className="text-sm font-black text-teal-800 tabular-nums">
                  {calcResults.naDeficitMmol} mmol (mEq)
                </span>
              </div>
            </div>

            {/* Tool 3: Serum Na Change */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
              <span className="block text-xs font-bold text-slate-800">
                3. 每公升輸注後預估血鈉變化
              </span>
              <p className="text-[10px] text-slate-500">
                公式: ([Na]_infusate - [Na]_serum) ÷ (TBW + 1)
              </p>
              <div className="text-[11px] space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>處方鈉濃度:</span>
                  <span className="font-bold tabular-nums">{proposedInfusateNaMeqPerL.toFixed(1)} mEq/L</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>總體液 TBW:</span>
                  <span className="font-bold tabular-nums">{(calcInputs.patientWeight * 0.6).toFixed(1)} L</span>
                </div>
              </div>
              <div className="pt-1 text-center">
                <span className="text-[10px] text-slate-500 block">每輸注 1000ml 血鈉預估變化</span>
                <span
                  className={`text-sm font-black tabular-nums ${
                    calcResults.serumNaDelta >= 0 ? 'text-teal-800' : 'text-rose-700'
                  }`}
                >
                  {calcResults.serumNaDelta >= 0 ? '+' : ''}
                  {calcResults.serumNaDelta} mEq/L
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
