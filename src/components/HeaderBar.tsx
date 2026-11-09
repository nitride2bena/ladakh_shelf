import React from 'react';
import {
  Sun,
  Moon,
  Type as TypeIcon,
  KeyRound,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ThemeMode, FontScaleStep } from '../types/shelfSchema';

interface HeaderBarProps {
  currentStep: 1 | 2 | 3;
  onSelectStep: (step: 1 | 2 | 3) => void;
  canProceedToStep3: boolean;
  theme: ThemeMode;
  onToggleTheme: () => void;
  fontScale: FontScaleStep;
  onChangeFontScale: (step: FontScaleStep) => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentStep,
  onSelectStep,
  canProceedToStep3,
  theme,
  onToggleTheme,
  fontScale,
  onChangeFontScale,
  hasApiKey,
  onOpenApiKeyModal,
}) => {
  const steps: Array<{ num: 1 | 2 | 3; label: string }> = [
    { num: 1, label: '1. 기본 종류 선택' },
    { num: 2, label: '2. 사양 및 특주 정의' },
    { num: 3, label: '3. 사양 검토 및 내보내기' },
  ];

  return (
    <header
      className="no-print sticky top-0 z-30 border-b px-4 py-3 transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        {/* Brand Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600/20 text-amber-500">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">
                원목 선반 사양 컨피규레이터
              </h1>
              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-500">
                AI Studio v3.0
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Deterministic 60fps SVG Blueprint &amp; Gemini Structured Output
            </p>
          </div>
        </div>

        {/* Step Navigation Pills */}
        <nav className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
          {steps.map((s) => {
            const isActive = currentStep === s.num;
            const isDisabled = s.num === 3 && !canProceedToStep3;
            return (
              <button
                key={s.num}
                type="button"
                disabled={isDisabled}
                onClick={() => onSelectStep(s.num)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-sm'
                    : isDisabled
                      ? 'cursor-not-allowed opacity-40'
                      : 'hover:bg-amber-500/10'
                }`}
              >
                {currentStep > s.num && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Accessibility & API Key Controls */}
        <div className="flex items-center gap-2">
          {/* Gemini API Key Button */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-amber-500/60"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-elevated)',
            }}
            title="Google AI Studio Gemini API 키 설정"
          >
            <KeyRound
              className={`h-3.5 w-3.5 ${
                hasApiKey ? 'text-emerald-400' : 'text-amber-400'
              }`}
            />
            <span>{hasApiKey ? 'Gemini 연결됨' : 'API 키 설정'}</span>
          </button>

          {/* Font Scale 3-Step Selector */}
          <div
            className="flex items-center rounded-lg border p-0.5 text-xs"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-elevated)',
            }}
            title="글자 크기 3단계 조절"
          >
            <TypeIcon className="mx-1.5 h-3.5 w-3.5 opacity-60" />
            {(
              [
                { id: 'small', label: '작게' },
                { id: 'default', label: '보통' },
                { id: 'large', label: '크게' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeFontScale(item.id)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                  fontScale === item.id
                    ? 'bg-amber-600 text-white'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Dark / Light Theme Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-amber-500/60"
            style={{
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-elevated)',
            }}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
