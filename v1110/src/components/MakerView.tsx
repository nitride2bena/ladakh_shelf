import React, { useState } from 'react';
import { FurnitureConfig, SystemStage, WOOD_CONFIGS } from '../types/furniture';
import { calculateBomAndEstimate } from '../utils/cadGeometry';
import { Viewport3D } from './Viewport3D';
import { KinematicBar } from './KinematicBar';
import { Download, FileCode, CheckCircle2, Droplets, Wrench, RefreshCw, Layers, Check } from 'lucide-react';

interface MakerViewProps {
  config: FurnitureConfig;
  onConfigChange: (updater: (prev: FurnitureConfig) => FurnitureConfig) => void;
  stage: SystemStage;
  onStageChange: (stage: SystemStage) => void;
}

export const MakerView: React.FC<MakerViewProps> = ({
  config,
  onConfigChange,
  stage,
  onStageChange,
}) => {
  const [humidity, setHumidity] = useState(65); // 대기 습도 (%)
  const [centerTab, setCenterTab] = useState<'3d' | 'nesting'>('3d');
  const [toleranceGap, setToleranceGap] = useState(2.5); // 도어 유격 mm
  const [isExporting, setIsExporting] = useState(false);
  const [rfiSent, setRfiSent] = useState(false);

  const estimate = calculateBomAndEstimate(config);
  const wood = WOOD_CONFIGS[config.woodType];

  // 습도에 따른 목재 팽창량 계산 (기본 습도 45% 기준 차이)
  const expansionMm = Number(((humidity - 45) * wood.expansionFactor * (config.dimensions.width / 500)).toFixed(2));
  const isClashRisk = expansionMm >= toleranceGap;

  // STEP / DXF / BOM 다운로드 핸들러
  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      onStageChange('6_PRODUCTION_RELEASED');
      // 가상 파일 다운로드 트리거
      const bomData = JSON.stringify({
        project: '공유선반_v1.0_정밀제조패키지',
        timestamp: new Date().toISOString(),
        hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        material: wood.name,
        dimensions: config.dimensions,
        tolerance_gap_mm: toleranceGap,
        expansion_margin_mm: expansionMm,
        bom_items: estimate.bom,
        sheets_required: estimate.requiredSheets,
        files_included: ['assembly.step', 'panels_nesting.dxf', 'cut_list.pdf', 'hardware_domino.json']
      }, null, 2);

      const blob = new Blob([bomData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `청주우드웍스_가공패키지_${config.woodType}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-studio-black text-gray-100">
      {/* ===================== [좌측: 수주 & 실시간 부재표 BOM 패널 (280px)] ===================== */}
      <div className="w-full md:w-80 bg-panel-surface border-r border-panel-border flex flex-col shrink-0 overflow-y-auto p-4 space-y-5">
        {/* 공방 정보 헤더 */}
        <div className="p-3.5 rounded-2xl bg-panel-elevated border border-white/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-wood-oak">WORKSHOP WORKBENCH</span>
            <span className="w-2 h-2 rounded-full bg-semantic-emerald"></span>
          </div>
          <h3 className="text-sm font-bold text-white">청주 우드웍스 (장인 포털)</h3>
          <p className="text-[11px] text-gray-400">로컬 Antigravity MCP: <strong className="text-semantic-emerald">FreeCAD 1.0 연결됨</strong></p>
        </div>

        {/* 1. 수주 칸반 현황 요약 */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">수주 의뢰 관리</h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-panel-elevated border border-white/5">
              <span className="text-[10px] text-gray-400 block">신규 RFQ</span>
              <strong className="text-sm font-mono text-white">2건</strong>
            </div>
            <div className="p-2 rounded-xl bg-panel-elevated border border-white/5">
              <span className="text-[10px] text-gray-400 block">RFI 대기</span>
              <strong className="text-sm font-mono text-semantic-amber">1건</strong>
            </div>
            <div className="p-2 rounded-xl bg-panel-elevated border border-white/5">
              <span className="text-[10px] text-gray-400 block">계약 완료</span>
              <strong className="text-sm font-mono text-semantic-emerald">4건</strong>
            </div>
          </div>
        </div>

        {/* 2. 실시간 부재표 (Cut-list BOM) */}
        <div className="space-y-2 flex-1">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">실시간 부재표 (BOM)</h4>
            <span className="text-[10px] text-wood-oak font-mono">{estimate.bom.length}개 부재</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {estimate.bom.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-panel-elevated/70 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-white block">{item.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {item.thickness}T × {item.width} × {item.height}mm
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] font-mono font-bold text-wood-oak">
                  {item.count}EA
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. 4x8 원판 재단 수율 (Nesting) */}
        <div className="p-3.5 rounded-2xl bg-panel-elevated border border-white/10 space-y-2 text-xs">
          <div className="flex justify-between text-gray-300">
            <span>4x8 (1220×2440) 소요 원판</span>
            <strong className="font-mono text-white">{estimate.requiredSheets}장</strong>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>원목 유효 총 면적</span>
            <span className="font-mono">{estimate.totalAreaM2} ㎡</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>예상 재단 로스율 (Waste)</span>
            <span className="font-mono text-semantic-amber">{estimate.wasteFactor}%</span>
          </div>
        </div>

        {/* 4. 최종 가공 데이터 STEP/DXF/BOM 일괄출력 버튼 */}
        <div className="pt-2">
          <button
            onClick={handleExportData}
            disabled={isExporting}
            className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xl ${
              stage === '5_CONTRACT_LOCKED' || stage === '6_PRODUCTION_RELEASED'
                ? 'bg-semantic-emerald hover:bg-emerald-500 text-black shadow-emerald-500/20 animate-pulse'
                : 'bg-panel-elevated border border-white/10 text-gray-300 hover:text-white'
            }`}
          >
            {isExporting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>STEP / DXF 생성 중...</span>
              </>
            ) : (
              <>
                <Download size={15} />
                <span>[STEP / DXF / BOM 일괄출력]</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            {stage === '5_CONTRACT_LOCKED' ? '✔ 에스크로 결제 완료: 즉시 도면 발행 가능' : '계약 체결 시 버튼이 활성화됩니다.'}
          </p>
        </div>
      </div>

      {/* ===================== [중앙: 3D CAD 검증 뷰포트 & 수축/팽창 시뮬레이터] ===================== */}
      <div className="flex-1 flex flex-col relative h-[50vh] md:h-full">
        {/* 뷰 모드 탭 (3D 모델 vs 2D Nesting 배치도) */}
        <div className="absolute top-4 left-4 z-20 flex gap-1 bg-panel-surface/80 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setCenterTab('3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              centerTab === '3d' ? 'bg-wood-oak text-black font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            3D 어셈블리 검증
          </button>
          <button
            onClick={() => setCenterTab('nesting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              centerTab === 'nesting' ? 'bg-wood-oak text-black font-semibold' : 'text-gray-300 hover:text-white'
            }`}
          >
            2D 원판 재단 배치도 (Nesting)
          </button>
        </div>

        {/* 3D 뷰포트 또는 2D Nesting 렌더링 */}
        {centerTab === '3d' ? (
          <>
            <Viewport3D config={config} onConfigChange={onConfigChange} />
            <KinematicBar config={config} onConfigChange={onConfigChange} />
          </>
        ) : (
          <div className="w-full h-full bg-studio-viewport p-8 flex flex-col items-center justify-center space-y-6 overflow-y-auto">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-wood-oak" />
              <span>4x8 원판 (1220 × 2440 mm) 자동 재단 배치도 (Nesting Layout)</span>
            </h4>

            {/* 시각적 4x8 패널 시뮬레이션 */}
            <div className="w-full max-w-xl aspect-[2/1] bg-panel-surface border-2 border-dashed border-wood-oak/50 rounded-2xl p-4 grid grid-cols-4 grid-rows-3 gap-2 shadow-2xl relative">
              <div className="col-span-2 row-span-3 bg-amber-800/40 border border-wood-oak/60 rounded-xl flex items-center justify-center text-xs font-mono font-semibold text-white">
                좌측판 / 우측판 ({config.dimensions.depth} × {config.dimensions.height})
              </div>
              <div className="col-span-2 row-span-1 bg-amber-700/40 border border-wood-oak/60 rounded-xl flex items-center justify-center text-xs font-mono font-semibold text-white">
                상판 / 하판
              </div>
              <div className="col-span-1 row-span-2 bg-amber-600/40 border border-wood-oak/60 rounded-xl flex items-center justify-center text-xs font-mono font-semibold text-white">
                선반 {config.shelfCount}단
              </div>
              <div className="col-span-1 row-span-2 bg-gray-800/60 border border-dashed border-gray-600 rounded-xl flex items-center justify-center text-[10px] font-mono text-gray-400">
                잔여 자재 ({estimate.wasteFactor}%)
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center max-w-md">
              CNC G-Code 툴패스가 각 부재의 2.5mm 엔드밀 가공 간격을 자동으로 계산하여 최적 원판 수율로 배치되었습니다.
            </p>
          </div>
        )}

        {/* 뷰포트 하단: 계절별 원목 수축·팽창 환경 시뮬레이터 바 */}
        <div className="absolute bottom-4 left-4 right-4 md:right-80 md:left-6 z-10">
          <div className="glass-panel px-4 py-2.5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 shrink-0">
              <Droplets size={16} className="text-semantic-blue" />
              <span className="font-semibold text-white">계절별 온·습도 시뮬레이터</span>
            </div>

            {/* 습도 슬라이더 */}
            <div className="flex-1 w-full flex items-center gap-3">
              <span className="text-[11px] text-gray-400 shrink-0">건조 30%</span>
              <input
                type="range"
                min="30"
                max="85"
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full accent-semantic-blue"
              />
              <span className="text-[11px] text-gray-400 shrink-0">다습 85%</span>
            </div>

            {/* 시뮬레이션 결과 판정 */}
            <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
              <span className="text-gray-300">습도: <strong>{humidity}%</strong></span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-300">팽창량: <strong className="text-wood-oak">+{expansionMm}mm</strong></span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                isClashRisk ? 'bg-semantic-crimson/20 text-semantic-crimson' : 'bg-semantic-emerald/20 text-semantic-emerald'
              }`}>
                {isClashRisk ? '⚠️ 도어 끼임 위험' : '✔ 공차 안전'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== [우측: 엔지니어링 제어 & 견적 입찰 패널 (340px)] ===================== */}
      <div className="w-full md:w-84 bg-panel-surface border-l border-panel-border flex flex-col shrink-0 overflow-y-auto p-4 space-y-5">
        {/* 1. 표준 템플릿 자동 매칭 */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">공방 표준 모델 매칭</h4>
          <div className="p-3.5 rounded-2xl bg-panel-elevated border border-wood-oak/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">시그니처: 인셋 화이트오크 3단</span>
              <span className="px-2 py-0.5 rounded-full bg-wood-oak/20 text-wood-oak font-mono text-[10px] font-bold">
                적합도 96%
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              소비자의 요청 치수(W:{config.dimensions.width})에 맞추어 공방 지그 규격으로 자동 모핑(Auto-Fitting)됩니다.
            </p>
            <button
              onClick={() => onConfigChange(prev => ({ ...prev, woodType: 'oak', thickness: 24, diffMode: true }))}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
            >
              템플릿 치수 원클릭 피팅
            </button>
          </div>
        </div>

        {/* 2. 현장 RFI 질문 발송기 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">현장 필수 RFI 질문 발송</h4>
            {rfiSent && <span className="text-[10px] text-semantic-emerald flex items-center gap-1"><Check size={12} /> 발송됨</span>}
          </div>

          <div className="p-3.5 rounded-2xl bg-panel-elevated border border-white/10 space-y-2.5 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input type="checkbox" defaultChecked className="accent-wood-oak rounded" />
              <span>걸레받이(몰딩) 높이/두께 확인 요청</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input type="checkbox" defaultChecked className="accent-wood-oak rounded" />
              <span>선반 적재 예정 도서/물품 하중 확인</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-gray-300">
              <input type="checkbox" defaultChecked className="accent-wood-oak rounded" />
              <span>벽면 콘센트 위치 및 배판 타공 확인</span>
            </label>

            <button
              onClick={() => {
                setRfiSent(true);
                onStageChange('2_RFI_REQUESTED');
              }}
              className="w-full py-2 mt-1 rounded-xl bg-semantic-amber hover:bg-amber-400 text-black font-semibold text-xs transition"
            >
              소비자에게 RFI 질문 카드 즉시 발송
            </button>
          </div>
        </div>

        {/* 3. 공차 / 결구 보정 & 견적 산출 */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">공차 / 결구 보정 및 견적</h4>

          <div className="p-3.5 rounded-2xl bg-panel-elevated border border-white/10 space-y-3 text-xs">
            {/* 도어 유격 슬라이더 */}
            <div className="space-y-1">
              <div className="flex justify-between text-gray-300">
                <span>도어 간섭 유격 (Clearance)</span>
                <span className="font-mono text-wood-oak font-bold">{toleranceGap} mm</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="4.0"
                step="0.1"
                value={toleranceGap}
                onChange={(e) => setToleranceGap(Number(e.target.value))}
                className="w-full accent-wood-oak"
              />
            </div>

            {/* 결구 방식 */}
            <div className="space-y-1">
              <span className="text-gray-300">주요 결구 방식</span>
              <select className="w-full px-2.5 py-1.5 bg-studio-black border border-white/10 rounded-lg text-xs text-white">
                <option>도미노 (Festool 5×30) - 28개소</option>
                <option>목심(Dowel 8×35) + 미니픽스</option>
                <option>전통 짜맞춤 (주먹장부)</option>
              </select>
            </div>

            {/* 단가 세부 내역 */}
            <div className="pt-2 border-t border-white/10 space-y-1 text-gray-400 text-[11px]">
              <div className="flex justify-between">
                <span>자재비 (원목 4x8 2장)</span>
                <span className="font-mono">₩{estimate.materialCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>가공 공임 & 하드웨어</span>
                <span className="font-mono">₩{estimate.laborCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/5 font-semibold text-white text-xs">
                <span>최종 제출 견적 금액</span>
                <span className="font-mono text-wood-oak text-sm">₩450,000</span>
              </div>
            </div>

            <button
              onClick={() => onStageChange('4_MULTI_PROPOSAL_OPEN')}
              className="w-full py-2.5 rounded-xl bg-wood-oak hover:bg-amber-400 text-black font-bold text-xs transition shadow-lg"
            >
              수정안 및 견적 제출 (입찰 참여)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
