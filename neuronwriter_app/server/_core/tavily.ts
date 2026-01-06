import { ENV } from "./env";

export type TavilySearchResult = {
    title: string;
    url: string;
    content: string;
    raw_content?: string;
    score: number;
};

export type TavilyResponse = {
    results: TavilySearchResult[];
    answer?: string;
    query: string;
    images?: string[];
};

export async function searchTavily(query: string, maxResults = 5): Promise<TavilyResponse> {
    if (!ENV.tavilyApiKey) {
        throw new Error("TAVILY_API_KEY is not configured");
    }

    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: ENV.tavilyApiKey,
            query,
            search_depth: "advanced", // 'basic' or 'advanced'
            include_answer: false,
            include_images: false,
            include_raw_content: false,
            max_results: maxResults,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json() as Promise<TavilyResponse>;
}
