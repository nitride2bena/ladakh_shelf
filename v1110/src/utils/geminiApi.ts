import { FurnitureDimensions, WoodType } from '../types/furniture';

export interface AiDesignRecommendation {
  dimensions: FurnitureDimensions;
  woodType: WoodType;
  shelfCount: number;
  doorType: 'double' | 'single' | 'drawers' | 'open';
  reasoning: string;
  rfiSuggestions: string[];
}

/**
 * BYOK Gemini API를 호출하거나 로컬 스마트 알고리즘으로 설계 추천을 생성합니다.
 */
export async function getAiDesignRecommendation(
  prompt: string,
  apiKey?: string
): Promise<AiDesignRecommendation> {
  // 실제 Gemini API Key가 입력된 경우 직접 Gemini 1.5 Flash 호출
  if (apiKey && apiKey.trim().length > 10) {
    try {
      const systemInstruction = `당신은 최고급 맞춤형 원목 가구 3D 설계 전문 AI 에이전트입니다.
사용자의 공간이나 요청에 맞춰 가구 규격(width, height, depth), 수종(oak, walnut, birch), 선반 단수(shelfCount: 0~4), 도어 타입(double, single, drawers, open), 추천 사유 및 장인이 현장에서 반드시 확인해야 할 RFI 질문 2~3가지를 JSON 형식으로만 응답하세요.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemInstruction}\n\n사용자 요청: "${prompt}"\n\nJSON 형식으로만 답하세요:` }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            dimensions: {
              width: Number(parsed.width) || 900,
              height: Number(parsed.height) || 1200,
              depth: Number(parsed.depth) || 380,
            },
            woodType: ['oak', 'walnut', 'birch'].includes(parsed.woodType) ? parsed.woodType : 'oak',
            shelfCount: Number(parsed.shelfCount) >= 0 ? Number(parsed.shelfCount) : 2,
            doorType: ['double', 'single', 'drawers', 'open'].includes(parsed.doorType) ? parsed.doorType : 'double',
            reasoning: parsed.reasoning || "Gemini 1.5 Flash가 분석한 최적 인체공학적 치수와 안정성 비율입니다.",
            rfiSuggestions: Array.isArray(parsed.rfiSuggestions) ? parsed.rfiSuggestions : [
              "바닥면 걸레받이 높이 및 깊이 실측 필요",
              "선반 최대 적재 예정 도서/물품 하중 확인"
            ]
          };
        }
      }
    } catch (err) {
      console.warn("Gemini API 호출 실패, 내장 스마트 시뮬레이션으로 대체:", err);
    }
  }

  // API 키가 없거나 호출 실패 시: 스마트 로컬 룰베이스 시뮬레이션
  await new Promise(r => setTimeout(r, 600)); // 자연스러운 딜레이

  const lower = prompt.toLowerCase();
  let dimensions: FurnitureDimensions = { width: 900, height: 1400, depth: 380 };
  let woodType: WoodType = 'oak';
  let shelfCount = 2;
  let doorType: 'double' | 'single' | 'drawers' | 'open' = 'double';
  let reasoning = "거실 및 서재 공간에 가장 이상적인 황금비율(W:900 × H:1400 × D:380mm)과 선반 처짐 안전성을 반영했습니다.";

  if (lower.includes('월넛') || lower.includes('다크') || lower.includes('고급')) {
    woodType = 'walnut';
    reasoning = "깊이감 있는 월넛 원목을 추천하며, 안정적인 하중 지지를 위해 3단 구조를 적용했습니다.";
  } else if (lower.includes('자작') || lower.includes('밝은') || lower.includes('모던')) {
    woodType = 'birch';
  }

  if (lower.includes('서랍') || lower.includes('수납장')) {
    doorType = 'drawers';
    dimensions = { width: 800, height: 950, depth: 420 };
    shelfCount = 0;
  } else if (lower.includes('책장') || lower.includes('오픈') || lower.includes('선반')) {
    doorType = 'open';
    dimensions = { width: 1000, height: 1600, depth: 320 };
    shelfCount = 4;
  } else if (lower.includes('소형') || lower.includes('미니') || lower.includes('협탁')) {
    dimensions = { width: 550, height: 750, depth: 350 };
    doorType = 'single';
    shelfCount = 1;
  }

  return {
    dimensions,
    woodType,
    shelfCount,
    doorType,
    reasoning,
    rfiSuggestions: [
      "벽면 하단 걸레받이(몰딩) 치수 실측 확인 (기본 60x12mm)",
      "선반 적재 예정 도서/물품의 예상 최대 하중 (20kg 이상 시 24T 권장)",
      "벽면 콘센트 위치와 후면 배판 전선 타공(Ø50mm) 필요 여부"
    ]
  };
}
