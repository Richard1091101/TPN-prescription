import React from 'react';
import { X, Check, BookOpen, Stethoscope } from 'lucide-react';
import { CLINICAL_PRESETS } from '../data/tpnDatabase';
import { ClinicalCasePreset } from '../types/tpn';

interface ClinicalPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: ClinicalCasePreset) => void;
  activePresetId?: string;
}

export const ClinicalPresetModal: React.FC<ClinicalPresetModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  activePresetId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">臨床實證案例範本</h2>
              <p className="text-xs text-slate-500">選擇以下典型情境以快速帶入病患數據與處方配置進行分析</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {CLINICAL_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`pt-3 first:pt-0 p-4 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                        {preset.title}
                      </span>
                      {isSelected && (
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> 當前使用
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-teal-800">
                      {preset.subtitle}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {preset.description}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 group-hover:border-teal-500 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xs"
                  >
                    套用案例
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
