import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PieChart,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight,
} from 'lucide-react';
import { GapRowData, CalculatedRegimen, NutrientValues } from '../types/tpn';
import { useTpnDatabase } from '../context/DatabaseContext';

interface GapAnalysisTableProps {
  rows: GapRowData[];
  currentCalculated: CalculatedRegimen;
  proposedCalculated: CalculatedRegimen;
  targets: NutrientValues;
  currentMainId: string;
  proposedMainId: string;
}

export const GapAnalysisTable: React.FC<GapAnalysisTableProps> = ({
  rows,
  currentCalculated,
  proposedCalculated,
  targets,
  currentMainId,
  proposedMainId,
}) => {
  const { mainFormulations } = useTpnDatabase();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const currentMainName = mainFormulations[currentMainId]?.shortName || '未選擇主配方';
  const proposedMainName = mainFormulations[proposedMainId]?.shortName || '未選擇新配方';

  const renderStatusBadge = (diff: number, threshold: number, perL: number | null, unit: string) => {
    let colorClass = 'text-slate-700 bg-slate-50';
    let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    let text = '達標';

    if (diff < -threshold) {
      colorClass = 'text-rose-700 bg-rose-50/70 border border-rose-200/80';
      icon = <TrendingDown className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      text = '不足';
    } else if (diff > threshold) {
      colorClass = 'text-blue-700 bg-blue-50/70 border border-blue-200/80';
      icon = <TrendingUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
      text = '過量';
    } else {
      colorClass = 'text-emerald-800 bg-emerald-50/80 border border-emerald-200/80';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
      text = '達標';
    }

    const sign = diff > 0 ? '+' : '';
    const perLText = perL !== null ? `(${sign}${perL.toFixed(1)} ${unit}/L)` : '';

    return (
      <div className={`p-1.5 rounded-md ${colorClass} text-center`}>
        <div className="flex items-center justify-center gap-1 font-bold tabular-nums text-xs">
          {icon}
          <span>
            {sign}
            {diff.toFixed(1)}
          </span>
        </div>
        {perLText && (
          <div className="text-[10px] text-slate-500 font-normal tracking-tight mt-0.5">
            {perLText}
          </div>
        )}
      </div>
    );
  };

  const renderChangeBadge = (diffChange: number, decimals: number) => {
    if (Math.abs(diffChange) < 0.001) {
      return <span className="text-slate-400 font-medium text-xs text-center block">-</span>;
    }
    const isIncrease = diffChange > 0;
    const sign = isIncrease ? '+' : '';
    return (
      <div
        className={`px-2 py-1 rounded text-center font-bold tabular-nums text-xs flex items-center justify-center gap-1 ${
          isIncrease ? 'text-blue-700 bg-blue-50' : 'text-rose-700 bg-rose-50'
        }`}
      >
        {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>
          {sign}
          {diffChange.toFixed(decimals)}
        </span>
      </div>
    );
  };

  // Fluid difference
  const volDiff = proposedCalculated.volume - currentCalculated.volume;

  return (
    <section id="section-analysis" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
            3
          </div>
          <div>
            <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
              目前 vs 建議處方 差距分析總表
              <span className="text-xs font-normal text-slate-500 hidden sm:inline">(Gap & Balance Analysis)</span>
            </h2>
            <p className="text-xs text-slate-500">
              對照目標需求量、舊處方供給、新處方供給與增減落差
            </p>
          </div>
        </div>

        {/* View Mode Toggle (Card vs Table for mobile) */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'cards'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>卡片檢視 (手機友善)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-teal-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>完整對照表</span>
          </button>
        </div>
      </div>

      {/* CARD VIEW (Great for mobile screens) */}
      {viewMode === 'cards' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rows.map((row) => {
              const currentPercent = row.target > 0 ? Math.round((row.current / row.target) * 100) : 0;
              const proposedPercent = row.target > 0 ? Math.round((row.proposed / row.target) * 100) : 0;

              return (
                <div
                  key={row.key}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all shadow-2xs space-y-2.5"
                >
                  {/* Card Title & Target */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {row.label}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">({row.unit})</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">目標需求</span>
                      <span className="text-xs font-bold text-teal-800 tabular-nums">
                        {row.target.toFixed(row.decimals)} {row.unit}
                      </span>
                    </div>
                  </div>

                  {/* Current vs Proposed Comparison Box */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                    {/* Current */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-medium block truncate">
                        目前 ({currentMainName})
                      </span>
                      <div className="font-bold text-slate-800 tabular-nums">
                        {row.current.toFixed(row.decimals)} {row.unit}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        達成: {currentPercent}%
                      </div>
                    </div>

                    {/* Proposed */}
                    <div className="space-y-0.5 border-l border-slate-200 pl-2">
                      <span className="text-[10px] text-teal-700 font-bold block truncate">
                        建議 ({proposedMainName})
                      </span>
                      <div className="font-bold text-teal-950 tabular-nums">
                        {row.proposed.toFixed(row.decimals)} {row.unit}
                      </div>
                      <div className="text-[10px] font-bold text-teal-700">
                        達成: {proposedPercent}%
                      </div>
                    </div>
                  </div>

                  {/* Net Change & Gap Badges */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">變更:</span>
                      {renderChangeBadge(row.netChange, row.decimals)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">落差:</span>
                      {renderStatusBadge(row.proposedGap, row.threshold, row.proposedPerL, row.unit)}
                    </div>
                  </div>

                  {/* Visual Bar of Proposed Target % */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, proposedPercent)}%` }}
                      className={`h-full ${
                        proposedPercent > 120
                          ? 'bg-blue-600'
                          : proposedPercent < 80
                          ? 'bg-rose-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Metrics on Cards View */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">總液體量變更</span>
              <strong className="text-xs font-bold text-slate-800 tabular-nums">
                {proposedCalculated.volume} ml ({volDiff >= 0 ? `+${volDiff}` : volDiff} ml)
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">新處方 GIR</span>
              <strong
                className={`text-xs font-bold tabular-nums ${
                  proposedCalculated.gir > 5 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {proposedCalculated.gir.toFixed(2)} mg/kg/min
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">非蛋白熱量氮比 (NPC:N)</span>
              <strong className="text-xs font-bold text-slate-800 tabular-nums">
                {proposedCalculated.npcToNRatio}:1
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 block font-medium">預估滲透壓</span>
              <strong
                className={`text-xs font-bold tabular-nums ${
                  proposedCalculated.estimatedOsmolarity > 900 ? 'text-rose-600' : 'text-teal-700'
                }`}
              >
                {proposedCalculated.estimatedOsmolarity} mOsm/L
              </strong>
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW (with sticky left column for mobile horizontal scroll) */
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-[11px] tracking-wider uppercase">
                <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-900 shadow-xs">
                  營養素項目
                </th>
                <th className="py-2.5 px-3 text-center bg-teal-900 text-teal-100">
                  目標需求 (Target)
                </th>
                <th className="py-2.5 px-3 border-l border-slate-800 text-slate-200">
                  目前處方提供
                  <span className="text-[10px] text-slate-400 font-normal block tracking-normal normal-case truncate max-w-[140px]">
                    {currentMainName}
                  </span>
                </th>
                <th className="py-2.5 px-3 text-center text-slate-300">目前落差</th>
                <th className="py-2.5 px-3 border-l border-slate-800 bg-teal-950 text-teal-100">
                  新處方提供
                  <span className="text-[10px] text-teal-200/70 font-normal block tracking-normal normal-case truncate max-w-[140px]">
                    {proposedMainName}
                  </span>
                </th>
                <th className="py-2.5 px-3 text-center text-teal-200 bg-teal-950/40">新處方落差</th>
                <th className="py-2.5 px-3 border-l border-slate-800 text-amber-300 bg-slate-800/90 text-center">
                  新舊變更 (Δ)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-800 text-xs sticky left-0 z-10 bg-white shadow-xs">
                    {row.label}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">({row.unit})</span>
                  </td>
                  
                  {/* Target */}
                  <td className="py-2.5 px-3 font-bold text-center bg-teal-50/50 text-teal-900 border-l border-slate-100 tabular-nums">
                    {row.target.toFixed(row.decimals)}
                  </td>

                  {/* Current Provide */}
                  <td className="py-2.5 px-3 font-semibold text-slate-700 border-l border-slate-100 tabular-nums">
                    {row.current.toFixed(row.decimals)}
                  </td>

                  {/* Current Gap */}
                  <td className="py-1 px-2">
                    {renderStatusBadge(row.currentGap, row.threshold, row.currentPerL, row.unit)}
                  </td>

                  {/* Proposed Provide */}
                  <td className="py-2.5 px-3 font-bold text-teal-950 bg-teal-50/30 border-l border-slate-100 tabular-nums">
                    {row.proposed.toFixed(row.decimals)}
                  </td>

                  {/* Proposed Gap */}
                  <td className="py-1 px-2 bg-teal-50/30">
                    {renderStatusBadge(row.proposedGap, row.threshold, row.proposedPerL, row.unit)}
                  </td>

                  {/* Net Change */}
                  <td className="py-1.5 px-2 border-l border-slate-200 bg-slate-50/50">
                    {renderChangeBadge(row.netChange, row.decimals)}
                  </td>
                </tr>
              ))}

              {/* GIR Row */}
              <tr className="bg-slate-50/60 font-semibold border-t-2 border-slate-200">
                <td className="py-2.5 px-3 font-bold text-slate-800 text-xs sticky left-0 z-10 bg-slate-50 shadow-xs flex items-center gap-1.5">
                  <span>葡萄糖輸注速率 (GIR)</span>
                  <span className="text-[10px] text-slate-400 font-normal">(mg/kg/min)</span>
                </td>
                <td className="py-2.5 px-3 font-bold text-center bg-teal-50/50 text-teal-900 border-l border-slate-100">
                  &le; 4.0 - 5.0
                </td>
                <td className="py-2.5 px-3 border-l border-slate-100 tabular-nums">
                  {currentCalculated.gir.toFixed(2)}
                </td>
                <td className="py-1 px-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                      currentCalculated.gir > 5.0
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {currentCalculated.gir > 5.0 ? '⚠️ 超標' : '✓ 正常'}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-bold text-teal-950 bg-teal-50/30 border-l border-slate-100 tabular-nums">
                  {proposedCalculated.gir.toFixed(2)}
                </td>
                <td className="py-1 px-2 text-center bg-teal-50/30">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums ${
                      proposedCalculated.gir > 5.0
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {proposedCalculated.gir > 5.0 ? '⚠️ 超標 (>5.0)' : '✓ 正常'}
                  </span>
                </td>
                <td className="py-1.5 px-2 border-l border-slate-200 bg-slate-50/50">
                  {renderChangeBadge(proposedCalculated.gir - currentCalculated.gir, 2)}
                </td>
              </tr>

              {/* Total Fluid Volume Row */}
              <tr className="bg-slate-100/80 font-bold border-t border-slate-300">
                <td className="py-2.5 px-3 text-slate-900 text-xs sticky left-0 z-10 bg-slate-100 shadow-xs">
                  每日總液體量 (Total Fluid Volume)
                  <span className="text-[10px] text-slate-500 font-normal block">
                    (主配方 + 脂肪乳劑 + 微量元素 + 單方)
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center bg-teal-50/50 text-teal-900 border-l border-slate-100 tabular-nums">
                  --
                </td>
                <td className="py-2.5 px-3 border-l border-slate-100 tabular-nums">
                  {Math.round(currentCalculated.volume)} ml
                </td>
                <td className="py-2.5 px-3 text-center text-slate-400">--</td>
                <td className="py-2.5 px-3 font-bold text-teal-950 bg-teal-50/30 border-l border-slate-100 tabular-nums">
                  {Math.round(proposedCalculated.volume)} ml
                </td>
                <td className="py-2.5 px-3 text-center bg-teal-50/30 text-teal-800">
                  {volDiff > 0 ? `+${volDiff} ml` : `${volDiff} ml`}
                </td>
                <td className="py-2.5 px-2 text-center border-l border-slate-200 bg-slate-50/50">
                  {renderChangeBadge(volDiff, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Notes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            達標 (落差在臨床容許臨界值內)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            不足 (需外加單方或提高流速)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            過量 (注意電解質代謝蓄積)
          </span>
        </div>
        <div className="text-slate-400 font-mono text-[10px]">
          ※ 括號標記為每 1000ml (1L) 處方溶液中所含落差量
        </div>
      </div>
    </section>
  );
};
