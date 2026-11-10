import React from 'react';
import {
  WoodShelfSpecificationData,
  WOOD_COLORS,
  LABELS,
  ThemeMode,
} from '../types/shelfSchema';
import { computeBlueprintMetrics } from '../engine/calculator';

export type BlueprintInteractiveSection =
  | 'dimensions'
  | 'base'
  | 'material'
  | 'finishing';

interface BlueprintSVGProps {
  spec: Pick<
    WoodShelfSpecificationData,
    'dimensions' | 'base_clearance' | 'material_joinery' | 'finishing_hardware'
  >;
  netShelfHeightMm: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  theme?: ThemeMode;
  onSelectSection?: (
    section: BlueprintInteractiveSection,
    openDrawer?: boolean,
  ) => void;
}

/**
 * FSD v3.1 Section 4.1 & 4.3: 안전 여백(Safe Padding) 보장 및 양방향 인터랙티브 듀얼 뷰포트 SVG 도면 엔진
 * viewBox="0 0 540 330"
 */
export const BlueprintSVG: React.FC<BlueprintSVGProps> = ({
  spec,
  netShelfHeightMm,
  svgRef,
  theme = 'dark',
  onSelectSection,
}) => {
  const metrics = computeBlueprintMetrics(spec);
  const {
    scale,
    w_svg,
    d_svg,
    h_svg,
    h_base_svg,
    h_frame_svg,
    t_svg,
  } = metrics;

  const {
    width_mm: W,
    depth_mm: D,
    height_mm: H,
    levels: N,
    thickness_t: T,
    vertical_dividers: V,
    custom_shelf_heights_mm,
  } = spec.dimensions;

  const { type: baseType, clearance_mm, leg_style, skirting_notch } =
    spec.base_clearance;
  const { wood_species, reinforcement, backpanel } = spec.material_joinery;

  const isLight = theme === 'light';
  const bgFill = isLight ? '#f8fafc' : '#0f1318';
  const gridStroke = isLight ? '#e2e8f0' : '#1e293b';
  const titleFill = isLight ? '#475569' : '#94a3b8';
  const floorStroke = isLight ? '#64748b' : '#475569';
  const dimStroke = isLight ? '#0284c7' : '#38bdf8';
  const innerDimColor = isLight ? '#d97706' : '#fbbf24';
  const baseDimColor = isLight ? '#059669' : '#34d399';
  const frameStroke = isLight ? '#334155' : '#0f172a';

  const woodColor = WOOD_COLORS[wood_species] || '#d4a373';
  const floorY = 286; // 바닥 기준선 Y좌표 (FSD v3.1 Section 4.1)

  // 정면도(Front View) 배치 좌표 (중심 X = 190, 최대 폭 260 -> 좌측 최소 X = 60)
  const frontCenterX = 190;
  const frontX = frontCenterX - w_svg / 2;
  const frontTopY = floorY - h_svg;

  // 측면도(Side View) 배치 좌표 (중심 X = 445, 최대 폭 115 -> 좌측 최소 X = 387.5)
  const sideCenterX = 445;
  const sideX = sideCenterX - d_svg / 2;
  const sideTopY = floorY - h_svg;

  const hasCustomHeights =
    Array.isArray(custom_shelf_heights_mm) &&
    custom_shelf_heights_mm.length === N &&
    custom_shelf_heights_mm.reduce((a, b) => a + b, 0) > 0;

  // 각 선반 판재의 Y 위치 계산 (상판 = frontTopY, 하판 = frontTopY + h_frame_svg - t_svg)
  const shelfYPositions: number[] = [];
  const innerAvailableSvg = Math.max(h_frame_svg - t_svg * (N + 1), 0);

  if (hasCustomHeights && custom_shelf_heights_mm) {
    const totalCustom = custom_shelf_heights_mm.reduce((a, b) => a + b, 0);
    let cursorY = frontTopY;
    shelfYPositions.push(cursorY); // 최상판
    for (let i = 0; i < N - 1; i++) {
      const ratio = custom_shelf_heights_mm[i] / totalCustom;
      cursorY += t_svg + innerAvailableSvg * ratio;
      shelfYPositions.push(cursorY);
    }
    shelfYPositions.push(frontTopY + h_frame_svg - t_svg); // 최하판
  } else {
    const stepSvg = (h_frame_svg - t_svg) / N;
    for (let i = 0; i <= N; i++) {
      shelfYPositions.push(frontTopY + i * stepSvg);
    }
  }

  // 세로 칸막이(Vertical Dividers) X 위치 계산
  const dividerXPositions: number[] = [];
  if (V > 0) {
    const innerWidthSvg = w_svg - 2 * t_svg;
    const bayWidthSvg = (innerWidthSvg - V * t_svg) / (V + 1);
    for (let v = 1; v <= V; v++) {
      dividerXPositions.push(
        frontX + t_svg + v * bayWidthSvg + (v - 1) * t_svg,
      );
    }
  }

  // 루바(solid_louver) 스트라이프 개수
  const louverCount = Math.max(Math.floor(w_svg / 12), 4);
  const legWidthSvg = Math.max(t_svg * 1.15, 5);
  const frameBottomY = frontTopY + h_frame_svg;

  // 걸레받이 노치 크기 (측면도 우측 하단 = 벽면 측)
  const notchW =
    skirting_notch === 'custom'
      ? Math.max(15 * scale, 4)
      : skirting_notch === 'standard'
        ? Math.max(12 * scale, 3.5)
        : 0;
  const notchH =
    skirting_notch === 'custom'
      ? Math.max(90 * scale, 10)
      : skirting_notch === 'standard'
        ? Math.max(75 * scale, 8)
        : 0;

  const interactiveClass = onSelectSection
    ? 'cursor-pointer transition-opacity hover:opacity-80'
    : '';

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 540 330"
      className="h-auto w-full select-none rounded-lg border"
      style={{
        backgroundColor: bgFill,
        borderColor: 'var(--border-color)',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="blueprint-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke={gridStroke}
            strokeWidth="0.6"
          />
        </pattern>
      </defs>

      {/* 배경 그리드 */}
      <rect width="540" height="330" fill="url(#blueprint-grid)" />

      {/* 상단 뷰 타이틀 (y=16 고정, 치수선 y>=47과 최소 31px 안전 여백 확보) */}
      <text
        x={frontCenterX}
        y={16}
        textAnchor="middle"
        fill={titleFill}
        fontSize="10"
        fontWeight="600"
      >
        정면도 (FRONT VIEW)
      </text>
      <text
        x={sideCenterX}
        y={16}
        textAnchor="middle"
        fill={titleFill}
        fontSize="10"
        fontWeight="600"
      >
        측면도 (SIDE VIEW)
      </text>

      {/* 바닥 기준선 (Floor Line) */}
      <line
        x1="18"
        y1={floorY}
        x2="516"
        y2={floorY}
        stroke={floorStroke}
        strokeWidth="1.2"
        strokeDasharray="4 2"
      />
      <text x="519" y={floorY + 3} fill={titleFill} fontSize="8">
        FL
      </text>

      {/* ==================== 1. 정면도 (FRONT VIEW) ==================== */}

      {/* 1-A. 백패널 렌더링 */}
      {backpanel === 'plywood_5t' && (
        <rect
          x={frontX + t_svg}
          y={frontTopY + t_svg}
          width={Math.max(w_svg - 2 * t_svg, 0)}
          height={Math.max(h_frame_svg - 2 * t_svg, 0)}
          fill={woodColor}
          fillOpacity={0.26}
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', true)}
        >
          <title>5T 동수종 무늬목 합판 백패널 (클릭하여 특주 옵션 편집)</title>
        </rect>
      )}

      {backpanel === 'solid_louver' && (
        <g
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', true)}
        >
          <title>솔리드 원목 루바 백패널 (클릭하여 특주 옵션 편집)</title>
          <rect
            x={frontX + t_svg}
            y={frontTopY + t_svg}
            width={Math.max(w_svg - 2 * t_svg, 0)}
            height={Math.max(h_frame_svg - 2 * t_svg, 0)}
            fill={woodColor}
            fillOpacity={0.18}
          />
          {Array.from({ length: louverCount }).map((_, idx) => {
            const lx =
              frontX +
              t_svg +
              ((idx + 1) * (w_svg - 2 * t_svg)) / (louverCount + 1);
            return (
              <line
                key={idx}
                x1={lx}
                y1={frontTopY + t_svg}
                x2={lx}
                y2={frameBottomY - t_svg}
                stroke={woodColor}
                strokeOpacity={0.55}
                strokeWidth="1.2"
              />
            );
          })}
        </g>
      )}

      {backpanel === 'brass_cross' && (
        <g
          stroke="#d4af37"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', true)}
        >
          <title>황동 강선 X자 브레이싱 (클릭하여 특주 옵션 편집)</title>
          <line
            x1={frontX + t_svg}
            y1={frontTopY + t_svg}
            x2={frontX + w_svg - t_svg}
            y2={frameBottomY - t_svg}
          />
          <line
            x1={frontX + w_svg - t_svg}
            y1={frontTopY + t_svg}
            x2={frontX + t_svg}
            y2={frameBottomY - t_svg}
          />
        </g>
      )}

      {/* 1-B. 좌/우 외측판 (Side Panels) */}
      <g
        className={interactiveClass}
        onClick={() => onSelectSection?.('material', false)}
      >
        <title>
          {LABELS.wood_species[wood_species]} {T}T 측판 (클릭하여 수종/구조 설정)
        </title>
        <rect
          x={frontX}
          y={frontTopY}
          width={t_svg}
          height={h_frame_svg}
          fill={woodColor}
          stroke={frameStroke}
          strokeWidth="0.6"
        />
        <rect
          x={frontX + w_svg - t_svg}
          y={frontTopY}
          width={t_svg}
          height={h_frame_svg}
          fill={woodColor}
          stroke={frameStroke}
          strokeWidth="0.6"
        />
      </g>

      {/* 1-C. 중간 세로 칸막이 (Vertical Dividers) */}
      {dividerXPositions.map((dx, i) => (
        <rect
          key={i}
          x={dx}
          y={frontTopY + t_svg}
          width={t_svg}
          height={Math.max(h_frame_svg - 2 * t_svg, 0)}
          fill={woodColor}
          fillOpacity={0.92}
          stroke={frameStroke}
          strokeWidth="0.5"
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', true)}
        >
          <title>중간 세로 칸막이 {i + 1}열 (클릭하여 특주 옵션 편집)</title>
        </rect>
      ))}

      {/* 1-D. 가로 선반 판재 (N + 1 매) 및 하중 보강재 */}
      {shelfYPositions.map((sy, idx) => (
        <g
          key={idx}
          className={interactiveClass}
          onClick={() => onSelectSection?.('material', reinforcement !== 'none')}
        >
          <title>
            가로 선반 판재 ({T}T) {reinforcement !== 'none' ? `+ ${LABELS.reinforcement[reinforcement]}` : ''}
          </title>
          <rect
            x={frontX}
            y={sy}
            width={w_svg}
            height={t_svg}
            fill={woodColor}
            stroke={frameStroke}
            strokeWidth="0.7"
          />
          {/* 하중 보강재 렌더링 (최하판 제외) */}
          {idx < shelfYPositions.length - 1 &&
            reinforcement === 'steel_flat' && (
              <line
                x1={frontX + t_svg}
                y1={sy + t_svg + 1.2}
                x2={frontX + w_svg - t_svg}
                y2={sy + t_svg + 1.2}
                stroke="#f59e0b"
                strokeWidth="2"
              />
            )}
          {idx < shelfYPositions.length - 1 &&
            reinforcement === 'wood_apron' && (
              <rect
                x={frontX + t_svg}
                y={sy + t_svg}
                width={Math.max(w_svg - 2 * t_svg, 0)}
                height={3.8}
                fill={woodColor}
                fillOpacity={0.82}
                stroke={frameStroke}
                strokeWidth="0.4"
              />
            )}
        </g>
      ))}

      {/* 1-E. 하부 베이스 구조 (legs / plinth / floor) */}
      {baseType === 'legs' && h_base_svg > 0 && (
        <g
          className={interactiveClass}
          onClick={() => onSelectSection?.('base', false)}
        >
          <title>하부 다리 ({clearance_mm}mm) - 클릭하여 하부 공간 설정</title>
          {leg_style === 'tapered' ? (
            <>
              <polygon
                points={`${frontX + 2},${frameBottomY} ${frontX + 2 + legWidthSvg},${frameBottomY} ${frontX + 2 + legWidthSvg * 0.65},${floorY} ${frontX + 2 + legWidthSvg * 0.15},${floorY}`}
                fill={woodColor}
                stroke={frameStroke}
                strokeWidth="0.6"
              />
              <polygon
                points={`${frontX + w_svg - 2 - legWidthSvg},${frameBottomY} ${frontX + w_svg - 2},${frameBottomY} ${frontX + w_svg - 2 - legWidthSvg * 0.15},${floorY} ${frontX + w_svg - 2 - legWidthSvg * 0.65},${floorY}`}
                fill={woodColor}
                stroke={frameStroke}
                strokeWidth="0.6"
              />
            </>
          ) : (
            <>
              <rect
                x={frontX + 2}
                y={frameBottomY}
                width={legWidthSvg}
                height={h_base_svg}
                fill={leg_style === 'steel' ? '#334155' : woodColor}
                stroke={frameStroke}
                strokeWidth="0.6"
              />
              <rect
                x={frontX + w_svg - 2 - legWidthSvg}
                y={frameBottomY}
                width={legWidthSvg}
                height={h_base_svg}
                fill={leg_style === 'steel' ? '#334155' : woodColor}
                stroke={frameStroke}
                strokeWidth="0.6"
              />
            </>
          )}
        </g>
      )}

      {baseType === 'plinth' && h_base_svg > 0 && (
        <rect
          x={frontX + Math.min(8, w_svg * 0.05)}
          y={frameBottomY}
          width={Math.max(w_svg - Math.min(16, w_svg * 0.1), 10)}
          height={h_base_svg}
          fill={woodColor}
          fillOpacity={0.78}
          stroke={frameStroke}
          strokeWidth="0.8"
          className={interactiveClass}
          onClick={() => onSelectSection?.('base', false)}
        >
          <title>하부 걸레받이 박스형 ({clearance_mm}mm)</title>
        </rect>
      )}

      {/* ==================== 2. 측면도 (SIDE VIEW) ==================== */}
      <g>
        {/* 측면 본체 외곽 */}
        <rect
          x={sideX}
          y={sideTopY}
          width={d_svg}
          height={h_frame_svg}
          fill={woodColor}
          fillOpacity={0.85}
          stroke={frameStroke}
          strokeWidth="0.9"
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', false)}
        >
          <title>측면 깊이 {D}mm (클릭하여 규격 설정)</title>
        </rect>

        {/* 측면 선반 단면 점선 표시 */}
        {shelfYPositions.map((sy, idx) => (
          <line
            key={idx}
            x1={sideX}
            y1={sy + t_svg / 2}
            x2={sideX + d_svg}
            y2={sy + t_svg / 2}
            stroke={frameStroke}
            strokeOpacity={0.5}
            strokeWidth={Math.max(t_svg * 0.6, 1)}
          />
        ))}

        {/* 측면 하부 다리 또는 걸레받이 */}
        {baseType === 'legs' && h_base_svg > 0 && (
          <>
            <rect
              x={sideX + 1.5}
              y={frameBottomY}
              width={Math.min(legWidthSvg, d_svg * 0.25)}
              height={h_base_svg}
              fill={leg_style === 'steel' ? '#334155' : woodColor}
              stroke={frameStroke}
              strokeWidth="0.6"
            />
            <rect
              x={sideX + d_svg - 1.5 - Math.min(legWidthSvg, d_svg * 0.25)}
              y={frameBottomY}
              width={Math.min(legWidthSvg, d_svg * 0.25)}
              height={h_base_svg}
              fill={leg_style === 'steel' ? '#334155' : woodColor}
              stroke={frameStroke}
              strokeWidth="0.6"
            />
          </>
        )}

        {baseType === 'plinth' && h_base_svg > 0 && (
          <rect
            x={sideX + 3}
            y={frameBottomY}
            width={Math.max(d_svg - 3, 6)}
            height={h_base_svg}
            fill={woodColor}
            fillOpacity={0.75}
            stroke={frameStroke}
            strokeWidth="0.7"
          />
        )}

        {/* 측면 후면 하단 걸레받이 노치 (Skirting Notch) */}
        {skirting_notch !== 'none' && notchW > 0 && notchH > 0 && (
          <g
            className={interactiveClass}
            onClick={() => onSelectSection?.('base', true)}
          >
            <title>벽면 걸레받이 노치 가공 (클릭하여 하부 특주 설정)</title>
            <rect
              x={sideX + d_svg - notchW}
              y={floorY - notchH}
              width={notchW + 1}
              height={notchH + 1}
              fill={bgFill}
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
            <text
              x={sideX + d_svg + 4}
              y={floorY - notchH / 2 + 2}
              fill="#ef4444"
              fontSize="7.5"
              fontWeight="600"
            >
              노치
            </text>
          </g>
        )}
      </g>

      {/* ==================== 3. 치수 보조선 및 수치 표기 ==================== */}

      {/* 가로 폭 (W) 치수선 */}
      <g
        className={interactiveClass}
        onClick={() => onSelectSection?.('dimensions', false)}
      >
        <g stroke={dimStroke} strokeWidth="0.8">
          <line
            x1={frontX}
            y1={frontTopY - 9}
            x2={frontX + w_svg}
            y2={frontTopY - 9}
          />
          <line
            x1={frontX}
            y1={frontTopY - 13}
            x2={frontX}
            y2={frontTopY - 5}
          />
          <line
            x1={frontX + w_svg}
            y1={frontTopY - 13}
            x2={frontX + w_svg}
            y2={frontTopY - 5}
          />
        </g>
        <text
          x={frontCenterX}
          y={frontTopY - 13}
          textAnchor="middle"
          fill={dimStroke}
          fontSize="9.5"
          fontWeight="700"
        >
          W {W}mm
        </text>
      </g>

      {/* 전체 높이 (H) 치수선 (좌측 - mm 단위 포함 및 좌측 최소 60px 여백으로 잘림 방지) */}
      <g
        className={interactiveClass}
        onClick={() => onSelectSection?.('dimensions', false)}
      >
        <g stroke={dimStroke} strokeWidth="0.8">
          <line
            x1={frontX - 10}
            y1={frontTopY}
            x2={frontX - 10}
            y2={floorY}
          />
          <line
            x1={frontX - 14}
            y1={frontTopY}
            x2={frontX - 6}
            y2={frontTopY}
          />
          <line x1={frontX - 14} y1={floorY} x2={frontX - 6} y2={floorY} />
        </g>
        <text
          x={frontX - 13}
          y={frontTopY + h_svg / 2}
          textAnchor="end"
          dominantBaseline="middle"
          fill={dimStroke}
          fontSize="8.5"
          fontWeight="700"
        >
          H {H}mm
        </text>
      </g>

      {/* 단별 유효 내경 표시 (비대칭 활성화 시 전 단 개별 표시, 균등 분할 시 1단 평균 표시) */}
      {hasCustomHeights && custom_shelf_heights_mm ? (
        <g
          className={interactiveClass}
          onClick={() => onSelectSection?.('dimensions', true)}
        >
          {custom_shelf_heights_mm.map((hVal, idx) => {
            if (idx + 1 >= shelfYPositions.length) return null;
            const yTop = shelfYPositions[idx] + t_svg;
            const yBottom = shelfYPositions[idx + 1];
            const midY = (yTop + yBottom) / 2;
            return (
              <g key={idx}>
                <line
                  x1={frontX + w_svg + 7}
                  y1={yTop}
                  x2={frontX + w_svg + 7}
                  y2={yBottom}
                  stroke={innerDimColor}
                  strokeWidth="0.9"
                />
                <text
                  x={frontX + w_svg + 11}
                  y={midY + 2.5}
                  fill={innerDimColor}
                  fontSize={N >= 6 ? '7' : '8'}
                  fontWeight="600"
                >
                  {idx + 1}단 {hVal}mm
                </text>
              </g>
            );
          })}
        </g>
      ) : (
        shelfYPositions.length >= 2 && (
          <g
            className={interactiveClass}
            onClick={() => onSelectSection?.('dimensions', false)}
          >
            <line
              x1={frontX + w_svg + 8}
              y1={shelfYPositions[0] + t_svg}
              x2={frontX + w_svg + 8}
              y2={shelfYPositions[1]}
              stroke={innerDimColor}
              strokeWidth="0.9"
            />
            <text
              x={frontX + w_svg + 12}
              y={(shelfYPositions[0] + t_svg + shelfYPositions[1]) / 2 + 3}
              fill={innerDimColor}
              fontSize="8.5"
              fontWeight="600"
            >
              내경 {netShelfHeightMm}mm
            </text>
          </g>
        )
      )}

      {/* 하부 유효 높이 (clearance_mm) 표시 */}
      {baseType !== 'floor' && clearance_mm > 0 && h_base_svg > 4 && (
        <text
          x={frontX + w_svg + 12}
          y={floorY - h_base_svg / 2 + 3}
          fill={baseDimColor}
          fontSize="8"
          fontWeight="600"
          className={interactiveClass}
          onClick={() => onSelectSection?.('base', false)}
        >
          하부 {clearance_mm}mm
        </text>
      )}

      {/* 측면 깊이 (D) 치수선 */}
      <g
        className={interactiveClass}
        onClick={() => onSelectSection?.('dimensions', false)}
      >
        <g stroke={dimStroke} strokeWidth="0.8">
          <line
            x1={sideX}
            y1={sideTopY - 9}
            x2={sideX + d_svg}
            y2={sideTopY - 9}
          />
          <line
            x1={sideX}
            y1={sideTopY - 13}
            x2={sideX}
            y2={sideTopY - 5}
          />
          <line
            x1={sideX + d_svg}
            y1={sideTopY - 13}
            x2={sideX + d_svg}
            y2={sideTopY - 5}
          />
        </g>
        <text
          x={sideCenterX}
          y={sideTopY - 13}
          textAnchor="middle"
          fill={dimStroke}
          fontSize="9.5"
          fontWeight="700"
        >
          D {D}mm
        </text>
      </g>

      {/* 하단 도면 메타 정보 바 */}
      <text x="16" y="316" fill={titleFill} fontSize="8.5">
        수종: {LABELS.wood_species[wood_species]} | 두께: {T}T | 단수: {N}단
        {V > 0 ? ` (세로칸막이 ${V}열)` : ''} | 축척 S={scale.toFixed(3)}
      </text>
    </svg>
  );
};
