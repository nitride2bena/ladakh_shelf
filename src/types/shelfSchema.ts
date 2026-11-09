import { Type, Schema } from '@google/genai';

export type PresetId =
  | 'standard_pine'
  | 'premium_oak'
  | 'bookshelf_open'
  | 'heavy_audio'
  | 'custom';

export type ThicknessT = 18 | 20 | 24 | 28 | 30;
export type VerticalDividers = 0 | 1 | 2;
export type BaseType = 'legs' | 'plinth' | 'floor';
export type LegStyle = 'straight' | 'tapered' | 'steel' | null;
export type SkirtingNotch = 'none' | 'standard' | 'custom';
export type LevelerType = 'pad' | 'hidden_leveler' | 'brass_cap';

export type WoodSpecies = 'pine' | 'rubber' | 'oak' | 'walnut' | 'ash';
export type JoineryType = 'side_finger' | 'solid_standard' | 'solid_wide';
export type FrameJoin = 'standard' | 'dovetail' | 'mortise';
export type ShelfFixing = 'fixed' | 'movable';
export type Reinforcement = 'none' | 'wood_apron' | 'steel_flat';
export type BackpanelType = 'none' | 'plywood_5t' | 'solid_louver' | 'brass_cross';

export type FinishCoat = 'oil_hardwax' | 'water_varnish' | 'stain_walnut';
export type EdgeProfile = 'c1' | 'r3' | 'chamfer15';

export type ThemeMode = 'dark' | 'light';
export type FontScaleStep = 'small' | 'default' | 'large';

export interface DimensionsSpec {
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  levels: number; // 1 ~ 8 (내부 수납 칸 수)
  thickness_t: ThicknessT;
  vertical_dividers: VerticalDividers;
  custom_shelf_heights_mm?: number[];
  custom_shelf_height_note?: string;
}

export interface BaseClearanceSpec {
  type: BaseType;
  clearance_mm: number;
  leg_style: LegStyle;
  skirting_notch: SkirtingNotch;
  leveler: LevelerType;
}

export interface MaterialJoinerySpec {
  wood_species: WoodSpecies;
  joinery_type: JoineryType;
  frame_join: FrameJoin;
  shelf_fixing: ShelfFixing;
  reinforcement: Reinforcement;
  backpanel: BackpanelType;
}

export interface FinishingHardwareSpec {
  finish_coat: FinishCoat;
  edge_profile: EdgeProfile;
  wire_hole_note?: string;
}

export interface ComputedSummary {
  net_shelf_height_mm: number;
  inner_total_height_mm: number;
  clear_span_mm: number;
  robot_vacuum_pass: boolean;
  robot_badge_status: 'pass' | 'normal_vacuum' | 'closed';
  robot_badge_text: string;
  estimated_area_m2: number;
  estimated_weight_kg: number;
  warnings: string[];
  errors: string[];
}

export interface WoodShelfSpecificationData {
  client: string;
  presetType: PresetId;
  basePresetOrigin?: Exclude<PresetId, 'custom'>;
  dimensions: DimensionsSpec;
  base_clearance: BaseClearanceSpec;
  material_joinery: MaterialJoinerySpec;
  finishing_hardware: FinishingHardwareSpec;
  computed_summary: ComputedSummary;
  ai_review_comment?: string;
  generated_at: string;
}

export interface PresetDefinition {
  id: Exclude<PresetId, 'custom'>;
  title: string;
  subtitle: string;
  badge: string;
  recommendedUse: string;
  spec: Omit<WoodShelfSpecificationData, 'computed_summary' | 'generated_at'>;
}

export const WOOD_COLORS: Record<WoodSpecies, string> = {
  pine: '#d4a373',
  rubber: '#ddb892',
  oak: '#b08968',
  walnut: '#582f0e',
  ash: '#c9ada7',
};

export const WOOD_DENSITY_KG_M3: Record<WoodSpecies, number> = {
  pine: 450,
  rubber: 620,
  ash: 680,
  walnut: 640,
  oak: 750,
};

