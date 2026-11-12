/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { PatientAssessment } from './components/PatientAssessment';
import { FormulaConfigurator } from './components/FormulaConfigurator';
import { GapAnalysisTable } from './components/GapAnalysisTable';
import { CompoundingInspector } from './components/CompoundingInspector';
import { ClinicalSafetyPanel } from './components/ClinicalSafetyPanel';
import { PrescriptionOutput } from './components/PrescriptionOutput';
import { ClinicalPresetModal } from './components/ClinicalPresetModal';
import { DatabaseManagerModal } from './components/DatabaseManagerModal';
import { MobilePhaseNav, ClinicalPhase } from './components/MobilePhaseNav';
import {
  PatientProfile,
  RegimenConfig,
  NutrientValues,
  ClinicalCasePreset,
} from './types/tpn';
import {
  calculatePatientMetrics,
  calculateDefaultTargets,
  calculateRegimenTotals,
  generateGapRows,
  evaluateCompoundingFeasibility,
} from './utils/tpnCalculations';
import { DatabaseProvider, useTpnDatabase } from './context/DatabaseContext';

function AppContent() {
  const {
    mainFormulations,
    lipidEmulsions,
    traceElements,
    additives,
    compoundingRawSpecs,
    clinicalLimits,
  } = useTpnDatabase();

  const dbMaps = useMemo(
    () => ({
      main: mainFormulations,
      lipid: lipidEmulsions,
      trace: traceElements,
      add: additives,
      specs: compoundingRawSpecs,
      limits: clinicalLimits,
    }),
    [
      mainFormulations,
      lipidEmulsions,
      traceElements,
      additives,
      compoundingRawSpecs,
      clinicalLimits,
    ]
  );

  // Modals State
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | undefined>('post_op_icu');

  // Mobile Navigation State
  const [activePhase, setActivePhase] = useState<ClinicalPhase>('patient');
  const [isFocusMode, setIsFocusMode] = useState(false);

  // 1. Patient Profile State
  const [patient, setPatient] = useState<PatientProfile>({
    gender: 'male',
    age: 65,
    height: 168,
    weight: 65,
    af: 1.0,
    sf: 1.2,
    useAdjustedWeight: false,
  });

  // Derived patient metrics
  const patientMetrics = useMemo(() => {
    return calculatePatientMetrics(patient);
  }, [patient]);

  // Derived guideline targets
  const guidelineTargets = useMemo(() => {
    return calculateDefaultTargets(patient, patientMetrics);
  }, [patient, patientMetrics]);

  // Custom user-adjusted targets (initialized with guideline targets)
  const [customTargets, setCustomTargets] = useState<NutrientValues | null>(null);

  const targets = customTargets || guidelineTargets;

  const handleResetTargets = () => {
    setCustomTargets(null);
  };

  // Helper to extract default concentration for main formula
  const getInitialPer1000 = (mainId: string): NutrientValues => {
    const item = mainFormulations[mainId];
    if (!item) {
      return { kcal: 0, protein: 0, lipid: 0, cho: 0, na: 0, k: 0, p: 0, ca: 0, mg: 0, zn: 0 };
    }
    return {
      kcal: Number(((item.kcal || 0) * 1000).toFixed(1)),
      protein: Number(((item.protein || 0) * 1000).toFixed(1)),
      lipid: Number(((item.lipid || 0) * 1000).toFixed(1)),
      cho: Number(((item.cho || 0) * 1000).toFixed(1)),
      na: Number(((item.na || 0) * 1000).toFixed(1)),
      k: Number(((item.k || 0) * 1000).toFixed(1)),
      p: Number(((item.p || 0) * 1000).toFixed(1)),
      ca: Number(((item.ca || 0) * 1000).toFixed(1)),
      mg: Number(((item.mg || 0) * 1000).toFixed(1)),
      zn: Number(((item.zn || 0) * 1000).toFixed(1)),
    };
  };

  // 2. Current Regimen State (目前配方)
  const [currentRegimen, setCurrentRegimen] = useState<RegimenConfig>({
    mainId: 'std_a5d21',
    mainRate: 41.7,
    mainVol: 1000,
    isMainCustom: false,
    customMainPer1000: getInitialPer1000('std_a5d21'),
    subId: '',
    subVials: 0,
    subVol: 0,
    traceId: 'addamel',
    traceVials: 1,
    traceRatioText: '10.0 ml/L',
    addRows: [
      { id: 'cur_add_1', addId: 'lyo_povigen', vials: 1, vol: 10 },
    ],
  });

  // 3. Proposed Regimen State (新配方)
  const [proposedRegimen, setProposedRegimen] = useState<RegimenConfig>({
    mainId: 'smof_c',
    mainRate: 61.5,
    mainVol: 1477,
    isMainCustom: false,
    customMainPer1000: getInitialPer1000('smof_c'),
    subId: '',
    subVials: 0,
    subVol: 0,
    traceId: 'addamel',
    traceVials: 1,
    traceRatioText: '10.0 ml/L',
    addRows: [
      { id: 'prop_add_1', addId: 'lyo_povigen', vials: 1, vol: 10 },
      { id: 'prop_add_2', addId: 'nacl', vials: 0.5, vol: 10 },
    ],
  });

  // Calculations for Current and Proposed
  const currentCalculated = useMemo(() => {
    return calculateRegimenTotals(currentRegimen, patient.weight, dbMaps);
  }, [currentRegimen, patient.weight, dbMaps]);

  const proposedCalculated = useMemo(() => {
    return calculateRegimenTotals(proposedRegimen, patient.weight, dbMaps);
  }, [proposedRegimen, patient.weight, dbMaps]);

  // Compounding feasibility evaluations
  const currentCompounding = useMemo(() => {
    return evaluateCompoundingFeasibility(currentRegimen, patient.weight, currentCalculated, dbMaps);
  }, [currentRegimen, patient.weight, currentCalculated, dbMaps]);

  const proposedCompounding = useMemo(() => {
    return evaluateCompoundingFeasibility(proposedRegimen, patient.weight, proposedCalculated, dbMaps);
  }, [proposedRegimen, patient.weight, proposedCalculated, dbMaps]);

  // Gap analysis rows
  const gapRows = useMemo(() => {
    return generateGapRows(targets, currentCalculated, proposedCalculated);
  }, [targets, currentCalculated, proposedCalculated]);

  // Copy current regimen to proposed
  const handleCopyCurrentToProposed = () => {
    setProposedRegimen({
      ...currentRegimen,
      addRows: currentRegimen.addRows.map((r) => ({ ...r, id: `prop_copy_${r.id}` })),
    });
  };

  // Select Preset case
  const handleSelectPreset = (preset: ClinicalCasePreset) => {
    setActivePresetId(preset.id);
    setPatient({ ...preset.patient });

    const curMain = preset.currentRegimen.mainId;
    const curVol = mainFormulations[curMain]?.vialVol || 1000;
    setCurrentRegimen({
      mainId: curMain,
      mainRate: preset.currentRegimen.mainRate,
      mainVol: curVol,
      isMainCustom: false,
      customMainPer1000: getInitialPer1000(curMain),
      subId: preset.currentRegimen.subId || '',
      subVials: preset.currentRegimen.subVials || 0,
      subVol:
        (preset.currentRegimen.subVials || 0) *
        (preset.currentRegimen.subId ? lipidEmulsions[preset.currentRegimen.subId]?.vialVol || 0 : 0),
      traceId: preset.currentRegimen.traceId || '',
      traceVials: preset.currentRegimen.traceVials || 0,
      traceRatioText: preset.currentRegimen.traceId ? '6.8 ml/L' : '',
      addRows: (preset.currentRegimen.addRows || []).map((row, idx) => ({
        id: `preset_cur_${idx}`,
        addId: row.addId,
        vials: row.vials,
        vol: row.vials * (row.addId ? additives[row.addId]?.vialVol || 0 : 0),
      })),
    });

    if (preset.suggestedProposed) {
      const propMain = preset.suggestedProposed.mainId;
      const propVol = mainFormulations[propMain]?.vialVol || 1000;
      setProposedRegimen({
        mainId: propMain,
        mainRate: preset.suggestedProposed.mainRate,
        mainVol: propVol,
        isMainCustom: false,
        customMainPer1000: getInitialPer1000(propMain),
        subId: preset.suggestedProposed.subId || '',
        subVials: preset.suggestedProposed.subVials || 0,
        subVol:
          (preset.suggestedProposed.subVials || 0) *
          (preset.suggestedProposed.subId ? lipidEmulsions[preset.suggestedProposed.subId]?.vialVol || 0 : 0),
        traceId: preset.suggestedProposed.traceId || '',
        traceVials: preset.suggestedProposed.traceVials || 0,
        traceRatioText: preset.suggestedProposed.traceId ? '6.8 ml/L' : '',
        addRows: (preset.suggestedProposed.addRows || []).map((row, idx) => ({
          id: `preset_prop_${idx}`,
          addId: row.addId,
          vials: row.vials,
          vol: row.vials * (row.addId ? additives[row.addId]?.vialVol || 0 : 0),
        })),
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Phase selection handler with smooth scroll
  const handleSelectPhase = (phase: ClinicalPhase) => {
    setActivePhase(phase);
    if (!isFocusMode) {
      const el = document.getElementById(`section-${phase}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 pb-28 lg:pb-16 antialiased">
      {/* Top Bar Header */}
      <Header
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onPrint={handlePrint}
      />

      {/* Main Workspace Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-5 sm:space-y-6">

        {/* Standalone HTML Execution Mode Banner */}
        <div className="bg-linear-to-r from-amber-50 via-teal-50/50 to-emerald-50 border border-amber-300/80 rounded-2xl p-3.5 sm:p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 border border-amber-400 flex items-center justify-center text-lg shrink-0">
              🌐
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 flex flex-wrap items-center gap-2">
                <span>已提供純 HTML 單一檔案獨立執行版本 (Standalone HTML Mode)</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  離線雙擊即用・無需伺服器
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 max-w-3xl leading-relaxed">
                為滿足醫院內網受限環境、封閉電腦或臨床平板即時需求，本系統已完整重寫為<strong>純 HTML 單一獨立檔案 (<code className="text-teal-800 font-mono">tpn_app.html</code>)</strong>，內建完整 2018.10.08 調劑物理體積推演、破乳沉澱禁忌警示、差距分析及 Excel 相容 CSV 藥庫匯入匯出。
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <a
              href="/tpn_app.html"
              download="TPN_Clinical_Prescription_Studio.html"
              className="flex-1 md:flex-none text-center px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              📥 下載單檔 HTML
            </a>
            <a
              href="/tpn_app.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 md:flex-none text-center px-3.5 py-2 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 whitespace-nowrap"
            >
              🚀 開啟 HTML 獨立分頁
            </a>
          </div>
        </div>
        
        {/* Phase 1: Patient Assessment & Targets */}
        <div
          id="section-patient"
          className={`${isFocusMode && activePhase !== 'patient' ? 'hidden lg:block' : 'block'}`}
        >
          <PatientAssessment
            patient={patient}
            metrics={patientMetrics}
            targets={targets}
            onPatientChange={(updated) => {
              setPatient(updated);
              setActivePresetId(undefined);
            }}
            onTargetChange={(updatedTargets) => setCustomTargets(updatedTargets)}
            onResetTargets={handleResetTargets}
          />
        </div>

        {/* Phase 2: Formula Configurator (Side-by-Side Current vs Proposed) */}
        <div
          id="section-formula"
          className={`${isFocusMode && activePhase !== 'formula' ? 'hidden lg:block' : 'block'}`}
        >
          <FormulaConfigurator
            currentRegimen={currentRegimen}
            proposedRegimen={proposedRegimen}
            currentCalculated={currentCalculated}
            proposedCalculated={proposedCalculated}
            patientWeight={patient.weight}
            onCurrentChange={setCurrentRegimen}
            onProposedChange={setProposedRegimen}
            onCopyCurrentToProposed={handleCopyCurrentToProposed}
          />
        </div>

        {/* Phase 3: Comprehensive Gap Analysis Table */}
        <div
          id="section-analysis"
          className={`${isFocusMode && activePhase !== 'analysis' ? 'hidden lg:block' : 'block'}`}
        >
          <GapAnalysisTable
            rows={gapRows}
            currentCalculated={currentCalculated}
            proposedCalculated={proposedCalculated}
            targets={targets}
            currentMainId={currentRegimen.mainId}
            proposedMainId={proposedRegimen.mainId}
          />
        </div>

        {/* Phase 4: Pharmacy Compounding Simulation & Incompatibilities */}
        <div
          id="section-compounding"
          className={`${isFocusMode && activePhase !== 'compounding' ? 'hidden lg:block' : 'block'}`}
        >
          <CompoundingInspector
            proposedEvaluation={proposedCompounding}
            currentEvaluation={currentCompounding}
            proposedMainName={mainFormulations[proposedRegimen.mainId]?.name || '自訂微調配方'}
            patientWeight={patient.weight}
            proposedInfusateNaMeqPerL={
              proposedCalculated.volume > 0
                ? (proposedCalculated.na / proposedCalculated.volume) * 1000
                : 0
            }
          />
        </div>

        {/* Phase 5: Clinical Safety Guardrails */}
        <div
          id="section-safety"
          className={`${isFocusMode && activePhase !== 'safety' ? 'hidden lg:block' : 'block'}`}
        >
          <ClinicalSafetyPanel
            currentCalculated={currentCalculated}
            proposedCalculated={proposedCalculated}
            patient={patient}
          />
        </div>

        {/* Phase 6: Standardized HIS Prescription Order Output */}
        <div
          id="section-order"
          className={`${isFocusMode && activePhase !== 'order' ? 'hidden lg:block' : 'block'}`}
        >
          <PrescriptionOutput
            patient={patient}
            metrics={patientMetrics}
            targets={targets}
            currentCalculated={currentCalculated}
            proposedCalculated={proposedCalculated}
            currentRegimen={currentRegimen}
            proposedRegimen={proposedRegimen}
          />
        </div>

        {/* Clinical Evidence Reference Footer */}
        <footer className="text-[11px] text-slate-500 bg-white p-4 rounded-xl border border-slate-200/80 space-y-1">
          <div className="font-bold text-slate-700">實證指引依據與臨床參考規範 (Clinical References & Compounding Specs):</div>
          <ul className="list-disc pl-5 space-y-0.5 text-slate-500">
            <li><strong>基礎代謝率 (BMR):</strong> Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990.</li>
            <li><strong>靜脈營養指引:</strong> ASPEN Guidelines for the Provision and Assessment of Nutrition Support Therapy in the Adult Critically Ill Patient / ESPEN Guidelines on Adult Parenteral Nutrition.</li>
            <li><strong>藥局調劑相容性與原料規格 (2018.10.08):</strong> G/W 50%、Moriamin-SN 10%、Aminopoly-H 7.15%、Nephrosteril 7%、Aminosteril 10%、高濃度電解質 (NaCl 4 mEq/ml, K/Na Phosphate 3 mmol P/ml)；嚴格檢核無菌注射用水剩餘空間，防止物理體積溢出。</li>
            <li><strong>物理沉澱與破乳限制 (禁止進食使用):</strong> 鈣磷結晶 [Ca] + [P] &gt; 45 或 Ca × P &gt; 300；三合一脂肪乳劑二價陽離子總和 [Ca²⁺] + [Mg²⁺] &gt; 20 mEq/L 引發破乳破壞；周邊靜脈 K &gt; 40 mEq/L 或滲透壓 &gt; 900 mOsm/L 具嚴重靜脈炎壞死風險。</li>
            <li><strong>葡萄糖輸注率 (GIR):</strong> 建議維持在 2.0 - 4.0 mg/kg/min，上限不宜超過 0.25 g/kg/hr (~4.16 mg/kg/min) 以防高血糖高滲透壓。</li>
          </ul>
        </footer>

      </main>

      {/* Mobile Sticky Bottom Navigation Dock */}
      <MobilePhaseNav
        activePhase={activePhase}
        onSelectPhase={handleSelectPhase}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
        onOpenDatabase={() => setIsDatabaseOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        hasBarrierIssues={proposedCompounding.barrierIssues.length > 0}
      />

      {/* Clinical Case Presets Modal */}
      <ClinicalPresetModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* Database Management Modal (Export / Import / Catalog) */}
      <DatabaseManagerModal
        isOpen={isDatabaseOpen}
        onClose={() => setIsDatabaseOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}
