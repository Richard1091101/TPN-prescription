import {
  PatientProfile,
  PatientMetrics,
  NutrientValues,
  RegimenConfig,
  CalculatedRegimen,
  GapRowData,
  CompoundingEvaluation,
  CompoundingIngredient,
  CompoundingFeasibilityStatus,
} from '../types/tpn';
import {
  MAIN_FORMULATIONS,
  LIPID_EMULSIONS,
  TRACE_ELEMENTS,
  ADDITIVES,
  TPN_CLINICAL_LIMITS,
} from '../data/tpnDatabase';

/**
 * 計算病患衍生身體質量參數 (BMI, IBW, AdjBW, BMR, TEE)
 */
export function calculatePatientMetrics(patient: PatientProfile): PatientMetrics {
  const { gender, age, height, weight, af, sf } = patient;
  const heightM = height / 100;
  const bmi = heightM > 0 ? weight / (heightM * heightM) : 0;
  const isObese = bmi >= 30;

  // Devine formula for IBW
  let ibw = 50;
  if (gender === 'male') {
    ibw = 50 + 0.91 * (height - 152.4);
  } else {
    ibw = 45.5 + 0.91 * (height - 152.4);
  }
  if (ibw < 30) ibw = 30;

  // Adjusted Body Weight for obesity (AdjBW = IBW + 0.25 * (Actual - IBW))
  const adjustedWeight = isObese ? ibw + 0.25 * (weight - ibw) : weight;

  // Determine weight for BMR calculation
  const evalWeight = patient.useAdjustedWeight && isObese ? adjustedWeight : weight;

  // Mifflin-St Jeor (1990)
  let bmr = 10 * evalWeight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
  if (bmr < 500) bmr = 500;

  const tee = Math.round(bmr * af * sf);

  return {
    bmi: Number(bmi.toFixed(1)),
    ibw: Number(ibw.toFixed(1)),
    adjustedWeight: Number(adjustedWeight.toFixed(1)),
    isObese,
    bmr: Math.round(bmr),
    tee,
  };
}

/**
 * 依據 ASPEN 指引計算預設目標需求
 */
export function calculateDefaultTargets(
  patient: PatientProfile,
  metrics: PatientMetrics
): NutrientValues {
  const evalWeight = patient.useAdjustedWeight && metrics.isObese ? metrics.adjustedWeight : patient.weight;
  const kcal = metrics.tee;

  // Protein factor (ASPEN: 1.2 - 2.0 g/kg/d)
  let protFactor = 1.2;
  if (patient.sf >= 2.0) {
    protFactor = 2.0;
  } else if (patient.sf >= 1.5) {
    protFactor = 1.7;
  } else if (patient.sf >= 1.3) {
    protFactor = 1.5;
  } else {
    protFactor = 1.2;
  }

  const protein = Number((evalWeight * protFactor).toFixed(1));
  const lipid = Number((evalWeight * 1.0).toFixed(1)); // 1.0 g/kg/d
  // CHO: parenteral dextrose provides 3.4 kcal/g
  const choKcal = Math.max(0, kcal - protein * 4 - lipid * 9);
  const cho = Number((choKcal / 3.4).toFixed(1));

  // Electrolyte targets per kg (ASPEN standard maintenance)
  const na = Number((evalWeight * 1.5).toFixed(1)); // 1-2 mEq/kg
  const k = Number((evalWeight * 1.0).toFixed(1));  // 1-2 mEq/kg
  const p = Number((evalWeight * 0.4).toFixed(1));  // 0.3-0.5 mmol/kg
  const mg = Number((evalWeight * 0.4).toFixed(1)); // 0.3-0.5 mEq/kg
  const ca = Number((evalWeight * 0.3).toFixed(1)); // 0.2-0.4 mEq/kg
  const zn = 5.0; // mg

  return {
    kcal,
    protein,
    lipid,
    cho,
    na,
    k,
    p,
    ca,
    mg,
    zn,
  };
}

export interface DbLookupMaps {
  main?: Record<string, any>;
  lipid?: Record<string, any>;
  trace?: Record<string, any>;
  add?: Record<string, any>;
  specs?: Record<string, any>;
  limits?: Record<string, number>;
}

/**
 * 計算單一處方配方（目前或新配方）之所有營養素總和及臨床安全指標
 */