export const LABELS = {
  wood_species: {
    pine: '레드파인 (소프트우드)',
    rubber: '러버우드 (고무나무)',
    oak: '화이트오크 (참나무)',
    walnut: '북미산 월넛 (호두나무)',
    ash: '애쉬 (물푸레나무)',
  } as Record<WoodSpecies, string>,
  base_type: {
    legs: '오픈형 독립 다리 (Legs)',
    plinth: '하부 걸레받이 박스형 (Plinth)',
    floor: '바닥 밀착형 (Floor)',
  } as Record<BaseType, string>,
  leg_style: {
    straight: '직각 사각 다리',
    tapered: '5도 테이퍼드 경사다리',
    steel: '블랙 스틸 평철 프레임',
  } as Record<Exclude<LegStyle, null>, string>,
  skirting_notch: {
    none: '미가공 (벽면 이격 또는 다리형)',
    standard: '표준 걸레받이 노치 (12×75mm)',
    custom: '특주 걸레받이 노치 (15×90mm)',
  } as Record<SkirtingNotch, string>,
  leveler: {
    pad: '고밀도 펠트 패드',
    hidden_leveler: '매립형 육각 수평 레벨러',
    brass_cap: '황동 슈즈 레벨러 캡',
  } as Record<LevelerType, string>,
  joinery_type: {
    side_finger: '사이드 핑거조인트 집성',
    solid_standard: '일반 폭 솔리드 집성 (50~80mm)',
    solid_wide: '광폭 솔리드 집성 (100mm+ 프리미엄)',
  } as Record<JoineryType, string>,
  frame_join: {
    standard: '도미노 / 목심 표준 결합',
    dovetail: '주먹장 맞춤 (Dovetail)',
    mortise: '전통 통장부 맞춤 (Mortise & Tenon)',
  } as Record<FrameJoin, string>,
  shelf_fixing: {
    fixed: '고정식 짜임 구조',
    movable: '32mm 시스템 이동식 다보',
  } as Record<ShelfFixing, string>,
  reinforcement: {
    none: '보강 없음 (기본 판재)',
    wood_apron: '전면 원목 에이프런 보강 (35mm)',
    steel_flat: '하부 스틸 평철 매립 가공',
  } as Record<Reinforcement, string>,
  backpanel: {
    none: '오픈형 (뒷판 없음)',
    plywood_5t: '5T 동수종 무늬목 합판',
    solid_louver: '솔리드 원목 루바 패널',
    brass_cross: '황동 강선 X자 브레이싱',
  } as Record<BackpanelType, string>,
  finish_coat: {
    oil_hardwax: '천연 하드왁스 오일 (Rubio/Osmo)',
    water_varnish: '친환경 수성 무황변 바니쉬',
    stain_walnut: '월넛 착색 스테인 + 코팅',
  } as Record<FinishCoat, string>,
  edge_profile: {
    c1: 'C1~C2 미세 안전 모따기',
    r3: 'R3 소프트 라운드 가공',
    chamfer15: '15mm 45도 플로팅 베벨 챔퍼',
  } as Record<EdgeProfile, string>,
};

