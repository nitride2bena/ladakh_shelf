import React, { useState, useMemo, useEffect } from 'react';
import {
  PRESET_DEFINITIONS,
  PresetDefinition,
  WoodShelfSpecificationData,
  ThemeMode,
  FontScaleStep,
} from './types/shelfSchema';
import { computeShelfSummary } from './engine/calculator';
import { normalizeSpecDependencies } from './engine/validator';
import {
  generateShelfSpecFromPrompt,
  generateExpertReviewComment,
} from './services/geminiService';
import { HeaderBar } from './components/HeaderBar';
import { Step1PresetView } from './components/Step1PresetView';
import { Step2ConfigView } from './components/Step2ConfigView';
import { Step3ExportView } from './components/Step3ExportView';
import { AlertTriangle, KeyRound, X } from 'lucide-react';

const FONT_SIZE_MAP: Record<FontScaleStep, string> = {
  small: '13.5px',
  default: '15px',
  large: '17px',
};

const STORAGE_KEYS = {
  THEME: 'WOOD_SHELF_THEME',
  FONT_SCALE: 'WOOD_SHELF_FONT_SCALE',
  DRAFT_SPEC: 'WOOD_SHELF_DRAFT_SPEC_V31',
  API_KEY: 'WOOD_SHELF_GEMINI_API_KEY',
};

function loadInitialSpec(): Omit<
  WoodShelfSpecificationData,
  'computed_summary' | 'generated_at'
> {
  if (typeof window !== 'undefined') {
    // 1. URL 공유 파라미터(?spec=...) 우선 확인
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('spec');
      if (encoded) {
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        if (decoded && decoded.dimensions && decoded.base_clearance) {
          return normalizeSpecDependencies(decoded);
        }
      }
    } catch {
      // 잘못된 URL 파라미터 무시
    }

    // 2. localStorage 자동 백업 사양 복원
    try {
      const saved = window.localStorage.getItem(STORAGE_KEYS.DRAFT_SPEC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.dimensions && parsed.base_clearance) {
          return normalizeSpecDependencies(parsed);
        }
      }
    } catch {
      // 파싱 실패 시 기본 프리셋 사용
    }
  }
  return structuredClone(PRESET_DEFINITIONS[0].spec);
}

