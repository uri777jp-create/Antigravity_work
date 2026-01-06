import { SerpJson, ArticleStructure, ContentRole } from "./types";

export function generateStructure(json: SerpJson): ArticleStructure {
    const { top_content_type, intent_stats, word_count } = json;

    // H1 Generation Rule (4.3)
    let title = json.keyword;
    if (top_content_type === "comparison") {
        title = `${json.keyword}比較・おすすめランキング15選【2026年最新】`;
    }

    // Initial H2 roles (4.4)
    const roles: ContentRole[] = [
        "introduction",
        "comparison_points",
        "comparison_table",
        "conditional_recommendation",
        "faq",
        "caution",
        "conclusion",
        "summary",
    ];

    // Intent-based order adjustment (4.5)
    // informational ≥ transactional: intro -> conclusion
    // transactional > informational: conclusion -> intro
    if (intent_stats.transactional > intent_stats.informational) {
        const conclusionIndex = roles.indexOf("conclusion");
        roles.splice(conclusionIndex, 1);
        roles.splice(1, 0, "conclusion"); // Move to near top
    }

    // Metrics based deep-dive (4.7)
    // Ensure enough sections for long articles
    const sections = roles.map((role) => {
        let h2Text = "";
        const h3s: string[] = [];

        switch (role) {
            case "introduction":
                h2Text = `${json.keyword}とは？基本知識を解説`;
                break;
            case "comparison_points":
                h2Text = `${json.keyword}選びで失敗しないための比較ポイント`;
                break;
            case "comparison_table":
                h2Text = `${json.keyword}のおすすめ比較一覧表`;
                break;
            case "conditional_recommendation":
                h2Text = "【目的別】あなたにぴったりの選び方";
                break;
            case "faq":
                h2Text = "よくある質問（FAQ）";
                // Add PAA as H3
                json.ideas.people_also_ask.slice(0, 3).forEach((aa) => h3s.push(aa.q));
                break;
            case "caution":
                h2Text = "利用前に知っておきたい注意点・リスク";
                break;
            case "conclusion":
                h2Text = "まとめ：最適な選択をするために";
                break;
            case "summary":
                h2Text = "最後に";
                break;
        }

        return { h2: h2Text, role, h3s };
    });

    return { title, sections };
}
