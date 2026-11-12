import React, { useState } from 'react';
import { User, Scale, HeartPulse, SlidersHorizontal, RotateCcw, Info, CheckCircle2 } from 'lucide-react';
import { PatientProfile, PatientMetrics, NutrientValues } from '../types/tpn';

interface PatientAssessmentProps {
  patient: PatientProfile;
  metrics: PatientMetrics;
  targets: NutrientValues;
  onPatientChange: (updated: PatientProfile) => void;
  onTargetChange: (updatedTargets: NutrientValues) => void;
  onResetTargets: () => void;
}

export const PatientAssessment: React.FC<PatientAssessmentProps> = ({
  patient,
  metrics,
  targets,
  onPatientChange,
  onTargetChange,
  onResetTargets,
}) => {
  const [showAdvancedTargets, setShowAdvancedTargets] = useState(true);

  const handleFieldChange = (field: keyof PatientProfile, val: any) => {
    onPatientChange({
      ...patient,
      [field]: val,
    });
  };

  const handleTargetValueChange = (key: keyof NutrientValues, val: number) => {
    onTargetChange({
      ...targets,
      [key]: isNaN(val) ? 0 : val,
    });
  };

  const getBmiBadge = (bmi: number) => {
    if (bmi < 18.5) return { text: '過輕 (Underweight)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (bmi < 24) return { text: '正常 (Normal)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (bmi < 27) return { text: '過重 (Overweight)', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: '肥胖 (Obese)', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const bmiBadge = getBmiBadge(metrics.bmi);

  return (
    <section id="section-patient" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 transition-all">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            1
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              病患基礎生理與目標需求評估
              <span className="text-xs font-normal text-slate-500 hidden sm:inline">(Patient Baseline & Targets)</span>
            </h2>
            <div className="text-xs text-slate-500">
              採用 Mifflin-St Jeor 實證公式及 ASPEN 臨床靜脈營養指引即時運算
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvancedTargets(!showAdvancedTargets)}
          className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100/80 px-3 py-1.5 rounded-lg border border-teal-200/80 transition-colors self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{showAdvancedTargets ? '收合目標微調' : '展開目標微調'}</span>
        </button>
      </div>

      {/* Primary Input Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Gender */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">性別 (Gender)</label>
          <select
            value={patient.gender}
            onChange={(e) => handleFieldChange('gender', e.target.value)}
            className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all"
          >
            <option value="male">男性 (Male)</option>
            <option value="female">女性 (Female)</option>
          </select>
        </div>

        {/* Age */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">年齡 (Age)</label>
          <div className="relative">
            <input
              type="number"
              value={patient.age || ''}
              onChange={(e) => handleFieldChange('age', parseFloat(e.target.value))}
              placeholder="歲"
              min={1}
              max={120}
              className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums transition-all"
            />
            <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 pointer-events-none">歲</span>
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">身高 (Height)</label>
          <div className="relative">
            <input
              type="number"
              value={patient.height || ''}
              onChange={(e) => handleFieldChange('height', parseFloat(e.target.value))}
              placeholder="cm"
              min={50}
              max={250}
              className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums transition-all"
            />
            <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 pointer-events-none">cm</span>
          </div>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">體重 (Weight)</label>
          <div className="relative">
            <input
              type="number"
              value={patient.weight || ''}
              onChange={(e) => handleFieldChange('weight', parseFloat(e.target.value))}
              placeholder="kg"
              min={10}
              max={300}
              step={0.5}
              className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums transition-all"
            />
            <span className="absolute right-2.5 top-3 text-[10px] text-slate-400 pointer-events-none">kg</span>
          </div>
        </div>

        {/* Activity Factor */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">活動因子 (AF)</label>
          <select
            value={patient.af}
            onChange={(e) => handleFieldChange('af', parseFloat(e.target.value))}
            className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all truncate"
          >
            <option value={1.0}>臥床/呼吸器 (1.0)</option>
            <option value={1.1}>輪椅/輕度床邊 (1.1)</option>
            <option value={1.2}>輕度活動/走動 (1.2)</option>
            <option value={1.3}>中度活動 (1.3)</option>
          </select>
        </div>

        {/* Stress Factor */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">壓力因子 (SF)</label>
          <select
            value={patient.sf}
            onChange={(e) => handleFieldChange('sf', parseFloat(e.target.value))}
            className="w-full min-h-[44px] bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs md:text-sm font-medium text-slate-800 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-all truncate"
          >
            <option value={1.0}>無壓力/營養不良 (1.0)</option>
            <option value={1.1}>輕微手術/發燒 (1.1)</option>
            <option value={1.2}>一般大手術/骨折 (1.2)</option>
            <option value={1.3}>嚴重創傷/頭外傷 (1.3)</option>
            <option value={1.4}>敗血症 (1.4)</option>
            <option value={1.5}>重症/嚴重感染 (1.5)</option>
            <option value={1.7}>大燒傷 &lt; 20% (1.7)</option>
            <option value={2.0}>嚴重燒傷 &gt; 20% (2.0)</option>
          </select>
        </div>
      </div>

      {/* Physiological Indicators Strip */}
      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">BMI:</span>
            <span className="font-bold tabular-nums text-slate-800">{metrics.bmi || '--'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${bmiBadge.color}`}>
              {bmiBadge.text}
            </span>
          </div>

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">理想體重 (IBW):</span>
            <span className="font-bold tabular-nums text-slate-800">{metrics.ibw} kg</span>
          </div>

          {metrics.isObese && (
            <>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">校正體重 (AdjBW):</span>
                <span className="font-bold tabular-nums text-teal-800">{metrics.adjustedWeight} kg</span>
                <label className="flex items-center gap-1 text-[11px] text-teal-700 cursor-pointer ml-1">
                  <input
                    type="checkbox"
                    checked={patient.useAdjustedWeight || false}
                    onChange={(e) => handleFieldChange('useAdjustedWeight', e.target.checked)}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>使用校正體重計算</span>
                </label>
              </div>
            </>
          )}

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">BMR:</span>
            <span className="font-bold tabular-nums text-slate-800">{metrics.bmr} kcal</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">每日總熱量需求 (TEE):</span>
            <span className="font-black tabular-nums text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
              {metrics.tee} kcal/day
            </span>
          </div>
        </div>
      </div>

      {/* Target Requirements Adjustment Panel */}
      {showAdvancedTargets && (
        <div className="mt-4 p-4 bg-teal-50/50 rounded-xl border border-teal-200/90 animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                目標需求微調 (連動差距分析)
              </span>
              <span className="text-[10px] text-slate-500 hidden md:inline">
                可依個別臨床生化值 (如高血鉀、水腫、腎功能) 進行細項設定
              </span>
            </div>
            <button
              type="button"
              onClick={onResetTargets}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-teal-700 hover:bg-teal-100/60 px-2 py-1 rounded transition-colors"
              title="還原為指引標準預設計算值"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重設預設</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">熱量 (kcal)</label>
              <input
                type="number"
                value={targets.kcal || ''}
                onChange={(e) => handleTargetValueChange('kcal', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">蛋白質 (g)</label>
              <input
                type="number"
                step="0.1"
                value={targets.protein || ''}
                onChange={(e) => handleTargetValueChange('protein', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">脂肪 (g)</label>
              <input
                type="number"
                step="0.1"
                value={targets.lipid || ''}
                onChange={(e) => handleTargetValueChange('lipid', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">碳水 (g)</label>
              <input
                type="number"
                step="0.1"
                value={targets.cho || ''}
                onChange={(e) => handleTargetValueChange('cho', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">鈉 Na (mEq)</label>
              <input
                type="number"
                step="0.1"
                value={targets.na || ''}
                onChange={(e) => handleTargetValueChange('na', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">鉀 K (mEq)</label>
              <input
                type="number"
                step="0.1"
                value={targets.k || ''}
                onChange={(e) => handleTargetValueChange('k', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">磷 P (mmol)</label>
              <input
                type="number"
                step="0.1"
                value={targets.p || ''}
                onChange={(e) => handleTargetValueChange('p', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">鎂 Mg (mEq)</label>
              <input
                type="number"
                step="0.1"
                value={targets.mg || ''}
                onChange={(e) => handleTargetValueChange('mg', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">鈣 Ca (mEq)</label>
              <input
                type="number"
                step="0.1"
                value={targets.ca || ''}
                onChange={(e) => handleTargetValueChange('ca', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 truncate text-center">鋅 Zn (mg)</label>
              <input
                type="number"
                step="0.1"
                value={targets.zn || ''}
                onChange={(e) => handleTargetValueChange('zn', parseFloat(e.target.value))}
                className="w-full bg-white border border-teal-300 rounded p-1 text-center text-xs font-bold text-teal-800 tabular-nums focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
