import * as THREE from 'three';
import { FurnitureConfig, BomItem, WOOD_CONFIGS } from '../types/furniture';

/**
 * 치수 및 설정에 따라 실시간 3D 가구 씬 그래프를 구성하는 CAD 빌더
 */
export function createFurnitureModel(config: FurnitureConfig): THREE.Group {
  const root = new THREE.Group();
  root.name = "furniture_root";

  const { dimensions, woodType, thickness, shelfCount, doorType, doorAngle, drawerExtract, explodedView, xrayMode, diffMode, rfi } = config;
  const wood = WOOD_CONFIGS[woodType];

  // 스케일 팩터: 1 unit = 1000 mm (1 meter)
  const scale = 0.001;
  const W = dimensions.width * scale;
  const H = dimensions.height * scale;
  const D = dimensions.depth * scale;
  const T = thickness * scale; // 판재 두께 (기본 18mm -> 0.018)

  // 목재 기본 머티리얼 (다크/감성 원목 질감)
  const woodColor = new THREE.Color(wood.color);
  const mainMaterial = new THREE.MeshStandardMaterial({
    color: woodColor,
    roughness: wood.roughness,
    metalness: 0.1,
    transparent: xrayMode,
    opacity: xrayMode ? 0.35 : 1.0,
    depthWrite: !xrayMode,
  });

  // 뒷판 머티리얼 (조금 얇은 색감)
  const backMaterial = new THREE.MeshStandardMaterial({
    color: woodColor.clone().multiplyScalar(0.85),
    roughness: wood.roughness + 0.1,
    transparent: xrayMode,
    opacity: xrayMode ? 0.25 : 1.0,
  });

  // X-Ray 결구 (도미노/목심) 하이라이트 머티리얼
  const dominoMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a84ff, // 일렉트릭 블루
    emissive: 0x0044aa,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  // Diff 오버레이 머티리얼 (초록색 반투명)
  const diffMaterial = new THREE.MeshStandardMaterial({
    color: 0x30d158,
    transparent: true,
    opacity: 0.65,
    roughness: 0.3,
  });

  // 분해도 오프셋 배율
  const exp = explodedView * 0.3; // 최대 30cm 확장

  // 1. 좌측판 (Left Side Panel)
  const leftGroup = new THREE.Group();
  const leftGeo = new THREE.BoxGeometry(T, H, D);
  const leftMesh = new THREE.Mesh(leftGeo, mainMaterial);
  leftMesh.castShadow = true;
  leftMesh.receiveShadow = true;
  leftGroup.add(leftMesh);
  leftGroup.position.set(-W / 2 + T / 2 - exp, H / 2, 0);
  root.add(leftGroup);

  // 2. 우측판 (Right Side Panel)
  const rightGroup = new THREE.Group();
  const rightGeo = new THREE.BoxGeometry(T, H, D);
  const rightMesh = new THREE.Mesh(rightGeo, mainMaterial);
  rightMesh.castShadow = true;
  rightMesh.receiveShadow = true;
  rightGroup.add(rightMesh);
  rightGroup.position.set(W / 2 - T / 2 + exp, H / 2, 0);
  root.add(rightGroup);

  // 걸레받이 따내기 (Notch) 시각화: RFI 활성화 시 좌/우측판 하단 뒤쪽에 표시
  if (rfi.hasBaseboard) {
    const notchH = rfi.baseboardHeight * scale;
    const notchD = rfi.baseboardDepth * scale;
    const notchGeo = new THREE.BoxGeometry(T * 1.05, notchH, notchD);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0xff453a, wireframe: true });
    
    // 좌측판 노치
    const leftNotch = new THREE.Mesh(notchGeo, notchMat);
    leftNotch.position.set(0, -H / 2 + notchH / 2, -D / 2 + notchD / 2);
    leftGroup.add(leftNotch);

    // 우측판 노치
    const rightNotch = new THREE.Mesh(notchGeo, notchMat);
    rightNotch.position.set(0, -H / 2 + notchH / 2, -D / 2 + notchD / 2);
    rightGroup.add(rightNotch);
  }

  // 내부 유효 폭
  const innerW = W - 2 * T;

  // 3. 상판 (Top Panel)
  const topGroup = new THREE.Group();
  const topGeo = new THREE.BoxGeometry(innerW, T, D);
  const topMesh = new THREE.Mesh(topGeo, mainMaterial);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  topGroup.add(topMesh);
  topGroup.position.set(0, H - T / 2 + exp, 0);
  root.add(topGroup);

  // 4. 하판 (Bottom Panel)
  const bottomGroup = new THREE.Group();
  const bottomGeo = new THREE.BoxGeometry(innerW, T, D);
  const bottomMesh = new THREE.Mesh(bottomGeo, mainMaterial);
  bottomMesh.castShadow = true;
  bottomMesh.receiveShadow = true;
  bottomGroup.add(bottomMesh);
  bottomGroup.position.set(0, T / 2 - exp, 0);
  root.add(bottomGroup);

  // 5. 뒷판 (Back Panel - 9mm)
  const backT = 0.009;
  const backGeo = new THREE.BoxGeometry(innerW, H - 2 * T, backT);
  const backMesh = new THREE.Mesh(backGeo, backMaterial);
  backMesh.position.set(0, H / 2, -D / 2 + backT / 2 - exp * 0.8);
  root.add(backMesh);

  // 전선 타공 홀 시각화 (RFI 활성화 시)
  if (rfi.hasWireHole) {
    const holeRadius = (rfi.wireHoleDiameter * scale) / 2;
    const holeGeo = new THREE.CylinderGeometry(holeRadius, holeRadius, backT * 1.5, 32);
    holeGeo.rotateX(Math.PI / 2);
    const holeMesh = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x0a84ff, wireframe: true }));
    let posX = 0;
    if (rfi.wireHolePosition === 'left') posX = -innerW / 4;
    if (rfi.wireHolePosition === 'right') posX = innerW / 4;
    holeMesh.position.set(posX, H / 2 - (H - 2 * T) / 3, -D / 2 + backT / 2 - exp * 0.8);
    root.add(holeMesh);
  }

  // 6. 중간 선반들 (Shelves)
  if (shelfCount > 0) {
    const usableH = H - 2 * T;
    const step = usableH / (shelfCount + 1);
    for (let i = 1; i <= shelfCount; i++) {
      const shelfY = T + i * step;
      const shelfGeo = new THREE.BoxGeometry(innerW, T, D - 0.01);
      const shelfMesh = new THREE.Mesh(shelfGeo, mainMaterial);
      shelfMesh.castShadow = true;
      shelfMesh.receiveShadow = true;
      shelfMesh.position.set(0, shelfY, 0);
      root.add(shelfMesh);

      // X-Ray 모드 시 선반 지지 다보핀(Dowel) 표시
      if (xrayMode) {
        const pinGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.015, 16);
        pinGeo.rotateZ(Math.PI / 2);
        const pinL = new THREE.Mesh(pinGeo, dominoMaterial);
        pinL.position.set(-innerW / 2 + 0.005, shelfY, D / 4);
        root.add(pinL);
        const pinR = new THREE.Mesh(pinGeo, dominoMaterial);
        pinR.position.set(innerW / 2 - 0.005, shelfY, D / 4);
        root.add(pinR);
      }
    }
  }

  // 7. 도어 / 서랍 (Kinematic Joints)
  const radAngle = (doorAngle * Math.PI) / 180;

  if (doorType === 'double') {
    // 양문형 도어 (좌/우 힌지 피벗)
    const doorW = (innerW / 2) - 0.002; // 유격 2mm
    const doorH = H - 2 * T - 0.004;

    // 좌측 도어 피벗
    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-innerW / 2, H / 2, D / 2 + exp);
    
    const leftDoorGeo = new THREE.BoxGeometry(doorW, doorH, T);
    const leftDoorMesh = new THREE.Mesh(leftDoorGeo, mainMaterial);
    leftDoorMesh.position.set(doorW / 2, 0, 0); // 피벗 중심 기준 오프셋
    leftDoorMesh.castShadow = true;
    leftDoorPivot.add(leftDoorMesh);
    
    // 좌측 도어 손잡이
    const handleGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.1, 16);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    const leftHandle = new THREE.Mesh(handleGeo, handleMat);
    leftHandle.position.set(doorW - 0.04, 0, T / 2 + 0.015);
    leftDoorPivot.add(leftHandle);

    leftDoorPivot.rotation.y = -radAngle; // 바깥쪽으로 열림
    root.add(leftDoorPivot);

    // 우측 도어 피벗
    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(innerW / 2, H / 2, D / 2 + exp);
    
    const rightDoorGeo = new THREE.BoxGeometry(doorW, doorH, T);
    const rightDoorMesh = new THREE.Mesh(rightDoorGeo, mainMaterial);
    rightDoorMesh.position.set(-doorW / 2, 0, 0);
    rightDoorMesh.castShadow = true;
    rightDoorPivot.add(rightDoorMesh);

    const rightHandle = new THREE.Mesh(handleGeo, handleMat);
    rightHandle.position.set(-doorW + 0.04, 0, T / 2 + 0.015);
    rightDoorPivot.add(rightHandle);

    rightDoorPivot.rotation.y = radAngle;
    root.add(rightDoorPivot);
  } else if (doorType === 'single') {
    // 단문형 도어
    const doorW = innerW - 0.004;
    const doorH = H - 2 * T - 0.004;
    const singlePivot = new THREE.Group();
    singlePivot.position.set(-innerW / 2, H / 2, D / 2 + exp);

    const singleDoorGeo = new THREE.BoxGeometry(doorW, doorH, T);
    const singleDoorMesh = new THREE.Mesh(singleDoorGeo, mainMaterial);
    singleDoorMesh.position.set(doorW / 2, 0, 0);
    singleDoorMesh.castShadow = true;
    singlePivot.add(singleDoorMesh);

    singlePivot.rotation.y = -radAngle;
    root.add(singlePivot);
  } else if (doorType === 'drawers') {
    // 서랍 2단
    const drawerH = (H - 2 * T) / 2 - 0.005;
    const drawerW = innerW - 0.004;
    const extractDist = (drawerExtract * scale) + exp;

    for (let d = 0; d < 2; d++) {
      const drawerGroup = new THREE.Group();
      const frontGeo = new THREE.BoxGeometry(drawerW, drawerH, T);
      const frontMesh = new THREE.Mesh(frontGeo, mainMaterial);
      drawerGroup.add(frontMesh);

      // 서랍 바디
      const bodyGeo = new THREE.BoxGeometry(drawerW * 0.95, drawerH * 0.8, D * 0.85);
      const bodyMesh = new THREE.Mesh(bodyGeo, backMaterial);
      bodyMesh.position.set(0, 0, -D * 0.85 / 2);
      drawerGroup.add(bodyMesh);

      const dY = T + drawerH / 2 + d * (drawerH + 0.005);
      drawerGroup.position.set(0, dY, D / 2 + extractDist * (d === 0 ? 1 : 0.6));
      root.add(drawerGroup);
    }
  }

  // 8. X-Ray 모드 시 내부 결합 도미노 촉 (Domino Tenons)
  if (xrayMode) {
    const dominoCount = 12;
    const dominoGeo = new THREE.BoxGeometry(0.005, 0.03, 0.015);
    for (let k = 0; k < dominoCount; k++) {
      const domino = new THREE.Mesh(dominoGeo, dominoMaterial);
      const isLeft = k % 2 === 0;
      const yPos = (k / dominoCount) * H * 0.9 + H * 0.05;
      domino.position.set(isLeft ? -innerW / 2 : innerW / 2, yPos, D / 4 * ((k % 3) - 1));
      root.add(domino);
    }
  }

  // 9. Diff 모드 시 장인 수정안(두께 보강 및 걸레받이 따내기) 초록 오버레이
  if (diffMode) {
    const diffGeo = new THREE.BoxGeometry(innerW, 0.006, D);
    const diffMesh = new THREE.Mesh(diffGeo, diffMaterial);
    diffMesh.position.set(0, H / 2, 0);
    root.add(diffMesh);
  }

  // 전체 모델 중심을 바닥면에 맞추기
  root.position.y = 0;

  return root;
}

