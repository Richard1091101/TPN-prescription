import React from 'react';
import {
  User,
  Sliders,
  Scale,
  FlaskConical,
  ShieldAlert,
  FileText,
  Smartphone,
  Eye,
  Layers,
  Database,
  BookOpen,
} from 'lucide-react';

export type ClinicalPhase = 'patient' | 'formula' | 'analysis' | 'compounding' | 'safety' | 'order';

interface MobilePhaseNavProps {
  activePhase: ClinicalPhase;
  onSelectPhase: (phase: ClinicalPhase) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenDatabase: () => void;
  onOpenPresets: () => void;
  hasBarrierIssues?: boolean;
}

export const MobilePhaseNav: React.FC<MobilePhaseNavProps> = ({
  activePhase,
  onSelectPhase,
  isFocusMode,
  onToggleFocusMode,
  onOpenDatabase,
  onOpenPresets,
  hasBarrierIssues = false,
}) => {
  const phases: Array<{
    id: ClinicalPhase;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge?: string;
    isDanger?: boolean;
  }> = [
    {
      id: 'patient',
      label: '1. 病患評估',
      shortLabel: '評估',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'formula',
      label: '2. 配方微調',
      shortLabel: '微調',
      icon: <Sliders className="w-4 h-4" />,
    },
    {
      id: 'analysis',
      label: '3. 差距分析',
      shortLabel: '差距',
      icon: <Scale className="w-4 h-4" />,
    },
    {
      id: 'compounding',
      label: '4. 原料調配',
      shortLabel: '調配',
      icon: <FlaskConical className="w-4 h-4" />,
      isDanger: hasBarrierIssues,
    },
    {
      id: 'safety',
      label: '5. 安全防線',
      shortLabel: '安全',
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      id: 'order',
      label: '6. HIS 醫囑',
      shortLabel: '醫囑',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <aside aria-label="行動版導航工具列" className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-xl px-2 py-1.5 transition-all">
      {/* Top mini utility row */}
      <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-slate-500 border-b border-slate-100 mb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-colors ${
              isFocusMode
                ? 'bg-teal-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="切換單階段專注模式與全部展開模式"
          >
            <Smartphone className="w-3 h-3" />
            <span>{isFocusMode ? '手機專注分頁' : '滑動全覽模式'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenDatabase}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200 hover:bg-teal-100"
          >
            <Database className="w-3 h-3 text-teal-600" />
            <span>藥庫更新</span>
          </button>

          <button
            type="button"
            onClick={onOpenPresets}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium hover:bg-slate-200"
          >
            <BookOpen className="w-3 h-3 text-slate-500" />
            <span>範本</span>
          </button>
        </div>
      </div>

      {/* 6 Core Phase Navigation buttons */}
      <div className="grid grid-cols-6 gap-1">
        {phases.map((p) => {
          const isActive = activePhase === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPhase(p.id)}
              className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all min-h-[44px] relative ${
                isActive
                  ? 'bg-teal-700 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 active:bg-slate-200'
              }`}
            >
              <div className="relative">
                {p.icon}
                {p.isDanger && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                )}
                {p.isDanger && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-full">
                {p.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