export function calculateRegimenTotals(
  regimen: RegimenConfig,
  patientWeight: number,
  dbMaps?: DbLookupMaps
): CalculatedRegimen {
  const mainMap = dbMaps?.main || MAIN_FORMULATIONS;
  const lipidMap = dbMaps?.lipid || LIPID_EMULSIONS;
  const traceMap = dbMaps?.trace || TRACE_ELEMENTS;
  const addMap = dbMaps?.add || ADDITIVES;

  const totals: NutrientValues = {
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
  let totalVolume = 0;

  // 1. 主配方 (Main)
  const mainVol = Number(regimen.mainVol) || 0;
  totalVolume += mainVol;

  if (mainVol > 0) {
    if (regimen.isMainCustom) {
      const keys: (keyof NutrientValues)[] = ['kcal', 'protein', 'lipid', 'cho', 'na', 'k', 'p', 'ca', 'mg', 'zn'];
      const ratio = mainVol / 1000;
      keys.forEach((key) => {
        totals[key] += (regimen.customMainPer1000[key] || 0) * ratio;
      });
    } else if (regimen.mainId && mainMap[regimen.mainId]) {
      const data = mainMap[regimen.mainId];
      const keys: (keyof NutrientValues)[] = ['kcal', 'protein', 'lipid', 'cho', 'na', 'k', 'p', 'ca', 'mg', 'zn'];
      keys.forEach((key) => {
        totals[key] += data[key] * mainVol;
      });
    }
  }

  // 2. 脂肪乳劑 (Sub Lipid)
  if (regimen.subId && lipidMap[regimen.subId]) {
    const data = lipidMap[regimen.subId];
    const vials = Number(regimen.subVials) || 0;
    const vol = vials * (data.vialVol || 0);
    totalVolume += vol;

    const keys: (keyof NutrientValues)[] = ['kcal', 'protein', 'lipid', 'cho', 'na', 'k', 'p', 'ca', 'mg', 'zn'];
    keys.forEach((key) => {
      totals[key] += data[key] * vol;
    });
  }

  // 3. 微量元素 (Trace Elements)
  if (regimen.traceId && traceMap[regimen.traceId]) {
    const data = traceMap[regimen.traceId];
    const vials = Number(regimen.traceVials) || 0;
    const vol = vials * (data.vialVol || 0);
    totalVolume += vol;

    const keys: (keyof NutrientValues)[] = ['kcal', 'protein', 'lipid', 'cho', 'na', 'k', 'p', 'ca', 'mg', 'zn'];
    keys.forEach((key) => {
      totals[key] += data[key] * vol;
    });
  }

  // 4. 添加單方 (Additives)
  if (Array.isArray(regimen.addRows)) {
    regimen.addRows.forEach((row) => {
      if (row.addId && addMap[row.addId]) {
        const data = addMap[row.addId];
        const vials = Number(row.vials) || 0;
        const vol = vials * (data.vialVol || 0);
        totalVolume += vol;

        const keys: (keyof NutrientValues)[] = ['kcal', 'protein', 'lipid', 'cho', 'na', 'k', 'p', 'ca', 'mg', 'zn'];
        keys.forEach((key) => {
          totals[key] += data[key] * vol;
        });
      }
    });
  }

  // Clinical Safety Metrics
  const safeWeight = patientWeight > 0 ? patientWeight : 60;

  // GIR (Glucose Infusion Rate in mg/kg/min)
  // GIR = (CHO_g * 1000) / (weight_kg * 1440 min)
  const gir = (totals.cho * 1000) / (safeWeight * 1440);

  // Nitrogen and NPC:N Ratio
  const nitrogen = totals.protein / 6.25;
  const npcKcal = totals.cho * 3.4 + totals.lipid * 9;
  const npcToNRatio = nitrogen > 0 ? npcKcal / nitrogen : 0;

  // Estimated Osmolarity (mOsm/L)
  // Osm = [Protein(g)*10 + Dextrose(g)*5 + Lipid(g)*0.7 + (Na+K+Ca+Mg)*2] / Liters
  const liters = totalVolume / 1000;
  let estimatedOsmolarity = 0;
  if (liters > 0) {
    const cationSum = totals.na + totals.k + totals.ca + totals.mg;
    estimatedOsmolarity =
      (totals.protein * 10 + totals.cho * 5 + totals.lipid * 0.7 + cationSum * 2) / liters;
  }
  const isPeripheralSafe = estimatedOsmolarity <= 900;

  // Calcium-Phosphate Solubility Product Risk
  // Ca (mEq/L) and P (mmol/L)
  let caPProduct = 0;
  let caPRisk: 'safe' | 'borderline' | 'high_risk' = 'safe';
  if (liters > 0) {
    const caConcentration = totals.ca / liters; // mEq/L
    const pConcentration = totals.p / liters;   // mmol/L
    const sumConc = caConcentration + pConcentration;
    caPProduct = Number(sumConc.toFixed(1));

    if (sumConc > 45) {
      caPRisk = 'high_risk';
    } else if (sumConc > 30) {
      caPRisk = 'borderline';
    } else {
      caPRisk = 'safe';
    }
  }

  // Macronutrient percentage
  const totalMacroKcal = totals.cho * 3.4 + totals.protein * 4 + totals.lipid * 9;
  const macroPct = {
    cho: totalMacroKcal > 0 ? (totals.cho * 3.4 / totalMacroKcal) * 100 : 0,
    protein: totalMacroKcal > 0 ? (totals.protein * 4 / totalMacroKcal) * 100 : 0,
    lipid: totalMacroKcal > 0 ? (totals.lipid * 9 / totalMacroKcal) * 100 : 0,
  };

  return {
    ...totals,
    volume: totalVolume,
    gir: Number(gir.toFixed(2)),
    nitrogen: Number(nitrogen.toFixed(2)),
    npcKcal: Math.round(npcKcal),
    npcToNRatio: Math.round(npcToNRatio),
    estimatedOsmolarity: Math.round(estimatedOsmolarity),
    isPeripheralSafe,
    caPProduct,
    caPRisk,
    macroPct,
  };
}

/**
 * 產生三維臨床差距分析表列資料
 */
export function generateGapRows(
  targets: NutrientValues,
  current: CalculatedRegimen,
  proposed: CalculatedRegimen
): GapRowData[] {
  const curLiters = current.volume / 1000;
  const propLiters = proposed.volume / 1000;

  const definitions: Array<{
    key: keyof NutrientValues;
    label: string;
    unit: string;
    threshold: number;
    decimals: number;
  }> = [
    { key: 'kcal', label: '總熱量 (Total Calories)', unit: 'kcal', threshold: 150, decimals: 0 },
    { key: 'protein', label: '蛋白質 (Protein)', unit: 'g', threshold: 10, decimals: 1 },
    { key: 'lipid', label: '脂肪 (Lipid)', unit: 'g', threshold: 10, decimals: 1 },
    { key: 'cho', label: '碳水化合物 (CHO/Dextrose)', unit: 'g', threshold: 20, decimals: 1 },
    { key: 'na', label: '鈉離子 (Na+)', unit: 'mEq', threshold: 10, decimals: 1 },
    { key: 'k', label: '鉀離子 (K+)', unit: 'mEq', threshold: 5, decimals: 1 },
    { key: 'p', label: '磷酸鹽 (Phosphate)', unit: 'mmol', threshold: 3, decimals: 1 },
    { key: 'ca', label: '鈣離子 (Ca++)', unit: 'mEq', threshold: 4, decimals: 1 },
    { key: 'mg', label: '鎂離子 (Mg++)', unit: 'mEq', threshold: 4, decimals: 1 },
    { key: 'zn', label: '鋅微量元素 (Zinc)', unit: 'mg', threshold: 1.5, decimals: 1 },
  ];

  return definitions.map((def) => {
    const tar = targets[def.key] || 0;
    const cur = current[def.key] || 0;
    const prop = proposed[def.key] || 0;

    const curGap = cur - tar;
    const propGap = prop - tar;
    const netChange = prop - cur;

    const curPerL = curLiters > 0 ? curGap / curLiters : null;
    const propPerL = propLiters > 0 ? propGap / propLiters : null;

    let currentStatus: 'deficit' | 'surplus' | 'target' = 'target';
    if (curGap < -def.threshold) currentStatus = 'deficit';
    else if (curGap > def.threshold) currentStatus = 'surplus';

    let proposedStatus: 'deficit' | 'surplus' | 'target' = 'target';
    if (propGap < -def.threshold) proposedStatus = 'deficit';
    else if (propGap > def.threshold) proposedStatus = 'surplus';

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      target: tar,
      current: cur,
      currentGap: curGap,
      currentPerL: curPerL,
      proposed: prop,
      proposedGap: propGap,
      proposedPerL: propPerL,
      netChange,
      threshold: def.threshold,
      decimals: def.decimals,
      currentStatus,
      proposedStatus,
    };
  });
}

