import { ENV } from "./env";

export interface ToolTavilySearchResult {
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    score?: number;
    published_date?: string;
}

export interface ToolTavilySearchResponse {
    query: string;
    follow_up_questions?: string[];
    answer?: string;
    images?: string[];
    results: ToolTavilySearchResult[];
    response_time: number;
}

export async function searchTavily(query: string, options: { maxResults?: number; includeAnswer?: boolean } = {}): Promise<ToolTavilySearchResponse> {
    const apiKey = ENV.tavilyApiKey;
    if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured in .env");
    }

    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "basic",
            include_answer: options.includeAnswer ?? false,
            include_raw_content: false,
            max_results: options.maxResults ?? 3,
            // topic: "general", // "news" is also available
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API search failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return (await response.json()) as ToolTavilySearchResponse;
}
