import { GoogleGenAI } from '@google/genai';
import {
  WoodShelfSpecificationData,
  GEMINI_SHELF_RESPONSE_SCHEMA,
  LABELS,
  SHORT_LABELS,
} from '../types/shelfSchema';
import {
  normalizeSpecDependencies,
  sanitizeThickness,
  sanitizeVerticalDividers,
} from '../engine/validator';
import { clamp } from '../engine/calculator';

export interface AISpecGenerationResult {
  updatedSpec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>;
  reasoning: string;
  usedFallback: boolean;
}

function getEffectiveApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 0) {
    return customKey.trim();
  }
  const stored =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('WOOD_SHELF_GEMINI_API_KEY')
      : null;
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }
  return process.env.GEMINI_API_KEY || process.env.API_KEY || '';
}

/**
 * FSD v3.1 Section 5.2: API 키가 없는 오프라인/로컬 환경에서도
 * 자기모순 및 정규식 충돌 없이 자연어 입력을 분석하여 사양을 즉시 추천하는 스마트 폴백 파서
 */
function parsePromptLocally(
  prompt: string,
  currentSpec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
  imageDataUrl?: string | null,
): AISpecGenerationResult {
  const text = prompt.toLowerCase();
  const next = structuredClone(currentSpec);
  const reasons: string[] = [];

  next.presetType = 'custom';
  let domainCategory: 'audio' | 'bookshelf' | 'living' | null = null;

  // 1. 용도별 기본 프로파일 적용
  if (
    text.includes('lp') ||
    text.includes('오디오') ||
    text.includes('앰프') ||
    text.includes('턴테이블')
  ) {
    domainCategory = 'audio';
    next.dimensions.width_mm = 1200;
    next.dimensions.depth_mm = 450;
    next.dimensions.height_mm = 800;
    next.dimensions.levels = 2;
    next.dimensions.thickness_t = 28;
    next.dimensions.vertical_dividers = 1;
    next.material_joinery.wood_species = 'walnut';
    next.material_joinery.reinforcement = 'steel_flat';
    next.finishing_hardware.wire_hole_note =
      '후면 중앙 Ø60mm 오디오 배선 관통 홀';
  } else if (
    text.includes('책') ||
    text.includes('서재') ||
    text.includes('북쉘프') ||
    text.includes('a4')
  ) {
    domainCategory = 'bookshelf';
    next.dimensions.width_mm = 1000;
    next.dimensions.depth_mm = 300;
    next.dimensions.height_mm = 1500;
    next.dimensions.levels = 4;
    next.dimensions.thickness_t = 24;
    next.material_joinery.wood_species = 'oak';
    next.material_joinery.reinforcement = 'steel_flat';
  } else if (text.includes('장식장') || text.includes('거실')) {
    domainCategory = 'living';
    next.dimensions.width_mm = 1000;
    next.dimensions.depth_mm = 320;
    next.dimensions.height_mm = 1150;
    next.dimensions.levels = 3;
    next.dimensions.thickness_t = 24;
  }

  // 2. 수종 키워드 명시적 오버라이드
  if (text.includes('월넛') || text.includes('호두')) {
    next.material_joinery.wood_species = 'walnut';
  } else if (text.includes('오크') || text.includes('참나무')) {
    next.material_joinery.wood_species = 'oak';
  } else if (text.includes('애쉬') || text.includes('물푸레')) {
    next.material_joinery.wood_species = 'ash';
  } else if (
    text.includes('파인') ||
    text.includes('소나무') ||
    text.includes('가성비')
  ) {
    next.material_joinery.wood_species = 'pine';
  } else if (text.includes('러버') || text.includes('고무나무')) {
    next.material_joinery.wood_species = 'rubber';
  }

  // 3. 치수 및 단수 명시적 숫자 추출 (가로 폭 vs 깊이 정규식 분리 - FSD v3.1 Section 5.2)
  const widthMatch = text.match(/(?:가로|너비|폭|w)\s*(\d{3,4})/);
  if (widthMatch) {
    next.dimensions.width_mm = clamp(Number(widthMatch[1]), 300, 3000);
  }
  const depthMatch = text.match(/(?:깊이|세로|안길이|d)\s*(\d{3})/);
  if (depthMatch) {
    next.dimensions.depth_mm = clamp(Number(depthMatch[1]), 150, 800);
  }
  const heightMatch = text.match(/(?:높이|키|h)\s*(\d{3,4})/);
  if (heightMatch) {
    next.dimensions.height_mm = clamp(Number(heightMatch[1]), 300, 2400);
  }
  const levelMatch = text.match(/([1-8])\s*단/);
  if (levelMatch) {
    next.dimensions.levels = clamp(Number(levelMatch[1]), 1, 8);
  }

  // 광폭일 경우 보강 자동 상향
  if (next.dimensions.width_mm >= 1100 && next.dimensions.thickness_t < 24) {
    next.dimensions.thickness_t = 24;
  }
  if (
    next.dimensions.width_mm >= 1200 &&
    next.material_joinery.reinforcement === 'none'
  ) {
    next.material_joinery.reinforcement = 'steel_flat';
  }

  // 4. 하부 구조 및 청소기/걸레받이 키워드 감지
  let baseReason = '';
  if (text.includes('로봇') || text.includes('청소기')) {
    next.base_clearance.type = 'legs';
    next.base_clearance.clearance_mm = 125;
    next.base_clearance.leg_style = 'tapered';
    baseReason =
      '로봇청소기(기준 110mm 이상)가 여유롭게 통과하도록 125mm 테이퍼드 다리 구조를 적용했습니다.';
  } else if (
    text.includes('바닥') ||
    text.includes('밀착') ||
    text.includes('걸레받이')
  ) {
    if (text.includes('걸레받이') || text.includes('노치')) {
      next.base_clearance.type = 'plinth';
      next.base_clearance.clearance_mm = 60;
      next.base_clearance.skirting_notch = 'standard';
      baseReason =
        '먼지 유입을 막고 벽면에 밀착되도록 60mm 걸레받이 박스형 베이스와 표준 노치 가공(12×75mm)을 적용했습니다.';
    } else {
      next.base_clearance.type = 'floor';
      next.base_clearance.clearance_mm = 0;
      baseReason = '진동 억제 및 먼지 차단을 위해 바닥 밀착형 구조를 적용했습니다.';
    }
  }

  const normalized = normalizeSpecDependencies(next);
  const woodLabel = SHORT_LABELS.wood_species[normalized.material_joinery.wood_species];
  const reinfLabel = SHORT_LABELS.reinforcement[normalized.material_joinery.reinforcement];

  // 5. 최종 확정된 파라미터 기준으로 모순 없는 단일 사유 문장 조합
  if (domainCategory === 'audio') {
    reasons.push(
      `오디오·LP 중량물 수납을 위해 외경 ${normalized.dimensions.width_mm}×${normalized.dimensions.depth_mm}×${normalized.dimensions.height_mm}mm (${normalized.dimensions.levels}단), ${normalized.dimensions.thickness_t}T ${woodLabel}, 중앙 세로 칸막이 ${normalized.dimensions.vertical_dividers}열 및 ${reinfLabel} 보강을 설정했습니다.`,
    );
  } else if (domainCategory === 'bookshelf') {
    reasons.push(
      `도서 하중 지지 및 서재 수납을 위해 외경 ${normalized.dimensions.width_mm}×${normalized.dimensions.depth_mm}×${normalized.dimensions.height_mm}mm (${normalized.dimensions.levels}단), ${woodLabel} ${normalized.dimensions.thickness_t}T 두께 및 ${reinfLabel} 보강을 설정했습니다.`,
    );
  } else {
    reasons.push(
      `요청하신 조건에 맞춰 외경 ${normalized.dimensions.width_mm}×${normalized.dimensions.depth_mm}×${normalized.dimensions.height_mm}mm (${normalized.dimensions.levels}단), ${woodLabel} ${normalized.dimensions.thickness_t}T(${reinfLabel}) 사양으로 구성했습니다.`,
    );
  }

  if (baseReason) {
    reasons.push(baseReason);
  }

  if (imageDataUrl) {
    reasons.push(
      '(참고: 첨부된 공간 사진의 정밀 시각 분석을 위해서는 상단 [API 키 설정]에서 Gemini API 키 입력이 필요합니다. 현재는 텍스트 규칙 기반으로 사양을 설정했습니다.)',
    );
  }

  return {
    updatedSpec: normalized,
    reasoning: `[스마트 룰 엔진 적용] ${reasons.join(' ')}`,
    usedFallback: true,
  };
}

