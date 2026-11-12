import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Gauge,
  Syringe,
  AlertOctagon,
  Scale,
  CheckCircle,
} from 'lucide-react';
import { CalculatedRegimen, PatientProfile } from '../types/tpn';

interface ClinicalSafetyPanelProps {
  currentCalculated: CalculatedRegimen;
  proposedCalculated: CalculatedRegimen;
  patient: PatientProfile;
}

export const ClinicalSafetyPanel: React.FC<ClinicalSafetyPanelProps> = ({
  currentCalculated,
  proposedCalculated,
  patient,
}) => {
  // GIR analysis
  const gir = proposedCalculated.gir;
  let girStatus: { level: 'good' | 'warn' | 'danger'; text: string; note: string } = {
    level: 'good',
    text: '安全 (Optimal)',
    note: 'GIR 在成人生理耐受範圍 2-4 mg/kg/min 內，血糖與呼吸商穩定。',
  };
  if (gir > 5.0) {
    girStatus = {
      level: 'danger',
      text: '⚠️ 超標危險 (> 5.0)',
      note: '高於肝臟最大醣代謝上限，極易誘發高血糖、高滲透性利尿、肝脂肪變性及 CO2 生成增加。',
    };
  } else if (gir > 4.0) {
    girStatus = {
      level: 'warn',
      text: '注意監控 (4.0 - 5.0)',
      note: '接近代謝上限，重症及糖尿病患需嚴密每 4-6 小時監測指尖血糖 (Target 140-180 mg/dL)。',
    };
  }

  // Osmolarity analysis
  const osm = proposedCalculated.estimatedOsmolarity;
  const isPeripheralSafe = proposedCalculated.isPeripheralSafe;

  // Calcium Phosphate Precipitation
  const caPRisk = proposedCalculated.caPRisk;

  // NPC:N Stress assessment
  const npcN = proposedCalculated.npcToNRatio;
  let npcNAdvice = '適合一般維持營養 (150:1 ~ 200:1)';
  if (patient.sf >= 1.5) {
    npcNAdvice = '重症高代謝狀態建議熱量氮比 80:1 ~ 100:1';
  } else if (patient.sf >= 1.2) {
    npcNAdvice = '中度創傷/大手術建議熱量氮比 100:1 ~ 150:1';
  }

  return (
    <section id="section-safety" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
          5
        </div>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
            臨床給藥安全防線與藥師核對儀表
            <span className="text-xs font-normal text-slate-500 hidden sm:inline">(Clinical Safety Guardrails)</span>
          </h2>
          <p className="text-xs text-slate-500">
            自動校核 GIR 速率、輸注途徑滲透壓限制、鈣磷相容性沉澱與 NPC:N 熱量氮比
          </p>
        </div>
      </div>

      {/* 4 Key Safety Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        {/* Card 1: GIR */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            girStatus.level === 'danger'
              ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
              : girStatus.level === 'warn'
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-emerald-50/50 border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Gauge className="w-4 h-4 text-teal-600" />
              GIR 葡萄糖輸注速率
            </span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                girStatus.level === 'danger'
                  ? 'bg-rose-200 text-rose-800'
                  : girStatus.level === 'warn'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-emerald-200 text-emerald-800'
              }`}
            >
              {girStatus.text}
            </span>
          </div>

          <div className="text-2xl font-black tabular-nums text-slate-900 mb-1">
            {gir.toFixed(2)} <span className="text-xs font-medium text-slate-500">mg/kg/min</span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {girStatus.note}
          </p>
        </div>

        {/* Card 2: Osmolarity & Route */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isPeripheralSafe
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-sky-50/70 border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Syringe className="w-4 h-4 text-sky-600" />
              滲透壓與給藥途徑
            </span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                isPeripheralSafe
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-sky-200 text-sky-900'
              }`}
            >
              {isPeripheralSafe ? '周邊可 PPN' : '需中心 CVC'}
            </span>
          </div>

          <div className="text-2xl font-black tabular-nums text-slate-900 mb-1">
            {osm} <span className="text-xs font-medium text-slate-500">mOsm/L</span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {isPeripheralSafe ? (
              <span>
                估算滲透壓 &le; 900 mOsm/L，符合周邊靜脈安全規範，不易誘發周邊化學性靜脈炎。
              </span>
            ) : (
              <span className="text-sky-950 font-medium">
                估算滲透壓 &gt; 900 mOsm/L，<strong>必須經由中心靜脈導管 (CVC / PICC) 輸注</strong>，禁止周邊給藥以防靜脈硬化壞死。
              </span>
            )}
          </p>
        </div>

        {/* Card 3: Calcium-Phosphate Solubility */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            caPRisk === 'high_risk'
              ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200'
              : caPRisk === 'borderline'
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-teal-50/50 border-teal-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <AlertOctagon className="w-4 h-4 text-amber-600" />
              鈣磷沉澱相容性
            </span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                caPRisk === 'high_risk'
                  ? 'bg-rose-200 text-rose-800'
                  : caPRisk === 'borderline'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-teal-200 text-teal-800'
              }`}
            >
              {caPRisk === 'high_risk' ? '⚠️ 高風險' : caPRisk === 'borderline' ? '臨界監控' : '安全溶解'}
            </span>
          </div>

          <div className="text-2xl font-black tabular-nums text-slate-900 mb-1">
            {proposedCalculated.caPProduct} <span className="text-xs font-medium text-slate-500">Ca+P 濃度總和</span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {caPRisk === 'high_risk' ? (
              <span className="text-rose-800 font-semibold">
                濃度總和 &gt; 45，極易形成磷酸氫鈣沉澱微栓塞！建議選用有機磷 (Glycophos) 或分開靜脈輸注。
              </span>
            ) : (
              <span>
                調劑防線：加藥時<strong>請務必先加入磷酸鹽搖勻稀釋</strong>，最後再加入鈣鹽，避免局部高濃度析出結晶。
              </span>
            )}
          </p>
        </div>

        {/* Card 4: NPC:N Ratio */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Scale className="w-4 h-4 text-teal-600" />
              非蛋白熱量氮比 (NPC:N)
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
              {npcN > 0 ? `${npcN}:1` : '--'}
            </span>
          </div>

          <div className="text-2xl font-black tabular-nums text-slate-900 mb-1">
            {proposedCalculated.nitrogen} <span className="text-xs font-medium text-slate-500">g 氮素 (Nitrogen)</span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            非蛋白熱量 {proposedCalculated.npcKcal} kcal。{npcNAdvice}，確保所給予之胺基酸有效用於組織修復而非燃燒供能。
          </p>
        </div>

      </div>
    </section>
  );
};
