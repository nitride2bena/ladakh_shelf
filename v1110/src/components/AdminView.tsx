import React, { useState } from 'react';
import { SystemStage } from '../types/furniture';
import { ShieldCheck, Settings, FileText, Database, Server, Cpu, Play, Check, RefreshCw } from 'lucide-react';

interface AdminViewProps {
  stage: SystemStage;
}

export const AdminView: React.FC<AdminViewProps> = ({ stage }) => {
  const [minDoorClearance, setMinDoorClearance] = useState(1.5);
  const [maxShelfSpan, setMaxShelfSpan] = useState(900);
  const [isRuleSaved, setIsRuleSaved] = useState(false);
  const [isTestingSandbox, setIsTestingSandbox] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<string | null>(null);

  // 마크다운 지침서 템플릿 코드
  const [directiveTemplate, setDirectiveTemplate] = useState(`# Master CAD Engineering Directive (v2.4)
# System: Google Antigravity & FreeCAD 1.0 Pipeline

[CONSTRAINTS]
- Min_Door_Clearance: {{rules.min_clearance}} mm
- Max_Unsupported_Shelf_Span: {{rules.max_span}} mm
- Target_Tolerance_Standard: ISO 2768-m (0.01mm)
- Material_Density_Oak: 0.72 g/cm3

[FORBIDDEN_OPERATIONS]
- Do NOT use unconstrained Sketcher geometry.
- Do NOT skip Domino joinery collision verification.
- Enforce Notch cutout at bottom rear: {{rfi.baseboard_rule}}
`);

  const handleSaveRules = () => {
    setIsRuleSaved(true);
    setTimeout(() => setIsRuleSaved(false), 2000);
  };

  const handleRunSandbox = () => {
    setIsTestingSandbox(true);
    setTimeout(() => {
      setIsTestingSandbox(false);
      setSandboxResult('✔ 지침서 템플릿 검증 통과: Assembly JSON 및 FreeCAD Python 파싱 100% 성공 (0.01mm 오차 검증)');
    }, 1000);
  };

  // 실시간 프로젝트 파이프라인 트래커 데이터
  const pipelineProjects = [
    {
      id: 'proj_oak_202611_01',
      client: 'Melqui (서울 마포)',
      workshop: '청주 우드웍스',
      state: stage,
      bids: '3개 공방',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      match: true,
    },
    {
      id: 'proj_birch_202611_04',
      client: 'UserB (경기 성남)',
      workshop: '대전 아트퍼니처',
      state: '2_RFI_REQUESTED',
      bids: '2개 공방',
      hash: '계약 전 단계 (동적 수정 중)',
      match: null,
    },
    {
      id: 'proj_walnut_202611_09',
      client: 'UserC (부산 해운대)',
      workshop: '파주 목공소',
      state: '6_PRODUCTION_RELEASED',
      bids: '4개 공방',
      hash: '8a5b2f11076b9a32c74d8123efb0129c54e21a88b77621fec238914c',
      match: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-studio-black text-gray-100 p-6 space-y-6">
      {/* 관리자 콘솔 헤더 지표 */}
      <div className="p-4 rounded-2xl bg-panel-surface border border-panel-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-wood-oak/10 text-wood-oak">
              <Server size={18} />
            </span>
            <h2 className="text-base font-bold text-white">중앙 플랫폼 관리자 콘솔 (System Admin Console)</h2>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">엔지니어링 룰셋 관리, LLM 지침서(.md) 버전 제어 및 계약 무결성 실시간 감사</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-panel-elevated border border-white/5 flex items-center gap-2 text-xs">
            <Cpu size={14} className="text-semantic-emerald" />
            <span className="text-gray-400">서버 CPU:</span>
            <strong className="text-white font-mono">18% (정상)</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-panel-elevated border border-white/5 flex items-center gap-2 text-xs">
            <Database size={14} className="text-semantic-blue" />
            <span className="text-gray-400">활성 세션:</span>
            <strong className="text-white font-mono">142명</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-semantic-emerald/10 border border-semantic-emerald/30 text-semantic-emerald flex items-center gap-1.5 text-xs font-semibold">
            <ShieldCheck size={14} />
            <span>계약 해시 무결성: 100% 정상</span>
          </div>
        </div>
      </div>

      {/* 중앙 그리드: 좌측 룰셋 관리기 / 우측 지침서 에디터 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. 엔지니어링 룰셋 관리기 */}
        <div className="p-5 rounded-2xl bg-panel-surface border border-panel-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-wood-oak" />
              <h3 className="text-sm font-bold text-white">파라메트릭 엔지니어링 룰셋 관리기</h3>
            </div>
            {isRuleSaved && (
              <span className="text-xs text-semantic-emerald flex items-center gap-1">
                <Check size={14} /> 핫 리로드 배포됨
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* 최소 도어 유격 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-panel-elevated border border-white/5">
              <div>
                <span className="font-semibold text-white block">도어 최소 클리어런스 (회전 반경 마진)</span>
                <span className="text-[11px] text-gray-400">힌지 개폐 시 모서리 충돌 방지 최소 유격</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={minDoorClearance}
                  onChange={(e) => setMinDoorClearance(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-studio-black border border-white/10 rounded-lg text-right font-mono text-white"
                />
                <span className="text-gray-400">mm</span>
              </div>
            </div>

            {/* 선반 처짐 경고 스팬 */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-panel-elevated border border-white/5">
              <div>
                <span className="font-semibold text-white block">선반 처짐(Sagging) 경고 기준 스팬</span>
                <span className="text-[11px] text-gray-400">기준 초과 시 24T 두께 변경 규칙 자동 트리거</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="50"
                  value={maxShelfSpan}
                  onChange={(e) => setMaxShelfSpan(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-studio-black border border-white/10 rounded-lg text-right font-mono text-white"
                />
                <span className="text-gray-400">mm</span>
              </div>
            </div>

            {/* 수종별 수축/팽창 계수 테이블 */}
            <div className="p-3 rounded-xl bg-panel-elevated border border-white/5 space-y-2">
              <span className="font-semibold text-white block">수종별 대기 습도 팽창 계수 (α)</span>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-studio-black">
                  <span className="text-gray-400 block">화이트오크</span>
                  <strong className="text-wood-oak font-mono">0.0036</strong>
                </div>
                <div className="p-2 rounded-lg bg-studio-black">
                  <span className="text-gray-400 block">월넛</span>
                  <strong className="text-wood-oak font-mono">0.0028</strong>
                </div>
                <div className="p-2 rounded-lg bg-studio-black">
                  <span className="text-gray-400 block">자작나무합판</span>
                  <strong className="text-wood-oak font-mono">0.0012</strong>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveRules}
            className="w-full py-2.5 rounded-xl bg-wood-oak hover:bg-amber-400 text-black font-semibold text-xs transition shadow-md"
          >
            수정된 엔지니어링 룰셋 즉시 배포 (Hot-Reload)
          </button>
        </div>

        {/* 2. 지침서 마크다운 템플릿 에디터 */}
        <div className="p-5 rounded-2xl bg-panel-surface border border-panel-border space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-semantic-blue" />
              <h3 className="text-sm font-bold text-white">지침서 마크다운 (`cad_directive.md`) 에디터</h3>
            </div>
            <span className="text-[11px] font-mono text-gray-400">Target: Gemini 1.5 System Prompt</span>
          </div>

          <textarea
            value={directiveTemplate}
            onChange={(e) => setDirectiveTemplate(e.target.value)}
            rows={8}
            className="w-full p-3 bg-studio-black border border-white/10 rounded-xl text-xs font-mono text-gray-200 focus:outline-none focus:border-wood-oak leading-relaxed resize-none"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleRunSandbox}
              disabled={isTestingSandbox}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5"
            >
              {isTestingSandbox ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
              <span>샌드박스 가상 파라미터 주입 테스트</span>
            </button>
          </div>

          {sandboxResult && (
            <div className="p-2.5 rounded-xl bg-semantic-emerald/10 border border-semantic-emerald/30 text-semantic-emerald text-xs font-mono animate-fade-in">
              {sandboxResult}
            </div>
          )}
        </div>
      </div>

      {/* 하단 전체: 실시간 파이프라인 트래커 & SHA-256 계약 해시 감사 로그 */}
      <div className="p-5 rounded-2xl bg-panel-surface border border-panel-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-semantic-emerald" />
            <h3 className="text-sm font-bold text-white">실시간 프로젝트 파이프라인 트래커 & SHA-256 계약 해시 감사 로그</h3>
          </div>
          <span className="text-xs text-gray-400">자동 실시간 검증 동기화 중 (Supabase Realtime)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase font-mono text-[11px]">
                <th className="py-2.5 px-3">프로젝트 ID</th>
                <th className="py-2.5 px-3">의뢰 소비자</th>
                <th className="py-2.5 px-3">낙찰 공방</th>
                <th className="py-2.5 px-3">파이프라인 상태</th>
                <th className="py-2.5 px-3">입찰 수</th>
                <th className="py-2.5 px-3">계약 SHA-256 도면 해시 감사</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {pipelineProjects.map((proj, idx) => (
                <tr key={idx} className="hover:bg-panel-elevated/40 transition">
                  <td className="py-3 px-3 text-wood-oak font-semibold">{proj.id}</td>
                  <td className="py-3 px-3 text-gray-300 font-sans">{proj.client}</td>
                  <td className="py-3 px-3 text-white font-sans">{proj.workshop}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-200">
                      {proj.state}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-400">{proj.bids}</td>
                  <td className="py-3 px-3">
                    {proj.match === true && (
                      <span className="text-semantic-emerald flex items-center gap-1.5 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-semantic-emerald"></span>
                        <span className="truncate max-w-[200px]">{proj.hash}</span>
                        <strong className="text-[10px] bg-semantic-emerald/20 px-1 rounded">(일치)</strong>
                      </span>
                    )}
                    {proj.match === null && (
                      <span className="text-gray-500 text-[11px]">{proj.hash}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
