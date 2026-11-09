import React from 'react';
import {
  WoodShelfSpecificationData,
  WOOD_COLORS,
  LABELS,
} from '../types/shelfSchema';
import { computeBlueprintMetrics } from '../engine/calculator';

interface BlueprintSVGProps {
  spec: Pick<
    WoodShelfSpecificationData,
    'dimensions' | 'base_clearance' | 'material_joinery' | 'finishing_hardware'
  >;
  netShelfHeightMm: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

/**
 * FSD Section 4.1 & 4.3: 반응형 듀얼 뷰포트(정면도 + 측면도) SVG 도면 엔진
 * viewBox="0 0 520 320"
 */
export const BlueprintSVG: React.FC<BlueprintSVGProps> = ({
  spec,
  netShelfHeightMm,
  svgRef,
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

  const woodColor = WOOD_COLORS[wood_species] || '#d4a373';
  const floorY = 278; // 바닥 기준선 Y좌표

  // 정면도(Front View) 배치 좌표 (좌측 영역 X: 30 ~ 330)
  const frontCenterX = 175;
  const frontX = frontCenterX - w_svg / 2;
  const frontTopY = floorY - h_svg;

  // 측면도(Side View) 배치 좌표 (우측 영역 X: 355 ~ 495)
  const sideCenterX = 425;
  const sideX = sideCenterX - d_svg / 2;
  const sideTopY = floorY - h_svg;

  // 각 선반 판재의 Y 위치 계산 (상판 = frontTopY, 하판 = frontTopY + h_frame_svg - t_svg)
  const shelfYPositions: number[] = [];
  const innerAvailableSvg = Math.max(h_frame_svg - t_svg * (N + 1), 0);

  if (
    custom_shelf_heights_mm &&
    custom_shelf_heights_mm.length === N &&
    custom_shelf_heights_mm.reduce((a, b) => a + b, 0) > 0
  ) {
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

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 520 320"
      className="h-auto w-full select-none rounded-lg border"
      style={{
        backgroundColor: '#0f1318',
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
            stroke="#1e293b"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>

      {/* 배경 그리드 */}
      <rect width="520" height="320" fill="url(#blueprint-grid)" />

      {/* 상단 뷰 타이틀 */}
      <text
        x={frontCenterX}
        y={18}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="600"
      >
        정면도 (FRONT VIEW)
      </text>
      <text
        x={sideCenterX}
        y={18}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="10"
        fontWeight="600"
      >
        측면도 (SIDE VIEW)
      </text>

      {/* 바닥 기준선 (Floor Line) */}
      <line
        x1="20"
        y1={floorY}
        x2="500"
        y2={floorY}
        stroke="#475569"
        strokeWidth="1.2"
        strokeDasharray="4 2"
      />
      <text x="502" y={floorY + 3} fill="#64748b" fontSize="8">
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
        />
      )}

      {backpanel === 'solid_louver' && (
        <g>
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
        <g stroke="#d4af37" strokeWidth="1.5" strokeDasharray="4 3">
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
      <rect
        x={frontX}
        y={frontTopY}
        width={t_svg}
        height={h_frame_svg}
        fill={woodColor}
        stroke="#1e293b"
        strokeWidth="0.6"
      />
      <rect
        x={frontX + w_svg - t_svg}
        y={frontTopY}
        width={t_svg}
        height={h_frame_svg}
        fill={woodColor}
        stroke="#1e293b"
        strokeWidth="0.6"
      />

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
          stroke="#1e293b"
          strokeWidth="0.5"
        />
      ))}

      {/* 1-D. 가로 선반 판재 (N + 1 매) 및 하중 보강재 */}
      {shelfYPositions.map((sy, idx) => (
        <g key={idx}>
          <rect
            x={frontX}
            y={sy}
            width={w_svg}
            height={t_svg}
            fill={woodColor}
            stroke="#0f172a"
            strokeWidth="0.7"
          />
          {/* 하중 보강재 렌더링 (최하판 제외 또는 전 선반 적용) */}
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
                stroke="#0f172a"
                strokeWidth="0.4"
              />
            )}
        </g>
      ))}

