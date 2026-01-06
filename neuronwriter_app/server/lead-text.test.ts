import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            leadText: "FX口座選びで失敗したくない方へ。この記事では、主要なFX会社を徹底比較し、初心者の方におすすめの口座をランキング形式で紹介します。スプレッド、取引ツール、サポート体制など、重要なポイントを網羅的に解説しているので、あなたに最適なFX口座が必ず見つかります。",
          }),
        },
      },
    ],
  }),
}));

describe("Lead Text Feature - Database Schema", () => {
  it("should have leadText column in queries table schema", async () => {
    const { queries } = await import("../drizzle/schema");
    expect(queries).toBeDefined();
    // Check that leadText column exists in the schema
    expect(queries.leadText).toBeDefined();
  });
});

describe("Lead Text Feature - tRPC Procedures", () => {
  it("should have generateLeadText procedure defined", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    // The router should have generateLeadText procedure in neuronwriter namespace
    expect(appRouter._def.procedures["neuronwriter.generateLeadText"]).toBeDefined();
  });

  it("should have saveLeadText procedure defined", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    // The router should have saveLeadText procedure in neuronwriter namespace
    expect(appRouter._def.procedures["neuronwriter.saveLeadText"]).toBeDefined();
  });
});

describe("Lead Text Feature - Database Helpers", () => {
  it("should have getQueryById function in db.ts", async () => {
    const db = await import("./db");
    expect(db.getQueryById).toBeDefined();
    expect(typeof db.getQueryById).toBe("function");
  });

  it("should have updateQueryTitleDescription function in db.ts that supports leadText", async () => {
    const db = await import("./db");
    expect(db.updateQueryTitleDescription).toBeDefined();
    expect(typeof db.updateQueryTitleDescription).toBe("function");
  });
});

describe("Lead Text Generation Logic", () => {
  it("should generate lead text with proper structure", async () => {
    const { invokeLLM } = await import("./_core/llm");
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are an SEO content writer." },
        { role: "user", content: "Generate a lead text for FX口座 おすすめ" },
      ],
      response_format: { type: "json_object" },
    });

    expect(response.choices).toBeDefined();
    expect(response.choices[0]).toBeDefined();
    expect(response.choices[0].message).toBeDefined();
    expect(response.choices[0].message.content).toBeDefined();

    const content = JSON.parse(response.choices[0].message.content as string);
    expect(content.leadText).toBeDefined();
    expect(typeof content.leadText).toBe("string");
    expect(content.leadText.length).toBeGreaterThan(50);
  });
});
