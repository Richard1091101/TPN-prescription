import React, { useState, useRef, useMemo } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileJson,
  Layers,
  Info,
  ShieldCheck,
  Check,
  Copy,
  Table,
} from 'lucide-react';
import { useTpnDatabase } from '../context/DatabaseContext';
import { FormulationItem, DatabaseValidationSummary } from '../types/tpn';
import { parseCsvToDatabase } from '../utils/tpnCsvConverter';

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'import' | 'export' | 'browse' | 'reset';

export const DatabaseManagerModal: React.FC<DatabaseManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    mainFormulations,
    lipidEmulsions,
    traceElements,
    additives,
    isCustomized,
    lastUpdated,
    exportDatabase,
    exportDatabaseAsCsv,
    downloadCsvTemplate,
    validateDatabase,
    importDatabase,
    importFromCsv,
    resetToDefaults,
  } = useTpnDatabase();

  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'csv' | 'json' | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [validationResult, setValidationResult] = useState<DatabaseValidationSummary | null>(null);
  const [previewRows, setPreviewRows] = useState<FormulationItem[]>([]);
  const [importNotice, setImportNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [copiedJson, setCopiedJson] = useState(false);

  // Catalog Browser State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'main' | 'sub' | 'trace' | 'add'>('all');

  // Counts
  const mainCount = Object.keys(mainFormulations).filter((k) => k !== '').length;
  const lipidCount = Object.keys(lipidEmulsions).length;
  const traceCount = Object.keys(traceElements).length;
  const addCount = Object.keys(additives).length;
  const totalItemsCount = mainCount + lipidCount + traceCount + addCount;

  // Handle file selection (CSV or JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportNotice(null);
    setPreviewRows([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
    setFileType(isCsv ? 'csv' : 'json');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (isCsv) {
        setRawCsvText(text);
        const res = parseCsvToDatabase(text);
        setValidationResult({
          isValid: res.isValid,
          errors: res.errors,
          warnings: res.warnings,
          stats: res.stats,
        });
        setParsedData(res.parsedPackage);

        // Build preview items
        const allItems = [
          ...Object.values(res.parsedPackage.mainFormulations),
          ...Object.values(res.parsedPackage.lipidEmulsions),
          ...Object.values(res.parsedPackage.traceElements),
          ...Object.values(res.parsedPackage.additives),
        ];
        setPreviewRows(allItems.slice(0, 10)); // preview first 10
      } else {
        try {
          const json = JSON.parse(text);
          setParsedData(json);
          const val = validateDatabase(json);
          setValidationResult(val);

          const allItems = [
            ...Object.values(json.mainFormulations || {}),
            ...Object.values(json.lipidEmulsions || {}),
            ...Object.values(json.traceElements || {}),
            ...Object.values(json.additives || {}),
          ] as FormulationItem[];
          setPreviewRows(allItems.slice(0, 10));
        } catch (err: any) {
          setParsedData(null);
          setValidationResult({
            isValid: false,
            errors: [`檔案解析失敗：${err.message || '非合法 JSON 格式'}`],
            warnings: [],
            stats: { mainCount: 0, lipidCount: 0, traceCount: 0, additiveCount: 0 },
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Perform import
  const handleExecuteImport = () => {
    if (!parsedData || !validationResult?.isValid) return;

    let res;
    if (fileType === 'csv') {
      res = importFromCsv(rawCsvText, importMode);
    } else {
      res = importDatabase(parsedData, importMode);
    }

    if (res.success) {
      setImportNotice({ type: 'success', text: res.message });
      setSelectedFile(null);
      setParsedData(null);
      setRawCsvText('');
      setValidationResult(null);
      setPreviewRows([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setImportNotice({ type: 'error', text: res.message });
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    const pkg = {
      version: '2.1.0',
      systemName: 'TPN Clinical Studio',
      exportedAt: new Date().toISOString(),
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
    };
    navigator.clipboard.writeText(JSON.stringify(pkg, null, 2)).then(() => {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    });
  };

  // Catalog items list
  const catalogList = useMemo(() => {
    const list: Array<FormulationItem & { categoryLabel: string }> = [];

    if (filterCategory === 'all' || filterCategory === 'main') {
      Object.values(mainFormulations).forEach((item) => {
        if (item.id) list.push({ ...item, categoryLabel: '主配方 (Main)' });
      });
    }
    if (filterCategory === 'all' || filterCategory === 'sub') {
      Object.values(lipidEmulsions).forEach((item) => {
        list.push({ ...item, categoryLabel: '脂肪乳劑 (Lipid)' });
      });
    }
    if (filterCategory === 'all' || filterCategory === 'trace') {
      Object.values(traceElements).forEach((item) => {
        list.push({ ...item, categoryLabel: '微量元素 (Trace)' });
      });
    }
    if (filterCategory === 'all' || filterCategory === 'add') {
      Object.values(additives).forEach((item) => {
        list.push({ ...item, categoryLabel: '電解質/單方 (Add)' });
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.shortName && item.shortName.toLowerCase().includes(q)) ||
        item.id.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  }, [mainFormulations, lipidEmulsions, traceElements, additives, filterCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  藥品資料庫管理 (CSV 試算表 / JSON 格式)
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCustomized
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {isCustomized ? '自訂更新版 (Customized)' : '標準內建版 (Standard)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                支援 Microsoft Excel / Google 試算表直接編輯之 CSV 檔匯入與匯出，方便藥劑科全院配方維護
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Ribbon */}
        <div className="bg-teal-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-300" />
              <span>目前資料庫：</span>
              <strong className="text-teal-200">{totalItemsCount} 項藥品</strong>
            </span>
            <span className="hidden md:inline text-teal-300/60">|</span>
            <span className="hidden md:inline text-teal-100 text-[11px]">
              主配方: {mainCount} ｜ 脂肪乳劑: {lipidCount} ｜ 微量元素: {traceCount} ｜ 單方添加劑: {addCount}
            </span>
          </div>
          <div className="text-[11px] text-teal-200/90 font-mono">
            更新戳記: {lastUpdated.slice(0, 19).replace('T', ' ')}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-3 sm:px-5 gap-1 sm:gap-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'import'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>匯入更新 (CSV / JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'export'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>匯出備份 (CSV / JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browse')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'browse'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>瀏覽資料庫品項 ({totalItemsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reset')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'reset'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>還原預設</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Notification Alert if any */}
          {importNotice && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                importNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {importNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-medium">{importNotice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    上傳藥品資料庫更新檔 (推薦 .csv 檔，亦支援 .json)
                  </h3>
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-300 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors self-start sm:self-auto cursor-pointer"
                    title="下載標準 CSV 格式範本，可用 Excel 編輯填寫"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>下載標準 CSV 格式範本</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  您可以在 <strong>Excel 或 Google 試算表</strong> 中依照範本格式編輯全院藥品規格（數值以每 1000ml 熱量、蛋白質、醣類、電解質填寫），儲存為 CSV 後上傳。系統會自動驗證、即時轉換並套用於處方微調與調配分析。
                </p>

                {/* File picker */}
                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv,.json,application/json"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                  />
                  <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    支援 UTF-8 編碼之 CSV 與 JSON 檔案。
                  </div>
                </div>
              </div>

              {/* Validation & Preview Card */}
              {validationResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    validationResult.isValid
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-rose-50/70 border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-slate-900">
                      {validationResult.isValid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            {fileType === 'csv' ? 'CSV 試算表' : 'JSON 檔案'} 驗證通過，可執行更新
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>檔案格式有誤</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {selectedFile?.name} ({(selectedFile?.size ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="block text-[10px] text-slate-500">主配方 (Main)</span>
                      <strong className="text-xs sm:text-sm font-bold text-teal-800">
                        {validationResult.stats.mainCount} 項
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="block text-[10px] text-slate-500">脂肪乳劑 (Lipids)</span>
                      <strong className="text-xs sm:text-sm font-bold text-teal-800">
                        {validationResult.stats.lipidCount} 項
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="block text-[10px] text-slate-500">微量元素 (Trace)</span>
                      <strong className="text-xs sm:text-sm font-bold text-teal-800">
                        {validationResult.stats.traceCount} 項
                      </strong>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="block text-[10px] text-slate-500">單方添加劑 (Add)</span>
                      <strong className="text-xs sm:text-sm font-bold text-teal-800">
                        {validationResult.stats.additiveCount} 項
                      </strong>
                    </div>
                  </div>

                  {/* Preview Items Table */}
                  {previewRows.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Table className="w-3.5 h-3.5 text-teal-600" />
                        待匯入藥品項目預覽 (前 {previewRows.length} 筆)：
                      </span>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-40 bg-white">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-100 text-slate-700 sticky top-0">
                            <tr>
                              <th className="p-1.5 font-bold">類別</th>
                              <th className="p-1.5 font-bold">藥品名稱</th>
                              <th className="p-1.5 font-bold">容量</th>
                              <th className="p-1.5 font-bold">熱量/L</th>
                              <th className="p-1.5 font-bold">蛋白/L</th>
                              <th className="p-1.5 font-bold">醣類/L</th>
                              <th className="p-1.5 font-bold">Na/L</th>
                              <th className="p-1.5 font-bold">K/L</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewRows.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-1.5 font-mono text-[10px] text-slate-500">{item.category}</td>
                                <td className="p-1.5 font-medium text-slate-900">{item.name}</td>
                                <td className="p-1.5 tabular-nums text-slate-600">{item.vialVol}ml</td>
                                <td className="p-1.5 tabular-nums font-bold text-teal-800">
                                  {(item.kcal * 1000).toFixed(0)}
                                </td>
                                <td className="p-1.5 tabular-nums">{(item.protein * 1000).toFixed(1)}g</td>
                                <td className="p-1.5 tabular-nums">{(item.cho * 1000).toFixed(1)}g</td>
                                <td className="p-1.5 tabular-nums">{(item.na * 1000).toFixed(1)}</td>
                                <td className="p-1.5 tabular-nums">{(item.k * 1000).toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Error / Warning notes */}
                  {validationResult.errors.length > 0 && (
                    <ul className="text-xs text-rose-700 list-disc pl-5 space-y-1">
                      {validationResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <ul className="text-xs text-amber-700 list-disc pl-5 space-y-0.5">
                      {validationResult.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  )}

                  {/* Mode options */}
                  {validationResult.isValid && (
                    <div className="pt-2 border-t border-emerald-200/80 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        更新策略選擇 (Import Strategy):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <label
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${
                            importMode === 'merge'
                              ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'merge'}
                            onChange={() => setImportMode('merge')}
                            className="mt-0.5 text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <span className="block font-bold">增量合併 (Merge) [推薦]</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              保留未變更之既有配方，僅新增檔案中的新品項或更新相同 ID 藥品數值。
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 ${
                            importMode === 'overwrite'
                              ? 'bg-rose-50 border-rose-500 text-rose-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="importMode"
                            checked={importMode === 'overwrite'}
                            onChange={() => setImportMode('overwrite')}
                            className="mt-0.5 text-rose-600 focus:ring-rose-500"
                          />
                          <div>
                            <span className="block font-bold">完全覆蓋 (Overwrite)</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              以匯入檔案完全取代所有配方項目（未在檔案內的配方將被清除）。
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleExecuteImport}
                          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                        >
                          <Upload className="w-4 h-4" />
                          <span>確認匯入並更新資料庫 ({fileType === 'csv' ? 'CSV 試算表' : 'JSON'})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-teal-600" />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                    匯出目前藥品資料庫 (CSV 試算表 / JSON 格式)
                  </h3>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  匯出的 <strong>CSV 試算表檔</strong> 內建 UTF-8 BOM，可直接使用 <strong>Microsoft Excel 或 Google Sheets</strong> 開啟並完整顯示繁體中文，數值均換算為每 1000ml 標準含量，方便科內藥師共同編輯與審核。
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500">主配方</span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-800">{mainCount} 項</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500">脂肪乳劑</span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-800">{lipidCount} 項</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500">微量元素</span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-800">{traceCount} 項</strong>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="block text-[10px] text-slate-500">添加劑</span>
                    <strong className="text-xs sm:text-sm font-bold text-slate-800">{addCount} 項</strong>
                  </div>
                </div>

                {/* Export Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  {/* CSV Export Button (Prominent) */}
                  <button
                    type="button"
                    onClick={exportDatabaseAsCsv}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-teal-200" />
                    <span>下載 CSV 試算表檔案 (.csv) [適合 Excel]</span>
                  </button>

                  {/* CSV Template Download */}
                  <button
                    type="button"
                    onClick={downloadCsvTemplate}
                    className="px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>下載空白 CSV 範本</span>
                  </button>

                  {/* JSON Export */}
                  <button
                    type="button"
                    onClick={exportDatabase}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <FileJson className="w-3.5 h-3.5 text-slate-500" />
                    <span>下載完整 JSON (.json)</span>
                  </button>

                  {/* Copy JSON */}
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 font-medium rounded-xl text-xs border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">已複製！</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>複製 JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BROWSE CATALOG */}
          {activeTab === 'browse' && (
            <div className="space-y-3">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋藥品名稱、ID、或成分描述..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-teal-500 outline-none"
                  />
                </div>

                <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                  {(
                    [
                      { id: 'all', label: '全部' },
                      { id: 'main', label: '主配方' },
                      { id: 'sub', label: '脂肪乳' },
                      { id: 'trace', label: '微量元素' },
                      { id: 'add', label: '單方' },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setFilterCategory(btn.id)}
                      className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                        filterCategory === btn.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catalog Items Grid */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {catalogList.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    未找到符合條件的藥品項目。
                  </div>
                ) : (
                  catalogList.map((item) => (
                    <div
                      key={`${item.category}_${item.id}`}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-teal-300 transition-colors shadow-2xs space-y-1.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.categoryLabel}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.name}
                          </span>
                          {item.shortName && (
                            <span className="text-xs text-slate-500 hidden md:inline">
                              ({item.shortName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.vialVol ? `每袋/支 ${item.vialVol} ml` : '每 1000 ml 基準'}
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-tight">
                          {item.description}
                        </p>
                      )}

                      {/* Nutrient specs */}
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 pt-1 text-[11px] text-center bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <div>
                          <span className="block text-[9px] text-slate-400">熱量 (kcal)</span>
                          <strong className="text-slate-800">{(item.kcal * 1000).toFixed(0)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">蛋白 (g)</span>
                          <strong className="text-slate-800">{(item.protein * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">醣類 (g)</span>
                          <strong className="text-slate-800">{(item.cho * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">脂肪 (g)</span>
                          <strong className="text-slate-800">{(item.lipid * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">Na (mEq)</span>
                          <strong className="text-slate-800">{(item.na * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">K (mEq)</span>
                          <strong className="text-slate-800">{(item.k * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">P (mmol)</span>
                          <strong className="text-slate-800">{(item.p * 1000).toFixed(1)}</strong>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">Ca (mEq)</span>
                          <strong className="text-slate-800">{(item.ca * 1000).toFixed(1)}</strong>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RESET */}
          {activeTab === 'reset' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>還原至原廠標準資料庫</span>
                </div>
                <p className="text-xs text-rose-800 leading-relaxed">
                  若您曾經匯入或修改過藥品項目，點擊下方按鈕將會清除瀏覽器中的自訂快取，並立即恢復至內建標準的 2018.10.08 修訂版藥品與電解質調劑資料庫（包含台大液、SmofKabiven、Kabiven、Nutriflex、Olimel、Clinimix、Bfluid、小兒配方等完整設定）。
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefaults();
                      setImportNotice({
                        type: 'success',
                        text: '已成功還原為原廠標準配方資料庫！',
                      });
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>確認清除自訂資料並還原預設</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            CSV 試算表具備 UTF-8 BOM，在 Windows Excel 中開啟中文絕不亂碼
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>

      </div>
    </div>
  );
};