/**
 * 부재 목록(BOM) 및 견적 계산
 */
export function calculateBomAndEstimate(config: FurnitureConfig): {
  bom: BomItem[];
  totalAreaM2: number;
  wasteFactor: number;
  requiredSheets: number;
  materialCost: number;
  laborCost: number;
  totalPrice: number;
} {
  const { dimensions, woodType, thickness, shelfCount, doorType } = config;
  const wood = WOOD_CONFIGS[woodType];
  const { width: W, height: H, depth: D } = dimensions;
  const T = thickness;

  const bom: BomItem[] = [];

  // 좌/우 측판 2개
  bom.push({
    id: 'side_panels',
    name: '좌/우 측판 (Side Panels)',
    width: D,
    height: H,
    thickness: T,
    count: 2,
    material: wood.name,
  });

  // 상/하판 2개
  const innerW = W - 2 * T;
  bom.push({
    id: 'top_bottom_panels',
    name: '상/하판 (Top/Bottom)',
    width: innerW,
    height: D,
    thickness: T,
    count: 2,
    material: wood.name,
  });

  // 뒷판 1개
  bom.push({
    id: 'back_panel',
    name: '배판 (Back Panel)',
    width: innerW,
    height: H - 2 * T,
    thickness: 9,
    count: 1,
    material: '자작합판 9T',
  });

  // 선반
  if (shelfCount > 0) {
    bom.push({
      id: 'shelves',
      name: `중간 선반 (${shelfCount}단)`,
      width: innerW,
      height: D - 10,
      thickness: T,
      count: shelfCount,
      material: wood.name,
    });
  }

  // 도어
  if (doorType === 'double') {
    bom.push({
      id: 'doors_double',
      name: '양문형 도어 (Double Doors)',
      width: Math.floor(innerW / 2) - 2,
      height: H - 2 * T - 4,
      thickness: T,
      count: 2,
      material: wood.name,
    });
  } else if (doorType === 'single') {
    bom.push({
      id: 'door_single',
      name: '단문형 도어 (Single Door)',
      width: innerW - 4,
      height: H - 2 * T - 4,
      thickness: T,
      count: 1,
      material: wood.name,
    });
  } else if (doorType === 'drawers') {
    bom.push({
      id: 'drawers',
      name: '서랍 전면판 (Drawer Fronts)',
      width: innerW - 4,
      height: Math.floor((H - 2 * T) / 2) - 4,
      thickness: T,
      count: 2,
      material: wood.name,
    });
  }

  // 총 표면적 계산 (m²)
  let totalAreaMm2 = 0;
  bom.forEach(b => {
    totalAreaMm2 += b.width * b.height * b.count;
  });
  const totalAreaM2 = Number((totalAreaMm2 / 1000000).toFixed(2));

  // 4x8 원판 (1220 x 2440 mm = 2.9768 m²)
  const sheetAreaM2 = 2.977;
  const wasteFactor = 14.5; // 로스율 14.5%
  const effectiveAreaNeeded = totalAreaM2 * (1 + wasteFactor / 100);
  const requiredSheets = Math.ceil(effectiveAreaNeeded / sheetAreaM2);

  // 원가 계산
  const materialCost = Math.round(requiredSheets * sheetAreaM2 * wood.unitCostPerM2);
  const laborCost = Math.round(180000 + (shelfCount * 15000) + (doorType !== 'open' ? 45000 : 0));
  const totalPrice = materialCost + laborCost;

  return {
    bom,
    totalAreaM2,
    wasteFactor,
    requiredSheets,
    materialCost,
    laborCost,
    totalPrice,
  };
}
