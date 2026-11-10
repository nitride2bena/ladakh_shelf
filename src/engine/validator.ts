import {
  WoodShelfSpecificationData,
  ThicknessT,
  VerticalDividers,
} from '../types/shelfSchema';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

/**
 * FSD v3.1 Section 3.2.3: 비대칭 단 높이 자동 잔여 분배 (Auto-Balance)
 * 특정 단(changedIdx)의 높이를 변경했을 때 잠금(lockedIndices)되지 않은 나머지 단들에
 * 전체 유효 내경(innerTotalHeightMm)을 최소 100mm 보장하며 균등 분배한다.
 */
export function autoBalanceShelfHeights(
  currentHeights: number[],
  changedIdx: number,
  newValue: number,
  lockedIndices: number[],
  innerTotalHeightMm: number,
): number[] {
  const N = currentHeights.length;
  if (N <= 1) {
    return [Math.max(100, innerTotalHeightMm)];
  }

  const next = [...currentHeights];
  // 변경하려는 단 이외의 잠금된 단들 합계
  const otherLockedIndices = lockedIndices.filter((idx) => idx !== changedIdx && idx >= 0 && idx < N);
  const unlockedOtherIndices = Array.from({ length: N }, (_, i) => i).filter(
    (i) => i !== changedIdx && !otherLockedIndices.includes(i),
  );

  if (unlockedOtherIndices.length === 0) {
    // 다른 모든 단이 잠겨있으면 변경된 단이 잔여 높이를 흡수
    const otherSum = otherLockedIndices.reduce((acc, idx) => acc + next[idx], 0);
    next[changedIdx] = Math.max(100, innerTotalHeightMm - otherSum);
    return next;
  }

  const lockedSum = otherLockedIndices.reduce((acc, idx) => acc + next[idx], 0);
  const minRequiredForUnlocked = unlockedOtherIndices.length * 100;
  const maxAllowedForChanged = Math.max(
    100,
    innerTotalHeightMm - lockedSum - minRequiredForUnlocked,
  );

  const clampedNewVal = Math.min(Math.max(100, Math.round(newValue)), maxAllowedForChanged);
  next[changedIdx] = clampedNewVal;

  const remaining = Math.max(
    minRequiredForUnlocked,
    innerTotalHeightMm - lockedSum - clampedNewVal,
  );
  const baseShare = Math.floor(remaining / unlockedOtherIndices.length);
  let remainder = remaining - baseShare * unlockedOtherIndices.length;

  for (const idx of unlockedOtherIndices) {
    next[idx] = baseShare + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }

  return next;
}

/**
 * 비대칭 단 높이의 현재 오차를 잠기지 않은 단들에 즉시 분배하여 합계를 innerTotalHeightMm에 맞춘다.
 */
export function distributeRemainingHeight(
  currentHeights: number[],
  lockedIndices: number[],
  innerTotalHeightMm: number,
): number[] {
  const N = currentHeights.length;
  if (N === 0) return [];
  const next = [...currentHeights];
  const validLocked = lockedIndices.filter((i) => i >= 0 && i < N);
  const unlocked = Array.from({ length: N }, (_, i) => i).filter(
    (i) => !validLocked.includes(i),
  );

  const targetIndices = unlocked.length > 0 ? unlocked : Array.from({ length: N }, (_, i) => i);
  const fixedSum = Array.from({ length: N }, (_, i) => i)
    .filter((i) => !targetIndices.includes(i))
    .reduce((acc, i) => acc + next[i], 0);

  const remaining = Math.max(targetIndices.length * 100, innerTotalHeightMm - fixedSum);
  const avg = Math.floor(remaining / targetIndices.length);
  let rem = remaining - avg * targetIndices.length;

  for (const idx of targetIndices) {
    next[idx] = avg + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;
  }

  return next;
}

/**
 * FSD v3.1 Section 3.3.1: 옵션 종속성(Dependency) 자동 보정 규칙
 */
export function normalizeSpecDependencies(
  draft: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
): Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'> {
  const next = structuredClone(draft);

  // 높이 상한 대비 다리 높이 최대 35% 제한
  const maxClearance = Math.min(300, Math.floor(next.dimensions.height_mm * 0.35));

  if (next.base_clearance.type === 'floor') {
    next.base_clearance.clearance_mm = 0;
    next.base_clearance.leg_style = null;
  } else if (next.base_clearance.type === 'plinth') {
    // 걸레받이 박스형: 기본 60mm, 범위 40~120mm 내로 보정
    if (next.base_clearance.clearance_mm < 40) {
      next.base_clearance.clearance_mm = 60;
    } else if (next.base_clearance.clearance_mm > Math.min(120, maxClearance)) {
      next.base_clearance.clearance_mm = Math.min(120, maxClearance);
    }
    next.base_clearance.leg_style = null;
  } else if (next.base_clearance.type === 'legs') {
    if (next.base_clearance.clearance_mm <= 0) {
      next.base_clearance.clearance_mm = Math.min(100, maxClearance);
    } else if (next.base_clearance.clearance_mm > maxClearance) {
      next.base_clearance.clearance_mm = maxClearance;
    }
    if (!next.base_clearance.leg_style) {
      next.base_clearance.leg_style = 'straight';
    }
  }

  // 이동식 다보 선반일 경우 원목 에이프런 보강 간섭 방지
  if (
    next.material_joinery.shelf_fixing === 'movable' &&
    next.material_joinery.reinforcement === 'wood_apron'
  ) {
    next.material_joinery.reinforcement = 'steel_flat';
  }

  // 비대칭 단 높이 배열이 활성화된 경우 단수(levels)와 배열 길이 동기화
  if (
    next.dimensions.custom_shelf_heights_mm &&
    next.dimensions.custom_shelf_heights_mm.length > 0 &&
    next.dimensions.custom_shelf_heights_mm.length !== next.dimensions.levels
  ) {
    const H_base =
      next.base_clearance.type === 'floor' ? 0 : next.base_clearance.clearance_mm;
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
}

