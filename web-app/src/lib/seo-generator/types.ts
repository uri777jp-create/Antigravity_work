export type ContentRole =
    | "introduction"
    | "conclusion"
    | "comparison_points"
    | "comparison_table"
    | "conditional_recommendation"
    | "faq"
    | "caution"
    | "summary";

export interface Header {
    level: "h1" | "h2" | "h3";
    text: string;
    role?: ContentRole;
}

export interface Competitor {
    rank: number;
    url: string;
    title: string;
    headers: [string, string][];
    word_count: number;
}

export interface SerpJson {
    keyword: string;
    language: string;
    engine: string;
    top_intent: string;
    intent_stats: {
        informational: number;
        transactional: number;
    };
    top_content_type: "comparison" | "listicle" | "guide" | "other";
    content_type_stats: {
        comparison: number;
        listicle: number;
        guide: number;
    };
    word_count: {
        target: number;
    };
    competitors: Competitor[];
    ideas: {
        people_also_ask: { q: string }[];
    };
}

export interface ArticleStructure {
    title: string;
    sections: {
        h2: string;
        role: ContentRole;
        h3s: string[];
    }[];
}