export const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    id: 'standard_pine',
    title: '실속형 소프트우드 선반',
    subtitle: '가성비 우수, 실내 다목적 범용 수납',
    badge: '가성비 베스트',
    recommendedUse: '거실 소품, 소형 가전, 침실 데일리 수납장',
    spec: {
      client: '기본 발주 프로젝트',
      presetType: 'standard_pine',
      basePresetOrigin: 'standard_pine',
      dimensions: {
        width_mm: 800,
        depth_mm: 300,
        height_mm: 800,
        levels: 3,
        thickness_t: 18,
        vertical_dividers: 0,
        custom_shelf_height_note: '',
      },
      base_clearance: {
        type: 'legs',
        clearance_mm: 100,
        leg_style: 'straight',
        skirting_notch: 'none',
        leveler: 'pad',
      },
      material_joinery: {
        wood_species: 'pine',
        joinery_type: 'side_finger',
        frame_join: 'standard',
        shelf_fixing: 'fixed',
        reinforcement: 'none',
        backpanel: 'none',
      },
      finishing_hardware: {
        finish_coat: 'oil_hardwax',
        edge_profile: 'c1',
        wire_hole_note: '',
      },
    },
  },
  {
    id: 'premium_oak',
    title: '프리미엄 하드우드 장식장',
    subtitle: '고급 나뭇결 질감, 고하중 지지 및 로봇청소기 완벽 대응',
    badge: '인테리어 디자이너 픽',
    recommendedUse: '다이닝룸 식기/오브제 수납, 서재 장식장',
    spec: {
      client: '기본 발주 프로젝트',
      presetType: 'premium_oak',
      basePresetOrigin: 'premium_oak',
      dimensions: {
        width_mm: 1000,
        depth_mm: 320,
        height_mm: 1150,
        levels: 4,
        thickness_t: 24,
        vertical_dividers: 0,
        custom_shelf_height_note: '',
      },
      base_clearance: {
        type: 'legs',
        clearance_mm: 130,
        leg_style: 'tapered',
        skirting_notch: 'none',
        leveler: 'hidden_leveler',
      },
      material_joinery: {
        wood_species: 'oak',
        joinery_type: 'solid_standard',
        frame_join: 'dovetail',
        shelf_fixing: 'fixed',
        reinforcement: 'wood_apron',
        backpanel: 'plywood_5t',
      },
      finishing_hardware: {
        finish_coat: 'oil_hardwax',
        edge_profile: 'r3',
        wire_hole_note: '',
      },
    },
  },
  {
    id: 'bookshelf_open',
    title: '개방형 미니멀 북쉘프',
    subtitle: 'A4/화집 수록 전용, 시각적 개방감 극대화',
    badge: '서재/북카페 특화',
    recommendedUse: '대형 서적, 매거진, 화집 및 아트북 컬렉션',
    spec: {
      client: '기본 발주 프로젝트',
      presetType: 'bookshelf_open',
      basePresetOrigin: 'bookshelf_open',
      dimensions: {
        width_mm: 900,
        depth_mm: 280,
        height_mm: 1400,
        levels: 4,
        thickness_t: 20,
        vertical_dividers: 0,
        custom_shelf_height_note: '',
      },
      base_clearance: {
        type: 'legs',
        clearance_mm: 120,
        leg_style: 'straight',
        skirting_notch: 'none',
        leveler: 'hidden_leveler',
      },
      material_joinery: {
        wood_species: 'ash',
        joinery_type: 'solid_standard',
        frame_join: 'standard',
        shelf_fixing: 'movable',
        reinforcement: 'steel_flat',
        backpanel: 'brass_cross',
      },
      finishing_hardware: {
        finish_coat: 'water_varnish',
        edge_profile: 'chamfer15',
        wire_hole_note: '',
      },
    },
  },
  {
    id: 'heavy_audio',
    title: '오디오/중량물 수납 선반',
    subtitle: '진동 억제 28T 광폭 월넛, 앰프/턴테이블/LP 전용',
    badge: '초고하중 하이파이',
    recommendedUse: '진공관 앰프, 턴테이블, 바이닐(LP) 대량 수납',
    spec: {
      client: '기본 발주 프로젝트',
      presetType: 'heavy_audio',
      basePresetOrigin: 'heavy_audio',
      dimensions: {
        width_mm: 1200,
        depth_mm: 450,
        height_mm: 750,
        levels: 2,
        thickness_t: 28,
        vertical_dividers: 1,
        custom_shelf_height_note: '하단 LP 수납 340mm 이상 확보',
      },
      base_clearance: {
        type: 'floor',
        clearance_mm: 0,
        leg_style: null,
        skirting_notch: 'standard',
        leveler: 'brass_cap',
      },
      material_joinery: {
        wood_species: 'walnut',
        joinery_type: 'solid_wide',
        frame_join: 'mortise',
        shelf_fixing: 'fixed',
        reinforcement: 'steel_flat',
        backpanel: 'solid_louver',
      },
      finishing_hardware: {
        finish_coat: 'oil_hardwax',
        edge_profile: 'c1',
        wire_hole_note: '후면 상/하단 중앙 Ø60mm 오디오 케이블 관통 홀',
      },
    },
  },
];

