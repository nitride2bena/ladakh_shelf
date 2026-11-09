import React, { useState, useEffect } from 'react';
import {
  WoodShelfSpecificationData,
  ThicknessT,
  VerticalDividers,
  BaseType,
  LegStyle,
  SkirtingNotch,
  LevelerType,
  WoodSpecies,
  JoineryType,
  FrameJoin,
  ShelfFixing,
  Reinforcement,
  BackpanelType,
  FinishCoat,
  EdgeProfile,
  LABELS,
  PRESET_DEFINITIONS,
} from '../types/shelfSchema';
import { clamp } from '../engine/calculator';
import { BlueprintSVG } from './BlueprintSVG';
import { AICopilotBar } from './AICopilotBar';
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

interface Step2ConfigViewProps {
  spec: WoodShelfSpecificationData;
  onUpdateSpec: (
    updater: (
      prev: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
    ) => Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
  ) => void;
  onResetToOriginPreset: () => void;
  onProceedToStep3: () => void;
  onApplyAIPrompt: (prompt: string, imageDataUrl?: string | null) => Promise<void>;
  isAILoading: boolean;
  lastAIReasoning: string | null;
}

type DrawerKey = 'dimensions' | 'base' | 'material' | 'finishing' | null;

/**
 * FSD Section 3.2.2: 입력 값 클램핑 분리 (Typing UX 보호용 숫자 입력 컴포넌트)
 */
interface ClampedNumberInputProps {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  helperText?: string;
  onChangeValue: (clampedVal: number) => void;
}