/**
 * 等碳水起始流速換算 (Iso-carbohydrate starting infusion rate)
 * 轉換至新配方時，為避免血糖驟升驟降，以舊配方之每日碳水總量估算新配方等量起始流速
 */
export function calculateSuggestedIsoChoRate(
  curCho: number,
  newMainId: string,
  isCustom: boolean,
  customChoPerL: number,
  dbMaps?: DbLookupMaps
): number | null {
  if (curCho <= 0) return null;
  const mainMap = dbMaps?.main || MAIN_FORMULATIONS;

  let choPerMl = 0;
  if (isCustom) {
    choPerMl = (customChoPerL || 0) / 1000;
  } else if (newMainId && mainMap[newMainId]) {
    choPerMl = mainMap[newMainId].cho;
  }

  if (choPerMl <= 0) return null;

  // Daily volume needed to equal curCho = curCho / choPerMl
  const dailyVol = curCho / choPerMl;
  const hourlyRate = dailyVol / 24;

  return Number(hourlyRate.toFixed(1));
}

/**
 * 產生標準化 HIS 格式醫囑與臨床備忘文字
 */
export function generateHisPrescriptionText(
  patient: PatientProfile,
  metrics: PatientMetrics,
  targets: NutrientValues,
  current: CalculatedRegimen,
  proposed: CalculatedRegimen,
  currentRegimen: RegimenConfig,
  proposedRegimen: RegimenConfig,
  dbMaps?: DbLookupMaps
): string {
  const mainMap = dbMaps?.main || MAIN_FORMULATIONS;
  const lipidMap = dbMaps?.lipid || LIPID_EMULSIONS;
  const traceMap = dbMaps?.trace || TRACE_ELEMENTS;
  const addMap = dbMaps?.add || ADDITIVES;

  const curMain = mainMap[currentRegimen.mainId]?.name || '未選擇主配方';
  const newMain = mainMap[proposedRegimen.mainId]?.name || '未選擇新配方';

  // Section 1: Comparison summary
  const summaryLine =
    `[臨床 TPN 處方轉換摘要]\n` +
    `病患資訊: ${patient.gender === 'male' ? '男' : '女'}, ${patient.age}歲, 體重 ${patient.weight}kg, 身高 ${patient.height}cm (BMI ${metrics.bmi})\n` +
    `目標需求: ${targets.kcal} kcal/d, 蛋白質 ${targets.protein} g/d (SF=${patient.sf}, AF=${patient.af})\n` +
    `目前配方: ${curMain} (${Math.round(current.volume)} ml/d) -> 提供 ${Math.round(current.kcal)} kcal, 蛋白質 ${current.protein.toFixed(1)}g (GIR ${current.gir.toFixed(2)})\n` +
    `新處方案: ${newMain} (${Math.round(proposed.volume)} ml/d) -> 提供 ${Math.round(proposed.kcal)} kcal, 蛋白質 ${proposed.protein.toFixed(1)}g (GIR ${proposed.gir.toFixed(2)})`;

  // Section 2: Order line for HIS
  let additivesStr = '';
  if (Array.isArray(proposedRegimen.addRows)) {
    const addParts = proposedRegimen.addRows
      .filter((r) => r.addId && addMap[r.addId] && Number(r.vials) > 0)
      .map((r) => {
        const item = addMap[r.addId];
        const vol = r.vials * (item.vialVol || 0);
        return `${item.shortName || item.name} ${r.vials}支 (${vol}ml)`;
      });
    if (addParts.length > 0) {
      additivesStr = ' + ' + addParts.join(' + ');
    }
  }

  let traceStr = '';
  if (proposedRegimen.traceId && traceMap[proposedRegimen.traceId] && proposedRegimen.traceVials > 0) {
    const item = traceMap[proposedRegimen.traceId];
    traceStr = ` + ${item.shortName} ${proposedRegimen.traceVials}支 (${proposedRegimen.traceRatioText || 'auto'})`;
  }

  // Titration advice
  const isoRate = calculateSuggestedIsoChoRate(
    current.cho,
    proposedRegimen.mainId,
    proposedRegimen.isMainCustom,
    proposedRegimen.customMainPer1000.cho,
    dbMaps
  );
  const startRate = isoRate ? Math.round(isoRate) : 30;
  const targetRate = proposedRegimen.mainRate;

  const mainOrder =
    `1. 主配方醫囑:\n` +
    `   ${newMain} ${targetRate} ml/hr IV drip${additivesStr}${traceStr}\n` +
    `   [輸注滴定建議]: 建議由起始流速 ${startRate} ml/hr 開始，每 12 小時增加 10-15 ml/hr 直至目標 ${targetRate} ml/hr，維持血糖穩定。`;

  // Section 3: Lipid emulsion
  let lipidOrder = '2. 脂肪乳劑: 無需另加';
  if (proposedRegimen.subId && lipidMap[proposedRegimen.subId] && proposedRegimen.subVials > 0) {
    const lipidItem = lipidMap[proposedRegimen.subId];
    const lipidVol = proposedRegimen.subVials * (lipidItem.vialVol || 0);
    lipidOrder =
      `2. 脂肪乳劑醫囑:\n` +
      `   ${lipidItem.name} ${proposedRegimen.subVials}瓶 (共 ${lipidVol} ml/d) IV drip\n` +
      `   [輸注叮嚀]: 建議以輸液幫浦慢速獨立通路給予 (流速 15-20 ml/hr，至少維持 12-16 小時輸畢)。`;
  }

  // Section 4: Safety checkpoints
  const girAlert =
    proposed.gir > 5.0
      ? `[⚠️ GIR 警示]: 新配方 GIR 為 ${proposed.gir.toFixed(2)} mg/kg/min 超過 5.0 安全上限，請密切追蹤血糖並考量減速或降醣處置！`
      : `[GIR 正常]: 新配方 GIR 為 ${proposed.gir.toFixed(2)} mg/kg/min (正常範圍 2.0-4.0)。`;

  const routeAlert = proposed.isPeripheralSafe
    ? `[給藥途徑]: 估算滲透壓 ${proposed.estimatedOsmolarity} mOsm/L (<= 900 mOsm/L，可經由周邊靜脈 PPN 給藥)。`
    : `[⚠️ 給藥途徑]: 估算滲透壓 ${proposed.estimatedOsmolarity} mOsm/L (> 900 mOsm/L，必須由中心靜脈導管 CVC / PICC 給藥，禁止周邊輸注！)。`;

  const caPAlert =
    proposed.caPRisk === 'high_risk'
      ? `[⚠️ 鈣磷沉澱風險]: 鈣磷濃度總和達 ${proposed.caPProduct}，存在結晶沉澱風險！加藥時請務必先加入磷酸鹽搖勻，最後再加入鈣鹽。`
      : `[鈣磷相容性]: 鈣磷濃度總和 ${proposed.caPProduct} (正常安全溶解範圍內)。`;

  const npcNAlert = `[NPC:N 熱量氮比]: ${proposed.npcToNRatio}:1 (非蛋白熱量 ${proposed.npcKcal} kcal / 氮素 ${proposed.nitrogen}g)。`;

  // Compounding Feasibility Evaluation Stamp
  const compEval = evaluateCompoundingFeasibility(proposedRegimen, patient.weight, proposed);
  const compStamp =
    compEval.barrierIssues.length > 0
      ? `[❌ 藥局調配與進食狀態警示]:\n` + compEval.barrierIssues.map((b: string) => `   - ${b}`).join('\n')
      : `[✓ 藥局調配驗證]: 原料調配可行，注射用水空間 ${compEval.waterVol.toFixed(1)} ml/L，無物理沉澱或破乳阻礙。`;

  return [
    summaryLine,
    '',
    mainOrder,
    '',
    lipidOrder,
    '',
    '[臨床安全與藥師核對指標]:',
    girAlert,
    routeAlert,
    caPAlert,
    npcNAlert,
    '',
    compStamp,
    '',
    '※ 本建議醫囑係依據 ASPEN 指引與臨床常用產品試算，請處方醫師與臨床藥師核對病患最新生化數據後於 HIS 系統中開立。',
  ].join('\n');
}

