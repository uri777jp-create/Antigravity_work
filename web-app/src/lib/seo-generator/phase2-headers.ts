import { SerpJson, ArticleStructure, ContentRole } from "./types";

export function integrateCompetitorHeaders(
    json: SerpJson,
    structure: ArticleStructure
): ArticleStructure {
    const { competitors } = json;

    // 5.2 処理フロー: 正規化 -> 分類 -> 頻度集計 -> 選別
    const headerMap = new Map<string, { count: number; role?: ContentRole }>();

    competitors.forEach((comp) => {
        comp.headers.forEach(([tag, text]) => {
            if (tag === "h2") {
                const normalized = normalizeHeader(text);
                if (normalized.length < 2) return;

                const existing = headerMap.get(normalized) || { count: 0 };
                headerMap.set(normalized, { ...existing, count: existing.count + 1 });
            }
        });
    });

    // 5.5 頻度評価 (50%以上: 必須, 30%以上: 推奨)
    const threshold = competitors.length * 0.3; // 30%以上を採用候補とする
    const commonHeaders = Array.from(headerMap.entries())
        .filter(([_, data]) => data.count >= threshold)
        .sort((a, b) => b[1].count - a[1].count);

    // 5.6 構成への統合 (H3として注入)
    // ここでは簡易的に、関連性の高そうな H2 セクションに H3 として追加する
    commonHeaders.forEach(([text, data]) => {
        // 既存の H2 と重複していないか確認
        const isDuplicate = structure.sections.some(s => s.h2.includes(text) || text.includes(s.h2));
        if (isDuplicate) return;

        // 適切なセクションへ H3 として追加 (例: introduction または comparison_points)
        const targetSection = structure.sections.find(s => s.role === "comparison_points") || structure.sections[0];
        if (targetSection && targetSection.h3s.length < 5) {
            targetSection.h3s.push(text);
        }
    });

    return structure;
}

function normalizeHeader(text: string): string {
    return text
        .replace(/[【】]/g, "")
        .replace(/\s+/g, "")
        .trim();
}