/**
 * FSD v3.1 Section 5.1 & 8.1: 자연어 및 공간 사진 기반 사양 자동 생성 (Gemini Structured Outputs)
 */
export async function generateShelfSpecFromPrompt(
  prompt: string,
  currentSpec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>,
  imageDataUrl?: string | null,
  customApiKey?: string,
): Promise<AISpecGenerationResult> {
  const apiKey = getEffectiveApiKey(customApiKey);
  if (!apiKey) {
    return parsePromptLocally(prompt, currentSpec, imageDataUrl);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `당신은 20년 경력의 원목 가구 구조 설계사 및 인테리어 디렉터입니다.
사용자의 요구사항(및 첨부된 실내 공간 사진)을 분석하여 최적의 원목 선반 사양(JSON)을 설계하세요.
반드시 아래 구조 공학 규칙을 지키세요:
1. 로봇청소기 통과 요청 시 base_clearance.type="legs"이고 clearance_mm는 최소 120 이상으로 설정하세요.
2. 가로 폭(width_mm)이 1000mm 이상이거나 무거운 물건(책, LP, 오디오) 수납 시 thickness_t는 24 또는 28 이상, reinforcement는 "steel_flat" 또는 "wood_apron", 필요시 vertical_dividers를 1 또는 2로 설정하세요.
3. 전체 높이에서 다리 높이와 판재 두께 총합(thickness_t * (levels + 1))을 뺀 뒤 levels로 나눈 단당 유효 내경이 반드시 100mm 이상이어야 합니다.
4. clearance_mm는 전체 높이(height_mm)의 35%를 넘지 않아야 합니다.`;

    const contentsParts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [
      {
        text: `현재 사양 상태 JSON:\n${JSON.stringify(currentSpec, null, 2)}\n\n사용자 요구사항:\n"${prompt}"\n\n위 요구사항을 반영한 최적의 선반 사양을 JSON 스키마에 맞춰 출력하세요.`,
      },
    ];

    if (imageDataUrl && imageDataUrl.startsWith('data:')) {
      const [meta, base64Data] = imageDataUrl.split(',');
      const mimeMatch = meta.match(/data:(.*?);base64/);
      if (mimeMatch && base64Data) {
        contentsParts.push({
          inlineData: {
            mimeType: mimeMatch[1],
            data: base64Data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentsParts,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_SHELF_RESPONSE_SCHEMA,
      },
    });

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);

    const parsedCustomHeights = Array.isArray(
      parsed.dimensions?.custom_shelf_heights_mm,
    )
      ? parsed.dimensions.custom_shelf_heights_mm
          .map((n: unknown) => Math.max(100, Math.round(Number(n) || 100)))
          .filter((n: number) => !Number.isNaN(n))
      : undefined;

    const merged: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'> = {
      client: parsed.client || currentSpec.client || 'AI 맞춤 설계 프로젝트',
      presetType: 'custom',
      basePresetOrigin: currentSpec.basePresetOrigin,
      dimensions: {
        width_mm: clamp(Number(parsed.dimensions?.width_mm ?? currentSpec.dimensions.width_mm), 300, 3000),
        depth_mm: clamp(Number(parsed.dimensions?.depth_mm ?? currentSpec.dimensions.depth_mm), 150, 800),
        height_mm: clamp(Number(parsed.dimensions?.height_mm ?? currentSpec.dimensions.height_mm), 300, 2400),
        levels: clamp(Number(parsed.dimensions?.levels ?? currentSpec.dimensions.levels), 1, 8),
        thickness_t: sanitizeThickness(Number(parsed.dimensions?.thickness_t ?? currentSpec.dimensions.thickness_t)),
        vertical_dividers: sanitizeVerticalDividers(Number(parsed.dimensions?.vertical_dividers ?? currentSpec.dimensions.vertical_dividers)),
        ...(parsedCustomHeights && parsedCustomHeights.length > 0
          ? { custom_shelf_heights_mm: parsedCustomHeights }
          : {}),
        custom_shelf_height_note:
          parsed.dimensions?.custom_shelf_height_note ??
          currentSpec.dimensions.custom_shelf_height_note ??
          '',
      },
      base_clearance: {
        type: ['legs', 'plinth', 'floor'].includes(parsed.base_clearance?.type)
          ? parsed.base_clearance.type
          : currentSpec.base_clearance.type,
        clearance_mm: clamp(Number(parsed.base_clearance?.clearance_mm ?? currentSpec.base_clearance.clearance_mm), 0, 300),
        leg_style: ['straight', 'tapered', 'steel'].includes(parsed.base_clearance?.leg_style)
          ? parsed.base_clearance.leg_style
          : currentSpec.base_clearance.leg_style,
        skirting_notch: ['none', 'standard', 'custom'].includes(parsed.base_clearance?.skirting_notch)
          ? parsed.base_clearance.skirting_notch
          : currentSpec.base_clearance.skirting_notch,
        leveler: ['pad', 'hidden_leveler', 'brass_cap'].includes(parsed.base_clearance?.leveler)
          ? parsed.base_clearance.leveler
          : currentSpec.base_clearance.leveler,
      },
      material_joinery: {
        wood_species: ['pine', 'rubber', 'oak', 'walnut', 'ash'].includes(parsed.material_joinery?.wood_species)
          ? parsed.material_joinery.wood_species
          : currentSpec.material_joinery.wood_species,
        joinery_type: ['side_finger', 'solid_standard', 'solid_wide'].includes(parsed.material_joinery?.joinery_type)
          ? parsed.material_joinery.joinery_type
          : currentSpec.material_joinery.joinery_type,
        frame_join: ['standard', 'dovetail', 'mortise'].includes(parsed.material_joinery?.frame_join)
          ? parsed.material_joinery.frame_join
          : currentSpec.material_joinery.frame_join,
        shelf_fixing: ['fixed', 'movable'].includes(parsed.material_joinery?.shelf_fixing)
          ? parsed.material_joinery.shelf_fixing
          : currentSpec.material_joinery.shelf_fixing,
        reinforcement: ['none', 'wood_apron', 'steel_flat'].includes(parsed.material_joinery?.reinforcement)
          ? parsed.material_joinery.reinforcement
          : currentSpec.material_joinery.reinforcement,
        backpanel: ['none', 'plywood_5t', 'solid_louver', 'brass_cross'].includes(parsed.material_joinery?.backpanel)
          ? parsed.material_joinery.backpanel
          : currentSpec.material_joinery.backpanel,
      },
      finishing_hardware: {
        finish_coat: ['oil_hardwax', 'water_varnish', 'stain_walnut'].includes(parsed.finishing_hardware?.finish_coat)
          ? parsed.finishing_hardware.finish_coat
          : currentSpec.finishing_hardware.finish_coat,
        edge_profile: ['c1', 'r3', 'chamfer15'].includes(parsed.finishing_hardware?.edge_profile)
          ? parsed.finishing_hardware.edge_profile
          : currentSpec.finishing_hardware.edge_profile,
        wire_hole_note:
          parsed.finishing_hardware?.wire_hole_note ??
          currentSpec.finishing_hardware.wire_hole_note ??
          '',
      },
    };

    const normalized = normalizeSpecDependencies(merged);
    return {
      updatedSpec: normalized,
      reasoning: parsed.ai_reasoning || 'Gemini 2.5 Flash가 요구사항에 맞춰 최적의 사양을 구성했습니다.',
      usedFallback: false,
    };
  } catch (err) {
    console.warn('Gemini API 호출 실패, 로컬 폴백 파서로 전환합니다:', err);
    return parsePromptLocally(prompt, currentSpec, imageDataUrl);
  }
}

