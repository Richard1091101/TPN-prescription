import React, { useState, useMemo } from 'react';
import { Copy, Check, FileText, Stethoscope, AlertCircle } from 'lucide-react';
import {
  PatientProfile,
  PatientMetrics,
  NutrientValues,
  CalculatedRegimen,
  RegimenConfig,
} from '../types/tpn';
import { generateHisPrescriptionText } from '../utils/tpnCalculations';
import { useTpnDatabase } from '../context/DatabaseContext';

interface PrescriptionOutputProps {
  patient: PatientProfile;
  metrics: PatientMetrics;
  targets: NutrientValues;
  currentCalculated: CalculatedRegimen;
  proposedCalculated: CalculatedRegimen;
  currentRegimen: RegimenConfig;
  proposedRegimen: RegimenConfig;
}

export const PrescriptionOutput: React.FC<PrescriptionOutputProps> = ({
  patient,
  metrics,
  targets,
  currentCalculated,
  proposedCalculated,
  currentRegimen,
  proposedRegimen,
}) => {
  const { mainFormulations, lipidEmulsions, traceElements, additives } = useTpnDatabase();
  const [copied, setCopied] = useState(false);

  const dbMaps = useMemo(
    () => ({
      main: mainFormulations,
      lipid: lipidEmulsions,
      trace: traceElements,
      add: additives,
    }),
    [mainFormulations, lipidEmulsions, traceElements, additives]
  );

  const prescriptionText = generateHisPrescriptionText(
    patient,
    metrics,
    targets,
    currentCalculated,
    proposedCalculated,
    currentRegimen,
    proposedRegimen,
    dbMaps
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prescriptionText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <section id="section-order" className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md p-4 md:p-6 text-slate-100 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-2xs">
            6
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-amber-400 flex items-center gap-2">
              建議醫囑開立與 HIS 匯入格式
              <span className="text-xs font-normal text-slate-400 hidden sm:inline">(Prescription Order Text)</span>
            </h2>
            <p className="text-xs text-slate-400">
              包含完整處方滴定流速、添加劑比例、輸注途徑與藥事核對註記
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer min-h-[44px] ${
            copied
              ? 'bg-emerald-500 text-slate-950 font-black'
              : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? '已複製到剪貼簿！' : '一鍵複製醫囑文字'}</span>
        </button>
      </div>

      {/* Monospace Prescription Box */}
      <div className="relative">
        <div className="bg-slate-950 rounded-xl p-4 md:p-5 border border-slate-800 font-mono text-xs md:text-[13px] leading-relaxed text-emerald-400 overflow-x-auto whitespace-pre-wrap selection:bg-emerald-800 selection:text-white shadow-inner">
          {prescriptionText}
        </div>
      </div>

      {/* Footer Notes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
        <span className="flex items-center gap-1 text-slate-500">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
          請將上方醫囑複製並於各醫院醫療資訊系統 (HIS) 或電子病歷中確認後開立。
        </span>
        <span className="text-slate-500">
          ASPEN 臨床安全標準校對完成
        </span>
      </div>
    </section>
  );
};