/**
 * Gemini Structured Output Schema (@google/genai Type definition)
 * FSD Section 6 & Section 8.1
 */
export const GEMINI_SHELF_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: [
    'dimensions',
    'base_clearance',
    'material_joinery',
    'finishing_hardware',
    'ai_reasoning',
  ],
  properties: {
    client: { type: Type.STRING, description: '고객 또는 프로젝트 명칭' },
    dimensions: {
      type: Type.OBJECT,
      required: ['width_mm', 'depth_mm', 'height_mm', 'levels', 'thickness_t', 'vertical_dividers'],
      properties: {
        width_mm: { type: Type.INTEGER, description: '가로 폭 (300~3000mm)' },
        depth_mm: { type: Type.INTEGER, description: '깊이 (150~800mm)' },
        height_mm: { type: Type.INTEGER, description: '전체 높이 (300~2400mm)' },
        levels: { type: Type.INTEGER, description: '수납 공간 단수 (1~8단)' },
        thickness_t: { type: Type.INTEGER, description: '판재 두께 (18, 20, 24, 28, 30 중 택1)' },
        vertical_dividers: { type: Type.INTEGER, description: '중간 세로 칸막이 열 수 (0, 1, 2 중 택1)' },
        custom_shelf_height_note: { type: Type.STRING, description: '단별 높이 특기사항 메모' },
      },
    },
    base_clearance: {
      type: Type.OBJECT,
      required: ['type', 'clearance_mm', 'skirting_notch', 'leveler'],
      properties: {
        type: { type: Type.STRING, description: 'legs, plinth, floor 중 택1' },
        clearance_mm: { type: Type.INTEGER, description: '바닥 유효 높이 (0~300mm, 로봇청소기 진입 시 110 이상)' },
        leg_style: { type: Type.STRING, description: 'straight, tapered, steel 중 택1' },
        skirting_notch: { type: Type.STRING, description: 'none, standard, custom 중 택1' },
        leveler: { type: Type.STRING, description: 'pad, hidden_leveler, brass_cap 중 택1' },
      },
    },
    material_joinery: {
      type: Type.OBJECT,
      required: [
        'wood_species',
        'joinery_type',
        'frame_join',
        'shelf_fixing',
        'reinforcement',
        'backpanel',
      ],
      properties: {
        wood_species: { type: Type.STRING, description: 'pine, rubber, oak, walnut, ash 중 택1' },
        joinery_type: { type: Type.STRING, description: 'side_finger, solid_standard, solid_wide 중 택1' },
        frame_join: { type: Type.STRING, description: 'standard, dovetail, mortise 중 택1' },
        shelf_fixing: { type: Type.STRING, description: 'fixed, movable 중 택1' },
        reinforcement: { type: Type.STRING, description: 'none, wood_apron, steel_flat 중 택1' },
        backpanel: { type: Type.STRING, description: 'none, plywood_5t, solid_louver, brass_cross 중 택1' },
      },
    },
    finishing_hardware: {
      type: Type.OBJECT,
      required: ['finish_coat', 'edge_profile'],
      properties: {
        finish_coat: { type: Type.STRING, description: 'oil_hardwax, water_varnish, stain_walnut 중 택1' },
        edge_profile: { type: Type.STRING, description: 'c1, r3, chamfer15 중 택1' },
        wire_hole_note: { type: Type.STRING, description: '배선 홀 위치 및 규격 메모' },
      },
    },
    ai_reasoning: {
      type: Type.STRING,
      description: '사용자의 요청을 바탕으로 해당 치수, 수종, 두께, 보강재를 추천한 전문가 요약 설명 (한국어)',
    },
  },
};