/**
 * FSD v3.1 Section 3.3.2: 물리적/구조적 한계 진단 (Structural Health Check)
 */
export function validateShelfStructure(
  spec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
  innerTotalHeightMm: number,
  netShelfHeightMm: number,
  clearSpanMm: number,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { width_mm: W, depth_mm: D, height_mm: H, levels: N, thickness_t: T } =
    spec.dimensions;

  // 1. [ERROR] 최소 유효 내경 미달 (< 100mm)
  if (netShelfHeightMm < 100) {
    errors.push(
      `단당 평균 유효 높이(${netShelfHeightMm}mm)가 최소 수납 기준(100mm) 미만입니다. 전체 높이를 늘리거나 단수(${N}단)/다리 높이를 줄여주세요.`,
    );
  }

  // 2. [ERROR] 비대칭 단 높이 합계 불일치 및 단별 100mm 미만 체크
  if (
    spec.dimensions.custom_shelf_heights_mm &&
    spec.dimensions.custom_shelf_heights_mm.length > 0
  ) {
    const sumCustom = spec.dimensions.custom_shelf_heights_mm.reduce(
      (acc, v) => acc + v,
      0,
    );
    const diff = sumCustom - innerTotalHeightMm;
    if (Math.abs(diff) > 1) {
      errors.push(
        `비대칭 단별 지정 높이의 합(${sumCustom}mm)이 전체 유효 내경 합계(${innerTotalHeightMm}mm)와 일치하지 않습니다 (차이: ${diff > 0 ? `+${diff}` : diff}mm).`,
      );
    }
    const minCustom = Math.min(...spec.dimensions.custom_shelf_heights_mm);
    if (minCustom < 100) {
      errors.push(
        `비대칭 단 높이 중 최소 기준(100mm) 미만인 칸(${minCustom}mm)이 존재합니다.`,
      );
    }
  }

  // 3. [WARNING] 선반 하중 처짐(Sagging) 주의
  if (
    (clearSpanMm > 900 &&
      T < 24 &&
      spec.material_joinery.reinforcement === 'none') ||
    (clearSpanMm > 1100 && spec.material_joinery.reinforcement === 'none')
  ) {
    warnings.push(
      `선반 유효 경간(${clearSpanMm}mm)이 넓어 장기간 서적/중량물 수납 시 중앙 처짐이 발생할 수 있습니다. 두께 24T 이상, 하중 보강재(에이프런/평철), 또는 중간 세로 칸막이 추가를 권장합니다.`,
    );
  }

  // 4. [WARNING] 세장비(전도 위험) 주의
  if (H >= 1400 && H / D > 5.0) {
    warnings.push(
      `깊이(${D}mm) 대비 높이(${H}mm) 세장비(${(H / D).toFixed(1)})가 높아 전도(넘어짐) 위험이 있습니다. 벽면 고정 브라켓 시공 또는 깊이 확장을 권장합니다.`,
    );
  }

  // 5. [INFO/WARNING] 다리 높이와 걸레받이 노치 중복 안내
  if (
    spec.base_clearance.type === 'legs' &&
    spec.base_clearance.clearance_mm >= 100 &&
    spec.base_clearance.skirting_notch !== 'none'
  ) {
    warnings.push(
      `다리 높이(${spec.base_clearance.clearance_mm}mm)가 일반 실내 걸레받이(75~90mm)보다 높아 후면 걸레받이 노치 가공이 불필요할 수 있습니다.`,
    );
  }

  // 6. 폭 범위 경고
  if (W < 300 || W > 3000 || D < 150 || D > 800 || H < 300 || H > 2400) {
    errors.push(
      '외경 치수가 제작 허용 범위(W: 300~3000, D: 150~800, H: 300~2400mm)를 벗어났습니다.',
    );
  }

  return { errors, warnings };
}

export function sanitizeThickness(val: number): ThicknessT {
  const allowed: ThicknessT[] = [18, 20, 24, 28, 30];
  return allowed.reduce((prev, curr) =>
    Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev,
  );
}

export function sanitizeVerticalDividers(val: number): VerticalDividers {
  if (val <= 0) return 0;
  if (val === 1) return 1;
  return 2;
}
