import React, { useState, useRef, useEffect } from 'react';
import {
  WoodShelfSpecificationData,
  LABELS,
  PRESET_DEFINITIONS,
} from '../types/shelfSchema';
import { BlueprintSVG } from './BlueprintSVG';
import {
  FileText,
  FileJson,
  ImageDown,
  Printer,
  Copy,
  Check,
  Sparkles,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

interface Step3ExportViewProps {
  spec: WoodShelfSpecificationData;
  onBackToStep2: () => void;
  onGenerateAIReview: () => Promise<void>;
  isGeneratingReview: boolean;
}

export function buildMarkdownDocument(spec: WoodShelfSpecificationData): string {
  const {
    client,
    presetType,
    basePresetOrigin,
    dimensions,
    base_clearance,
    material_joinery,
    finishing_hardware,
    computed_summary,
    ai_review_comment,
    generated_at,
  } = spec;

  const presetTitle =
    presetType === 'custom'
      ? `커스텀 사양 (원본 프리셋: ${
          PRESET_DEFINITIONS.find((p) => p.id === basePresetOrigin)?.title ||
          '기본형'
        })`
      : PRESET_DEFINITIONS.find((p) => p.id === presetType)?.title || presetType;

  const customHeightsStr =
    dimensions.custom_shelf_heights_mm &&
    dimensions.custom_shelf_heights_mm.length > 0
      ? dimensions.custom_shelf_heights_mm.map((h, i) => `${i + 1}단: ${h}mm`).join(', ')
      : `균등 분할 (단당 약 ${computed_summary.net_shelf_height_mm}mm)`;

  const warningsSection =
    computed_summary.warnings.length > 0
      ? computed_summary.warnings.map((w) => `- ⚠️ ${w}`).join('\n')
      : '- ✅ 특이 구조 위험 없음 (유효 내경, 처짐 경간, 세장비 모두 기준 충족)';

  return `# 원목 선반 제작 발주 사양서 (Wood Shelf Specification)

- **발주처 / 프로젝트명:** ${client || '미지정 프로젝트'}
- **기반 모델 유형:** ${presetTitle}
- **문서 생성 일시:** ${new Date(generated_at).toLocaleString('ko-KR')}

---

## 1. 규격 및 수납 구조 (Dimensions & Capacity)

| 항목 | 세부 사양 | 비고 |
| :--- | :--- | :--- |
| **외경 치수 (W × D × H)** | **${dimensions.width_mm} × ${dimensions.depth_mm} × ${dimensions.height_mm} mm** | 가로 × 깊이 × 전체 높이 |
| **수납 단수 (N)** | **${dimensions.levels}단** (가로 판재 ${dimensions.levels + 1}매) | 내부 수납 공간 기준 |
| **부재 두께 (T)** | **${dimensions.thickness_t}T (${dimensions.thickness_t}mm)** | 주요 판재 두께 |
| **중간 세로 칸막이** | **${dimensions.vertical_dividers}열** (${dimensions.vertical_dividers + 1}분할 경간) | 유효 경간(Span): ${computed_summary.clear_span_mm}mm |
| **단당 유효 내경** | **평균 ${computed_summary.net_shelf_height_mm} mm** (총 내경 합: ${computed_summary.inner_total_height_mm}mm) | ${customHeightsStr} |
| **단 높이 특기 메모** | ${dimensions.custom_shelf_height_note || '없음'} | - |

---

## 2. 하부 베이스 및 공간 간섭 (Base & Clearance)

- **하부 구조 형태:** ${LABELS.base_type[base_clearance.type]}
- **바닥 유효 높이 ($H_{\\text{clearance}}$):** ${base_clearance.clearance_mm} mm
- **로봇청소기 진입 판정:** **${computed_summary.robot_badge_text}**
- **다리 디자인:** ${base_clearance.leg_style ? LABELS.leg_style[base_clearance.leg_style] : '해당 없음 (비다리형)'}
- **벽면 걸레받이 노치:** ${LABELS.skirting_notch[base_clearance.skirting_notch]}
- **수평 조절 레벨러:** ${LABELS.leveler[base_clearance.leveler]}

---

## 3. 목재 수종 및 결구/보강 사양 (Material & Joinery)

- **원목 수종:** **${LABELS.wood_species[material_joinery.wood_species]}**
- **집성 등급:** ${LABELS.joinery_type[material_joinery.joinery_type]}
- **프레임 짜임 방식:** ${LABELS.frame_join[material_joinery.frame_join]}
- **선반 고정 방식:** ${LABELS.shelf_fixing[material_joinery.shelf_fixing]}
- **하중 처짐 보강:** ${LABELS.reinforcement[material_joinery.reinforcement]}
- **백패널(뒷판) 구성:** ${LABELS.backpanel[material_joinery.backpanel]}

---

## 4. 표면 마감 및 하드웨어 특주 (Finishing & Hardware)

- **표면 도장 마감:** ${LABELS.finish_coat[finishing_hardware.finish_coat]}
- **모서리 프로파일 가공:** ${LABELS.edge_profile[finishing_hardware.edge_profile]}
- **배선 관통 홀 가공:** ${finishing_hardware.wire_hole_note || '없음'}

---

## 5. 예상 물량(BOM) 산출 및 구조 안전성 검토

- **예상 주요 판재 소요 면적:** **${computed_summary.estimated_area_m2} m²**
- **예상 본체 중량:** **약 ${computed_summary.estimated_weight_kg} kg** (하드웨어 가산 포함)

### 구조 진단 결과
${warningsSection}

${
  ai_review_comment
    ? `---\n\n## 6. AI 목공 전문가 감리 코멘트 (Gemini Review)\n\n${ai_review_comment}\n`
    : ''
}`;
}

export const Step3ExportView: React.FC<Step3ExportViewProps> = ({
  spec,
  onBackToStep2,
  onGenerateAIReview,
  isGeneratingReview,
}) => {
  const [copied, setCopied] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'markdown' | 'json'>(
    'markdown',
  );
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!spec.ai_review_comment && !isGeneratingReview) {
      onGenerateAIReview();
    }
  }, []);

  const markdownContent = buildMarkdownDocument(spec);
  const jsonContent = JSON.stringify(spec, null, 2);

  const filePrefix = `${spec.dimensions.width_mm}x${spec.dimensions.depth_mm}x${spec.dimensions.height_mm}`;

  const triggerDownload = (
    filename: string,
    content: string,
    mimeType: string,
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    triggerDownload(
      `wood_shelf_spec_${filePrefix}.md`,
      markdownContent,
      'text/markdown;charset=utf-8',
    );
  };

  const handleDownloadJSON = () => {
    triggerDownload(
      `wood_shelf_spec_${filePrefix}.json`,
      jsonContent,
      'application/json;charset=utf-8',
    );
  };

  const handleDownloadSVG = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgRef.current);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(
        /^<svg/,
        '<svg xmlns="http://www.w3.org/2000/svg"',
      );
    }
    triggerDownload(
      `wood_shelf_blueprint_${filePrefix}.svg`,
      source,
      'image/svg+xml;charset=utf-8',
    );
  };

  /**
   * FSD Section 7.4: 클립보드 복사 (Clipboard API + Fallback)
   */
  const handleCopyClipboard = async () => {
    const textToCopy =
      activePreviewTab === 'markdown' ? markdownContent : jsonContent;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-5">
      {/* 상단 액션 바 */}
      <div
        className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToStep2}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-amber-500"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Step 2로 돌아가기</span>
          </button>
          <div>
            <h2 className="text-base font-bold">
              Step 3. 최종 사양 검토 및 발주 문서/도면 내보내기
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              마크다운(.md), 표준 스키마(.json), 벡터 도면(.svg) 다운로드 및 A4 인쇄를 지원합니다.
            </p>
          </div>
        </div>

        {/* 내보내기 버튼 그룹 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:border-amber-500"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">클립보드 복사됨!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-amber-500" />
                <span>클립보드 복사</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-500"
          >
            <FileText className="h-4 w-4" />
            <span>.MD 사양서 다운로드</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
          >
            <FileJson className="h-4 w-4" />
            <span>.JSON 스키마 다운로드</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSVG}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
          >
            <ImageDown className="h-4 w-4" />
            <span>.SVG 도면 다운로드</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:border-amber-500"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
          >
            <Printer className="h-4 w-4" />
            <span>A4 인쇄 / PDF</span>
          </button>
        </div>
      </div>

      {/* 본문 2단 구성: 좌측 최종 도면 & AI 감리 코멘트, 우측 문서 프리뷰 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 좌측: 최종 도면 및 AI 감리 코멘트 */}
        <div className="print-only-full flex flex-col gap-4 lg:col-span-5">
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <h3 className="mb-3 text-sm font-bold">
              최종 확정 비례 도면 (정면도 &amp; 측면도)
            </h3>
            <BlueprintSVG
              svgRef={svgRef}
              spec={spec}
              netShelfHeightMm={spec.computed_summary.net_shelf_height_mm}
            />
          </div>

          {/* AI 목공 전문가 감리 코멘트 카드 */}
          <div
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                <Sparkles className="h-4 w-4" />
                <span>AI 목공 전문가 감리 리포트 (Gemini Review)</span>
              </div>
              <button
                type="button"
                disabled={isGeneratingReview}
                onClick={onGenerateAIReview}
                className="no-print flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition hover:border-amber-500 disabled:opacity-50"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                {isGeneratingReview ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <span>다시 생성</span>
                )}
              </button>
            </div>

            <div
              className="whitespace-pre-line rounded-lg border p-3 text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-color)',
              }}
            >
              {spec.ai_review_comment ||
                '전문가 감리 의견을 생성하고 있습니다...'}
            </div>
          </div>
        </div>

        {/* 우측: Markdown / JSON 전문 프리뷰 */}
        <div className="print-only-full lg:col-span-7">
          <div
            className="flex h-full flex-col rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div className="no-print mb-3 flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('markdown')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activePreviewTab === 'markdown'
                      ? 'bg-amber-600 text-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  Markdown 발주서 (.md)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('json')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activePreviewTab === 'json'
                      ? 'bg-sky-600 text-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  JSON Schema 인스턴스 (.json)
                </button>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                파일명:{' '}
                {activePreviewTab === 'markdown'
                  ? `wood_shelf_spec_${filePrefix}.md`
                  : `wood_shelf_spec_${filePrefix}.json`}
              </span>
            </div>

            <pre
              className="custom-scroll max-h-[600px] flex-1 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-main)',
              }}
            >
              {activePreviewTab === 'markdown' ? markdownContent : jsonContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
