import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { FurnitureConfig } from '../types/furniture';
import { createFurnitureModel } from '../utils/cadGeometry';
import { Eye, Layers, RotateCcw, Maximize2 } from 'lucide-react';

interface Viewport3DProps {
  config: FurnitureConfig;
  onConfigChange: (updater: (prev: FurnitureConfig) => FurnitureConfig) => void;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({ config, onConfigChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // 마우스/터치 인터랙션 상태
  const isDraggingRef = useRef(false);
  const previousPointerPosition = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: Math.PI / 4, phi: Math.PI / 6, radius: 2.8 });

  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene 생성
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // 다크 테마 배경 (#1A1A1A)
    sceneRef.current = scene;

    // 2. Camera 생성
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer 생성
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. 조명 세팅 (원목 가구 감성 세련화 스튜디오 조명)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // 주광 (Key Light - 웜 톤)
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 1.4);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // 보조광 (Fill Light - 쿨 톤)
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.6);
    fillLight.position.set(-4, 3, -2);
    scene.add(fillLight);

    // 5. 바닥 그리드 및 섀도우 플레인
    const gridHelper = new THREE.GridHelper(4, 20, 0x444448, 0x28282c);
    gridHelper.position.y = -0.001;
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(10, 10);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 6. 모델 초기 추가
    const model = createFurnitureModel(config);
    modelGroupRef.current = model;
    scene.add(model);

    // 7. FPS 측정 및 애니메이션 렌더 루프
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // FPS 계산
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. 윈도우 리사이즈 대응
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 카메라 구면 좌표계 갱신 함수
  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraRotationRef.current;
    const clampedPhi = Math.max(0.05, Math.min(Math.PI / 2 - 0.05, phi));
    cameraRotationRef.current.phi = clampedPhi;

    const x = radius * Math.sin(clampedPhi) * Math.sin(theta);
    const y = radius * Math.cos(clampedPhi);
    const z = radius * Math.sin(clampedPhi) * Math.cos(theta);

    cameraRef.current.position.set(x, y + 0.5, z);
    cameraRef.current.lookAt(0, 0.6, 0);
  };

  // 설정값 변경 시 모델 갱신
  useEffect(() => {
    if (!sceneRef.current) return;
    if (modelGroupRef.current) {
      sceneRef.current.remove(modelGroupRef.current);
    }
    const newModel = createFurnitureModel(config);
    modelGroupRef.current = newModel;
    sceneRef.current.add(newModel);
  }, [config]);

  // 포인터 이벤트 핸들러 (마우스 회전/터치)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    previousPointerPosition.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousPointerPosition.current.x;
    const deltaY = e.clientY - previousPointerPosition.current.y;
    previousPointerPosition.current = { x: e.clientX, y: e.clientY };

    cameraRotationRef.current.theta += deltaX * 0.008;
    cameraRotationRef.current.phi -= deltaY * 0.008;
    updateCameraPosition();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.0015;
    cameraRotationRef.current.radius = Math.max(1.2, Math.min(5.5, cameraRotationRef.current.radius + zoomDelta));
    updateCameraPosition();
  };

  // 카메라 뷰 리셋
  const handleResetView = () => {
    cameraRotationRef.current = { theta: Math.PI / 4, phi: Math.PI / 6, radius: 2.8 };
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-studio-viewport">
      {/* Three.js 캔버스 컨테이너 */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* 뷰포트 상단 오버레이 HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
        <div className="bg-panel-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-semantic-emerald animate-pulse"></span>
          <span>{fps} FPS (WebGL 2.0)</span>
        </div>
        <div className="bg-panel-surface/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-gray-300 shadow-lg">
          <span>W:{config.dimensions.width} × H:{config.dimensions.height} × D:{config.dimensions.depth}mm ({config.thickness}T)</span>
        </div>
      </div>

      {/* 뷰포트 우측 툴바 (X-Ray, Diff, 리셋) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleResetView}
          title="카메라 시점 초기화"
          className="p-2.5 rounded-xl bg-panel-surface/80 hover:bg-panel-elevated backdrop-blur-md border border-white/10 text-gray-300 hover:text-white transition shadow-lg"
        >
          <RotateCcw size={18} />
        </button>

        <button
          onClick={() => onConfigChange(prev => ({ ...prev, xrayMode: !prev.xrayMode }))}
          title="X-Ray 결구 투시 모드"
          className={`p-2.5 rounded-xl backdrop-blur-md border transition shadow-lg ${
            config.xrayMode
              ? 'bg-semantic-blue text-white border-semantic-blue shadow-blue-500/30'
              : 'bg-panel-surface/80 hover:bg-panel-elevated text-gray-300 border-white/10'
          }`}
        >
          <Eye size={18} />
        </button>

        <button
          onClick={() => onConfigChange(prev => ({ ...prev, diffMode: !prev.diffMode }))}
          title="내 원안 vs 장인 수정안 3D Diff 겹쳐보기"
          className={`p-2.5 rounded-xl backdrop-blur-md border transition shadow-lg ${
            config.diffMode
              ? 'bg-semantic-emerald text-white border-semantic-emerald shadow-emerald-500/30'
              : 'bg-panel-surface/80 hover:bg-panel-elevated text-gray-300 border-white/10'
          }`}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* 상태 배지: X-Ray 활성화 안내 */}
      {config.xrayMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-semantic-blue/90 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-1.5 animate-bounce">
          <span>● X-Ray 투시 모드: 도미노 결구 촉 및 목심 위치 강조</span>
        </div>
      )}

      {/* 상태 배지: Diff 활성화 안내 */}
      {config.diffMode && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-semantic-emerald/90 text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg pointer-events-none flex items-center gap-1.5 animate-bounce">
          <span>● 3D Diff 비교: 장인 보강 부재(초록색) 오버레이 활성</span>
        </div>
      )}
    </div>
  );
};
