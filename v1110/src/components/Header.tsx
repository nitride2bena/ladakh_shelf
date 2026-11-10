import React from 'react';
import { UserRole, SystemStage } from '../types/furniture';
import { Key, ShieldCheck, Hammer, User, Settings, Layers } from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  stage: SystemStage;
  hasApiKey: boolean;
  onOpenByokModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  onRoleChange,
  stage,
  hasApiKey,
  onOpenByokModal,
}) => {
  // 상태별 텍스트 및 컬러 매핑
  const stageBadges: Record<SystemStage, { label: string; color: string }> = {
    '1_DRAFT_INIT': { label: '초안 설계 중', color: 'bg-gray-700 text-gray-200' },
    '2_RFI_REQUESTED': { label: '장인 RFI 역질문 도착', color: 'bg-semantic-amber/20 text-semantic-amber border-semantic-amber/40' },
    '3_SPEC_COMPILED': { label: '제작 사양서 확정', color: 'bg-semantic-blue/20 text-semantic-blue border-semantic-blue/40' },
    '4_MULTI_PROPOSAL_OPEN': { label: '공방 제안 비교 입찰 중', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    '5_CONTRACT_LOCKED': { label: '계약 해시 잠금 (결제완료)', color: 'bg-semantic-emerald/20 text-semantic-emerald border-semantic-emerald/40' },
    '6_PRODUCTION_RELEASED': { label: 'STEP/CNC 도면 발행 (가공시작)', color: 'bg-green-600/30 text-green-300 border-green-500/50' },
  };

  const currentBadge = stageBadges[stage];

  return (
    <header className="h-16 px-4 md:px-6 bg-panel-surface/90 backdrop-blur-md border-b border-panel-border flex items-center justify-between z-30 select-none">
      {/* 1. 로고 및 프로젝트 상태 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wood-oak to-amber-700 flex items-center justify-center shadow-md">
            <Hammer size={18} className="text-black" />
          </div>
          <div>
            <span className="font-bold text-sm md:text-base tracking-tight text-white flex items-center gap-1.5">
              공유선반 <span className="text-[10px] px-1.5 py-0.5 rounded bg-wood-oak/20 text-wood-oak border border-wood-oak/30 font-mono">v1.0</span>
            </span>
            <p className="text-[10px] text-gray-400 hidden sm:block">AI 3D 맞춤형 가구 & 장인 매칭 플랫폼</p>
          </div>
        </div>

        {/* 현재 상태 배지 */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${currentBadge.color}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
          <span>{currentBadge.label}</span>
        </div>
      </div>

      {/* 2. 중앙 역할 전환 탭 */}
      <div className="flex items-center bg-panel-elevated p-1 rounded-xl border border-white/5">
        <button
          onClick={() => onRoleChange('consumer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            role === 'consumer'
              ? 'bg-wood-oak text-black shadow-sm font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <User size={14} />
          <span>소비자</span>
        </button>

        <button
          onClick={() => onRoleChange('maker')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            role === 'maker'
              ? 'bg-wood-oak text-black shadow-sm font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Hammer size={14} />
          <span>목수 장인</span>
        </button>

        <button
          onClick={() => onRoleChange('admin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            role === 'admin'
              ? 'bg-wood-oak text-black shadow-sm font-semibold'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings size={14} />
          <span>관리자</span>
        </button>
      </div>

      {/* 3. 우측 액션: BYOK 개인 API Key 설정 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenByokModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
            hasApiKey
              ? 'bg-panel-elevated text-semantic-emerald border-semantic-emerald/30 hover:border-semantic-emerald'
              : 'bg-panel-elevated text-gray-300 border-white/10 hover:border-wood-oak hover:text-white'
          }`}
        >
          <Key size={14} className={hasApiKey ? 'text-semantic-emerald' : 'text-wood-oak'} />
          <span className="hidden sm:inline">{hasApiKey ? 'BYOK 연결됨' : 'BYOK Key 등록'}</span>
          {hasApiKey && <span className="w-1.5 h-1.5 rounded-full bg-semantic-emerald"></span>}
        </button>
      </div>
    </header>
  );
};
