import { FormulationItem } from '../types/tpn';

/**
 * CSV 標頭定義 (繁體中文 + 英文對應)
 * 數值標準以臨床最常用的「每 1000 ml 含量」為準，便於在 Excel 中直接閱讀與編輯
 */
export const CSV_HEADERS = [
  '類別(main/sub/trace/add)',
  '藥品代碼(ID)',
  '藥品完整名稱',
  '處方簡稱',
  '每袋容量ml',
  '每1000ml熱量kcal',
  '每1000ml蛋白質g',
  '每1000ml脂肪g',
  '每1000ml醣類g',
  '每1000ml鈉mEq',
  '每1000ml鉀mEq',
  '每1000ml磷mmol',
  '每1000ml鈣mEq',
  '每1000ml鎂mEq',
  '每1000ml鋅mg',
  '周邊靜脈可用(Y/N)',
  '說明備註',
];

/**
 * 安全跳脫 CSV 欄位中的逗號與引號
 */
function escapeCsvCell(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 將藥品清單轉成 CSV 文字 (含 UTF-8 BOM，防止 Windows Excel 繁體中文亂碼)
 */
export function exportDatabaseToCsv(data: {
  mainFormulations: Record<string, FormulationItem>;
  lipidEmulsions: Record<string, FormulationItem>;
  traceElements: Record<string, FormulationItem>;
  additives: Record<string, FormulationItem>;
}): string {
  const rows: string[] = [];

  // 1. Header Row
  rows.push(CSV_HEADERS.map(escapeCsvCell).join(','));

  const appendItem = (cat: 'main' | 'sub' | 'trace' | 'add', item: FormulationItem) => {
    if (!item.id || item.id === '') return;

    // Convert per-1ml to per-1000ml
    const kcal1000 = Number(((item.kcal || 0) * 1000).toFixed(1));
    const prot1000 = Number(((item.protein || 0) * 1000).toFixed(2));
    const lipid1000 = Number(((item.lipid || 0) * 1000).toFixed(2));
    const cho1000 = Number(((item.cho || 0) * 1000).toFixed(2));
    const na1000 = Number(((item.na || 0) * 1000).toFixed(2));
    const k1000 = Number(((item.k || 0) * 1000).toFixed(2));
    const p1000 = Number(((item.p || 0) * 1000).toFixed(2));
    const ca1000 = Number(((item.ca || 0) * 1000).toFixed(2));
    const mg1000 = Number(((item.mg || 0) * 1000).toFixed(2));
    const zn1000 = Number(((item.zn || 0) * 1000).toFixed(2));

    const line = [
      cat,
      item.id,
      item.name,
      item.shortName || '',
      item.vialVol || '',
      kcal1000,
      prot1000,
      lipid1000,
      cho1000,
      na1000,
      k1000,
      p1000,
      ca1000,
      mg1000,
      zn1000,
      item.isPeripheralAllowed ? 'Y' : 'N',
      item.description || '',
    ];

    rows.push(line.map(escapeCsvCell).join(','));
  };

  // Export each group
  Object.values(data.mainFormulations).forEach((item) => appendItem('main', item));
  Object.values(data.lipidEmulsions).forEach((item) => appendItem('sub', item));
  Object.values(data.traceElements).forEach((item) => appendItem('trace', item));
  Object.values(data.additives).forEach((item) => appendItem('add', item));

  // Add \uFEFF BOM for Excel compatibility
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * 簡易 RFC4180 CSV 行解析器 (處理引號內的換行、逗號與引號跳脫)
 */
export function parseCsvRows(csvString: string): string[][] {
  // Strip UTF-8 BOM if present
  let cleanStr = csvString;
  if (cleanStr.charCodeAt(0) === 0xfeff) {
    cleanStr = cleanStr.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const nextChar = cleanStr[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export interface CsvParseResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    mainCount: number;
    lipidCount: number;
    traceCount: number;
    additiveCount: number;
  };
  parsedPackage: {
    mainFormulations: Record<string, FormulationItem>;
    lipidEmulsions: Record<string, FormulationItem>;
    traceElements: Record<string, FormulationItem>;
    additives: Record<string, FormulationItem>;
  };
}

/**
 * 解析 CSV 文字並轉為系統 FormulationItem 物件集合
 */
export function parseCsvToDatabase(csvString: string): CsvParseResult {
  const rows = parseCsvRows(csvString);
  const errors: string[] = [];
  const warnings: string[] = [];

  const mainFormulations: Record<string, FormulationItem> = {};
  const lipidEmulsions: Record<string, FormulationItem> = {};
  const traceElements: Record<string, FormulationItem> = {};
  const additives: Record<string, FormulationItem> = {};

  if (rows.length < 2) {
    return {
      isValid: false,
      errors: ['CSV 檔案內容為空或缺少資料列。至少需包含標頭列與一筆藥品資料。'],
      warnings: [],
      stats: { mainCount: 0, lipidCount: 0, traceCount: 0, additiveCount: 0 },
      parsedPackage: { mainFormulations, lipidEmulsions, traceElements, additives },
    };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase());

  // Helper to find column index by keyword
  const findCol = (...keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = rawHeaders.findIndex((h) => h.includes(kw.toLowerCase()));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colCat = findCol('類別', 'category', 'cat', 'type');
  const colId = findCol('藥品代碼', '代碼', 'id', 'code');
  const colName = findCol('完整名稱', '名稱', 'name', '藥品');
  const colShort = findCol('簡稱', 'short', 'shortname');
  const colVol = findCol('容量', 'vialvol', 'vol', '體積');
  const colKcal = findCol('熱量', 'kcal', 'cal');
  const colProt = findCol('蛋白', 'protein', 'prot');
  const colLipid = findCol('脂肪', 'lipid', 'fat');
  const colCho = findCol('醣類', '碳水', 'cho', 'carbo');
  const colNa = findCol('鈉', 'na');
  const colK = findCol('鉀', 'k');
  const colP = findCol('磷', 'p');
  const colCa = findCol('鈣', 'ca');
  const colMg = findCol('鎂', 'mg');
  const colZn = findCol('鋅', 'zn');
  const colPeriph = findCol('周邊', '週邊', 'peripheral');
  const colDesc = findCol('說明', '備註', 'desc', 'note');

  if (colName === -1 && colId === -1) {
    errors.push('無法識別 CSV 標頭！請確認至少包含「藥品代碼 (ID)」或「藥品名稱 (Name)」欄位。');
    return {
      isValid: false,
      errors,
      warnings,
      stats: { mainCount: 0, lipidCount: 0, traceCount: 0, additiveCount: 0 },
      parsedPackage: { mainFormulations, lipidEmulsions, traceElements, additives },
    };
  }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const rowNum = r + 1;
    let rawCat = (colCat !== -1 ? row[colCat] : 'main').toLowerCase().trim();
    let id = (colId !== -1 ? row[colId] : '').trim();
    const name = (colName !== -1 ? row[colName] : '').trim();

    if (!name && !id) {
      warnings.push(`第 ${rowNum} 列：缺少藥品名稱與代碼，已略過。`);
      continue;
    }

    if (!id) {
      // Auto-generate id from name
      id = `custom_${Math.abs(name.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(36)}`;
    }

    // Determine category
    let category: 'main' | 'sub' | 'trace' | 'add' = 'main';
    if (rawCat.includes('sub') || rawCat.includes('脂') || rawCat.includes('油') || rawCat.includes('lipid')) {
      category = 'sub';
    } else if (rawCat.includes('trace') || rawCat.includes('微量') || rawCat.includes('元素')) {
      category = 'trace';
    } else if (rawCat.includes('add') || rawCat.includes('單方') || rawCat.includes('電解質') || rawCat.includes('添加')) {
      category = 'add';
    } else {
      category = 'main';
    }

    const parseNum = (colIdx: number): number => {
      if (colIdx === -1 || colIdx >= row.length) return 0;
      const clean = row[colIdx].replace(/[^\d.-]/g, '');
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    };

    // Note: CSV values are in per-1000ml, convert to per-1ml for internal database storage!
    const kcal1000 = parseNum(colKcal);
    const prot1000 = parseNum(colProt);
    const lipid1000 = parseNum(colLipid);
    const cho1000 = parseNum(colCho);
    const na1000 = parseNum(colNa);
    const k1000 = parseNum(colK);
    const p1000 = parseNum(colP);
    const ca1000 = parseNum(colCa);
    const mg1000 = parseNum(colMg);
    const zn1000 = parseNum(colZn);

    const vialVol = colVol !== -1 ? parseNum(colVol) : (category === 'main' ? 1000 : 0);
    const isPeripheral =
      colPeriph !== -1
        ? ['y', 'yes', 'true', '是', '1'].includes(row[colPeriph].toLowerCase().trim())
        : category === 'main';

    const shortName = colShort !== -1 ? row[colShort] : undefined;
    const description = colDesc !== -1 ? row[colDesc] : undefined;

    const item: FormulationItem = {
      id,
      name: name || id,
      shortName: shortName || undefined,
      category,
      vialVol: vialVol > 0 ? vialVol : 1000,
      kcal: kcal1000 / 1000,
      protein: prot1000 / 1000,
      lipid: lipid1000 / 1000,
      cho: cho1000 / 1000,
      na: na1000 / 1000,
      k: k1000 / 1000,
      p: p1000 / 1000,
      ca: ca1000 / 1000,
      mg: mg1000 / 1000,
      zn: zn1000 / 1000,
      isPeripheralAllowed: isPeripheral,
      description: description || undefined,
    };

    if (category === 'main') {
      mainFormulations[id] = item;
    } else if (category === 'sub') {
      lipidEmulsions[id] = item;
    } else if (category === 'trace') {
      traceElements[id] = item;
    } else if (category === 'add') {
      additives[id] = item;
    }
  }

  const mainCount = Object.keys(mainFormulations).length;
  const lipidCount = Object.keys(lipidEmulsions).length;
  const traceCount = Object.keys(traceElements).length;
  const additiveCount = Object.keys(additives).length;
  const totalCount = mainCount + lipidCount + traceCount + additiveCount;

  if (totalCount === 0) {
    errors.push('CSV 檔案中未解析出任何有效的藥品資料列。');
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
    parsedPackage: {
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
    },
  };
}

/**
 * 產生預設的 CSV 範本文字 (供使用者在 Excel 中依照格式填寫)
 */
export function getSampleCsvTemplate(): string {
  const sampleLines = [
    CSV_HEADERS.join(','),
    'main,smof_custom,斯莫夫卡文客製配方,Smof Custom,1477,1083,50.7,38.5,84.6,40.6,30.4,12.8,5.0,10.0,2.6,N,四種油源中心靜脈專用',
    'main,ppn_custom,周邊靜脈營養自訂袋,PPN 1000ml,1000,600,30,20,75,35,20,10,0,5,0,Y,低滲透壓周邊靜脈專用配方',
    'sub,lipidem_custom,利皮得 20% 脂肪乳劑,Lipidem 20%,100,2000,0,200,0,0,0,0,0,0,0,Y,MCT/LCT/魚油三合一脂肪乳劑',
    'trace,tracutil_custom,查枯特微量元素注射液,Tracutil,10,0,0,0,0,0,0,0,0,0,10,Y,成人綜合微量元素 (含鋅鐵錳銅氟硒鉬鉻碘)',
    'add,nacl_custom,10% 高濃度氯化鈉,NaCl 4 mEq/ml,20,0,0,0,0,4000,0,0,0,0,0,Y,每ml含 4 mEq 鈉離子',
    'add,kcl_custom,15% 氯化鉀注射液,15% KCl,20,0,0,0,0,0,2000,0,0,0,0,Y,每ml含 2 mEq 鉀離子',
  ];
  return '\uFEFF' + sampleLines.join('\r\n');
}