      {/* 1-E. 하부 베이스 구조 (legs / plinth / floor) */}
      {baseType === 'legs' && h_base_svg > 0 && (
        <g>
          {leg_style === 'tapered' ? (
            <>
              {/* 좌측 테이퍼드 다리 */}
              <polygon
                points={`${frontX + 2},${frameBottomY} ${frontX + 2 + legWidthSvg},${frameBottomY} ${frontX + 2 + legWidthSvg * 0.65},${floorY} ${frontX + 2 + legWidthSvg * 0.15},${floorY}`}
                fill={woodColor}
                stroke="#0f172a"
                strokeWidth="0.6"
              />
              {/* 우측 테이퍼드 다리 */}
              <polygon
                points={`${frontX + w_svg - 2 - legWidthSvg},${frameBottomY} ${frontX + w_svg - 2},${frameBottomY} ${frontX + w_svg - 2 - legWidthSvg * 0.15},${floorY} ${frontX + w_svg - 2 - legWidthSvg * 0.65},${floorY}`}
                fill={woodColor}
                stroke="#0f172a"
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
                stroke="#0f172a"
                strokeWidth="0.6"
              />
              <rect
                x={frontX + w_svg - 2 - legWidthSvg}
                y={frameBottomY}
                width={legWidthSvg}
                height={h_base_svg}
                fill={leg_style === 'steel' ? '#334155' : woodColor}
                stroke="#0f172a"
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
          stroke="#0f172a"
          strokeWidth="0.8"
        />
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
          stroke="#0f172a"
          strokeWidth="0.9"
        />

        {/* 측면 선반 단면 점선 표시 */}
        {shelfYPositions.map((sy, idx) => (
          <line
            key={idx}
            x1={sideX}
            y1={sy + t_svg / 2}
            x2={sideX + d_svg}
            y2={sy + t_svg / 2}
            stroke="#0f172a"
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
              stroke="#0f172a"
              strokeWidth="0.6"
            />
            <rect
              x={sideX + d_svg - 1.5 - Math.min(legWidthSvg, d_svg * 0.25)}
              y={frameBottomY}
              width={Math.min(legWidthSvg, d_svg * 0.25)}
              height={h_base_svg}
              fill={leg_style === 'steel' ? '#334155' : woodColor}
              stroke="#0f172a"
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
            stroke="#0f172a"
            strokeWidth="0.7"
          />
        )}

        {/* 측면 후면 하단 걸레받이 노치 (Skirting Notch) */}
        {skirting_notch !== 'none' && notchW > 0 && notchH > 0 && (
          <g>
            <rect
              x={sideX + d_svg - notchW}
              y={floorY - notchH}
              width={notchW + 1}
              height={notchH + 1}
              fill="#0f1318"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
            <text
              x={sideX + d_svg + 4}
              y={floorY - notchH / 2}
              fill="#f87171"
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
      <g stroke="#38bdf8" strokeWidth="0.8">
        <line
          x1={frontX}
          y1={frontTopY - 10}
          x2={frontX + w_svg}
          y2={frontTopY - 10}
        />
        <line
          x1={frontX}
          y1={frontTopY - 14}
          x2={frontX}
          y2={frontTopY - 6}
        />
        <line
          x1={frontX + w_svg}
          y1={frontTopY - 14}
          x2={frontX + w_svg}
          y2={frontTopY - 6}
        />
      </g>
      <text
        x={frontCenterX}
        y={frontTopY - 14}
        textAnchor="middle"
        fill="#38bdf8"
        fontSize="9.5"
        fontWeight="700"
      >
        W {W}mm
      </text>

      {/* 전체 높이 (H) 치수선 (좌측) */}
      <g stroke="#38bdf8" strokeWidth="0.8">
        <line
          x1={frontX - 12}
          y1={frontTopY}
          x2={frontX - 12}
          y2={floorY}
        />
        <line
          x1={frontX - 16}
          y1={frontTopY}
          x2={frontX - 8}
          y2={frontTopY}
        />
        <line x1={frontX - 16} y1={floorY} x2={frontX - 8} y2={floorY} />
      </g>
      <text
        x={frontX - 16}
        y={frontTopY + h_svg / 2}
        textAnchor="end"
        dominantBaseline="middle"
        fill="#38bdf8"
        fontSize="9"
        fontWeight="700"
      >
        H {H}
      </text>

      {/* 단당 유효 내경 (H_shelf_net) 표시 (정면 우측 첫 번째 칸) */}
      {shelfYPositions.length >= 2 && (
        <g>
          <line
            x1={frontX + w_svg + 8}
            y1={shelfYPositions[0] + t_svg}
            x2={frontX + w_svg + 8}
            y2={shelfYPositions[1]}
            stroke="#fbbf24"
            strokeWidth="0.9"
          />
          <text
            x={frontX + w_svg + 12}
            y={(shelfYPositions[0] + t_svg + shelfYPositions[1]) / 2 + 3}
            fill="#fbbf24"
            fontSize="8.5"
            fontWeight="600"
          >
            내경 {netShelfHeightMm}mm
          </text>
        </g>
      )}

      {/* 하부 유효 높이 (clearance_mm) 표시 */}
      {baseType !== 'floor' && clearance_mm > 0 && h_base_svg > 4 && (
        <text
          x={frontX + w_svg + 12}
          y={floorY - h_base_svg / 2 + 3}
          fill="#34d399"
          fontSize="8"
          fontWeight="600"
        >
          하부 {clearance_mm}mm
        </text>
      )}

      {/* 측면 깊이 (D) 치수선 */}
      <g stroke="#38bdf8" strokeWidth="0.8">
        <line
          x1={sideX}
          y1={sideTopY - 10}
          x2={sideX + d_svg}
          y2={sideTopY - 10}
        />
        <line
          x1={sideX}
          y1={sideTopY - 14}
          x2={sideX}
          y2={sideTopY - 6}
        />
        <line
          x1={sideX + d_svg}
          y1={sideTopY - 14}
          x2={sideX + d_svg}
          y2={sideTopY - 6}
        />
      </g>
      <text
        x={sideCenterX}
        y={sideTopY - 14}
        textAnchor="middle"
        fill="#38bdf8"
        fontSize="9.5"
        fontWeight="700"
      >
        D {D}mm
      </text>

      {/* 하단 도면 메타 정보 바 */}
      <text x="16" y="308" fill="#94a3b8" fontSize="8.5">
        수종: {LABELS.wood_species[wood_species]} | 두께: {T}T | 단수: {N}단
        {V > 0 ? ` (세로칸막이 ${V}열)` : ''} | 축척 S={scale.toFixed(3)}
      </text>
    </svg>
  );
};