export const App: React.FC = () => {
  // 전역 시스템 테마 및 글자 크기 상태 (FSD v3.1 Section 2.1 영속화)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [fontScale, setFontScale] = useState<FontScaleStep>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEYS.FONT_SCALE);
      if (saved === 'small' || saved === 'default' || saved === 'large') {
        return saved;
      }
    }
    return 'default';
  });

  // 단일 진실 공급원(Single Source of Truth) 사양 상태
  const [coreSpec, setCoreSpec] = useState<
    Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>
  >(loadInitialSpec);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('spec')) return 2;
    }
    return 1;
  });

  // Step 1에서 선택 중인 카드 ID (기반 프리셋과 초기 동기화)
  const [selectedPresetCardId, setSelectedPresetCardId] = useState<
    PresetDefinition['id']
  >(() => coreSpec.basePresetOrigin || 'standard_pine');

  const [aiReviewComment, setAiReviewComment] = useState<string>('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [lastAIReasoning, setLastAIReasoning] = useState<string | null>(null);

  // 프리셋 덮어쓰기 확인 모달 (FSD v3.1 Section 3.1.3 작업 내역 완벽 보호)
  const [pendingPresetToConfirm, setPendingPresetToConfirm] =
    useState<PresetDefinition | null>(null);

  // API 키 설정 모달
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    }
    return '';
  });

  // 테마 동기화 및 영속화
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.THEME, theme);
    }
  }, [theme]);

  // 폰트 스케일링 동기화 및 영속화
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-font-size',
      FONT_SIZE_MAP[fontScale],
    );
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.FONT_SCALE, fontScale);
    }
  }, [fontScale]);

  // 편집 사양 localStorage 자동 백업
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        STORAGE_KEYS.DRAFT_SPEC,
        JSON.stringify(coreSpec),
      );
    }
  }, [coreSpec]);

  // 60fps 즉시 파생 계산 (Deterministic Core Engine)
  const computedSummary = useMemo(
    () => computeShelfSummary(coreSpec),
    [coreSpec],
  );

  const fullSpec: WoodShelfSpecificationData = useMemo(
    () => ({
      ...coreSpec,
      computed_summary: computedSummary,
      ai_review_comment: aiReviewComment || undefined,
      generated_at: new Date().toISOString(),
    }),
    [coreSpec, computedSummary, aiReviewComment],
  );

  const hasEffectiveApiKey = Boolean(
    customApiKey.trim() || process.env.GEMINI_API_KEY || process.env.API_KEY,
  );

  // Step 1로 이동할 때 현재 사양의 원본 프리셋 카드로 포커스 동기화
  const handleSelectStep = (step: 1 | 2 | 3) => {
    if (step === 1 && coreSpec.basePresetOrigin) {
      setSelectedPresetCardId(coreSpec.basePresetOrigin);
    }
    setCurrentStep(step);
  };

  // Step 1에서 프리셋 기본값으로 확정 시
  const applyPresetDirectly = (preset: PresetDefinition) => {
    setSelectedPresetCardId(preset.id);
    setCoreSpec(structuredClone(preset.spec));
    setAiReviewComment('');
    setLastAIReasoning(null);
    setCurrentStep(2);
    setPendingPresetToConfirm(null);
  };

  /**
   * FSD v3.1 Section 3.1.3: 커스텀 사양이 존재할 경우(동일 원본 프리셋 포함)
   * 예외 없이 초기화 확인 모달을 표시하여 작업 유실을 방지한다.
   */
  const handleConfirmPresetFromStep1 = (preset: PresetDefinition) => {
    if (coreSpec.presetType === 'custom') {
      setPendingPresetToConfirm(preset);
      return;
    }
    applyPresetDirectly(preset);
  };

  // Step 2에서 사양 수정 시 자동으로 presetType = "custom" 전환
  const handleUpdateSpec = (
    updater: (
      prev: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
    ) => Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
  ) => {
    setCoreSpec((prev) => {
      const updated = updater(prev);
      const normalized = normalizeSpecDependencies({
        ...updated,
        presetType: 'custom',
        basePresetOrigin: prev.basePresetOrigin || 'standard_pine',
      });
      return normalized;
    });
    setAiReviewComment('');
  };

  // 원본 프리셋으로 복원
  const handleResetToOriginPreset = () => {
    const originId = coreSpec.basePresetOrigin || 'standard_pine';
    const found =
      PRESET_DEFINITIONS.find((p) => p.id === originId) ||
      PRESET_DEFINITIONS[0];
    setCoreSpec(structuredClone(found.spec));
    setAiReviewComment('');
    setLastAIReasoning(null);
  };

  // Gemini AI 자연어/사진 사양 자동 설정
  const handleApplyAIPrompt = async (
    prompt: string,
    imageDataUrl?: string | null,
  ) => {
    setIsAILoading(true);
    try {
      const result = await generateShelfSpecFromPrompt(
        prompt,
        coreSpec,
        imageDataUrl,
        customApiKey,
      );
      setCoreSpec(result.updatedSpec);
      setLastAIReasoning(result.reasoning);
      setAiReviewComment('');
      if (currentStep === 1) {
        setCurrentStep(2);
      }
    } finally {
      setIsAILoading(false);
    }
  };

  // Step 3 AI 전문가 감리 코멘트 생성
  const handleGenerateAIReview = async () => {
    setIsGeneratingReview(true);
    try {
      const comment = await generateExpertReviewComment(fullSpec, customApiKey);
      setAiReviewComment(comment);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEYS.API_KEY, customApiKey.trim());
    }
    setIsApiKeyModalOpen(false);
  };

  return (
    <div className="min-h-screen">
      <HeaderBar
        currentStep={currentStep}
        onSelectStep={handleSelectStep}
        canProceedToStep3={computedSummary.errors.length === 0}
        theme={theme}
        onToggleTheme={() =>
          setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
        }
        fontScale={fontScale}
        onChangeFontScale={setFontScale}
        hasApiKey={hasEffectiveApiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      <main>
        {currentStep === 1 && (
          <Step1PresetView
            selectedPresetId={selectedPresetCardId}
            onSelectPresetCard={setSelectedPresetCardId}
            onConfirmPresetAndContinue={handleConfirmPresetFromStep1}
            onContinueCustomEdit={() => setCurrentStep(2)}
            isCustomActive={coreSpec.presetType === 'custom'}
            customOriginId={coreSpec.basePresetOrigin}
            theme={theme}
            onApplyAIPrompt={handleApplyAIPrompt}
            isAILoading={isAILoading}
            lastAIReasoning={lastAIReasoning}
          />
        )}

        {currentStep === 2 && (
          <Step2ConfigView
            spec={fullSpec}
            theme={theme}
            onUpdateSpec={handleUpdateSpec}
            onResetToOriginPreset={handleResetToOriginPreset}
            onProceedToStep3={() => setCurrentStep(3)}
            onApplyAIPrompt={handleApplyAIPrompt}
            isAILoading={isAILoading}
            lastAIReasoning={lastAIReasoning}
          />
        )}

        {currentStep === 3 && (
          <Step3ExportView
            spec={fullSpec}
            theme={theme}
            onBackToStep2={() => setCurrentStep(2)}
            onGenerateAIReview={handleGenerateAIReview}
            isGeneratingReview={isGeneratingReview}
          />
        )}
      </main>

      {/* 프리셋 덮어쓰기 확인 모달 (FSD v3.1 Section 3.1.3) */}
      {pendingPresetToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-base font-bold">커스텀 사양 초기화 확인</h3>
            </div>
            <p
              className="mt-2.5 text-xs leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              현재 수정 중인 커스텀 사양({coreSpec.dimensions.width_mm}×
              {coreSpec.dimensions.depth_mm}×{coreSpec.dimensions.height_mm}mm,{' '}
              {coreSpec.dimensions.levels}단)이 있습니다.{' '}
              <strong style={{ color: 'var(--text-main)' }}>
                [{pendingPresetToConfirm.title}]
              </strong>{' '}
              기본 사양을 새로 불러오면 기존에 수정한 커스텀 내역이 초기화됩니다.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingPresetToConfirm(null);
                  setCurrentStep(2);
                }}
                className="rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:border-emerald-500"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                기존 커스텀 이어서 편집 (Step 2)
              </button>
              <button
                type="button"
                onClick={() => applyPresetDirectly(pendingPresetToConfirm)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500"
              >
                프리셋 기본값으로 초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini API 키 설정 모달 */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSaveApiKey}
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <KeyRound className="h-5 w-5" />
                <h3 className="text-base font-bold">
                  Google AI Studio Gemini API 키 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="rounded p-1 opacity-70 hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p
              className="mt-2 text-xs leading-relaxed"
              style={{ color: 'var(--text-muted)' }}
            >
              Google AI Studio에서 발급받은 Gemini API 키를 입력하면{' '}
              <code>gemini-2.5-flash</code> 기반 자연어 사양 설계, 실내 공간 사진 멀티모달 분석, 전문가 감리 리포트가 활성화됩니다. (미입력 시에도 내장 스마트 룰 엔진과 60fps 실시간 도면은 100% 정상 작동합니다.)
            </p>

            <input
              type="password"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="mt-3 w-full rounded-lg border px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="rounded-lg border px-3.5 py-2 text-xs font-semibold"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                닫기
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-500"
              >
                저장 및 적용
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default App;
