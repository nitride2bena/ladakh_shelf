import React, { useState, useRef } from 'react';
import { Sparkles, ImagePlus, Loader2, X, Wand2 } from 'lucide-react';

interface AICopilotBarProps {
  onApplyPrompt: (prompt: string, imageDataUrl?: string | null) => Promise<void>;
  isLoading: boolean;
  lastReasoning?: string | null;
  compact?: boolean;
}

const EXAMPLE_PROMPTS = [
  'LP판 300장이랑 진공관 앰프 올릴 월넛 선반, 로봇청소기 지나가게 해줘',
  '가로 1400 높이 1500 서재용 화이트오크 4단 책장, 처짐 없게 보강해줘',
  '거실 벽면 밀착형 걸레받이 노치 있는 3단 애쉬 장식장 추천해줘',
];

export const AICopilotBar: React.FC<AICopilotBarProps> = ({
  onApplyPrompt,
  isLoading,
  lastReasoning,
  compact = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !imageDataUrl) return;
    await onApplyPrompt(prompt.trim() || '첨부한 공간 사진에 어울리는 선반 사양을 추천해줘', imageDataUrl);
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        compact ? 'p-3' : 'p-4'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
          <Sparkles className="h-4 w-4" />
          <span>Gemini AI 맞춤 사양 코파일럿 (자연어 &amp; 설치 공간 사진 분석)</span>
        </div>
        {!compact && (
          <div className="hidden flex-wrap gap-1.5 xl:flex">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPrompt(ex)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] opacity-80 transition hover:border-amber-500 hover:opacity-100"
                style={{
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                “{ex.slice(0, 26)}…”
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 가로 1200에 로봇청소기가 들어가는 4단 오크 책장으로 짜줘 (공간 사진 첨부 가능)"
            className="w-full rounded-lg border px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:border-amber-500"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-color)',
            }}
            title="설치할 실내 공간 사진 첨부"
          >
            <ImagePlus className="h-3.5 w-3.5 text-amber-500" />
            <span>{imageDataUrl ? '사진 변경' : '공간 사진'}</span>
          </button>

          <button
            type="submit"
            disabled={isLoading || (!prompt.trim() && !imageDataUrl)}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>설계 중...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                <span>AI 자동 설정</span>
              </>
            )}
          </button>
        </div>
      </form>

      {imageDataUrl && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={imageDataUrl}
            alt="첨부된 실내 공간"
            className="h-10 w-14 rounded border object-cover"
            style={{ borderColor: 'var(--border-color)' }}
          />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            공간 사진이 첨부되었습니다. 수종 색상 및 걸레받이 간섭을 함께 분석합니다.
          </span>
          <button
            type="button"
            onClick={() => setImageDataUrl(null)}
            className="rounded p-1 hover:bg-red-500/20 hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {lastReasoning && (
        <div
          className="mt-2.5 rounded-lg border px-3 py-2 text-xs leading-relaxed"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-color)',
          }}
        >
          <span className="mr-1.5 font-semibold text-amber-500">✨ AI 설계 코멘트:</span>
          <span>{lastReasoning}</span>
        </div>
      )}
    </div>
  );
};
