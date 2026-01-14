
import { invokeLLM } from "./_core/llm";
import { searchTavily } from "./_core/tavily";
import { ENV } from "./_core/env";

export interface FactCheckClaim {
    originalText: string;
    claim: string;
    status: "verified" | "contradicted" | "unverified";
    reasoning: string;
    sources: { title: string; url: string }[];
}

export interface FactCheckResult {
    overallScore: number; // 0-100
    claims: FactCheckClaim[];
    summary: string;
}

// 1. Claim Extraction
async function extractClaims(text: string): Promise<string[]> {
    const prompt = `あなたはファクトチェックの専門家です。以下のテキストから、事実確認が必要な具体的な「主張（Claim）」を抽出してください。
「〜と思われる」や「〜という意見がある」などの主観的表現は除外し、数値、日付、イベント、機能の有無など、客観的に検証可能な事実のみを抽出してください。
JSON形式の文字列配列として出力してください。

テキスト:
"${text}"

出力例:
["2024年にSoraが一般公開された", "GPT-4のコンテキストウィンドウは128kトークンである"]
`;

    const response = await invokeLLM({
        model: ENV.hallucinationLlmModel || undefined, // Use specific model if set, else default
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        maxTokens: 1024,
        apiKey: ENV.hallucinationLlmApiKey,
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") return [];

    try {
        const json = JSON.parse(content);
        // Handle specific keys if LLM wraps the array, or just the array itself
        if (Array.isArray(json)) return json;
        if (json.claims && Array.isArray(json.claims)) return json.claims;
        // Fallback: try to find array in object values
        return Object.values(json).find(v => Array.isArray(v)) as string[] || [];
    } catch (e) {
        console.error("Failed to parse extracted claims:", e);
        return [];
    }
}

// 2. Verification Search (Tavily)
async function verifyClaimWithTavily(claim: string): Promise<{ searchResults: string; sources: { title: string; url: string }[] }> {
    try {
        const searchResponse = await searchTavily(claim, { maxResults: 3 });
        const searchResults = searchResponse.results
            .map((r, i) => `[ID:${i + 1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
            .join("\n---\n");

        const sources = searchResponse.results.map(r => ({ title: r.title, url: r.url }));
        return { searchResults, sources };
    } catch (e) {
        console.error(`Tavily search failed for claim: ${claim}`, e);
        return { searchResults: "Search failed.", sources: [] };
    }
}

// 3. Cross-Reference Reasoning
async function reasonVerification(claim: string, searchResults: string): Promise<{ status: "verified" | "contradicted" | "unverified"; reasoning: string }> {
    // Use a reasoning-capable model if available, otherwise default
    // Ideally, use a model like "deepseek-r1" or similar if ENV allows, otherwise standard model
    const reasoningModel = ENV.hallucinationLlmModel || ENV.llmModel; // Fallback to standard model if not set

    const prompt = `あなたは厳格なファクトチェッカーです。
以下の「対象の主張」について、「検索結果」のみを根拠として真偽を判定してください。
自身の知識は使わず、必ず検索結果に基づいて判断してください。

対象の主張:
"${claim}"

検索結果:
${searchResults}

以下のJSON形式で出力してください:
{
  "status": "verified" | "contradicted" | "unverified",
  "reasoning": "判定の根拠（検索結果のIDを引用して説明してください）"
}
- "verified": 検索結果が主張を明確に裏付けている場合。
- "contradicted": 検索結果が主張と矛盾している、または主張が誤りであることを示している場合。
- "unverified": 検索結果に関連情報が含まれていない、または判断がつかない場合。
`;

    const response = await invokeLLM({
        model: reasoningModel,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        maxTokens: 2048,
        apiKey: ENV.hallucinationLlmApiKey,
        // Thinking parameter is handled inside invokeLLM if supported
    });

    const content = response.choices[0].message.content;
    if (typeof content !== "string") return { status: "unverified", reasoning: "Parser error" };

    try {
        const json = JSON.parse(content);
        return {
            status: json.status || "unverified",
            reasoning: json.reasoning || "No reasoning provided",
        };
    } catch (e) {
        return { status: "unverified", reasoning: "JSON parse error" };
    }
}

export async function checkTextFactuality(text: string): Promise<FactCheckResult> {
    // 1. Extract
    const claims = await extractClaims(text);
    if (claims.length === 0) {
        return { overallScore: 100, claims: [], summary: "検証可能な事実上の主張が見つかりませんでした。" };
    }

    const results: FactCheckClaim[] = [];

    // TODO: Use Promise.all for parallel execution but be mindful of rate limits
    for (const claim of claims) {
        // 2. Search
        const { searchResults, sources } = await verifyClaimWithTavily(claim);

        // 3. Reason
        const { status, reasoning } = await reasonVerification(claim, searchResults);

        results.push({
            originalText: text, // In a more complex version, we might map claim back to substring index
            claim,
            status,
            reasoning,
            sources
        });
    }

    // Calculate generic score
    const total = results.length;
    const verified = results.filter(r => r.status === "verified").length;
    const contradicted = results.filter(r => r.status === "contradicted").length;
    // unverified counts as neutral or slight penalty depending on policy. Let's say neutral.

    // Score implementation: (Verified / Total) * 100? Or penalty for contradictions?
    // Let's do: 100 - (Contradicted / Total * 100) - (Unverified / Total * 20)
    let score = 100;
    if (total > 0) {
        const penaltyPerContradiction = 100 / total;
        const penaltyPerUnverified = 20 / total; // Smaller penalty for not knowing
        score = Math.max(0, 100 - (contradicted * penaltyPerContradiction) - (results.filter(r => r.status === "unverified").length * penaltyPerUnverified));
    }

    const summary = `検証した${total}件の主張のうち、${verified}件が確認され、${contradicted}件の矛盾が見つかりました。`;

    return {
        overallScore: Math.round(score),
        claims: results,
        summary
    };
}
