import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  FormulationItem,
  TpnDatabasePackage,
  DatabaseValidationSummary,
} from '../types/tpn';
import {
  MAIN_FORMULATIONS as DEFAULT_MAIN_FORMULATIONS,
  LIPID_EMULSIONS as DEFAULT_LIPID_EMULSIONS,
  TRACE_ELEMENTS as DEFAULT_TRACE_ELEMENTS,
  ADDITIVES as DEFAULT_ADDITIVES,
  COMPOUNDING_RAW_SPECS as DEFAULT_COMPOUNDING_RAW_SPECS,
  TPN_CLINICAL_LIMITS as DEFAULT_TPN_CLINICAL_LIMITS,
} from '../data/tpnDatabase';
import {
  exportDatabaseToCsv,
  parseCsvToDatabase,
  getSampleCsvTemplate,
} from '../utils/tpnCsvConverter';

const STORAGE_KEY = 'tpn_clinical_database_package_v2';

interface DatabaseContextValue {
  mainFormulations: Record<string, FormulationItem>;
  lipidEmulsions: Record<string, FormulationItem>;
  traceElements: Record<string, FormulationItem>;
  additives: Record<string, FormulationItem>;
  compoundingRawSpecs: Record<string, any>;
  clinicalLimits: Record<string, number>;
  isCustomized: boolean;
  lastUpdated: string;
  exportDatabase: () => void;
  exportDatabaseAsCsv: () => void;
  downloadCsvTemplate: () => void;
  validateDatabase: (pkg: any) => DatabaseValidationSummary;
  importDatabase: (
    pkg: any,
    mode: 'merge' | 'overwrite'
  ) => { success: boolean; message: string; stats?: DatabaseValidationSummary['stats'] };
  importFromCsv: (
    csvText: string,
    mode: 'merge' | 'overwrite'
  ) => { success: boolean; message: string; stats?: DatabaseValidationSummary['stats'] };
  resetToDefaults: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

export function useTpnDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useTpnDatabase must be used within a DatabaseProvider');
  }
  return context;
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [mainFormulations, setMainFormulations] = useState<Record<string, FormulationItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mainFormulations && typeof parsed.mainFormulations === 'object') {
          return { ...DEFAULT_MAIN_FORMULATIONS, ...parsed.mainFormulations };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved database from localStorage', e);
    }
    return DEFAULT_MAIN_FORMULATIONS;
  });

  const [lipidEmulsions, setLipidEmulsions] = useState<Record<string, FormulationItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lipidEmulsions && typeof parsed.lipidEmulsions === 'object') {
          return { ...DEFAULT_LIPID_EMULSIONS, ...parsed.lipidEmulsions };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved lipid emulsions', e);
    }
    return DEFAULT_LIPID_EMULSIONS;
  });

  const [traceElements, setTraceElements] = useState<Record<string, FormulationItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.traceElements && typeof parsed.traceElements === 'object') {
          return { ...DEFAULT_TRACE_ELEMENTS, ...parsed.traceElements };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved trace elements', e);
    }
    return DEFAULT_TRACE_ELEMENTS;
  });

  const [additives, setAdditives] = useState<Record<string, FormulationItem>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.additives && typeof parsed.additives === 'object') {
          return { ...DEFAULT_ADDITIVES, ...parsed.additives };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved additives', e);
    }
    return DEFAULT_ADDITIVES;
  });

  const [compoundingRawSpecs, setCompoundingRawSpecs] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.compoundingRawSpecs) {
          return { ...DEFAULT_COMPOUNDING_RAW_SPECS, ...parsed.compoundingRawSpecs };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved compounding specs', e);
    }
    return DEFAULT_COMPOUNDING_RAW_SPECS;
  });

  const [clinicalLimits, setClinicalLimits] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.clinicalLimits) {
          return { ...DEFAULT_TPN_CLINICAL_LIMITS, ...parsed.clinicalLimits };
        }
      }
    } catch (e) {
      console.warn('Failed to load saved limits', e);
    }
    return DEFAULT_TPN_CLINICAL_LIMITS;
  });

  const [isCustomized, setIsCustomized] = useState<boolean>(() => {
    return !!localStorage.getItem(STORAGE_KEY);
  });

  const [lastUpdated, setLastUpdated] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.exportedAt || parsed.updatedAt || new Date().toISOString();
      }
    } catch {
      // ignore
    }
    return '原廠內建標準資料庫 (2018.10.08 / ASPEN)';
  });

  // Save changes to localStorage
  const saveToStorage = (
    main: Record<string, FormulationItem>,
    lipid: Record<string, FormulationItem>,
    trace: Record<string, FormulationItem>,
    adds: Record<string, FormulationItem>,
    specs: Record<string, any>,
    limits: Record<string, number>
  ) => {
    const pkg: TpnDatabasePackage = {
      version: '2.1.0',
      systemName: 'TPN Clinical Studio',
      exportedAt: new Date().toISOString(),
      description: '臨床全靜脈營養藥品與配方資料庫自訂包',
      mainFormulations: main,
      lipidEmulsions: lipid,
      traceElements: trace,
      additives: adds,
      compoundingRawSpecs: specs,
      clinicalLimits: limits,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pkg));
      setIsCustomized(true);
      setLastUpdated(pkg.exportedAt);
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  };

  // 1. Export database as CSV file (for Excel editing)
  const exportDatabaseAsCsv = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `TPN_Drug_Database_${dateStr}.csv`;
    const csvContent = exportDatabaseToCsv({
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
    });
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Download sample CSV template for Excel
  const downloadCsvTemplate = () => {
    const csvContent = getSampleCsvTemplate();
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TPN_Drug_Formulary_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 3. Export database as JSON file
  const exportDatabase = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `TPN_Drug_Database_${dateStr}.json`;

    const pkg: TpnDatabasePackage = {
      version: '2.1.0',
      systemName: 'TPN Clinical Studio',
      exportedAt: now.toISOString(),
      description: '臨床全靜脈營養處方藥品資料庫 (含主配方、脂肪乳劑、微量元素、電解質添加劑與調劑物理規格)',
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
      compoundingRawSpecs,
      clinicalLimits,
    };

    const blob = new Blob([JSON.stringify(pkg, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 4. Validate database structure (JSON object)
  const validateDatabase = (pkg: any): DatabaseValidationSummary => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pkg || typeof pkg !== 'object') {
      return {
        isValid: false,
        errors: ['檔案格式無效，必須是合法的 JSON 或 CSV 物件。'],
        warnings: [],
        stats: { mainCount: 0, lipidCount: 0, traceCount: 0, additiveCount: 0 },
      };
    }

    let mainCount = 0;
    let lipidCount = 0;
    let traceCount = 0;
    let additiveCount = 0;

    if (pkg.mainFormulations && typeof pkg.mainFormulations === 'object') {
      mainCount = Object.keys(pkg.mainFormulations).filter((k) => k !== '').length;
      for (const [id, item] of Object.entries<any>(pkg.mainFormulations)) {
        if (!item || typeof item !== 'object') {
          errors.push(`主配方 ID [${id}] 資料無效。`);
          continue;
        }
        if (!item.name) {
          warnings.push(`主配方 ID [${id}] 缺少名稱欄位。`);
        }
      }
    } else {
      warnings.push('未包含 mainFormulations (主配方群組)。');
    }

    if (pkg.lipidEmulsions && typeof pkg.lipidEmulsions === 'object') {
      lipidCount = Object.keys(pkg.lipidEmulsions).length;
    }

    if (pkg.traceElements && typeof pkg.traceElements === 'object') {
      traceCount = Object.keys(pkg.traceElements).length;
    }

    if (pkg.additives && typeof pkg.additives === 'object') {
      additiveCount = Object.keys(pkg.additives).length;
    }

    const totalItems = mainCount + lipidCount + traceCount + additiveCount;
    if (totalItems === 0) {
      errors.push('資料庫包中未發現任何合法的藥品或配方項目。');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        mainCount,
        lipidCount,
        traceCount,
        additiveCount,
      },
    };
  };

  // 5. Import database package (merge or overwrite)
  const importDatabase = (
    pkg: any,
    mode: 'merge' | 'overwrite'
  ): { success: boolean; message: string; stats?: DatabaseValidationSummary['stats'] } => {
    const validation = validateDatabase(pkg);
    if (!validation.isValid) {
      return {
        success: false,
        message: validation.errors.join('；'),
        stats: validation.stats,
      };
    }

    let nextMain: Record<string, FormulationItem>;
    let nextLipid: Record<string, FormulationItem>;
    let nextTrace: Record<string, FormulationItem>;
    let nextAdd: Record<string, FormulationItem>;
    let nextSpecs: Record<string, any>;
    let nextLimits: Record<string, number>;

    if (mode === 'overwrite') {
      nextMain = {
        '': DEFAULT_MAIN_FORMULATIONS[''],
        ...(pkg.mainFormulations || {}),
      };
      nextLipid = pkg.lipidEmulsions || {};
      nextTrace = pkg.traceElements || {};
      nextAdd = pkg.additives || {};
      nextSpecs = pkg.compoundingRawSpecs || DEFAULT_COMPOUNDING_RAW_SPECS;
      nextLimits = pkg.clinicalLimits || DEFAULT_TPN_CLINICAL_LIMITS;
    } else {
      // Merge mode
      nextMain = {
        ...mainFormulations,
        ...(pkg.mainFormulations || {}),
      };
      nextLipid = {
        ...lipidEmulsions,
        ...(pkg.lipidEmulsions || {}),
      };
      nextTrace = {
        ...traceElements,
        ...(pkg.traceElements || {}),
      };
      nextAdd = {
        ...additives,
        ...(pkg.additives || {}),
      };
      nextSpecs = {
        ...compoundingRawSpecs,
        ...(pkg.compoundingRawSpecs || {}),
      };
      nextLimits = {
        ...clinicalLimits,
        ...(pkg.clinicalLimits || {}),
      };
    }

    setMainFormulations(nextMain);
    setLipidEmulsions(nextLipid);
    setTraceElements(nextTrace);
    setAdditives(nextAdd);
    setCompoundingRawSpecs(nextSpecs);
    setClinicalLimits(nextLimits);

    saveToStorage(nextMain, nextLipid, nextTrace, nextAdd, nextSpecs, nextLimits);

    const modeText = mode === 'overwrite' ? '完全覆蓋更新' : '增量合併更新';
    return {
      success: true,
      message: `成功完成${modeText}！包含主配方 ${validation.stats.mainCount} 項、脂肪乳劑 ${validation.stats.lipidCount} 項、微量元素 ${validation.stats.traceCount} 項、單方添加劑 ${validation.stats.additiveCount} 項。`,
      stats: validation.stats,
    };
  };

  // 6. Import directly from CSV text
  const importFromCsv = (
    csvText: string,
    mode: 'merge' | 'overwrite'
  ): { success: boolean; message: string; stats?: DatabaseValidationSummary['stats'] } => {
    const result = parseCsvToDatabase(csvText);
    if (!result.isValid) {
      return {
        success: false,
        message: result.errors.join('；'),
        stats: result.stats,
      };
    }

    return importDatabase(result.parsedPackage, mode);
  };

  // 7. Reset to built-in defaults
  const resetToDefaults = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear storage key', e);
    }
    setMainFormulations(DEFAULT_MAIN_FORMULATIONS);
    setLipidEmulsions(DEFAULT_LIPID_EMULSIONS);
    setTraceElements(DEFAULT_TRACE_ELEMENTS);
    setAdditives(DEFAULT_ADDITIVES);
    setCompoundingRawSpecs(DEFAULT_COMPOUNDING_RAW_SPECS);
    setClinicalLimits(DEFAULT_TPN_CLINICAL_LIMITS);
    setIsCustomized(false);
    setLastUpdated('原廠內建標準資料庫 (2018.10.08 / ASPEN)');
  };

  const value = useMemo(
    () => ({
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
      compoundingRawSpecs,
      clinicalLimits,
      isCustomized,
      lastUpdated,
      exportDatabase,
      exportDatabaseAsCsv,
      downloadCsvTemplate,
      validateDatabase,
      importDatabase,
      importFromCsv,
      resetToDefaults,
    }),
    [
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
      compoundingRawSpecs,
      clinicalLimits,
      isCustomized,
      lastUpdated,
    ]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
};
