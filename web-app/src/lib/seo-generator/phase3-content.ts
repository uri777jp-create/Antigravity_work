import { SerpJson, ArticleStructure } from "./types";

export interface GenerationStep {
    sectionIndex: number;
    h2: string;
    content: string;
}

export async function* generateContent(
    json: SerpJson,
    structure: ArticleStructure
): AsyncGenerator<GenerationStep> {
    // Phase 3: 本文生成フェーズ (6.1)
    // LLM APIを使用する部分は現在はモックとして実装し、構造をシミュレートする

    for (let i = 0; i < structure.sections.length; i++) {
        const section = structure.sections[i];

        // 実際の実装ではここで OpenAI や Gemini の API を叩く
        const mockContent = `（${section.h2} の本文を生成中... 設計書 role: ${section.role} に基づき約1500文字程度を執筆します。）\n\n` +
            `ここでは ${json.keyword} に関する詳細な情報を ${section.role} の役割に従って展開します。\n` +
            (section.h3s.length > 0 ? `見出し：\n- ${section.h3s.join("\n- ")}` : "");

        // 生成の遅延をシミュレート
        await new Promise(resolve => setTimeout(resolve, 1000));

        yield {
            sectionIndex: i,
            h2: section.h2,
            content: mockContent
        };
    }
}