/**
 * 藥局原料調配可行性與沉澱/破乳/無法使用狀態完整評估
 * 依據 2018.10.08 修訂版藥局調配濃度規格與知識庫指引
 */
export function evaluateCompoundingFeasibility(
  regimen: RegimenConfig,
  patientWeight: number,
  calculated: CalculatedRegimen,
  dbMaps?: DbLookupMaps
): CompoundingEvaluation {
  const mainMap = dbMaps?.main || MAIN_FORMULATIONS;
  const safeWeight = patientWeight > 0 ? patientWeight : 60;
  const isCustom = regimen.isMainCustom;
  const mainVol = regimen.mainVol || 1000;
  const ratioTo1000 = mainVol > 0 ? 1000 / mainVol : 1;

  // Extract per-1000ml nutrient amounts for main solution
  let per1000 = { ...regimen.customMainPer1000 };
  if (!isCustom && regimen.mainId && mainMap[regimen.mainId]) {
    const f = mainMap[regimen.mainId];
    per1000 = {
      kcal: f.kcal * 1000,
      protein: f.protein * 1000,
      lipid: f.lipid * 1000,
      cho: f.cho * 1000,
      na: f.na * 1000,
      k: f.k * 1000,
      p: f.p * 1000,
      ca: f.ca * 1000,
      mg: f.mg * 1000,
      zn: f.zn * 1000,
    };
  }

  // 1. Raw Ingredients Volume Breakdown (per 1000ml)
  const ingredients: CompoundingIngredient[] = [];

  // A. 50% Dextrose (G/W 50% = 0.5 g/ml)
  const choG = Math.max(0, per1000.cho || 0);
  const volD50W = choG / 0.5;
  ingredients.push({
    name: 'G/W 50% (高濃度葡萄糖)',
    spec: '0.5 g/ml (50% Dextrose)',
    volumeMl: Number(volD50W.toFixed(1)),
    note: `提供醣類 ${choG.toFixed(1)} g/L (${(choG / 10).toFixed(1)}%)`,
  });

  // B. Amino Acid Source
  const protG = Math.max(0, per1000.protein || 0);
  let aaName = 'Moriamin-SN 10% (綜合胺基酸)';
  let aaSpec = '0.1 g/ml (10% AA, 15.2 g N/L)';
  let aaFactor = 0.1;

  if (regimen.mainId === 'hepatic' || regimen.mainId === 'hepatic_926') {
    aaName = 'Aminopoly-H 7.15% (肝衰竭高BCAA)';
    aaSpec = '0.0715 g/ml (7.15% AA, 11.3 g N/L)';
    aaFactor = 0.0715;
  } else if (regimen.mainId === 'renal') {
    aaName = 'Nephrosteril 7% (腎衰竭專用)';
    aaSpec = '0.07 g/ml (7% AA, 10.8 g N/L)';
    aaFactor = 0.07;
  } else if (regimen.mainId === 'neonate_pn' || regimen.mainId === 'neonate_pn_a33') {
    aaName = 'Aminosteril Infant 10% (新生兒專用)';
    aaSpec = '0.1 g/ml (10% AA, 14.9 g N/L)';
    aaFactor = 0.1;
  }

  const volAA = protG / aaFactor;
  ingredients.push({
    name: aaName,
    spec: aaSpec,
    volumeMl: Number(volAA.toFixed(1)),
    note: `提供蛋白質/胺基酸 ${protG.toFixed(1)} g/L`,
  });

  // C. Phosphate Source
  const pMmol = Math.max(0, per1000.p || 0);
  let kFromPhos = 0;
  let naFromPhos = 0;

  if (regimen.mainId === 'renal') {
    // Renal uses Na Phosphate (Na 4 mEq/ml, P 3 mmol/ml)
    const volNaPhos = pMmol / 3.0;
    naFromPhos = volNaPhos * 4.0;
    ingredients.push({
      name: 'Na-Phosphate (磷酸鈉)',
      spec: 'Na 4 mEq/ml, P 3 mmol/ml',
      volumeMl: Number(volNaPhos.toFixed(1)),
      note: `提供磷 ${pMmol.toFixed(1)} mmol 及鈉 ${naFromPhos.toFixed(1)} mEq`,
    });
  } else {
    // Standard uses K Phosphate (K 4.4 mEq/ml, P 3 mmol/ml)
    const volKPhos = pMmol / 3.0;
    kFromPhos = volKPhos * 4.4;
    ingredients.push({
      name: 'K-Phosphate (磷酸鉀)',
      spec: 'K 4.4 mEq/ml, P 3 mmol/ml',
      volumeMl: Number(volKPhos.toFixed(1)),
      note: `提供磷 ${pMmol.toFixed(1)} mmol 及鉀 ${kFromPhos.toFixed(1)} mEq`,
    });
  }

  // D. Potassium Source (15% KCl = 2 mEq/ml)
  const targetK = Math.max(0, per1000.k || 0);
  const remainingK = Math.max(0, targetK - kFromPhos);
  const volKCl = remainingK / 2.0;
  ingredients.push({
    name: '15% KCl (氯化鉀注射液)',
    spec: '2 mEq/ml (每20ml含40 mEq)',
    volumeMl: Number(volKCl.toFixed(1)),
    note: `補足其餘鉀離子 ${remainingK.toFixed(1)} mEq (總K: ${targetK.toFixed(1)} mEq)`,
  });

  // E. Sodium Source (NaCl 4 mEq/ml; or Na Acetate for neonates)
  const targetNa = Math.max(0, per1000.na || 0);
  let naFromAcetate = 0;
  if (regimen.mainId === 'neonate_pn' || regimen.mainId === 'neonate_pn_a33') {
    const volAcetate = 13.0; // 26 mEq Acetate
    naFromAcetate = volAcetate * 2.0;
    ingredients.push({
      name: 'Na Acetate (醋酸鈉)',
      spec: '2 mEq/ml',
      volumeMl: volAcetate,
      note: `提供醋酸鹽 26 mEq 及鈉 26 mEq`,
    });
  }

  const remainingNa = Math.max(0, targetNa - naFromPhos - naFromAcetate);
  const volNaCl = remainingNa / 4.0;
  ingredients.push({
    name: 'NaCl (高濃度氯化鈉)',
    spec: '4 mEq/ml',
    volumeMl: Number(volNaCl.toFixed(1)),
    note: `補足其餘鈉離子 ${remainingNa.toFixed(1)} mEq (總Na: ${targetNa.toFixed(1)} mEq)`,
  });

  // F. Magnesium Source (10% MgSO4 = 0.81 mEq/ml)
  const targetMg = Math.max(0, per1000.mg || 0);
  const volMgSO4 = targetMg / 0.81;
  ingredients.push({
    name: '10% MgSO4 (硫酸鎂)',
    spec: '0.81 mEq/ml',
    volumeMl: Number(volMgSO4.toFixed(1)),
    note: `提供鎂離子 ${targetMg.toFixed(1)} mEq`,
  });

  // G. Calcium Source (10% Ca gluconate = 0.465 mEq/ml)
  const targetCa = Math.max(0, per1000.ca || 0);
  const volCaGluc = targetCa / 0.465;
  ingredients.push({
    name: '10% Ca Gluconate (葡萄糖酸鈣)',
    spec: '0.465 mEq/ml',
    volumeMl: Number(volCaGluc.toFixed(1)),
    note: `提供鈣離子 ${targetCa.toFixed(1)} mEq`,
  });

  // H. Zinc Source (ZnSO4 5.94 mg/ml, providing Zn ~1.35 mg/ml)
  const targetZn = Math.max(0, per1000.zn || 0);
  const volZn = targetZn > 0 ? targetZn / 1.35 : 0;
  ingredients.push({
    name: 'ZnSO4 (硫酸鋅)',
    spec: '5.94 mg/ml (~1.35 mg Zn/ml)',
    volumeMl: Number(volZn.toFixed(1)),
    note: `提供鋅微量元素 ${targetZn.toFixed(1)} mg`,
  });

  // I. MVI (綜合維他命)
  const volMVI = 2.1;
  ingredients.push({
    name: 'MVI (綜合維生素 1/3 set)',
    spec: '2.1 ~ 2.7 ml/bag',
    volumeMl: volMVI,
    note: '維生素常規添加',
  });

  // J. Sum & Sterile Water calculation
  const totalIngredientVol = ingredients.reduce((sum, item) => sum + item.volumeMl, 0);
  const waterVol = 1000 - totalIngredientVol;
  const isVolumeOverflow = waterVol < 0;

  ingredients.push({
    name: 'Water (滅菌注射用水)',
    spec: '補足總體積至 1000 ml',
    volumeMl: Number(waterVol.toFixed(1)),
    note: isVolumeOverflow
      ? '⚠️ 空間不足 (容量破表，無法加入水)'
      : `可添加注射用水 ${waterVol.toFixed(1)} ml`,
  });

  // 2. Safety Limit Checks (From 2018.10.08 Knowledge Base)
  const maxLimitsCheck = {
    k: {
      current: targetK,
      max: TPN_CLINICAL_LIMITS.kMaxPer1000ml,
      exceeded: targetK > TPN_CLINICAL_LIMITS.kMaxPer1000ml,
      note: '鉀上限 80 mEq/1000ml (週邊靜脈上限 40 mEq/L)',
    },
    mg: {
      current: targetMg,
      max: TPN_CLINICAL_LIMITS.mgMaxPer1000ml,
      exceeded: targetMg > TPN_CLINICAL_LIMITS.mgMaxPer1000ml,
      note: '鎂上限 15 mEq/1000ml (防低血壓與呼吸抑制)',
    },
    p: {
      current: pMmol,
      max: TPN_CLINICAL_LIMITS.pMaxPer1000ml,
      exceeded: pMmol > TPN_CLINICAL_LIMITS.pMaxPer1000ml,
      note: '磷上限 30 mmol/1000ml (避免過量引發高血磷與鈣磷沉澱)',
    },
    naPeripheral: {
      current: targetNa,
      max: TPN_CLINICAL_LIMITS.naPeripheralMaxPer1000ml,
      exceeded: targetNa > TPN_CLINICAL_LIMITS.naPeripheralMaxPer1000ml,
      note: '週邊靜脈鈉上限約 75 mEq/1000ml',
    },
  };

  // 3. Dextrose Infusion Rate (g/kg/hr)
  // Hourly Dextrose = (choG * (mainVol / 1000)) / 24 hr
  const hourlyDextroseG = calculated.cho / 24;
  const dextroseRateGPerKgHr = hourlyDextroseG / safeWeight;
  const isDextroseRateExceeded =
    dextroseRateGPerKgHr > TPN_CLINICAL_LIMITS.dextroseMaxRateGPerKgHr;

  // 4. Lipid Emulsion Cracking (Divalent Cations Ca + Mg <= 20 mEq/L)
  const liters = calculated.volume / 1000;
  const divalentCationsSum =
    liters > 0 ? (calculated.ca + calculated.mg) / liters : 0;
  const hasLipid = Boolean(regimen.subId && regimen.subVials > 0);
  const isLipidCrackingRisk =
    hasLipid && divalentCationsSum > TPN_CLINICAL_LIMITS.divalentCationCrackingLimit;

  // 5. Barrier Issues & Incompatibilities compilation
  const barrierIssues: string[] = [];
  const warningNotes: string[] = [];

  // Barrier 1: Volume Overflow
  if (isVolumeOverflow) {
    barrierIssues.push(
      `無法調劑出 (體積超出極限)：原料體積總和達 ${totalIngredientVol.toFixed(1)} ml 超過 1000 ml（注射用水空間為負值 ${waterVol.toFixed(1)} ml）。現有 50% 葡萄糖與 10% 胺基酸等原料濃度已達商業規格上限無法再濃縮，藥局無法調配此處方！請調降醣類或蛋白質濃度。`
    );
  }

  // Barrier 2: Precipitation Risk
  const caPProduct = calculated.caPProduct; // Ca + P sum
  const caConcentration = liters > 0 ? calculated.ca / liters : targetCa;
  const pConcentration = liters > 0 ? calculated.p / liters : pMmol;
  const caMultP = caConcentration * pConcentration;

  if (pMmol > TPN_CLINICAL_LIMITS.pMaxPer1000ml || caMultP > 300 || caPProduct > 45) {
    barrierIssues.push(
      `會沉澱無法輸注 (鈣磷析出結晶)：鈣(${caConcentration.toFixed(1)} mEq/L) 與磷(${pConcentration.toFixed(1)} mmol/L) 濃度乘積 (${caMultP.toFixed(0)}) 或總和 (${caPProduct.toFixed(1)}) 超出溶解度飽和界限，極易形成磷酸氫鈣 (CaHPO4) 不溶性白色結晶，輸注會引發致死性肺動脈微血管栓塞！必須降低鈣/磷量或改用有機磷 (Glycophos)。`
    );
  } else if (caPProduct > 30) {
    warningNotes.push(
      `鈣磷相容性臨界監控：調配時請務必先加入磷酸鹽搖勻稀釋，最後再加入葡萄糖酸鈣，避免局部高濃度析出沉澱。`
    );
  }

  // Barrier 3: Lipid Cracking Risk
  if (isLipidCrackingRisk) {
    barrierIssues.push(
      `乳劑破乳無法輸注 (脂質破乳)：處方二價陽離子總和 (Ca + Mg = ${divalentCationsSum.toFixed(1)} mEq/L) 超出脂質乳劑安全界限 (20 mEq/L)，會中和微粒表面負電荷導致乳油滴融合破乳（油水分離），輸注有極高脂肪栓塞致死風險！請將脂肪乳劑改為獨立通路分瓶輸注，嚴禁混於同一袋內。`
    );
  }

  // Barrier 4: Electrolyte Max Limits
  if (maxLimitsCheck.k.exceeded) {
    barrierIssues.push(
      `超出鉀濃度調配上限：目前鉀濃度 ${targetK.toFixed(1)} mEq/L 超過上限 80 mEq/1000ml，具引發致死性高血鉀與心臟驟停危險！`
    );
  }
  if (maxLimitsCheck.mg.exceeded) {
    barrierIssues.push(
      `超出鎂濃度調配上限：目前鎂濃度 ${targetMg.toFixed(1)} mEq/L 超過上限 15 mEq/1000ml，具引發低血壓與中樞呼吸抑制風險！`
    );
  }
  if (maxLimitsCheck.p.exceeded) {
    barrierIssues.push(
      `超出磷酸鹽調配上限：目前磷濃度 ${pMmol.toFixed(1)} mmol/L 超過上限 30 mmol/1000ml，易致低血鈣抽搐與沉澱！`
    );
  }

  // Warning 5: Dextrose Infusion Rate
  if (isDextroseRateExceeded) {
    warningNotes.push(
      `葡萄糖輸注速率超標 (當前 ${dextroseRateGPerKgHr.toFixed(2)} g/kg/hr > 0.25 g/kg/hr 上限)：易引起高血糖、高滲透壓非酮酸性昏迷、肝脂肪變性及 CO2 產生過量阻礙拔管。`
    );
  }

  // Warning 6: Peripheral Route Incompatibility
  const isPeripheralFormula =
    mainMap[regimen.mainId]?.isPeripheralAllowed ?? false;
  if (
    isPeripheralFormula &&
    (calculated.estimatedOsmolarity > 900 || targetNa > 75 || targetK > 40)
  ) {
    barrierIssues.push(
      `禁止週邊靜脈輸注：處方滲透壓 (${calculated.estimatedOsmolarity} mOsm/L > 900) 或鉀/鈉濃度過高，會引起劇烈化學性血栓性靜脈炎與皮膚壞死，必須經由中心靜脈導管 (CVC / PICC) 輸注！`
    );
  }

  // Status badge determination
  let status: CompoundingFeasibilityStatus = 'feasible';
  let badge: CompoundingEvaluation['statusBadge'] = {
    text: '✓ 可正常調劑與使用',
    level: 'success',
    summary: '符合藥局調配規格，注射用水足夠，無沉澱或破乳阻礙。',
  };

  if (barrierIssues.length > 0) {
    if (isVolumeOverflow) {
      status = 'cannot_compound';
      badge = {
        text: '❌ 無法調劑出 (體積容量破表)',
        level: 'danger',
        summary: `原料總量 (${totalIngredientVol.toFixed(1)} ml) 超過 1000 ml，注射用水呈現負值。`,
      };
    } else if (pMmol > 30 || caMultP > 300 || caPProduct > 45) {
      status = 'precipitation_risk';
      badge = {
        text: '⚠️ 會沉澱無法輸注 (鈣磷結晶)',
        level: 'danger',
        summary: '鈣磷濃度超飽和，具肺動脈微栓塞致死風險。',
      };
    } else if (isLipidCrackingRisk) {
      status = 'lipid_cracking_risk';
      badge = {
        text: '⚠️ 脂質破乳無法輸注',
        level: 'danger',
        summary: `二價陽離子總和 (${divalentCationsSum.toFixed(1)} mEq/L) 超標，乳劑油水分離。`,
      };
    } else {
      status = 'cannot_compound';
      badge = {
        text: '❌ 超出臨床安全極限',
        level: 'danger',
        summary: '電解質濃度或輸注途徑超出指引上限。',
      };
    }
  } else if (warningNotes.length > 0) {
    badge = {
      text: '⚠️ 需調配注意 (有警示項目)',
      level: 'warning',
      summary: '原料可調出，但包含接近臨界上限之生化指標。',
    };
  }

  return {
    isFeasible: barrierIssues.length === 0,
    status,
    statusBadge: badge,
    barrierIssues,
    warningNotes,
    totalIngredientVol: Number(totalIngredientVol.toFixed(1)),
    waterVol: Number(waterVol.toFixed(1)),
    isVolumeOverflow,
    dextroseRateGPerKgHr: Number(dextroseRateGPerKgHr.toFixed(3)),
    isDextroseRateExceeded,
    divalentCationsSum: Number(divalentCationsSum.toFixed(1)),
    isLipidCrackingRisk,
    ingredients,
    maxLimitsCheck,
  };
}

