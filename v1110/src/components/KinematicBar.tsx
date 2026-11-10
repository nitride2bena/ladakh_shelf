import React from 'react';
import { FurnitureConfig } from '../types/furniture';
import { Play, Pause, Sparkles } from 'lucide-react';

interface KinematicBarProps {
  config: FurnitureConfig;
  onConfigChange: (updater: (prev: FurnitureConfig) => FurnitureConfig) => void;
}

export const KinematicBar: React.FC<KinematicBarProps> = ({ config, onConfigChange }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const animRef = React.useRef<number | null>(null);
  const dirRef = React.useRef<number>(1);

  // 자동 개폐 시뮬레이션
  React.useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    const step = () => {
      onConfigChange(prev => {
        let nextAngle = prev.doorAngle + dirRef.current * 1.5;
        if (nextAngle >= 105) {
          nextAngle = 105;
          dirRef.current = -1;
        } else if (nextAngle <= 0) {
          nextAngle = 0;
          dirRef.current = 1;
        }
        return { ...prev, doorAngle: nextAngle };
      });
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, onConfigChange]);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-2xl">
      <div className="glass-panel px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-xs">
        {/* 자동 시뮬레이션 토글 버튼 */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl transition flex items-center gap-1.5 font-medium ${
            isPlaying
              ? 'bg-semantic-amber text-black font-semibold'
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title="도어 개폐 자동 시뮬레이션"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          <span className="hidden sm:inline">{isPlaying ? '정지' : '모션'}</span>
        </button>

        {/* 1. 도어 개폐 각도 슬라이더 */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-gray-400 font-mono text-[11px]">
            <span>도어 개폐 각도</span>
            <span className="text-wood-oak font-semibold">{Math.round(config.doorAngle)}°</span>
          </div>
          <input
            type="range"
            min="0"
            max="110"
            value={config.doorAngle}
            onChange={(e) => onConfigChange(prev => ({ ...prev, doorAngle: Number(e.target.value) }))}
            className="w-full accent-wood-oak cursor-pointer"
          />
        </div>

        {/* 2. 서랍 인출 슬라이더 (서랍 타입일 때만) */}
        {config.doorType === 'drawers' && (
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-gray-400 font-mono text-[11px]">
              <span>서랍 인출</span>
              <span className="text-wood-oak font-semibold">{config.drawerExtract}mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              value={config.drawerExtract}
              onChange={(e) => onConfigChange(prev => ({ ...prev, drawerExtract: Number(e.target.value) }))}
              className="w-full accent-wood-oak cursor-pointer"
            />
          </div>
        )}

        {/* 3. 분해도 슬라이더 (Exploded View) */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-gray-400 font-mono text-[11px]">
            <span>분해도 전개</span>
            <span className="text-semantic-blue font-semibold">{Math.round(config.explodedView * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.explodedView}
            onChange={(e) => onConfigChange(prev => ({ ...prev, explodedView: Number(e.target.value) }))}
            className="w-full accent-semantic-blue cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