/**
 * FSD v3.1 Section 5.3: Step 3 AI 목공 전문가 감리 코멘트 생성
 */
export async function generateExpertReviewComment(
  fullSpec: WoodShelfSpecificationData,
  customApiKey?: string,
): Promise<string> {
  const apiKey = getEffectiveApiKey(customApiKey);
  const { dimensions, base_clearance, material_joinery, finishing_hardware, computed_summary } = fullSpec;

  const fallbackReview = [
    `- **구조 안정성 총평:** 외경 ${dimensions.width_mm}×${dimensions.depth_mm}×${dimensions.height_mm}mm (${dimensions.levels}단, ${dimensions.thickness_t}T) 구성으로, 유효 경간은 **${computed_summary.clear_span_mm}mm**, 단당 평균 내경은 **${computed_summary.net_shelf_height_mm}mm**입니다. ${
      computed_summary.warnings.length === 0
        ? '처짐 및 세장비 기준을 모두 안정적으로 충족합니다.'
        : `주의사항(${computed_summary.warnings.length}건)을 제작 전 확인하시기 바랍니다.`
    }`,
    `- **수종 및 마감 관리 팁:** 선택하신 **${LABELS.wood_species[material_joinery.wood_species]}** 및 **${LABELS.finish_coat[finishing_hardware.finish_coat]}** 조합은 실내 습도 40~60% 유지를 권장하며, 직사광선이나 난방기구 직접 노출을 피하면 수축·팽창 변형을 최소화할 수 있습니다.`,
    `- **공방 가공 유의사항:** ${LABELS.frame_join[material_joinery.frame_join]} 결구 시 목재 함수율(8~10%) 확인이 필요하며, 하부 ${LABELS.base_type[base_clearance.type]} 구조와 ${LABELS.leveler[base_clearance.leveler]} 장착 시 바닥 수평 편차를 점검하세요.`,
  ].join('\n');

  if (!apiKey) {
    return fallbackReview;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `다음 원목 선반 최종 발주 사양 데이터에 대해 발주자와 제작 공방을 위한 전문가 감리 의견(3개 불릿 포인트: 1. 구조적 안정성 총평, 2. 수종/마감재 계절별 수축·팽창 관리 팁, 3. 제작 공방 가공 유의사항)을 한국어 마크다운으로 간결하게 작성해주세요.\n\n${JSON.stringify(
        fullSpec,
        null,
        2,
      )}`,
    });
    return response.text?.trim() || fallbackReview;
  } catch {
    return fallbackReview;
  }
}
