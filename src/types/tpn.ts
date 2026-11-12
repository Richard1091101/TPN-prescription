export type Gender = 'male' | 'female';

export interface PatientProfile {
  gender: Gender;
  age: number;
  height: number; // cm
  weight: number; // kg
  af: number; // Activity factor (1.0 - 1.3)
  sf: number; // Stress factor (1.0 - 2.0)
  useAdjustedWeight?: boolean; // When BMI >= 30
}

export interface PatientMetrics {
  bmi: number;
  ibw: number; // Ideal Body Weight (Devine formula)
  adjustedWeight: number; // Adjusted Body Weight for obesity
  isObese: boolean;
  bmr: number; // Mifflin-St Jeor (kcal/d)
  tee: number; // Total Energy Expenditure = BMR * AF * SF
}

export interface NutrientValues {
  kcal: number;
  protein: number; // g
  lipid: number;   // g
  cho: number;     // g
  na: number;      // mEq
  k: number;       // mEq
  p: number;       // mmol
  ca: number;      // mEq
  mg: number;      // mEq
  zn: number;      // mg
}

export interface FormulationItem extends NutrientValues {
  id: string;
  name: string;
  shortName?: string;
  category: 'main' | 'sub' | 'trace' | 'add';
  vialVol?: number; // ml per vial/bag
  description?: string;
  isPeripheralAllowed?: boolean;
}

export interface AddonEntry {
  id: string;
  addId: string;
  vials: number;
  vol: number;
}

export interface RegimenConfig {
  mainId: string;
  mainRate: number; // ml/hr
  mainVol: number;  // ml/day
  isMainCustom: boolean;
  customMainPer1000: NutrientValues;
  subId: string;
  subVials: number;
  subVol: number;
  traceId: string;
  traceVials: number;
  traceRatioText: string;
  addRows: AddonEntry[];
}

export interface CalculatedRegimen extends NutrientValues {
  volume: number;
  gir: number; // Glucose Infusion Rate (mg/kg/min)
  nitrogen: number; // g
  npcKcal: number; // Non-protein calories (kcal)
  npcToNRatio: number; // NPC:N (e.g. 120:1)
  estimatedOsmolarity: number; // mOsm/L
  isPeripheralSafe: boolean; // Osmolarity <= 900 mOsm/L
  caPProduct: number; // Ca(mEq/L) * P(mmol/L) or combined sum
  caPRisk: 'safe' | 'borderline' | 'high_risk';
  macroPct: {
    cho: number;
    protein: number;
    lipid: number;
  };
}

export interface GapRowData {
  key: keyof NutrientValues | 'volume' | 'gir' | 'npcToNRatio' | 'osmolarity';
  label: string;
  unit: string;
  target: number;
  current: number;
  currentGap: number;
  currentPerL: number | null;
  proposed: number;
  proposedGap: number;
  proposedPerL: number | null;
  netChange: number;
  threshold: number;
  decimals: number;
  currentStatus: 'deficit' | 'surplus' | 'target';
  proposedStatus: 'deficit' | 'surplus' | 'target';
}

export interface CompoundingIngredient {
  name: string;
  spec: string;
  volumeMl: number;
  note?: string;
}

export type CompoundingFeasibilityStatus =
  | 'feasible'                  // 可正常調劑
  | 'cannot_compound'           // 無法調劑出 (體積超出/原料超標)
  | 'precipitation_risk'        // 沉澱危險 (鈣磷不相容)
  | 'lipid_cracking_risk'       // 脂質乳劑瓦解破乳 (Ca+Mg過高)
  | 'peripheral_incompatible';  // 週邊靜脈禁用 (高滲透壓/高鉀/高鈉)

export interface CompoundingEvaluation {
  isFeasible: boolean;
  status: CompoundingFeasibilityStatus;
  statusBadge: {
    text: string;
    level: 'success' | 'warning' | 'danger';
    summary: string;
  };
  barrierIssues: string[]; // 致命阻礙：導致「無法調劑出」或「沉澱禁用」
  warningNotes: string[];  // 臨床警語：需特別注意的上限或調配順序
  totalIngredientVol: number; // 原料體積總和 (ml/1000ml)
  waterVol: number; // 剩餘可加注射用水 (ml/1000ml)，若 < 0 代表無法調出
  isVolumeOverflow: boolean;
  dextroseRateGPerKgHr: number; // g/kg/hr (KB上限 < 0.25)
  isDextroseRateExceeded: boolean;
  divalentCationsSum: number; // Ca + Mg (mEq/L)，三合一破乳上限 20 mEq/L
  isLipidCrackingRisk: boolean;
  ingredients: CompoundingIngredient[];
  maxLimitsCheck: {
    k: { current: number; max: number; exceeded: boolean; note: string };
    mg: { current: number; max: number; exceeded: boolean; note: string };
    p: { current: number; max: number; exceeded: boolean; note: string };
    naPeripheral: { current: number; max: number; exceeded: boolean; note: string };
  };
}

export interface ClinicalCalculatorInputs {
  serumAlbumin: number; // g/dL
  serumCa: number;      // mg/dL
  serumNa: number;      // mEq/L
  desiredNa: number;    // mEq/L
  patientWeight: number;// kg
}

export interface ClinicalCalculatorResults {
  correctedCa: number;  // mg/dL
  naDeficitMmol: number;// mmol
  serumNaDelta: number; // mEq/L per liter of TPN
}

export interface ClinicalCasePreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  patient: PatientProfile;
  currentRegimen: {
    mainId: string;
    mainRate: number;
    subId?: string;
    subVials?: number;
    traceId?: string;
    traceVials?: number;
    addRows?: Array<{ addId: string; vials: number }>;
  };
  suggestedProposed?: {
    mainId: string;
    mainRate: number;
    subId?: string;
    subVials?: number;
    traceId?: string;
    traceVials?: number;
    addRows?: Array<{ addId: string; vials: number }>;
  };
}

export interface TpnDatabasePackage {
  version: string;
  systemName: string;
  exportedAt: string;
  description?: string;
  mainFormulations: Record<string, FormulationItem>;
  lipidEmulsions: Record<string, FormulationItem>;
  traceElements: Record<string, FormulationItem>;
  additives: Record<string, FormulationItem>;
  compoundingRawSpecs?: Record<string, any>;
  clinicalLimits?: Record<string, number>;
}

export interface DatabaseValidationSummary {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    mainCount: number;
    lipidCount: number;
    traceCount: number;
    additiveCount: number;
  };
}

