import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getUserByOpenId } from "./db";

describe("Outline Generation", () => {
  let testUserId: number;
  let testQueryId: number;

  beforeAll(async () => {
    // Get test user
    const testUser = await getUserByOpenId(process.env.OWNER_OPEN_ID || "");
    if (!testUser) {
      throw new Error("Test user not found");
    }
    testUserId = testUser.id;

    // Get existing queries for testing
    const { getUserQueries } = await import("./db");
    const queries = await getUserQueries(testUserId);
    if (queries.length > 0) {
      testQueryId = queries[0].id;
    } else {
      throw new Error("No queries found for testing. Please create a query first.");
    }
  });

  it("should generate outline with SEO score", { timeout: 60000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin", name: null, email: null, passwordHash: null, loginMethod: null, credits: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.neuronwriter.generateOutline({
      queryId: testQueryId,
      targetScore: 70,
    });

    console.log("Generated outline:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.outline).toBeDefined();
    expect(result.structure).toBeDefined();
    expect(result.seoScore).toBeGreaterThan(0);
    expect(result.attempts).toBeGreaterThan(0);
    expect(result.structure.length).toBeGreaterThan(0);

    // Check heading structure
    const firstHeading = result.structure[0];
    expect(firstHeading).toHaveProperty("id");
    expect(firstHeading).toHaveProperty("level");
    expect(firstHeading).toHaveProperty("text");
    expect(firstHeading).toHaveProperty("keywords");
    expect(firstHeading).toHaveProperty("order");

    console.log(`✓ Generated ${result.structure.length} headings with SEO score: ${result.seoScore}/100`);
    console.log(`✓ Attempts: ${result.attempts}`);
  });

  it("should get outlines by query ID", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin", name: null, email: null, passwordHash: null, loginMethod: null, credits: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });

    const outlines = await caller.neuronwriter.getOutlinesByQuery({
      queryId: testQueryId,
    });

    console.log("Outlines count:", outlines.length);

    expect(outlines).toBeDefined();
    expect(Array.isArray(outlines)).toBe(true);

    if (outlines.length > 0) {
      const outline = outlines[0];
      expect(outline).toHaveProperty("id");
      expect(outline).toHaveProperty("queryId");
      expect(outline).toHaveProperty("structure");
      expect(outline).toHaveProperty("seoScore");
      console.log(`✓ Found ${outlines.length} outline(s) with score: ${outline.seoScore}/100`);
    }
  });

  it("should evaluate outline structure", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin", name: null, email: null, passwordHash: null, loginMethod: null, credits: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });

    // Create a sample outline structure
    const sampleStructure = {
      headings: [
        {
          id: "h1",
          level: 2,
          text: "FX会社の選び方",
          keywords: ["FX", "会社", "選び方"],
          order: 0,
        },
        {
          id: "h2",
          level: 3,
          text: "スプレッドで比較",
          keywords: ["スプレッド", "比較"],
          order: 1,
        },
        {
          id: "h3",
          level: 2,
          text: "おすすめFX会社ランキング",
          keywords: ["おすすめ", "FX", "会社", "ランキング"],
          order: 2,
        },
      ],
    };

    const evaluation = await caller.neuronwriter.evaluateOutline({
      queryId: testQueryId,
      structure: JSON.stringify(sampleStructure),
    });

    console.log("Evaluation result:", JSON.stringify(evaluation, null, 2));

    expect(evaluation).toBeDefined();
    expect(evaluation).toHaveProperty("content_score");
    expect(typeof evaluation.content_score).toBe("number");

    console.log(`✓ Evaluation score: ${evaluation.content_score}/100`);
  });
});
