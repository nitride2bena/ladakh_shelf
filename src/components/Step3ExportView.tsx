import React, { useState, useRef, useEffect } from 'react';
import {
  WoodShelfSpecificationData,
  LABELS,
  WOOD_COLORS,
  PRESET_DEFINITIONS,
  ThemeMode,
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
  Share2,
  ClipboardList,
} from 'lucide-react';

interface Step3ExportViewProps {
  spec: WoodShelfSpecificationData;
  theme: ThemeMode;
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
      ? dimensions.custom_shelf_heights_mm
          .map((h, i) => `${i + 1}단: ${h}mm`)
          .join(', ')
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
- **바닥 유효 높이 (H_clearance):** ${base_clearance.clearance_mm} mm
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
  theme,
  onBackToStep2,
  onGenerateAIReview,
  isGeneratingReview,
}) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  // FSD v3.1 Section 7.1: 시각적 발주 사양서('report')를 기본 탭으로 제공
  const [activePreviewTab, setActivePreviewTab] = useState<
    'report' | 'markdown' | 'json'
  >('report');
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

  const copyTextWithFallback = async (textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  /**
   * FSD v3.1 Section 7.5: 클립보드 복사
   */
  const handleCopyClipboard = async () => {
    const textToCopy =
      activePreviewTab === 'json' ? jsonContent : markdownContent;
    await copyTextWithFallback(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  /**
   * FSD v3.1 Section 2.1 & 7.5: 현재 사양이 인코딩된 공유 URL 복사
   */
  const handleCopyShareLink = async () => {
    const { computed_summary, generated_at, ai_review_comment, ...coreOnly } =
      spec;
    const encoded = btoa(
      encodeURIComponent(JSON.stringify(coreOnly)),
    );
    const url = `${window.location.origin}${window.location.pathname}?spec=${encoded}`;
    await copyTextWithFallback(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2200);
  };

  const {
    client,
    presetType,
    basePresetOrigin,
    dimensions,
    base_clearance,
    material_joinery,
    finishing_hardware,
    computed_summary,
  } = spec;

  const presetTitle =
    presetType === 'custom'
      ? `커스텀 사양 (원본: ${
          PRESET_DEFINITIONS.find((p) => p.id === basePresetOrigin)?.title ||
          '기본형'
        })`
      : PRESET_DEFINITIONS.find((p) => p.id === presetType)?.title || presetType;

  const customHeightsStr =
    dimensions.custom_shelf_heights_mm &&
    dimensions.custom_shelf_heights_mm.length > 0
      ? dimensions.custom_shelf_heights_mm
          .map((h, i) => `${i + 1}단: ${h}mm`)
          .join(' / ')
      : `균등 분할 (단당 약 ${computed_summary.net_shelf_height_mm}mm)`;

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
              시각적 발주서 리포트, 마크다운(.md), 표준 스키마(.json), 벡터 도면(.svg) 다운로드 및 A4 인쇄를 지원합니다.
            </p>
          </div>
        </div>

        {/* 내보내기 버튼 그룹 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-amber-500"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
            title="현재 설계된 사양을 URL 링크로 복사하여 공방이나 타인에게 공유합니다."
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">공유 링크 복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-sky-400" />
                <span>설계 링크 공유</span>
              </>
            )}
          </button>

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
              theme={theme}
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

        {/* 우측: 3-Tab 프리뷰 뷰어 (시각적 발주 사양서 / Markdown / JSON) */}
        <div className="print-only-full lg:col-span-7">
          <div
            className="flex h-full flex-col rounded-xl border p-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
            }}
          >
            <div
              className="no-print mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('report')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activePreviewTab === 'report'
                      ? 'bg-amber-600 text-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  <span>시각적 발주 사양서</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('markdown')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activePreviewTab === 'markdown'
                      ? 'bg-amber-600 text-white'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  Markdown 원문 (.md)
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
                {activePreviewTab === 'json'
                  ? `wood_shelf_spec_${filePrefix}.json`
                  : `wood_shelf_spec_${filePrefix}.md`}
              </span>
            </div>

            {activePreviewTab === 'report' ? (
              <div
                className="print-only-full custom-scroll max-h-[640px] flex-1 space-y-4 overflow-auto rounded-lg border p-4 text-xs"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-color)',
                }}
              >
                {/* 헤더 */}
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-b pb-3"
                  style={{ borderColor: 'var(--border-color)' }}
                >
                  <div>
                    <h3 className="text-base font-bold">
                      원목 선반 제작 발주 사양서
                    </h3>
                    <p
                      className="mt-0.5 text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      발주처: <strong>{client || '기본 발주 프로젝트'}</strong> · 기반 모델: {presetTitle}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
                      {dimensions.width_mm} × {dimensions.depth_mm} ×{' '}
                      {dimensions.height_mm} mm ({dimensions.levels}단 /{' '}
                      {dimensions.thickness_t}T)
                    </span>
                  </div>
                </div>

                {/* 섹션 1: 규격 및 수납 구조 */}
                <div>
                  <h4 className="mb-2 text-xs font-bold text-amber-500">
                    1. 규격 및 수납 구조 (Dimensions &amp; Capacity)
                  </h4>
                  <div
                    className="overflow-hidden rounded-lg border"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <table className="w-full border-collapse text-left text-xs">
                      <tbody>
                        <tr
                          className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <th
                            className="w-1/3 px-3 py-2 font-semibold"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            외경 치수 (W × D × H)
                          </th>
                          <td className="px-3 py-2 font-bold">
                            {dimensions.width_mm} × {dimensions.depth_mm} ×{' '}
                            {dimensions.height_mm} mm
                          </td>
                        </tr>
                        <tr
                          className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <th
                            className="px-3 py-2 font-semibold"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            수납 단수 / 부재 두께
                          </th>
                          <td className="px-3 py-2">
                            <strong>{dimensions.levels}단</strong> (가로 판재{' '}
                            {dimensions.levels + 1}매) /{' '}
                            <strong>{dimensions.thickness_t}T</strong> (
                            {dimensions.thickness_t}mm)
                          </td>
                        </tr>
                        <tr
                          className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <th
                            className="px-3 py-2 font-semibold"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            중간 세로 칸막이 / 유효 경간
                          </th>
                          <td className="px-3 py-2">
                            {dimensions.vertical_dividers}열 (
                            {dimensions.vertical_dividers + 1}분할) · 유효 경간{' '}
                            <strong>{computed_summary.clear_span_mm} mm</strong>
                          </td>
                        </tr>
                        <tr
                          className="border-b"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          <th
                            className="px-3 py-2 font-semibold"
                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                          >
                            단당 유효 내경 (총 {computed_summary.inner_total_height_mm}mm)
                          </th>
                          <td className="px-3 py-2 font-semibold text-amber-400">
                            {customHeightsStr}
                          </td>
                        </tr>
                        {dimensions.custom_shelf_height_note && (
                          <tr>
                            <th
                              className="px-3 py-2 font-semibold"
                              style={{ backgroundColor: 'var(--bg-elevated)' }}
                            >
                              단 높이 특기 메모
                            </th>
                            <td className="px-3 py-2">
                              {dimensions.custom_shelf_height_note}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 섹션 2 & 3: 하부 베이스 & 목재/결구 */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <h4 className="mb-2 text-xs font-bold text-amber-500">
                      2. 하부 베이스 및 공간 간섭
                    </h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          하부 구조 형태
                        </span>
                        <span className="font-semibold">
                          {LABELS.base_type[base_clearance.type]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          바닥 유효 높이
                        </span>
                        <span className="font-semibold">
                          {base_clearance.clearance_mm} mm
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          청소기 진입 판정
                        </span>
                        <span className="font-bold text-emerald-400">
                          {computed_summary.robot_badge_text}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          다리 디자인 / 레벨러
                        </span>
                        <span className="font-semibold">
                          {base_clearance.leg_style
                            ? LABELS.leg_style[base_clearance.leg_style]
                            : '비다리형'}{' '}
                          · {LABELS.leveler[base_clearance.leveler]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          벽면 걸레받이 노치
                        </span>
                        <span className="font-semibold">
                          {LABELS.skirting_notch[base_clearance.skirting_notch]}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <h4 className="mb-2 text-xs font-bold text-amber-500">
                      3. 목재 수종 및 결구/보강
                    </h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-center justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          원목 수종
                        </span>
                        <span className="flex items-center gap-1.5 font-bold">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-black/30"
                            style={{
                              backgroundColor:
                                WOOD_COLORS[material_joinery.wood_species],
                            }}
                          />
                          {LABELS.wood_species[material_joinery.wood_species]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          집성 등급
                        </span>
                        <span className="font-semibold">
                          {LABELS.joinery_type[material_joinery.joinery_type]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          프레임 짜임 / 고정
                        </span>
                        <span className="font-semibold">
                          {LABELS.frame_join[material_joinery.frame_join]} ·{' '}
                          {LABELS.shelf_fixing[material_joinery.shelf_fixing]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          하중 처짐 보강
                        </span>
                        <span className="font-semibold">
                          {LABELS.reinforcement[material_joinery.reinforcement]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          백패널 구성
                        </span>
                        <span className="font-semibold">
                          {LABELS.backpanel[material_joinery.backpanel]}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 섹션 4 & 5: 표면 마감 및 예상 물량(BOM) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <h4 className="mb-2 text-xs font-bold text-amber-500">
                      4. 표면 마감 및 하드웨어 특주
                    </h4>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          표면 도장 마감
                        </span>
                        <span className="font-semibold">
                          {LABELS.finish_coat[finishing_hardware.finish_coat]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          모서리 프로파일
                        </span>
                        <span className="font-semibold">
                          {LABELS.edge_profile[finishing_hardware.edge_profile]}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span style={{ color: 'var(--text-muted)' }}>
                          배선 관통 홀 메모
                        </span>
                        <span className="font-semibold">
                          {finishing_hardware.wire_hole_note || '없음'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div
                    className="rounded-lg border p-3"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-color)',
                    }}
                  >
                    <h4 className="mb-2 text-xs font-bold text-sky-400">
                      5. 예상 물량(BOM) 및 구조 진단
                    </h4>
                    <div className="mb-2 grid grid-cols-2 gap-2 rounded bg-sky-500/10 p-2">
                      <div>
                        <span
                          className="block text-[10px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          주요 판재 소요 면적
                        </span>
                        <span className="text-sm font-bold text-sky-400">
                          {computed_summary.estimated_area_m2} m²
                        </span>
                      </div>
                      <div>
                        <span
                          className="block text-[10px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          예상 본체 중량
                        </span>
                        <span className="text-sm font-bold text-sky-400">
                          약 {computed_summary.estimated_weight_kg} kg
                        </span>
                      </div>
                    </div>
                    {computed_summary.warnings.length === 0 ? (
                      <p className="text-[11px] text-emerald-400">
                        ✅ 특이 구조 위험 없음 (유효 내경, 처짐 경간, 세장비 모두 기준 충족)
                      </p>
                    ) : (
                      <ul className="space-y-1 text-[11px] text-amber-400">
                        {computed_summary.warnings.map((w, idx) => (
                          <li key={idx}>⚠️ {w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <pre
                className="print-only-full custom-scroll max-h-[640px] flex-1 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                {activePreviewTab === 'markdown'
                  ? markdownContent
                  : jsonContent}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
