import React, { useState } from 'react';
import { FurnitureConfig, UserRole, SystemStage } from './types/furniture';
import { Header } from './components/Header';
import { Viewport3D } from './components/Viewport3D';
import { KinematicBar } from './components/KinematicBar';
import { ConsumerView } from './components/ConsumerView';
import { MakerView } from './components/MakerView';
import { AdminView } from './components/AdminView';
import { ByokModal } from './components/ByokModal';
import { ChevronUp, ChevronDown, PanelRightClose, PanelRightOpen, Eye } from 'lucide-react';

export const App: React.FC = () => {
  // 역할 상태 (소비자 / 목수 장인 / 관리자)
  const [role, setRole] = useState<UserRole>('consumer');

  // 시스템 라이프사이클 단계
  const [stage, setStage] = useState<SystemStage>('1_DRAFT_INIT');

  // 데스크톱 패널 표시 여부 (패널 접기/펼치기)
  const [isDesktopPanelOpen, setIsDesktopPanelOpen] = useState(true);

  // 모바일 바텀시트 높이 상태 ('min': 3D 화면 최대화, 'half': 절반, 'full': 전체 패널)
  const [sheetState, setSheetState] = useState<'min' | 'half' | 'full'>('min');

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
            {/* 3D 뷰포트 영역: 모바일/데스크톱 모두 항상 100% 꽉 차게 배치 */}
            <div className="flex-1 relative h-full w-full overflow-hidden">
              <Viewport3D config={config} onConfigChange={setConfig} />
              
              {/* 하단 플로팅 기구학 리모컨: 바텀시트가 min일 때 항상 하단에 선명하게 노출 */}
              <div className={`transition-all duration-300 ${sheetState === 'min' ? 'bottom-20 md:bottom-6' : 'bottom-[42vh] md:bottom-6'} absolute left-0 right-0 pointer-events-none flex justify-center z-20`}>
                <div className="pointer-events-auto w-[92%] max-w-2xl">
                  <KinematicBar config={config} onConfigChange={setConfig} />
                </div>
              </div>

              {/* 데스크톱 우측 상단 패널 토글 버튼 */}
              <div className="hidden md:block absolute top-4 right-4 z-20">
                <button
                  onClick={() => setIsDesktopPanelOpen(!isDesktopPanelOpen)}
                  className="px-3 py-2 rounded-xl bg-panel-surface/90 hover:bg-panel-elevated backdrop-blur-md border border-white/10 text-xs font-medium text-gray-200 hover:text-white transition flex items-center gap-1.5 shadow-xl"
                  title="설정 패널 접기/펼치기"
                >
                  {isDesktopPanelOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                  <span>{isDesktopPanelOpen ? '패널 접기' : '설계 패널 열기'}</span>
                </button>
              </div>
            </div>

            {/* 데스크톱 우측 슬라이드 패널 (380px) */}
            {isDesktopPanelOpen && (
              <div className="hidden md:block w-96 h-full shrink-0 border-l border-panel-border animate-fade-in">
                <ConsumerView
                  config={config}
                  onConfigChange={setConfig}
                  stage={stage}
                  onStageChange={setStage}
                  apiKey={apiKey}
                />
              </div>
            )}

            {/* 모바일 적응형 바텀시트 (Bottom Sheet: min / half / full) */}
            <div
              className={`md:hidden absolute left-0 right-0 bottom-0 z-30 transition-all duration-300 ease-in-out rounded-t-3xl shadow-2xl bg-panel-surface border-t border-white/15 flex flex-col ${
                sheetState === 'min'
                  ? 'h-16'
                  : sheetState === 'half'
                  ? 'h-[40vh]'
                  : 'h-[85vh]'
              }`}
            >
              {/* 상단 드래그 & 토글 컨트롤 헤더 바 */}
              <div
                onClick={() => setSheetState(sheetState === 'min' ? 'half' : sheetState === 'half' ? 'full' : 'min')}
                className="h-16 px-5 flex items-center justify-between cursor-pointer border-b border-white/5 select-none shrink-0 bg-panel-elevated/80 rounded-t-3xl"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 rounded-full bg-wood-oak/80" />
                  <span className="text-xs font-bold text-white">
                    {sheetState === 'min' ? '📐 가구 치수 & 공방 패널 열기' : '설계 및 공방 패널'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSheetState(sheetState === 'min' ? 'half' : 'min');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] text-gray-200 font-medium flex items-center gap-1 hover:bg-white/20"
                  >
                    {sheetState === 'min' ? (
                      <>
                        <span>옵션 펼치기</span>
                        <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        <span>3D 화면 크게 보기</span>
                        <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 바텀 시트 스크롤 본문 */}
              {sheetState !== 'min' && (
                <div className="flex-1 overflow-y-auto">
                  <ConsumerView
                    config={config}
                    onConfigChange={setConfig}
                    stage={stage}
                    onStageChange={setStage}
                    apiKey={apiKey}
                  />
                </div>
              )}
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

      {/* BYOK 개인 키 모달 */}
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
