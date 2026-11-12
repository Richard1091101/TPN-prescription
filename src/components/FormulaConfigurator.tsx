import React, { useEffect, useState } from 'react';
import {
  Copy,
  Plus,
  Trash2,
  Lightbulb,
  Check,
  Droplets,
  Settings2,
  ShieldAlert,
  ChevronDown,
  Columns,
  Eye,
  ArrowRight,
  Minus,
} from 'lucide-react';
import { RegimenConfig, NutrientValues, CalculatedRegimen } from '../types/tpn';
import { useTpnDatabase } from '../context/DatabaseContext';
import {
  calculateSuggestedIsoChoRate,
  evaluateCompoundingFeasibility,
} from '../utils/tpnCalculations';

interface FormulaConfiguratorProps {
  currentRegimen: RegimenConfig;
  proposedRegimen: RegimenConfig;
  currentCalculated: CalculatedRegimen;
  proposedCalculated: CalculatedRegimen;
  patientWeight: number;
  onCurrentChange: (regimen: RegimenConfig) => void;
  onProposedChange: (regimen: RegimenConfig) => void;
  onCopyCurrentToProposed: () => void;
}

export const FormulaConfigurator: React.FC<FormulaConfiguratorProps> = ({
  currentRegimen,
  proposedRegimen,
  currentCalculated,
  proposedCalculated,
  patientWeight,
  onCurrentChange,
  onProposedChange,
  onCopyCurrentToProposed,
}) => {
  const { mainFormulations, lipidEmulsions, traceElements, additives, compoundingRawSpecs } =
    useTpnDatabase();

  // Mobile column switcher: 'new' (default on mobile for fast tuning), 'curr', or 'both'
  const [mobileTab, setMobileTab] = useState<'new' | 'curr' | 'both'>('new');

  // Iso-carbohydrate rate recommendation
  const suggestedRate = calculateSuggestedIsoChoRate(
    currentCalculated.cho,
    proposedRegimen.mainId,
    proposedRegimen.isMainCustom,
    proposedRegimen.customMainPer1000.cho,
    { main: mainFormulations }
  );

  const applySuggestedRate = () => {
    if (suggestedRate && suggestedRate > 0) {
      const vol = Math.round(suggestedRate * 24);
      onProposedChange({
        ...proposedRegimen,
        mainRate: suggestedRate,
        mainVol: vol,
      });
    }
  };

  const renderRegimenColumn = (
    prefix: 'curr' | 'new',
    title: string,
    regimen: RegimenConfig,
    calculated: CalculatedRegimen,
    onChange: (updated: RegimenConfig) => void
  ) => {
    const isProposed = prefix === 'new';

    // Handler for Main Selection
    const handleMainSelect = (mainId: string) => {
      let defaultVol = 1000;
      if (mainId && mainFormulations[mainId]?.vialVol) {
        defaultVol = mainFormulations[mainId].vialVol!;
      }
      const defaultRate = Number((defaultVol / 24).toFixed(1));

      // Update concentration defaults
      const per1000: NutrientValues = {
        kcal: 0,
        protein: 0,
        lipid: 0,
        cho: 0,
        na: 0,
        k: 0,
        p: 0,
        ca: 0,
        mg: 0,
        zn: 0,
      };
      if (mainId && mainFormulations[mainId]) {
        const item = mainFormulations[mainId];
        const keys: (keyof NutrientValues)[] = [
          'kcal',
          'protein',
          'lipid',
          'cho',
          'na',
          'k',
          'p',
          'ca',
          'mg',
          'zn',
        ];
        keys.forEach((k) => {
          per1000[k] = Number(((item[k] || 0) * 1000).toFixed(1));
        });
      }

      onChange({
        ...regimen,
        mainId,
        mainVol: defaultVol,
        mainRate: defaultRate,
        customMainPer1000: per1000,
      });
    };

    // Flow rate <-> Volume sync
    const handleRateChange = (rateVal: number) => {
      const rate = isNaN(rateVal) ? 0 : Math.max(0, rateVal);
      const vol = Math.round(rate * 24);
      onChange({
        ...regimen,
        mainRate: rate,
        mainVol: vol,
      });
    };

    const handleVolChange = (volVal: number) => {
      const vol = isNaN(volVal) ? 0 : Math.max(0, volVal);
      const rate = Number((vol / 24).toFixed(1));
      onChange({
        ...regimen,
        mainVol: vol,
        mainRate: rate,
      });
    };

    const adjustRate = (delta: number) => {
      const currentRate = regimen.mainRate || 0;
      const nextRate = Math.max(0, Number((currentRate + delta).toFixed(1)));
      handleRateChange(nextRate);
    };

    // Custom main nutrient handlers
    const handleCustomToggle = (isCustom: boolean) => {
      onChange({
        ...regimen,
        isMainCustom: isCustom,
      });
    };

    const handleCustomNutrientChange = (key: keyof NutrientValues, val: number) => {
      const currentPer1000 = { ...regimen.customMainPer1000 };
      currentPer1000[key] = isNaN(val) ? 0 : val;

      if (key === 'protein' || key === 'lipid' || key === 'cho') {
        const p = key === 'protein' ? val : currentPer1000.protein;
        const l = key === 'lipid' ? val : currentPer1000.lipid;
        const c = key === 'cho' ? val : currentPer1000.cho;
        currentPer1000.kcal = Math.round(p * 4 + c * 3.4 + l * 9);
      }

      onChange({
        ...regimen,
        customMainPer1000: currentPer1000,
      });
    };

    // Sub lipid handlers
    const handleSubSelect = (subId: string) => {
      const vialVol = (subId && lipidEmulsions[subId]?.vialVol) || 0;
      const vials = regimen.subVials || (subId ? 1 : 0);
      onChange({
        ...regimen,
        subId,
        subVials: vials,
        subVol: vials * vialVol,
      });
    };

    const handleSubVialsChange = (vialsVal: number) => {
      const vials = isNaN(vialsVal) ? 0 : Math.max(0, vialsVal);
      const vialVol = (regimen.subId && lipidEmulsions[regimen.subId]?.vialVol) || 0;
      onChange({
        ...regimen,
        subVials: vials,
        subVol: vials * vialVol,
      });
    };

    // Trace elements handlers
    const handleTraceSelect = (traceId: string) => {
      const vials = regimen.traceVials || (traceId ? 1 : 0);
      const item = traceElements[traceId];
      const ratioText = item ? (item.shortName?.includes('Addamel') ? '10 ml/支' : '6.8 ml/L') : '';
      onChange({
        ...regimen,
        traceId,
        traceVials: vials,
        traceRatioText: ratioText,
      });
    };

    const handleTraceVialsChange = (vialsVal: number) => {
      const vials = isNaN(vialsVal) ? 0 : Math.max(0, vialsVal);
      const item = traceElements[regimen.traceId];
      const ratioText = item ? (item.shortName?.includes('Addamel') ? '10 ml/支' : '6.8 ml/L') : '';
      onChange({
        ...regimen,
        traceVials: vials,
        traceRatioText: ratioText,
      });
    };

    // Additive rows handlers
    const handleAddAddRow = () => {
      const defaultItem = Object.values(additives)[0];
      const newRow = {
        id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        addId: defaultItem?.id || 'nacl',
        vials: 1,
        vol: defaultItem?.vialVol || 20,
      };
      onChange({
        ...regimen,
        addRows: [...regimen.addRows, newRow],
      });
    };

    const handleUpdateAddRow = (rowId: string, addId: string, vialsVal: number) => {
      const vials = isNaN(vialsVal) ? 0 : Math.max(0, vialsVal);
      const updatedRows = regimen.addRows.map((row) => {
        if (row.id === rowId) {
          const item = addId ? additives[addId] : undefined;
          const vialVol = item?.vialVol || 0;
          return {
            ...row,
            addId,
            vials,
            vol: vials * vialVol,
          };
        }
        return row;
      });
      onChange({
        ...regimen,
        addRows: updatedRows,
      });
    };

    const handleRemoveAddRow = (rowId: string) => {
      onChange({
        ...regimen,
        addRows: regimen.addRows.filter((r) => r.id !== rowId),
      });
    };

    const compEval = evaluateCompoundingFeasibility(regimen, patientWeight, calculated, {
      main: mainFormulations,
      specs: compoundingRawSpecs,
    });

    return (
      <div
        className={`bg-white rounded-2xl border shadow-sm p-4 md:p-5 flex flex-col space-y-4 ${
          isProposed ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
        }`}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs text-white ${
                isProposed ? 'bg-teal-600' : 'bg-slate-600'
              }`}
            >
              {isProposed ? '3' : '2'}
            </span>
            <h3 className={`text-base font-bold ${isProposed ? 'text-teal-900' : 'text-slate-800'}`}>
              {title}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-medium">總液體量: </span>
            <span className="text-xs font-bold tabular-nums text-slate-900">
              {calculated.volume} ml/d
            </span>
          </div>
        </div>

        {/* 1. Main Formulation Section */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                主配方選擇 (含台大液 / 三合一 / 雙合一)
              </label>
              <select
                value={regimen.mainId}
                onChange={(e) => handleMainSelect(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg p-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
              >
                {Object.values(mainFormulations).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Stepper & Rate inputs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-1">
                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                    流速 (ml/hr)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustRate(-5)}
                      className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs"
                      title="減少 5 ml/hr"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.mainRate || ''}
                      onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                      placeholder="Rate"
                      className="w-20 min-h-[38px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 tabular-nums text-center focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => adjustRate(5)}
                      className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs"
                      title="增加 5 ml/hr"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <span className="pt-4 text-slate-400 font-bold px-1">➔</span>

                <div>
                  <label className="block text-[10px] text-slate-500 font-medium mb-0.5">
                    每日總量 (ml/d)
                  </label>
                  <input
                    type="number"
                    value={regimen.mainVol || ''}
                    onChange={(e) => handleVolChange(parseFloat(e.target.value))}
                    placeholder="Total"
                    className="w-24 min-h-[38px] bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-teal-800 tabular-nums text-center focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Volume */}
              <div className="flex items-center gap-1 sm:self-end pt-1">
                <span className="text-[10px] text-slate-400">快捷:</span>
                {[500, 1000, 1500, 2000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleVolChange(v)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                      regimen.mainVol === v
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Iso-Carbohydrate Suggested Rate Callout (Proposed Column Only) */}
          {isProposed && suggestedRate && suggestedRate > 0 && (
            <div className="p-2.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between gap-2 text-xs text-teal-900">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-teal-600 shrink-0" />
                <span>
                  建議等碳水起始流速：
                  <strong className="text-teal-950 underline font-mono ml-1">
                    {suggestedRate} ml/hr
                  </strong>
                  <span className="text-[11px] text-teal-700 ml-1">
                    (~{Math.round(suggestedRate * 24)} ml/d)
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={applySuggestedRate}
                className="px-2.5 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
              >
                套用流速
              </button>
            </div>
          )}

          {/* Custom Nutrient Fine-Tuning Switch */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => handleCustomToggle(!regimen.isMainCustom)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5 text-teal-600" />
              <span>自訂主配方營養素濃度 (每 1000ml)</span>
              <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                {regimen.isMainCustom ? '已啟用微調' : '使用仿單標準'}
              </span>
            </button>

            {/* Custom Nutrient Grid */}
            {regimen.isMainCustom && (
              <div className="mt-3 p-3 bg-white rounded-xl border border-teal-200 space-y-3">
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>設定每 1000ml 溶液所含成分 (隨總體積等比放大)：</span>
                  <span className="font-mono font-bold text-teal-800">
                    自動換算熱量: {regimen.customMainPer1000.kcal} kcal/L
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">蛋白質 (g)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.customMainPer1000.protein ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('protein', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">醣類 (g)</label>
                    <input
                      type="number"
                      step="1"
                      value={regimen.customMainPer1000.cho ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('cho', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">脂肪 (g)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.customMainPer1000.lipid ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('lipid', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">鈉 Na (mEq)</label>
                    <input
                      type="number"
                      step="1"
                      value={regimen.customMainPer1000.na ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('na', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">鉀 K (mEq)</label>
                    <input
                      type="number"
                      step="1"
                      value={regimen.customMainPer1000.k ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('k', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">磷 P (mmol)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.customMainPer1000.p ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('p', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">鈣 Ca (mEq)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.customMainPer1000.ca ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('ca', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600">鎂 Mg (mEq)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={regimen.customMainPer1000.mg ?? ''}
                      onChange={(e) =>
                        handleCustomNutrientChange('mg', parseFloat(e.target.value))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-bold tabular-nums text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compounding Live Evaluation Pill */}
          {compEval.barrierIssues.length > 0 ? (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 space-y-1">
              <div className="font-bold flex items-center gap-1 text-rose-900">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>{compEval.statusBadge.text}</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-rose-700">
                {compEval.barrierIssues.map((issue: string, i: number) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : compEval.warningNotes.length > 0 ? (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 flex items-center justify-between">
              <span className="font-medium">⚠️ 提醒：{compEval.warningNotes[0]}</span>
              <span className="font-mono text-slate-500">水餘裕: {compEval.waterVol}ml</span>
            </div>
          ) : (
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <Check className="w-3 h-3 text-emerald-600" />
                調配原料可行 (原料 {compEval.totalIngredientVol} ml)
              </span>
              <span className="font-mono text-slate-400">注水空間: {compEval.waterVol} ml/L</span>
            </div>
          )}
        </div>

        {/* 2. 20% Lipid Emulsion Section */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            外加 20% 脂肪乳劑 (Lipid Emulsion)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              value={regimen.subId}
              onChange={(e) => handleSubSelect(e.target.value)}
              className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
            >
              <option value="">-- 無外加脂肪乳劑 --</option>
              {Object.values(lipidEmulsions).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={regimen.subVials || ''}
                  onChange={(e) => handleSubVialsChange(parseFloat(e.target.value))}
                  placeholder="瓶數"
                  className="w-18 min-h-[44px] bg-white border border-slate-300 rounded-lg p-1.5 text-xs sm:text-sm font-bold text-teal-800 text-center tabular-nums"
                />
              </div>
              <span className="text-slate-400 text-xs">➔</span>
              <div>
                <input
                  type="text"
                  readOnly
                  value={regimen.subVol > 0 ? `${regimen.subVol} ml` : '--'}
                  placeholder="總體積"
                  className="w-20 min-h-[44px] bg-teal-50 border border-teal-200 rounded-lg p-1.5 text-xs sm:text-sm font-bold text-teal-900 text-center tabular-nums"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Trace Elements Section */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            微量元素補充 (Trace Elements)
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <select
              value={regimen.traceId}
              onChange={(e) => handleTraceSelect(e.target.value)}
              className="flex-1 min-h-[44px] bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
            >
              <option value="">-- 無微量元素 --</option>
              {Object.values(traceElements).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={regimen.traceVials || ''}
                  onChange={(e) => handleTraceVialsChange(parseFloat(e.target.value))}
                  placeholder="支數"
                  className="w-18 min-h-[44px] bg-white border border-slate-300 rounded-lg p-1.5 text-xs sm:text-sm font-bold text-teal-800 text-center tabular-nums"
                />
              </div>
              <span className="text-slate-400 text-xs">➔</span>
              <div>
                <input
                  type="text"
                  readOnly
                  value={regimen.traceRatioText || (regimen.traceId ? '常規劑量' : '--')}
                  className="w-24 min-h-[44px] bg-slate-100 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 text-center truncate"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Additives & Electrolyte Section */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-slate-800">
                電解質與單方添加劑 (Additives)
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddAddRow}
              className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增單方</span>
            </button>
          </div>

          {regimen.addRows.length === 0 ? (
            <div className="text-center py-3 text-xs text-slate-400 border border-dashed border-amber-200 rounded-lg">
              無外加電解質單方（點擊右上角「新增單方」可微調 NaCl, KCl, 磷酸鹽, 鈣, 鎂, 鋅, MVI等）
            </div>
          ) : (
            <div className="space-y-2">
              {regimen.addRows.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs"
                >
                  <div className="flex-1">
                    <select
                      value={row.addId}
                      onChange={(e) => handleUpdateAddRow(row.id, e.target.value, row.vials)}
                      className="w-full min-h-[40px] bg-slate-50 border border-slate-300 rounded p-1.5 text-xs font-medium text-slate-800"
                    >
                      {Object.values(additives).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={row.vials || ''}
                        onChange={(e) =>
                          handleUpdateAddRow(row.id, row.addId, parseFloat(e.target.value) || 0)
                        }
                        placeholder="數量"
                        className="w-16 min-h-[40px] bg-slate-50 border border-slate-300 rounded p-1 text-xs sm:text-sm font-bold text-amber-800 text-center tabular-nums"
                      />
                    </div>
                    <span className="text-slate-400 text-xs">➔</span>
                    <div>
                      <input
                        type="text"
                        readOnly
                        value={row.vol > 0 ? `${row.vol} ml` : '--'}
                        placeholder="ml"
                        className="w-18 min-h-[40px] bg-amber-100/50 border border-amber-200 rounded p-1 text-xs font-bold text-amber-900 text-center tabular-nums"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddRow(row.id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title="移除此項單方"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="section-formula" className="space-y-4">
      {/* Title & Copy Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
            營養配方對照與微調
            <span className="text-xs font-normal text-slate-500 hidden sm:inline">
              (Dual Regimen Configurator)
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            左側設定「目前處方」，右側擬定「新配方調整」，提供一鍵複製與等碳水換算
          </p>
        </div>

        <button
          type="button"
          onClick={onCopyCurrentToProposed}
          className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer min-h-[44px]"
        >
          <Copy className="w-4 h-4 text-teal-600" />
          <span>複製「目前配方」至新處方 ➔</span>
        </button>
      </div>

      {/* Mobile Column View Switcher (lg:hidden) */}
      <div className="lg:hidden flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-2xs gap-1">
        <span className="text-[11px] font-bold text-slate-500 pl-2">檢視分頁：</span>
        <div className="grid grid-cols-3 gap-1 flex-1">
          <button
            type="button"
            onClick={() => setMobileTab('new')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center min-h-[40px] ${
              mobileTab === 'new'
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            建議新處方 (調整)
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('curr')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center min-h-[40px] ${
              mobileTab === 'curr'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            目前處方
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('both')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition-all text-center min-h-[40px] ${
              mobileTab === 'both'
                ? 'bg-teal-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            並排展開
          </button>
        </div>
      </div>

      {/* Two-Column Regimen Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Regimen Column */}
        <div className={`${mobileTab === 'new' ? 'hidden lg:block' : 'block'}`}>
          {renderRegimenColumn(
            'curr',
            '目前處方 (Current Regimen)',
            currentRegimen,
            currentCalculated,
            onCurrentChange
          )}
        </div>

        {/* Proposed Regimen Column */}
        <div className={`${mobileTab === 'curr' ? 'hidden lg:block' : 'block'}`}>
          {renderRegimenColumn(
            'new',
            '新處方調整 (Proposed Regimen)',
            proposedRegimen,
            proposedCalculated,
            onProposedChange
          )}
        </div>
      </div>
    </section>
  );
};