const ClampedNumberInput: React.FC<ClampedNumberInputProps> = ({
  label,
  unit = 'mm',
  value,
  min,
  max,
  step = 10,
  disabled = false,
  helperText,
  onChangeValue,
}) => {
  const [rawText, setRawText] = useState<string>(String(value));
  const [outOfRangeMsg, setOutOfRangeMsg] = useState<string | null>(null);

  useEffect(() => {
    setRawText(String(value));
    setOutOfRangeMsg(null);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    setRawText(str);
    const num = Number(str);
    if (str.trim() === '' || Number.isNaN(num)) {
      return;
    }
    if (num < min || num > max) {
      setOutOfRangeMsg(`허용 범위: ${min}~${max}${unit}`);
    } else {
      setOutOfRangeMsg(null);
    }
    // 도면/연산 엔진에는 즉시 클램핑된 안전한 값을 전달하여 60fps 렌더링 유지
    onChangeValue(clamp(Math.round(num), min, max));
  };

  const handleBlur = () => {
    const num = Number(rawText);
    const clamped = clamp(Number.isNaN(num) ? min : Math.round(num), min, max);
    setRawText(String(clamped));
    setOutOfRangeMsg(null);
    onChangeValue(clamped);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <label className="font-medium">{label}</label>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {min}~{max}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center">
        <input
          type="number"
          value={rawText}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full rounded-lg border px-3 py-2 pr-10 text-sm font-semibold focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
          style={{
            backgroundColor: 'var(--bg-main)',
            borderColor: outOfRangeMsg ? '#f59e0b' : 'var(--border-color)',
            color: 'var(--text-main)',
          }}
        />
        <span
          className="pointer-events-none absolute right-3 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {unit}
        </span>
      </div>
      {outOfRangeMsg && (
        <span className="text-[11px] text-amber-400">{outOfRangeMsg}</span>
      )}
      {helperText && !outOfRangeMsg && (
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export const Step2ConfigView: React.FC<Step2ConfigViewProps> = ({
  spec,
  onUpdateSpec,
  onResetToOriginPreset,
  onProceedToStep3,
  onApplyAIPrompt,
  isAILoading,
  lastAIReasoning,
}) => {
  // FSD Section 3.2.2: 상호 배타적 아코디언 드로어 (Mutual Exclusive Drawers)
  const [openDrawer, setOpenDrawer] = useState<DrawerKey>(null);

  const toggleDrawer = (key: Exclude<DrawerKey, null>) => {
    setOpenDrawer((prev) => (prev === key ? null : key));
  };

  const {
    dimensions,
    base_clearance,
    material_joinery,
    finishing_hardware,
    computed_summary,
  } = spec;

  const maxClearanceAllowed = Math.min(
    300,
    Math.floor(dimensions.height_mm * 0.35),
  );

  const originPresetTitle =
    PRESET_DEFINITIONS.find((p) => p.id === spec.basePresetOrigin)?.title ||
    '기본 프리셋';

  const hasCustomHeights =
    Array.isArray(dimensions.custom_shelf_heights_mm) &&
    dimensions.custom_shelf_heights_mm.length === dimensions.levels;

  const handleToggleAsymmetricHeights = (enable: boolean) => {
    onUpdateSpec((prev) => {
      const next = structuredClone(prev);
      if (!enable) {
        delete next.dimensions.custom_shelf_heights_mm;
      } else {
        const H_base =
          next.base_clearance.type === 'floor'
            ? 0
            : next.base_clearance.clearance_mm;
        const innerTotal = Math.max(
          next.dimensions.height_mm -
            H_base -
            next.dimensions.thickness_t * (next.dimensions.levels + 1),
          next.dimensions.levels * 100,
        );
        const avg = Math.floor(innerTotal / next.dimensions.levels);
        const arr = Array(next.dimensions.levels).fill(avg);
        arr[0] += innerTotal - avg * next.dimensions.levels;
        next.dimensions.custom_shelf_heights_mm = arr;
      }
      return next;
    });
  };

  const hasErrors = computed_summary.errors.length > 0;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4">
      {/* FSD Section 3.2.1: 컨테이너 높이 고정 및 좌(55%)/우(45%) 듀얼 독립 스크롤 */}
      <div className="grid grid-cols-1 gap-5 lg:h-[calc(100vh-88px)] lg:grid-cols-12">
        {/* ==================== 좌측 패널 (Controls Column: 7/12 ≈ 58%) ==================== */}
        <div className="custom-scroll flex flex-col gap-4 pr-1 lg:col-span-7 lg:h-full lg:overflow-y-auto">
          {/* 상단 상태 배너 & 초기화 */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold">
                Step 2. 세부 사양 및 특주 정의
              </span>
              {spec.presetType === 'custom' ? (
                <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400">
                  커스텀 수정됨 (원본: {originPresetTitle})
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                  표준 프리셋 ({originPresetTitle})
                </span>
              )}
            </div>

            {spec.presetType === 'custom' && (
              <button
                type="button"
                onClick={onResetToOriginPreset}
                className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition hover:border-amber-500"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>원본 프리셋 복원</span>
              </button>
            )}
          </div>

          {/* AI 코파일럿 컴팩트 바 */}
          <AICopilotBar
            onApplyPrompt={onApplyAIPrompt}
            isLoading={isAILoading}
            lastReasoning={lastAIReasoning}
            compact
          />

          {/* ---------------- 카드 1: 규격 및 단수 (Dimensions) ---------------- */}
          <section
            className="rounded-xl border p-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor:
                openDrawer === 'dimensions' ? '#f59e0b' : 'var(--border-color)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">1. 규격 및 수납 단수 (Dimensions)</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  외경 가로·깊이·높이 및 내부 수납 공간(단수) 설정
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleDrawer('dimensions')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  openDrawer === 'dimensions'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'hover:border-amber-500/50'
                }`}
                style={{
                  borderColor:
                    openDrawer === 'dimensions' ? '#f59e0b' : 'var(--border-color)',
                }}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>🛠️ 특주 옵션</span>
                {(dimensions.vertical_dividers > 0 ||
                  material_joinery.backpanel !== 'none' ||
                  hasCustomHeights) && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
                {openDrawer === 'dimensions' ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ClampedNumberInput
                label="가로 폭 (W)"
                value={dimensions.width_mm}
                min={300}
                max={3000}
                onChangeValue={(v) =>
                  onUpdateSpec((prev) => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, width_mm: v },
                  }))
                }
              />
              <ClampedNumberInput
                label="깊이 (D)"
                value={dimensions.depth_mm}
                min={150}
                max={800}
                onChangeValue={(v) =>
                  onUpdateSpec((prev) => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, depth_mm: v },
                  }))
                }
              />
              <ClampedNumberInput
                label="전체 높이 (H)"
                value={dimensions.height_mm}
                min={300}
                max={2400}
                onChangeValue={(v) =>
                  onUpdateSpec((prev) => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, height_mm: v },
                  }))
                }
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-medium">수납 단수 (N)</label>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    판재 {dimensions.levels + 1}매
                  </span>
                </div>
                <select
                  value={dimensions.levels}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      dimensions: {
                        ...prev.dimensions,
                        levels: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold focus:border-amber-500 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}단 (수납 {n}칸)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 카드 1 특주 드로어 */}
            {openDrawer === 'dimensions' && (
              <div
                className="mt-4 flex flex-col gap-3 rounded-xl border p-3.5"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* 부재 두께 (T) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      부재 두께 (T)
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {([18, 20, 24, 28, 30] as ThicknessT[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            onUpdateSpec((prev) => ({
                              ...prev,
                              dimensions: { ...prev.dimensions, thickness_t: t },
                            }))
                          }
                          className={`rounded-lg border py-1.5 text-xs font-bold transition ${
                            dimensions.thickness_t === t
                              ? 'border-amber-500 bg-amber-600 text-white'
                              : 'hover:border-amber-500/50'
                          }`}
                          style={{
                            borderColor:
                              dimensions.thickness_t === t
                                ? '#f59e0b'
                                : 'var(--border-color)',
                          }}
                        >
                          {t}T
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 중간 세로 칸막이 (Vertical Dividers) */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      중간 세로 칸막이 (처짐 방지)
                    </label>
                    <select
                      value={dimensions.vertical_dividers}
                      onChange={(e) =>
                        onUpdateSpec((prev) => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            vertical_dividers: Number(
                              e.target.value,
                            ) as VerticalDividers,
                          },
                        }))
                      }
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--bg-main)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <option value={0}>없음 (단일 통경간)</option>
                      <option value={1}>중앙 1열 (좌우 2분할)</option>
                      <option value={2}>2열 배치 (3분할 격자)</option>
                    </select>
                  </div>

                  {/* 백패널 형태 */}
                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      백패널 형태 (Backpanel)
                    </label>
                    <select
                      value={material_joinery.backpanel}
                      onChange={(e) =>
                        onUpdateSpec((prev) => ({
                          ...prev,
                          material_joinery: {
                            ...prev.material_joinery,
                            backpanel: e.target.value as BackpanelType,
                          },
                        }))
                      }
                      className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--bg-main)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-main)',
                      }}
                    >
                      {(Object.keys(LABELS.backpanel) as BackpanelType[]).map(
                        (k) => (
                          <option key={k} value={k}>
                            {LABELS.backpanel[k]}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {/* 단별 비대칭 높이 배열 설정 */}
                <div className="border-t pt-2.5" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={hasCustomHeights}
                        onChange={(e) =>
                          handleToggleAsymmetricHeights(e.target.checked)
                        }
                        className="rounded accent-amber-500"
                      />
                      <span>단별 비대칭 유효 높이 직접 지정 (총 유효 내경 합계: {computed_summary.inner_total_height_mm}mm)</span>
                    </label>
                  </div>

                  {hasCustomHeights && dimensions.custom_shelf_heights_mm && (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {dimensions.custom_shelf_heights_mm.map((hVal, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5">
                          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            위에서 {idx + 1}번째 단 (mm)
                          </span>
                          <input
                            type="number"
                            value={hVal}
                            min={100}
                            max={1500}
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              onUpdateSpec((prev) => {
                                const arr = [
                                  ...(prev.dimensions.custom_shelf_heights_mm || []),
                                ];
                                arr[idx] = newVal;
                                return {
                                  ...prev,
                                  dimensions: {
                                    ...prev.dimensions,
                                    custom_shelf_heights_mm: arr,
                                  },
                                };
                              });
                            }}
                            className="rounded border px-2 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: 'var(--bg-main)',
                              borderColor: 'var(--border-color)',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2">
                    <input
                      type="text"
                      value={dimensions.custom_shelf_height_note || ''}
                      onChange={(e) =>
                        onUpdateSpec((prev) => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            custom_shelf_height_note: e.target.value,
                          },
                        }))
                      }
                      placeholder="단별 높이 특기사항 메모 (예: 최하단은 LP 수납을 위해 340mm 이상 필수)"
                      className="w-full rounded-lg border px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-main)',
                        borderColor: 'var(--border-color)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ---------------- 카드 2: 하부 공간 및 간섭 (Base & Clearance) ---------------- */}
          <section
            className="rounded-xl border p-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor:
                openDrawer === 'base' ? '#f59e0b' : 'var(--border-color)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  2. 하부 공간 및 간섭 (Base &amp; Clearance)
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  다리 구조, 로봇청소기 진입 높이 및 벽면 걸레받이 간섭 제어
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleDrawer('base')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  openDrawer === 'base'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'hover:border-amber-500/50'
                }`}
                style={{
                  borderColor:
                    openDrawer === 'base' ? '#f59e0b' : 'var(--border-color)',
                }}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>🛠️ 특주 옵션</span>
                {base_clearance.skirting_notch !== 'none' && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
                {openDrawer === 'base' ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">하부 베이스 형태</label>
                <select
                  value={base_clearance.type}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      base_clearance: {
                        ...prev.base_clearance,
                        type: e.target.value as BaseType,
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {(Object.keys(LABELS.base_type) as BaseType[]).map((t) => (
                    <option key={t} value={t}>
                      {LABELS.base_type[t]}
                    </option>
                  ))}
                </select>
              </div>

              <ClampedNumberInput
                label="바닥 유효 높이 (H_clearance)"
                value={base_clearance.clearance_mm}
                min={base_clearance.type === 'plinth' ? 40 : 0}
                max={
                  base_clearance.type === 'floor'
                    ? 0
                    : base_clearance.type === 'plinth'
                      ? Math.min(120, maxClearanceAllowed)
                      : maxClearanceAllowed
                }
                disabled={base_clearance.type === 'floor'}
                helperText={
                  base_clearance.type === 'floor'
                    ? '바닥 밀착형은 0mm로 고정됩니다.'
                    : '로봇청소기 진입 권장: 110mm 이상 (최대 H의 35%)'
                }
                onChangeValue={(v) =>
                  onUpdateSpec((prev) => ({
                    ...prev,
                    base_clearance: { ...prev.base_clearance, clearance_mm: v },
                  }))
                }
              />
            </div>

            {/* 카드 2 특주 드로어 */}
            {openDrawer === 'base' && (
              <div
                className="mt-4 grid grid-cols-1 gap-3 rounded-xl border p-3.5 sm:grid-cols-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    다리 디자인 (Leg Style)
                  </label>
                  <select
                    value={base_clearance.leg_style || 'straight'}
                    disabled={base_clearance.type !== 'legs'}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        base_clearance: {
                          ...prev.base_clearance,
                          leg_style: e.target.value as LegStyle,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-45"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(
                      Object.keys(LABELS.leg_style) as Array<
                        Exclude<LegStyle, null>
                      >
                    ).map((k) => (
                      <option key={k} value={k}>
                        {LABELS.leg_style[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    걸레받이 노치 가공 (측면 후면)
                  </label>
                  <select
                    value={base_clearance.skirting_notch}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        base_clearance: {
                          ...prev.base_clearance,
                          skirting_notch: e.target.value as SkirtingNotch,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(
                      Object.keys(LABELS.skirting_notch) as SkirtingNotch[]
                    ).map((k) => (
                      <option key={k} value={k}>
                        {LABELS.skirting_notch[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    수평 조절 레벨러 (Leveler)
                  </label>
                  <select
                    value={base_clearance.leveler}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        base_clearance: {
                          ...prev.base_clearance,
                          leveler: e.target.value as LevelerType,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(Object.keys(LABELS.leveler) as LevelerType[]).map((k) => (
                      <option key={k} value={k}>
                        {LABELS.leveler[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ---------------- 카드 3: 목재 수종 및 구조 (Material & Joinery) ---------------- */}
          <section
            className="rounded-xl border p-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor:
                openDrawer === 'material' ? '#f59e0b' : 'var(--border-color)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  3. 목재 수종 및 구조 (Material &amp; Joinery)
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  원목 수종, 선반 고정 방식, 집성 등급 및 하중 보강재
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleDrawer('material')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  openDrawer === 'material'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'hover:border-amber-500/50'
                }`}
                style={{
                  borderColor:
                    openDrawer === 'material' ? '#f59e0b' : 'var(--border-color)',
                }}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>🛠️ 특주 옵션</span>
                {material_joinery.reinforcement !== 'none' && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
                {openDrawer === 'material' ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">원목 수종 (Wood Species)</label>
                <select
                  value={material_joinery.wood_species}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      material_joinery: {
                        ...prev.material_joinery,
                        wood_species: e.target.value as WoodSpecies,
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {(Object.keys(LABELS.wood_species) as WoodSpecies[]).map(
                    (w) => (
                      <option key={w} value={w}>
                        {LABELS.wood_species[w]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">선반 고정 방식</label>
                <select
                  value={material_joinery.shelf_fixing}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      material_joinery: {
                        ...prev.material_joinery,
                        shelf_fixing: e.target.value as ShelfFixing,
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {(Object.keys(LABELS.shelf_fixing) as ShelfFixing[]).map(
                    (f) => (
                      <option key={f} value={f}>
                        {LABELS.shelf_fixing[f]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* 카드 3 특주 드로어 */}
            {openDrawer === 'material' && (
              <div
                className="mt-4 grid grid-cols-1 gap-3 rounded-xl border p-3.5 sm:grid-cols-3"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    집성 등급 (Joinery Grade)
                  </label>
                  <select
                    value={material_joinery.joinery_type}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        material_joinery: {
                          ...prev.material_joinery,
                          joinery_type: e.target.value as JoineryType,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(Object.keys(LABELS.joinery_type) as JoineryType[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {LABELS.joinery_type[k]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    프레임 짜임 방식 (Frame Join)
                  </label>
                  <select
                    value={material_joinery.frame_join}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        material_joinery: {
                          ...prev.material_joinery,
                          frame_join: e.target.value as FrameJoin,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(Object.keys(LABELS.frame_join) as FrameJoin[]).map(
                      (k) => (
                        <option key={k} value={k}>
                          {LABELS.frame_join[k]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    하중 처짐 보강 (Reinforcement)
                  </label>
                  <select
                    value={material_joinery.reinforcement}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        material_joinery: {
                          ...prev.material_joinery,
                          reinforcement: e.target.value as Reinforcement,
                        },
                      }))
                    }
                    className="w-full rounded-lg border px-2.5 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {(Object.keys(LABELS.reinforcement) as Reinforcement[]).map(
                      (k) => (
                        <option
                          key={k}
                          value={k}
                          disabled={
                            material_joinery.shelf_fixing === 'movable' &&
                            k === 'wood_apron'
                          }
                        >
                          {LABELS.reinforcement[k]}
                          {material_joinery.shelf_fixing === 'movable' &&
                          k === 'wood_apron'
                            ? ' (이동식 다보 불가)'
                            : ''}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            )}
          </section>

          {/* ---------------- 카드 4: 표면 마감 및 기타 (Finishing & Extra) ---------------- */}
          <section
            className="rounded-xl border p-4 transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor:
                openDrawer === 'finishing' ? '#f59e0b' : 'var(--border-color)',
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  4. 표면 마감 및 기타 (Finishing &amp; Extra)
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  천연 오일/바니쉬 도장, 모서리 프로파일 및 프로젝트/배선 메모
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleDrawer('finishing')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  openDrawer === 'finishing'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'hover:border-amber-500/50'
                }`}
                style={{
                  borderColor:
                    openDrawer === 'finishing' ? '#f59e0b' : 'var(--border-color)',
                }}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>🛠️ 특주 옵션</span>
                {Boolean(finishing_hardware.wire_hole_note) && (
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                )}
                {openDrawer === 'finishing' ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">표면 마감 도료</label>
                <select
                  value={finishing_hardware.finish_coat}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      finishing_hardware: {
                        ...prev.finishing_hardware,
                        finish_coat: e.target.value as FinishCoat,
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {(Object.keys(LABELS.finish_coat) as FinishCoat[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {LABELS.finish_coat[c]}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium">모서리 가공 (Edge Profile)</label>
                <select
                  value={finishing_hardware.edge_profile}
                  onChange={(e) =>
                    onUpdateSpec((prev) => ({
                      ...prev,
                      finishing_hardware: {
                        ...prev.finishing_hardware,
                        edge_profile: e.target.value as EdgeProfile,
                      },
                    }))
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                  }}
                >
                  {(Object.keys(LABELS.edge_profile) as EdgeProfile[]).map(
                    (ep) => (
                      <option key={ep} value={ep}>
                        {LABELS.edge_profile[ep]}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {/* 카드 4 특주 드로어 */}
            {openDrawer === 'finishing' && (
              <div
                className="mt-4 grid grid-cols-1 gap-3 rounded-xl border p-3.5 sm:grid-cols-2"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    발주처 / 프로젝트명 (Client)
                  </label>
                  <input
                    type="text"
                    value={spec.client}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        client: e.target.value,
                      }))
                    }
                    placeholder="예: 성수동 스튜디오 거실장 프로젝트"
                    className="w-full rounded-lg border px-3 py-1.5 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">
                    배선 관통 홀 위치 및 직경 메모
                  </label>
                  <input
                    type="text"
                    value={finishing_hardware.wire_hole_note || ''}
                    onChange={(e) =>
                      onUpdateSpec((prev) => ({
                        ...prev,
                        finishing_hardware: {
                          ...prev.finishing_hardware,
                          wire_hole_note: e.target.value,
                        },
                      }))
                    }
                    placeholder="예: 1단 백패널 우측 하단 Ø50mm 황동 그로밋"
                    className="w-full rounded-lg border px-3 py-1.5 text-xs"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      borderColor: 'var(--border-color)',
                    }}
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ==================== 우측 패널 (Live Blueprint & Summary: 5/12 ≈ 42%) ==================== */}
        <div className="custom-scroll flex flex-col gap-4 pl-1 lg:col-span-5 lg:h-full lg:overflow-y-auto">
          <div
            className="flex flex-col gap-4 rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            {/* 도면 헤더 & 로봇청소기 진입 배지 */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold text-amber-500">
                  LIVE 60FPS VECTOR BLUEPRINT
                </span>
                <h3 className="text-sm font-bold">
                  실시간 정면·측면 비례 도면
                </h3>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  computed_summary.robot_badge_status === 'pass'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : computed_summary.robot_badge_status === 'normal_vacuum'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-500/20 text-slate-300'
                }`}
              >
                {computed_summary.robot_badge_text}
              </span>
            </div>

            {/* 실시간 SVG 도면 */}
            <BlueprintSVG
              spec={spec}
              netShelfHeightMm={computed_summary.net_shelf_height_mm}
            />

            {/* 구조 안전성 진단 배지 (Errors / Warnings / Normal) */}
            <div className="flex flex-col gap-2">
              {computed_summary.errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 text-xs text-red-300"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{err}</span>
                </div>
              ))}

              {computed_summary.warnings.map((warn, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{warn}</span>
                </div>
              ))}

              {computed_summary.errors.length === 0 &&
                computed_summary.warnings.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      구조 안전성 검증 통과: 유효 내경, 처짐 경간({computed_summary.clear_span_mm}mm), 세장비 모두 안정 범위입니다.
                    </span>
                  </div>
                )}
            </div>

            {/* 실시간 치수·BOM·중량 요약 테이블 */}
            <div
              className="rounded-xl border p-3.5"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-color)',
              }}
            >
              <h4 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                실시간 사양 및 물량(BOM) 요약
              </h4>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>외경 (W×D×H)</dt>
                  <dd className="font-semibold">
                    {dimensions.width_mm}×{dimensions.depth_mm}×{dimensions.height_mm}
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>단당 평균 내경</dt>
                  <dd className="font-bold text-amber-400">
                    {computed_summary.net_shelf_height_mm} mm
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>단수 / 두께</dt>
                  <dd className="font-semibold">
                    {dimensions.levels}단 / {dimensions.thickness_t}T
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>유효 경간(Span)</dt>
                  <dd className="font-semibold">
                    {computed_summary.clear_span_mm} mm
                    {dimensions.vertical_dividers > 0
                      ? ` (${dimensions.vertical_dividers + 1}분할)`
                      : ''}
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>수종 / 고정</dt>
                  <dd className="font-semibold">
                    {LABELS.wood_species[material_joinery.wood_species].split(' ')[0]} /{' '}
                    {material_joinery.shelf_fixing === 'fixed' ? '고정식' : '이동식'}
                  </dd>
                </div>
                <div className="flex justify-between border-b pb-1" style={{ borderColor: 'var(--border-color)' }}>
                  <dt style={{ color: 'var(--text-muted)' }}>짜임 / 보강</dt>
                  <dd className="font-semibold">
                    {LABELS.frame_join[material_joinery.frame_join].split(' ')[0]} /{' '}
                    {LABELS.reinforcement[material_joinery.reinforcement].split(' ')[0]}
                  </dd>
                </div>
                <div className="flex justify-between pt-0.5">
                  <dt style={{ color: 'var(--text-muted)' }}>예상 판재 면적</dt>
                  <dd className="font-bold text-sky-400">
                    {computed_summary.estimated_area_m2} m²
                  </dd>
                </div>
                <div className="flex justify-between pt-0.5">
                  <dt style={{ color: 'var(--text-muted)' }}>예상 본체 중량</dt>
                  <dd className="font-bold text-sky-400">
                    약 {computed_summary.estimated_weight_kg} kg
                  </dd>
                </div>
              </dl>
            </div>

            {/* Step 3 이동 버튼 */}
            <button
              type="button"
              disabled={hasErrors}
              onClick={onProceedToStep3}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span>
                {hasErrors
                  ? '구조 오류를 해결하면 내보내기가 활성화됩니다'
                  : '사양 확정 및 문서/도면 내보내기 (Step 3)'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
