import React from 'react';
import { Activity, BookOpen, Printer, Database, Download, Globe } from 'lucide-react';
import { useTpnDatabase } from '../context/DatabaseContext';

interface HeaderProps {
  onOpenPresets: () => void;
  onOpenDatabase: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPresets,
  onOpenDatabase,
  onPrint,
}) => {
  const { isCustomized } = useTpnDatabase();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-8">
        
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs font-bold text-xs">
            TPN
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                TPN Clinical Studio
              </span>
              {isCustomized && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 hidden sm:inline">
                  自訂庫
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-500 font-medium hidden sm:block">
              臨床全靜脈營養處方調整與分析系統
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation anchor links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-xs font-semibold text-slate-600">
          <a href="#section-patient" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0">
            1. 需求評估
          </a>
          <a href="#section-formula" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0">
            2. 配方微調
          </a>
          <a href="#section-analysis" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0">
            3. 差距分析
          </a>
          <a href="#section-compounding" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 text-teal-800 font-bold">
            4. 原料調配模擬
          </a>
          <a href="#section-safety" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0">
            5. 安全防線
          </a>
          <a href="#section-order" className="hover:text-teal-700 transition-colors whitespace-nowrap shrink-0">
            6. 醫囑開立
          </a>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Standalone HTML Action Links */}
          <a
            href="/tpn_app.html"
            download="TPN_Clinical_Prescription_Studio.html"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap shadow-2xs"
            title="下載純 HTML 單一檔案獨立執行版 (可於任何院內電腦或手機離線直接雙擊瀏覽器開啟執行，不需 Node.js 伺服器)"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">下載 HTML 獨立執行檔</span>
            <span className="sm:hidden">下載 HTML</span>
          </a>

          <a
            href="/tpn_app.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden xl:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shadow-2xs"
            title="在瀏覽器新分頁中直接執行純 HTML 版"
          >
            <Globe className="w-3.5 h-3.5 text-teal-600" />
            <span>開啟純 HTML 執行頁</span>
          </a>

          {/* Database Manager Button */}
          <button
            type="button"
            onClick={onOpenDatabase}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap shadow-2xs"
            title="藥品資料庫管理：匯入、匯出更新配方清單 (支援 CSV 格式)"
          >
            <Database className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">藥庫 CSV</span>
            <span className="sm:hidden">藥庫</span>
          </button>

          {/* Presets Button */}
          <button
            type="button"
            onClick={onOpenPresets}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shadow-2xs"
            title="查看或套用臨床預設案例"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">案例</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shadow-2xs"
            title="列印處方報告或匯出為 PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">列印</span>
          </button>
        </div>
      </div>
    </header>
  );
};
