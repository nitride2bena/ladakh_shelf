export type WoodType = 'oak' | 'walnut' | 'birch';

export interface WoodMaterialConfig {
  id: WoodType;
  name: string;
  color: string;
  roughness: number;
  expansionFactor: number; // 수축/팽창 계수 (예: 화이트오크 0.0036)
  unitCostPerM2: number; // m²당 단가 (원)
}

export const WOOD_CONFIGS: Record<WoodType, WoodMaterialConfig> = {
  oak: {
    id: 'oak',
    name: '화이트오크 (White Oak)',
    color: '#c29b62',
    roughness: 0.6,
    expansionFactor: 0.0036,
    unitCostPerM2: 85000,
  },
  walnut: {
    id: 'walnut',
    name: '월넛 (American Walnut)',
    color: '#5c4033',
    roughness: 0.55,
    expansionFactor: 0.0028,
    unitCostPerM2: 120000,
  },
  birch: {
    id: 'birch',
    name: '자작나무합판 (Birch Plywood)',
    color: '#e3caa5',
    roughness: 0.5,
    expansionFactor: 0.0012,
    unitCostPerM2: 55000,
  },
};

export interface FurnitureDimensions {
  width: number;  // mm (예: 900)
  height: number; // mm (예: 1400)
  depth: number;  // mm (예: 380)
}

export interface FurnitureConfig {
  dimensions: FurnitureDimensions;
  woodType: WoodType;
  thickness: number; // mm (기본 18T, 보강 시 24T)
  shelfCount: number; // 선반 개수 (단수)
  doorType: 'double' | 'single' | 'drawers' | 'open';
  doorAngle: number; // 0 ~ 110도
  drawerExtract: number; // 0 ~ 250mm
  explodedView: number; // 0 ~ 1 (분해도 배율)
  xrayMode: boolean; // X-Ray 결구 투시 모드 여부
  diffMode: boolean; // 원안 vs 장인 수정안 3D 겹쳐보기 여부
  rfi: {
    hasBaseboard: boolean;
    baseboardHeight: number; // mm (예: 60)
    baseboardDepth: number;  // mm (예: 12)
    hasWireHole: boolean;
    wireHoleDiameter: number; // mm (예: 50)
    wireHolePosition: 'center' | 'left' | 'right';
    isHeavyLoad: boolean;    // 고하중 수납 여부
  };
}

export interface BomItem {
  id: string;
  name: string;
  width: number;
  height: number;
  thickness: number;
  count: number;
  material: string;
}

export interface WorkshopBid {
  id: string;
  workshopName: string;
  location: string;
  price: number;
  leadDays: number;
  matchScore: number;
  templateName: string;
  features: string[];
  diffNote: string;
  avatarColor: string;
}

export type SystemStage = 
  | '1_DRAFT_INIT' 
  | '2_RFI_REQUESTED' 
  | '3_SPEC_COMPILED' 
  | '4_MULTI_PROPOSAL_OPEN' 
  | '5_CONTRACT_LOCKED' 
  | '6_PRODUCTION_RELEASED';

export type UserRole = 'consumer' | 'maker' | 'admin';
