import React, { useState, useEffect } from 'react';
import { FurnitureConfig, UserRole, SystemStage } from './types/furniture';
import { Header } from './components/Header';
import { Viewport3D } from './components/Viewport3D';
import { KinematicBar } from './components/KinematicBar';
import { ConsumerView } from './components/ConsumerView';
import { MakerView } from './components/MakerView';
import { AdminView } from './components/AdminView';
import { ByokModal } from './components/ByokModal';

export const App: React.FC = () => {
  // 역할 상태 (소비자 / 목수 장인 / 관리자)
  const [role, setRole] = useState<UserRole>('consumer');

  // 시스템 라이프사이클 단계
  const [stage, setStage] = useState<SystemStage>('1_DRAFT_INIT');

  // 가구 핵심 3D CAD 설정
  const [config, setConfig] = useState<FurnitureConfig>({
    dimensions: {
      width: 900,
      height: 1400,
      depth: 380,
    },
    woodType: 'oak',
    thickness: 18,
    shelfCount: 2,
    doorType: 'double',
    doorAngle: 0,
    drawerExtract: 0,
    explodedView: 0,
    xrayMode: false,
    diffMode: false,
    rfi: {
      hasBaseboard: true,
      baseboardHeight: 60,
      baseboardDepth: 12,
      hasWireHole: false,
      wireHoleDiameter: 50,
      wireHolePosition: 'center',
      isHeavyLoad: false,
    },
  });

  // BYOK API Key 관리 (브라우저 로컬스토리지 보관)
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('byok_gemini_api_key') || '';
  });
  const [isByokOpen, setIsByokOpen] = useState(false);

  // 모바일 바텀시트 상태 (소비자 뷰 전용: min / half / full)
  const [sheetState, setSheetState] = useState<'half' | 'min' | 'full'>('half');

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('byok_gemini_api_key', newKey);
    } else {
      localStorage.removeItem('byok_gemini_api_key');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-black overflow-hidden select-none">
      {/* 상단 공통 헤더 */}
      <Header
        role={role}
        onRoleChange={setRole}
        stage={stage}
        hasApiKey={Boolean(apiKey)}
        onOpenByokModal={() => setIsByokOpen(true)}
      />

      {/* 역할별 메인 워크스페이스 컨테이너 */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* ================= 1. 소비자(Client) 뷰 ================= */}
        {role === 'consumer' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative w-full h-full">
            {/* 데스크톱/태블릿: 3D 뷰포트 영역 (중앙 가변폭) */}
            <div className="flex-1 relative h-[50vh] md:h-full w-full">
              <Viewport3D config={config} onConfigChange={setConfig} />
              <KinematicBar config={config} onConfigChange={setConfig} />
            </div>

            {/* 데스크톱: 우측 패널 (380px) / 모바일: 하단 바텀 시트 */}
            <div className="hidden md:block w-96 h-full shrink-0">
              <ConsumerView
                config={config}
                onConfigChange={setConfig}
                stage={stage}
                onStageChange={setStage}
                apiKey={apiKey}
              />
            </div>

            {/* 모바일 반응형 바텀시트 (Bottom Sheet) */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 rounded-t-3xl shadow-2xl bg-panel-surface border-t border-white/10 flex flex-col max-h-[85vh]">
              {/* 드래그 핸들 바 */}
              <div
                onClick={() => setSheetState(sheetState === 'half' ? 'full' : sheetState === 'full' ? 'min' : 'half')}
                className="py-2.5 flex items-center justify-center cursor-pointer border-b border-panel-border/50 shrink-0"
              >
                <div className="w-10 h-1.5 rounded-full bg-gray-500/60" />
              </div>

              {/* 바텀 시트 본문 */}
              <div className="flex-1 overflow-y-auto">
                <ConsumerView
                  config={config}
                  onConfigChange={setConfig}
                  stage={stage}
                  onStageChange={setStage}
                  apiKey={apiKey}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= 2. 목수 장인(Maker) 포털 뷰 ================= */}
        {role === 'maker' && (
          <MakerView
            config={config}
            onConfigChange={setConfig}
            stage={stage}
            onStageChange={setStage}
          />
        )}

        {/* ================= 3. 시스템 관리자(Admin) 콘솔 뷰 ================= */}
        {role === 'admin' && (
          <AdminView stage={stage} />
        )}
      </main>

      {/* BYOK 모달 */}
      <ByokModal
        isOpen={isByokOpen}
        onClose={() => setIsByokOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />
    </div>
  );
};
export default App;
