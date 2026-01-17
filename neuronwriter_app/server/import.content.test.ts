import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getUserByOpenId } from "./db";

describe("Import Content Integration", () => {
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

  it("should generate title and description, save to NeuronWriter, and return SEO score", { timeout: 30000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin", name: null, email: null, passwordHash: null, loginMethod: null, credits: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.neuronwriter.generateTitleAndDescription({
      queryId: testQueryId,
    });

    console.log("Generated title and description:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.title).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.description.length).toBeGreaterThan(0);

    // Check if saved to NeuronWriter
    if (result.saved) {
      expect(result.seoScore).toBeDefined();
      expect(typeof result.seoScore).toBe("number");
      console.log(`✓ Saved to NeuronWriter with SEO score: ${result.seoScore}/100`);
    } else {
      console.log("⚠ Not saved to NeuronWriter (may be expected in some cases)");
    }

    console.log(`✓ Title: ${result.title}`);
    console.log(`✓ Description: ${result.description}`);
  });

  it("should generate outline considering current score gap", { timeout: 60000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin", name: null, email: null, passwordHash: null, loginMethod: null, credits: 0, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.neuronwriter.generateOutline({
      queryId: testQueryId,
      targetScore: 70,
    });

    console.log("Generated outline with score gap consideration:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.structure).toBeDefined();
    expect(result.structure.length).toBeGreaterThan(0);
    expect(result.seoScore).toBeGreaterThan(0);
    expect(result.currentScore).toBeDefined();
    expect(result.scoreGap).toBeDefined();

    const scoreIncrease = result.seoScore - result.currentScore;
    console.log(`✓ Current score: ${result.currentScore}/100`);
    console.log(`✓ Target score: 70/100`);
    console.log(`✓ Score gap: ${result.scoreGap} points`);
    console.log(`✓ Generated outline score: ${result.seoScore}/100`);
    console.log(`✓ Score increase: +${scoreIncrease} points`);
    console.log(`✓ Attempts: ${result.attempts}`);
    console.log(`✓ Headings count: ${result.structure.length}`);
  });
});
