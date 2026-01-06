import { describe, it, expect, beforeAll } from "vitest";
import { getQuery } from "./neuronwriter";
import { getUserByOpenId, getUserQueries } from "./db";

describe("Debug NeuronWriter Score Fields", () => {
  let testQueryNeuronId: string;

  beforeAll(async () => {
    // Get test user
    const testUser = await getUserByOpenId(process.env.OWNER_OPEN_ID || "");
    if (!testUser) {
      throw new Error("Test user not found");
    }

    // Get existing queries for testing
    const queries = await getUserQueries(testUser.id);
    if (queries.length > 0) {
      testQueryNeuronId = queries[0].neuronQueryId;
    } else {
      throw new Error("No queries found for testing.");
    }
  });

  it("should inspect NeuronWriter API response for score fields", { timeout: 30000 }, async () => {
    console.log("Fetching query:", testQueryNeuronId);
    
    const response = await getQuery(testQueryNeuronId);
    
    console.log("\n=== Full API Response Keys ===");
    console.log(Object.keys(response));
    
    console.log("\n=== Score-related fields ===");
    const scoreFields = Object.entries(response).filter(([key, value]) => 
      key.toLowerCase().includes("score") || 
      key.toLowerCase().includes("content") ||
      typeof value === "number"
    );
    
    for (const [key, value] of scoreFields) {
      console.log(`${key}: ${JSON.stringify(value)}`);
    }
    
    console.log("\n=== All numeric fields ===");
    for (const [key, value] of Object.entries(response)) {
      if (typeof value === "number") {
        console.log(`${key}: ${value}`);
      }
    }
    
    // Check specific fields that might contain the score
    console.log("\n=== Checking specific score fields ===");
    console.log("content_score:", response.content_score);
    console.log("score:", response.score);
    console.log("seo_score:", response.seo_score);
    console.log("contentScore:", response.contentScore);
    
    console.log("\n=== Metrics object ===");
    console.log(JSON.stringify(response.metrics, null, 2));
    
    console.log("\n=== SERP Summary ===");
    console.log(JSON.stringify(response.serp_summary, null, 2));
    
    // Now check getContent response
    console.log("\n\n=== Checking /get-content response ===");
    const { getContent } = await import("./neuronwriter");
    const { getUserQueries, getProjectById } = await import("./db");
    const testUser = await getUserByOpenId(process.env.OWNER_OPEN_ID || "");
    const queries = await getUserQueries(testUser!.id);
    const project = await getProjectById(queries[0].projectId);
    
    const contentResponse = await getContent({
      project: project!.neuronProjectId,
      query: testQueryNeuronId,
    });
    
    console.log("\n=== Content Response Keys ===");
    console.log(Object.keys(contentResponse));
    
    console.log("\n=== Content Score fields ===");
    console.log("content_score:", contentResponse.content_score);
    console.log("score:", contentResponse.score);
    console.log("seo_score:", contentResponse.seo_score);
    
    // Check if there's a nested object with score
    for (const [key, value] of Object.entries(contentResponse)) {
      if (typeof value === "number") {
        console.log(`${key}: ${value}`);
      }
      if (typeof value === "object" && value !== null) {
        const subObj = value as Record<string, unknown>;
        for (const [subKey, subValue] of Object.entries(subObj)) {
          if (typeof subValue === "number") {
            console.log(`${key}.${subKey}: ${subValue}`);
          }
        }
      }
    }
    
    // Now check evaluateContent response
    console.log("\n\n=== Checking /evaluate-content response ===");
    const { evaluateContent } = await import("./neuronwriter");
    
    const evalResponse = await evaluateContent({
      project: project!.neuronProjectId,
      query: testQueryNeuronId,
      html: "<h1>テストタイトル</h1><p>テスト本文です。</p>",
      title: "テストタイトル",
      description: "テストディスクリプション",
    });
    
    console.log("\n=== Evaluate Response Keys ===");
    console.log(Object.keys(evalResponse));
    
    console.log("\n=== Full Evaluate Response ===");
    console.log(JSON.stringify(evalResponse, null, 2));
    
    expect(response).toBeDefined();
  });
});
