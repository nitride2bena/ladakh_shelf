import React from 'react';
import {
  PRESET_DEFINITIONS,
  PresetDefinition,
  LABELS,
  SHORT_LABELS,
  formatShortBaseLabel,
  WOOD_COLORS,
  ThemeMode,
} from '../types/shelfSchema';
import { computeShelfSummary } from '../engine/calculator';
import { BlueprintSVG } from './BlueprintSVG';
import { AICopilotBar } from './AICopilotBar';
import {
  ArrowRight,
  CheckCircle2,
  Ruler,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

interface Step1PresetViewProps {
  selectedPresetId: PresetDefinition['id'];
  onSelectPresetCard: (id: PresetDefinition['id']) => void;
  onConfirmPresetAndContinue: (preset: PresetDefinition) => void;
  onContinueCustomEdit?: () => void;
  isCustomActive: boolean;
  customOriginId?: PresetDefinition['id'];
  theme: ThemeMode;
  onApplyAIPrompt: (prompt: string, imageDataUrl?: string | null) => Promise<void>;
  isAILoading: boolean;
  lastAIReasoning: string | null;
}

export const Step1PresetView: React.FC<Step1PresetViewProps> = ({
  selectedPresetId,
  onSelectPresetCard,
  onConfirmPresetAndContinue,
  onContinueCustomEdit,
  isCustomActive,
  customOriginId,
  theme,
  onApplyAIPrompt,
  isAILoading,
  lastAIReasoning,
}) => {
  const activePreset =
    PRESET_DEFINITIONS.find((p) => p.id === selectedPresetId) ||
    PRESET_DEFINITIONS[0];

  const previewSummary = computeShelfSummary(activePreset.spec);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5">
      {/* 상단: AI 맞춤 사양 빠른 시작 바 */}
      <AICopilotBar
        onApplyPrompt={onApplyAIPrompt}
        isLoading={isAILoading}
        lastReasoning={lastAIReasoning}
      />

      {/* 하단 50:50 분할 레이아웃 (FSD Section 3.1.1) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 좌측: 프리셋 4종 선택 목록 (50% = col-span-6) */}
        <div className="flex flex-col gap-3.5 lg:col-span-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">
                Step 1. 기본 프리셋 종류 선택
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                가장 유사한 용도의 기본형을 선택하면 Step 2에서 모든 세부 치수와 특주 옵션을 변경할 수 있습니다.
              </p>
            </div>
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{ borderColor: 'var(--border-color)' }}
            >
              총 4종 표준 모델
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PRESET_DEFINITIONS.map((preset) => {
              const isSelected = preset.id === activePreset.id;
              const isCurrentCustomOrigin =
                isCustomActive && customOriginId === preset.id;
              const { dimensions, base_clearance, material_joinery } =
                preset.spec;
              const woodHex = WOOD_COLORS[material_joinery.wood_species];

              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPresetCard(preset.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'hover:border-amber-500/50'
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: isSelected ? '#f59e0b' : 'var(--border-color)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-black/30 shadow-inner"
                        style={{ backgroundColor: woodHex }}
                        title={LABELS.wood_species[material_joinery.wood_species]}
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold">{preset.title}</h3>
                          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                            {preset.badge}
                          </span>
                          {isCurrentCustomOrigin && (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                              현재 커스텀 작업 중
                            </span>
                          )}
                        </div>
                        <p
                          className="mt-0.5 text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {preset.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-500" />
                    )}
                  </div>

                  {/* 프리셋 핵심 스펙 요약 칩 (FSD v3.1 Section 2.2 SHORT_LABELS 적용) */}
                  <div
                    className="mt-3 grid grid-cols-3 gap-2 rounded-lg p-2.5 text-xs"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div>
                      <span className="block text-[10px] opacity-70">
                        기본 외경 (W×D×H)
                      </span>
                      <span className="font-semibold">
                        {dimensions.width_mm}×{dimensions.depth_mm}×
                        {dimensions.height_mm}mm
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] opacity-70">
                        수납 단수 / 두께
                      </span>
                      <span className="font-semibold">
                        {dimensions.levels}단 / {dimensions.thickness_t}T
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] opacity-70">
                        수종 / 하부 구조
                      </span>
                      <span className="font-semibold">
                        {SHORT_LABELS.wood_species[material_joinery.wood_species]}{' '}
                        ·{' '}
                        {formatShortBaseLabel(
                          base_clearance.type,
                          base_clearance.clearance_mm,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측: 선택된 프리셋 상세 정보 & 정적 도면 프리뷰 (50% = col-span-6) */}
        <div className="lg:col-span-6">
          <div
            className="flex h-full flex-col justify-between rounded-xl border p-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-amber-500">
                    선택된 프리셋 도면 프리뷰
                  </span>
                  <h3 className="text-lg font-bold">{activePreset.title}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    previewSummary.robot_badge_status === 'pass'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : previewSummary.robot_badge_status === 'normal_vacuum'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-slate-500/20 text-slate-300'
                  }`}
                >
                  {previewSummary.robot_badge_text}
                </span>
              </div>

              {/* SVG 비례 도면 프리뷰 */}
              <BlueprintSVG
                spec={activePreset.spec}
                netShelfHeightMm={previewSummary.net_shelf_height_mm}
                theme={theme}
              />

              {/* 추천 사양 테이블 (FSD v3.1 SHORT_LABELS 적용) */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <div
                  className="rounded-lg border p-2.5"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Ruler className="h-3.5 w-3.5 text-amber-500" />
                    <span>단당 평균 유효 내경</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-amber-400">
                    {previewSummary.net_shelf_height_mm} mm
                  </p>
                </div>

                <div
                  className="rounded-lg border p-2.5"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                    <span>예상 판재 면적 / 중량</span>
                  </div>
                  <p className="mt-1 text-sm font-bold">
                    {previewSummary.estimated_area_m2} m² / 약{' '}
                    {previewSummary.estimated_weight_kg} kg
                  </p>
                </div>

                <div
                  className="col-span-2 rounded-lg border p-2.5 sm:col-span-1"
                  style={{
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-elevated)',
                  }}
                >
                  <div
                    className="flex items-center gap-1 text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>짜임 및 하중 보강</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold">
                    {
                      SHORT_LABELS.frame_join[
                        activePreset.spec.material_joinery.frame_join
                      ]
                    }{' '}
                    ·{' '}
                    {
                      SHORT_LABELS.reinforcement[
                        activePreset.spec.material_joinery.reinforcement
                      ]
                    }
                  </p>
                </div>
              </div>

              <div
                className="mt-3 rounded-lg border p-3 text-xs"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-main)',
                }}
              >
                <span className="font-semibold text-amber-500">추천 용도: </span>
                <span>{activePreset.recommendedUse}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {isCustomActive && onContinueCustomEdit && (
                <button
                  type="button"
                  onClick={onContinueCustomEdit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-600/20 px-4 py-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-600/30"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>수정 중인 커스텀 사양 이어서 편집 (Step 2)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onConfirmPresetAndContinue(activePreset)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-amber-500"
              >
                <span>이 프리셋으로 세부 사양 설정하기 (Step 2)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