/**
 * 臨床校正公式 (知識庫內建實證運算工具)
 */

// 1. 校正白蛋白鈣 (Corrected Calcium)
// Corrected Ca = 0.8 * (4.0 - Alb g/dL) + Serum Ca mg/dL
export function calculateCorrectedCa(serumCa: number, serumAlbumin: number): number {
  if (!serumCa) return 0;
  const alb = serumAlbumin > 0 ? serumAlbumin : 4.0;
  const corrected = 0.8 * (4.0 - alb) + serumCa;
  return Number(corrected.toFixed(2));
}

// 2. 鈉離子缺損量 (Na Deficit)
// Na deficit (mmol) = (Desired Na - Observed Na) * 0.6 * weight (kg)
export function calculateNaDeficit(desiredNa: number, observedNa: number, weightKg: number): number {
  if (!desiredNa || !observedNa || !weightKg) return 0;
  const deficit = (desiredNa - observedNa) * 0.6 * weightKg;
  return Number(deficit.toFixed(1));
}

// 3. 輸注後預估血鈉變化 (Change in Serum Sodium)
// Delta [Na] = (Infusate Na - Serum Na) / (TBW + 1), where TBW ≈ weight * 0.6
export function calculateSerumNaDelta(
  infusateNaMeqPerL: number,
  serumNa: number,
  weightKg: number
): number {
  if (!weightKg) return 0;
  const tbw = weightKg * 0.6;
  const delta = (infusateNaMeqPerL - serumNa) / (tbw + 1);
  return Number(delta.toFixed(2));
}

