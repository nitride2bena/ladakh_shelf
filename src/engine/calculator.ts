import {
  WoodShelfSpecificationData,
  ComputedSummary,
  WOOD_DENSITY_KG_M3,
} from '../types/shelfSchema';
import { validateShelfStructure } from './validator';

export interface BlueprintMetrics {
  scale: number; // S
  w_svg: number;
  d_svg: number;
  h_svg: number;
  h_base_svg: number;
  h_frame_svg: number;
  t_svg: number;
  maxClearanceAllowedMm: number;
}

export function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}

/**
 * FSD Section 4.1: 반응형 듀얼 뷰포트(정면도 + 측면도) 스케일 변환 공식
 * viewBox="0 0 520 320" 내에서 정면도 최대 280x240, 측면도 최대 120x240
 */
export function computeBlueprintMetrics(
  spec: Pick<WoodShelfSpecificationData, 'dimensions' | 'base_clearance'>,
): BlueprintMetrics {
  const W = clamp(spec.dimensions.width_mm, 300, 3000);
  const D = clamp(spec.dimensions.depth_mm, 150, 800);
  const H = clamp(spec.dimensions.height_mm, 300, 2400);
  const T = spec.dimensions.thickness_t;

  const maxClearanceAllowedMm = Math.min(300, Math.floor(H * 0.35));
  const rawClearance =
    spec.base_clearance.type === 'floor'
      ? 0
      : clamp(spec.base_clearance.clearance_mm, 0, maxClearanceAllowedMm);

  // 1. 공통 축척 배율 (S)
  const scale = Math.min(280 / W, 120 / D, 240 / H);

  // 2. 화면 렌더링 외경 치수
  const w_svg = W * scale;
  const d_svg = D * scale;
  const h_svg = H * scale;

  // 3. 하부 구조(baseType) 및 본체 분할 계산 (비례 왜곡 없음)
  const h_base_svg =
    spec.base_clearance.type === 'floor' ? 0 : rawClearance * scale;
  const h_frame_svg = Math.max(h_svg - h_base_svg, 20);

  // 4. 부재 두께 스케일링 (t_svg)
  const t_svg = Math.max(T * scale, 2.5);

  return {
    scale,
    w_svg,
    d_svg,
    h_svg,
    h_base_svg,
    h_frame_svg,
    t_svg,
    maxClearanceAllowedMm,
  };
}

/**
 * FSD Section 4.2: 내부 유효 공간, 로봇청소기 진입 판정, BOM 면적 및 예상 중량 계산
 */
export function computeShelfSummary(
  spec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
): ComputedSummary {
  const W = clamp(spec.dimensions.width_mm, 300, 3000);
  const D = clamp(spec.dimensions.depth_mm, 150, 800);
  const H = clamp(spec.dimensions.height_mm, 300, 2400);
  const N = clamp(spec.dimensions.levels, 1, 8);
  const T = spec.dimensions.thickness_t;
  const V = spec.dimensions.vertical_dividers ?? 0;

  const maxClearance = Math.min(300, Math.floor(H * 0.35));
  const H_base_deduct =
    spec.base_clearance.type === 'floor'
      ? 0
      : clamp(spec.base_clearance.clearance_mm, 0, maxClearance);

  // 1. 내부 유효 높이 총합 및 단당 평균 유효 높이 (H_shelf_net)
  const H_inner_total = H - H_base_deduct - T * (N + 1);
  const H_shelf_net = Math.max(Math.floor(H_inner_total / N), 0);

  // 유효 경간 (Span) 계산
  const clear_span_mm = Math.round((W - T * (V + 2)) / (V + 1));

  // 2. 로봇청소기 진입 판정 로직
  let robot_vacuum_pass = false;
  let robot_badge_status: ComputedSummary['robot_badge_status'] = 'closed';
  let robot_badge_text = '';

  if (spec.base_clearance.type === 'legs') {
    if (H_base_deduct >= 110) {
      robot_vacuum_pass = true;
      robot_badge_status = 'pass';
      robot_badge_text = `로봇청소기 진입 가능 (${H_base_deduct}mm ≥ 110mm)`;
    } else {
      robot_vacuum_pass = false;
      robot_badge_status = 'normal_vacuum';
      robot_badge_text = `일반 진공청소기 높이 (${H_base_deduct}mm < 110mm)`;
    }
  } else if (spec.base_clearance.type === 'plinth') {
    robot_vacuum_pass = false;
    robot_badge_status = 'closed';
    robot_badge_text = `하부 걸레받이 박스형 (${H_base_deduct}mm 밀폐 구조)`;
  } else {
    robot_vacuum_pass = false;
    robot_badge_status = 'closed';
    robot_badge_text = '바닥 밀착형 (먼지 유입 차단 구조)';
  }

  // 3. 실시간 목재 소요량(BOM 면적) 및 예상 중량 산출
  const A_horiz = (N + 1) * W * D;
  const A_side = 2 * Math.max(H - H_base_deduct, 0) * D;
  const A_div = V * Math.max(H_inner_total, 0) * D;
  const estimated_area_m2 = Number(((A_horiz + A_side + A_div) / 1_000_000).toFixed(2));

  const rho = WOOD_DENSITY_KG_M3[spec.material_joinery.wood_species] ?? 600;
  const estimated_weight_kg = Number(
    (estimated_area_m2 * (T / 1000) * rho * 1.08).toFixed(1),
  );

  // 4. 구조 안전성 검증 (Errors & Warnings)
  const { errors, warnings } = validateShelfStructure(
    spec,
    H_inner_total,
    H_shelf_net,
    clear_span_mm,
  );

  return {
    net_shelf_height_mm: H_shelf_net,
    inner_total_height_mm: H_inner_total,
    clear_span_mm,
    robot_vacuum_pass,
    robot_badge_status,
    robot_badge_text,
    estimated_area_m2,
    estimated_weight_kg,
    warnings,
    errors,
  };
}
