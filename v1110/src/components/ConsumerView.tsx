import React, { useState } from 'react';
import { FurnitureConfig, WoodType, WorkshopBid, SystemStage, WOOD_CONFIGS } from '../types/furniture';
import { calculateBomAndEstimate } from '../utils/cadGeometry';
import { getAiDesignRecommendation } from '../utils/geminiApi';
import { Sparkles, Sliders, MessageSquare, Building2, Check, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';

interface ConsumerViewProps {
  config: FurnitureConfig;
  onConfigChange: (updater: (prev: FurnitureConfig) => FurnitureConfig) => void;
  stage: SystemStage;
  onStageChange: (stage: SystemStage) => void;
  apiKey: string;
}

export const ConsumerView: React.FC<ConsumerViewProps> = ({
  config,
  onConfigChange,
  stage,
  onStageChange,
  apiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'rfi' | 'bids'>('dimensions');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string>('bid_1');
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  // 공방 입찰 제안 데이터
  const workshopBids: WorkshopBid[] = [
    {
      id: 'bid_1',
      workshopName: '청주 우드웍스',
      location: '충북 청주시',
      price: 450000,
      leadDays: 7,
      matchScore: 96,
      templateName: '인셋 화이트오크 3단장',
      features: ['도미노 5x30 28개소', '천연 루비오 모노코트 마감', '걸레받이 맞춤 따내기'],
      diffNote: '측판 하단 걸레받이 60x12mm 완벽 가공 및 선반 처짐 방지 24T 두께 보강 제안',
      avatarColor: 'bg-amber-600',
    },
    {
      id: 'bid_2',
      workshopName: '대전 아트퍼니처',
      location: '대전 유성구',
      price: 480000,
      leadDays: 5,
      matchScore: 91,
      templateName: '클래식 프레임 캐비닛',
      features: ['블룸(Blum) 소프트 클로징 힌지', '모서리 3R 라운딩', '전선 타공 마개 증정'],
      diffNote: '문짝 유격 2.5mm 적용으로 계절별 목재 팽창 간섭 사전 차단',
      avatarColor: 'bg-blue-600',
    },
    {
      id: 'bid_3',
      workshopName: '파주 목공소',
      location: '경기 파주시',
      price: 420000,
      leadDays: 10,
      matchScore: 88,
      templateName: '모던 슬림 도어장',
      features: ['친환경 수성 바니시 3회', '원목 결 맞춤 재단', '직접 화물 배송'],
      diffNote: '원판 4x8 2장 최적 수율 배치로 자재 로스비 3만원 절감 제안',
      avatarColor: 'bg-emerald-600',
    },
  ];

  const currentEstimate = calculateBomAndEstimate(config);

  // AI 자연어 설계 적용
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await getAiDesignRecommendation(aiPrompt, apiKey);
      onConfigChange(prev => ({
        ...prev,
        dimensions: result.dimensions,
        woodType: result.woodType,
        shelfCount: result.shelfCount,
        doorType: result.doorType,
      }));
    } finally {
      setIsAiLoading(false);
    }
  };

  // 공방 모델 선택 시 3D 모델 및 설정 업데이트
  const handleSelectBid = (bid: WorkshopBid) => {
    setSelectedBidId(bid.id);
    if (bid.id === 'bid_1') {
      onConfigChange(prev => ({ ...prev, woodType: 'oak', thickness: 24, diffMode: true }));
    } else if (bid.id === 'bid_2') {
      onConfigChange(prev => ({ ...prev, woodType: 'walnut', thickness: 18, diffMode: true }));
    } else {
      onConfigChange(prev => ({ ...prev, woodType: 'birch', thickness: 18, diffMode: false }));
    }
  };

  // 최종 계약 및 에스크로 결제
  const handleCheckout = () => {
    onStageChange('5_CONTRACT_LOCKED');
    setIsPaymentComplete(true);
  };

  return (
    <div className="flex flex-col h-full bg-panel-surface border-l border-panel-border overflow-hidden">
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-panel-border bg-panel-elevated/40 px-2 pt-2 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('dimensions')}
          className={`flex-1 py-2.5 text-xs font-medium rounded-t-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'dimensions'
              ? 'bg-panel-surface text-white border-t-2 border-wood-oak font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders size={14} />
          <span>기본 치수</span>
        </button>

        <button
          onClick={() => setActiveTab('rfi')}
          className={`flex-1 py-2.5 text-xs font-medium rounded-t-xl transition flex items-center justify-center gap-1.5 relative ${
            activeTab === 'rfi'
              ? 'bg-panel-surface text-white border-t-2 border-semantic-amber font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <MessageSquare size={14} className="text-semantic-amber" />
          <span>장인 RFI</span>
          <span className="w-2 h-2 rounded-full bg-semantic-amber animate-ping absolute top-2 right-4"></span>
        </button>

        <button
          onClick={() => setActiveTab('bids')}
          className={`flex-1 py-2.5 text-xs font-medium rounded-t-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'bids'
              ? 'bg-panel-surface text-white border-t-2 border-semantic-emerald font-semibold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Building2 size={14} className="text-semantic-emerald" />
          <span>공방 비교</span>
          <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-semantic-emerald/20 text-semantic-emerald font-bold">3</span>
        </button>
      </div>

      {/* 탭 내용 컨테이너 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* ===================== [탭 1: 기본 치수] ===================== */}
        {activeTab === 'dimensions' && (
          <div className="space-y-6 animate-fade-in">
            {/* AI 자연어 추천 입력 위젯 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-panel-elevated to-panel-surface border border-wood-oak/30 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-wood-oak">
                <Sparkles size={16} />
                <span>AI 지능형 치수 추천 (Gemini Powered)</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="예: 거실 TV 옆에 둘 3단 오크 수납장 만들어줘"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                  className="flex-1 px-3 py-2 bg-studio-black border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-wood-oak"
                />
                <button
                  onClick={handleAiGenerate}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-3.5 py-2 rounded-xl bg-wood-oak hover:bg-amber-400 text-black font-semibold text-xs transition disabled:opacity-40 shrink-0"
                >
                  {isAiLoading ? '분석 중...' : '생성'}
                </button>
              </div>
            </div>

            {/* 외경 치수 슬라이더 (W, H, D) */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">외경 치수 설정 (mm)</h4>

              {/* 가로 너비 (W) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">가로 너비 (Width, W)</span>
                  <span className="font-mono text-wood-oak font-semibold">{config.dimensions.width} mm</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="1600"
                  step="10"
                  value={config.dimensions.width}
                  onChange={(e) => onConfigChange(prev => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, width: Number(e.target.value) }
                  }))}
                  className="w-full accent-wood-oak"
                />
                {config.dimensions.width > 1000 && (
                  <p className="text-[11px] text-semantic-amber flex items-center gap-1">
                    <AlertTriangle size={12} /> 선반 스팬 1000mm 초과: 처짐 방지를 위해 두께 24T 또는 중간 수직 보강 권장
                  </p>
                )}
              </div>

              {/* 높이 (H) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">높이 (Height, H)</span>
                  <span className="font-mono text-wood-oak font-semibold">{config.dimensions.height} mm</span>
                </div>
                <input
                  type="range"
                  min="600"
                  max="2200"
                  step="20"
                  value={config.dimensions.height}
                  onChange={(e) => onConfigChange(prev => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, height: Number(e.target.value) }
                  }))}
                  className="w-full accent-wood-oak"
                />
              </div>

              {/* 깊이 (D) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">깊이 (Depth, D)</span>
                  <span className="font-mono text-wood-oak font-semibold">{config.dimensions.depth} mm</span>
                </div>
                <input
                  type="range"
                  min="250"
                  max="600"
                  step="10"
                  value={config.dimensions.depth}
                  onChange={(e) => onConfigChange(prev => ({
                    ...prev,
                    dimensions: { ...prev.dimensions, depth: Number(e.target.value) }
                  }))}
                  className="w-full accent-wood-oak"
                />
              </div>
            </div>

            {/* 수종 선택 */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">원목 수종 선택</h4>
              <div className="grid grid-cols-3 gap-2">
                {(['oak', 'walnut', 'birch'] as WoodType[]).map((type) => {
                  const wood = WOOD_CONFIGS[type];
                  const isSelected = config.woodType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => onConfigChange(prev => ({ ...prev, woodType: type }))}
                      className={`p-3 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-panel-elevated border-wood-oak shadow-md'
                          : 'bg-panel-elevated/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: wood.color }} />
                      <span className="text-xs font-medium text-white">{wood.name.split(' ')[0]}</span>
                      <span className="text-[10px] text-gray-400">㎡당 {Math.round(wood.unitCostPerM2 / 10000)}만원</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 선반 단수 및 도어 타입 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">선반 단수</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onConfigChange(prev => ({ ...prev, shelfCount: Math.max(0, prev.shelfCount - 1) }))}
                    className="w-8 h-8 rounded-lg bg-panel-elevated border border-white/10 text-white font-bold flex items-center justify-center hover:bg-white/10"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center font-mono text-sm font-semibold">{config.shelfCount}단</span>
                  <button
                    onClick={() => onConfigChange(prev => ({ ...prev, shelfCount: Math.min(6, prev.shelfCount + 1) }))}
                    className="w-8 h-8 rounded-lg bg-panel-elevated border border-white/10 text-white font-bold flex items-center justify-center hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">도어 형태</label>
                <select
                  value={config.doorType}
                  onChange={(e) => onConfigChange(prev => ({ ...prev, doorType: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-panel-elevated border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-wood-oak"
                >
                  <option value="double">양문형 도어</option>
                  <option value="single">단문형 도어</option>
                  <option value="drawers">2단 서랍형</option>
                  <option value="open">오픈형 (도어없음)</option>
                </select>
              </div>
            </div>

            {/* 예상 가견적 요약 카드 */}
            <div className="p-4 rounded-2xl bg-panel-elevated border border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>소요 원목 면적</span>
                <span className="font-mono">{currentEstimate.totalAreaM2} ㎡ (4x8 {currentEstimate.requiredSheets}장)</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>자재비 + 가공공임</span>
                <span className="font-mono">₩{(currentEstimate.materialCost).toLocaleString()} + ₩{(currentEstimate.laborCost).toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs font-semibold text-white">1차 산출 예상 견적</span>
                <span className="font-mono text-base font-bold text-wood-oak">₩{currentEstimate.totalPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* 다음 단계 버튼 */}
            <button
              onClick={() => {
                setActiveTab('rfi');
                onStageChange('2_RFI_REQUESTED');
              }}
              className="w-full py-3 rounded-xl bg-wood-oak hover:bg-amber-400 text-black font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>장인에게 필수 현장 확인(RFI) 요청받기</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ===================== [탭 2: 장인 RFI 응답] ===================== */}
        {activeTab === 'rfi' && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-3.5 rounded-xl bg-semantic-amber/10 border border-semantic-amber/30 text-xs text-semantic-amber leading-relaxed flex items-start gap-2.5">
              <MessageSquare size={18} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">현장 오차 0%를 위한 필수 확인 질문:</span> 목수 장인이 완벽한 맞춤 시공을 위해 질문을 남겼습니다. 입력 즉시 3D 도면에 반영됩니다.
              </div>
            </div>

            {/* 1. 걸레받이(몰딩) 따내기 */}
            <div className="p-4 rounded-2xl bg-panel-elevated border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-white">벽면 하단 걸레받이(몰딩)가 있나요?</h5>
                  <p className="text-[11px] text-gray-400">가구가 벽에 빈틈없이 밀착되도록 측판 뒤를 따냅니다.</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.rfi.hasBaseboard}
                  onChange={(e) => onConfigChange(prev => ({
                    ...prev,
                    rfi: { ...prev.rfi, hasBaseboard: e.target.checked }
                  }))}
                  className="w-5 h-5 accent-wood-oak rounded cursor-pointer"
                />
              </div>

              {config.rfi.hasBaseboard && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400">걸레받이 높이 (H)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={config.rfi.baseboardHeight}
                        onChange={(e) => onConfigChange(prev => ({
                          ...prev,
                          rfi: { ...prev.rfi, baseboardHeight: Number(e.target.value) }
                        }))}
                        className="w-full px-2.5 py-1.5 bg-studio-black border border-white/10 rounded-lg text-xs font-mono text-white"
                      />
                      <span className="text-xs text-gray-400">mm</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-gray-400">걸레받이 두께 (D)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={config.rfi.baseboardDepth}
                        onChange={(e) => onConfigChange(prev => ({
                          ...prev,
                          rfi: { ...prev.rfi, baseboardDepth: Number(e.target.value) }
                        }))}
                        className="w-full px-2.5 py-1.5 bg-studio-black border border-white/10 rounded-lg text-xs font-mono text-white"
                      />
                      <span className="text-xs text-gray-400">mm</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. 전선 타공 홀 */}
            <div className="p-4 rounded-2xl bg-panel-elevated border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-semibold text-white">가구 뒷판에 전선 타공 홀이 필요한가요?</h5>
                  <p className="text-[11px] text-gray-400">벽면 콘센트 연결 및 멀티탭 인출용 원형 타공(Ø50mm)</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.rfi.hasWireHole}
                  onChange={(e) => onConfigChange(prev => ({
                    ...prev,
                    rfi: { ...prev.rfi, hasWireHole: e.target.checked }
                  }))}
                  className="w-5 h-5 accent-wood-oak rounded cursor-pointer"
                />
              </div>

              {config.rfi.hasWireHole && (
                <div className="pt-2 border-t border-white/5 space-y-2 animate-fade-in">
                  <span className="text-[11px] text-gray-400">타공 위치 선택</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['left', 'center', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => onConfigChange(prev => ({
                          ...prev,
                          rfi: { ...prev.rfi, wireHolePosition: pos }
                        }))}
                        className={`py-1.5 text-xs rounded-lg border transition ${
                          config.rfi.wireHolePosition === pos
                            ? 'bg-wood-oak/20 border-wood-oak text-wood-oak font-semibold'
                            : 'bg-studio-black border-white/10 text-gray-300'
                        }`}
                      >
                        {pos === 'left' ? '좌측 하단' : pos === 'center' ? '중앙 하단' : '우측 하단'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. 고하중 보강 */}
            <div className="p-4 rounded-2xl bg-panel-elevated border border-white/10 flex items-center justify-between">
              <div>
                <h5 className="text-xs font-semibold text-white">무거운 전공서적/도자기 등을 수납하시나요?</h5>
                <p className="text-[11px] text-gray-400">선반 처짐 방지를 위해 판재를 18T에서 24T로 상향합니다.</p>
              </div>
              <input
                type="checkbox"
                checked={config.thickness === 24}
                onChange={(e) => onConfigChange(prev => ({
                  ...prev,
                  thickness: e.target.checked ? 24 : 18
                }))}
                className="w-5 h-5 accent-wood-oak rounded cursor-pointer"
              />
            </div>

            <button
              onClick={() => {
                setActiveTab('bids');
                onStageChange('4_MULTI_PROPOSAL_OPEN');
              }}
              className="w-full py-3 rounded-xl bg-semantic-emerald hover:bg-emerald-500 text-black font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-lg"
            >
              <span>RFI 반영 완료 및 복수 공방 견적 비교하기</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ===================== [탭 3: 공방 제안 비교] ===================== */}
        {activeTab === 'bids' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">입찰 참여 공방 비교 ({workshopBids.length}곳)</h4>
                <p className="text-[11px] text-gray-400">카드를 누르면 중앙 3D 뷰어 모델이 해당 공방 스타일로 바뀝니다.</p>
              </div>
              <button
                onClick={() => onConfigChange(prev => ({ ...prev, diffMode: !prev.diffMode }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  config.diffMode
                    ? 'bg-semantic-emerald/20 text-semantic-emerald border-semantic-emerald'
                    : 'bg-panel-elevated text-gray-300 border-white/10'
                }`}
              >
                3D Diff 토글 {config.diffMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* 공방 카드 목록 */}
            <div className="space-y-3">
              {workshopBids.map((bid) => {
                const isSelected = selectedBidId === bid.id;
                return (
                  <div
                    key={bid.id}
                    onClick={() => handleSelectBid(bid)}
                    className={`p-4 rounded-2xl border transition cursor-pointer relative ${
                      isSelected
                        ? 'bg-panel-elevated border-wood-oak shadow-xl ring-1 ring-wood-oak/50'
                        : 'bg-panel-elevated/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {/* 상단 공방명 및 매칭 스코어 */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${bid.avatarColor} text-white font-bold text-xs flex items-center justify-center shadow-md`}>
                          {bid.workshopName[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">{bid.workshopName}</h5>
                            <span className="text-[10px] text-gray-400">{bid.location}</span>
                          </div>
                          <p className="text-[11px] text-wood-oak font-medium">표준 모델: {bid.templateName}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-wood-oak/10 text-wood-oak border border-wood-oak/30 font-mono text-[11px] font-bold">
                          적합도 {bid.matchScore}%
                        </span>
                      </div>
                    </div>

                    {/* 장인 수정 코멘트 (Diff 설명) */}
                    <p className="mt-2.5 text-[11px] text-gray-300 bg-studio-black/50 p-2.5 rounded-xl border border-white/5">
                      💬 <span className="text-white font-medium">장인 제안:</span> {bid.diffNote}
                    </p>

                    {/* 태그 목록 */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {bid.features.map((feat, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-gray-300">
                          {feat}
                        </span>
                      ))}
                    </div>

                    {/* 하단 가격 및 납기 */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs text-gray-400">제작 기간: <strong className="text-white">{bid.leadDays}일</strong></span>
                      <span className="font-mono text-sm font-bold text-wood-oak">₩{bid.price.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 최종 결제 및 에스크로 계약 잠금 */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-panel-elevated to-studio-black border border-semantic-emerald/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-semantic-emerald">
                <ShieldCheck size={18} />
                <span>안전 에스크로 결제 & SHA-256 계약 해시 잠금</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                최종 낙찰 시 가구 설계 파라미터가 <strong>SHA-256 해시로 영구 동결</strong>되어 사후 도면 위변조나 불량 제작을 원천 차단합니다. 대금은 완성 검수 후 공방에 안전하게 정산됩니다.
              </p>

              {isPaymentComplete ? (
                <div className="p-3 rounded-xl bg-semantic-emerald/20 text-semantic-emerald text-xs font-bold text-center flex items-center justify-center gap-1.5">
                  <Check size={16} />
                  <span>계약 완료! SHA-256 도면 해시가 성공적으로 잠금되었습니다.</span>
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  className="w-full py-3 rounded-xl bg-semantic-emerald hover:bg-emerald-500 text-black font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <ShieldCheck size={16} />
                  <span>선택한 공방으로 낙찰 및 에스크로 결제하기 (₩450,000)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
