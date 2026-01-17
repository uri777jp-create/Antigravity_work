import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";

describe("SEO Score Evaluation", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testQueryId: number;

  beforeAll(async () => {
    // Mock context with test user
    const mockContext = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        passwordHash: null,
        loginMethod: "google",
        role: "admin" as const,
        credits: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(mockContext);

    // Get existing queries for testing
    const queries = await caller.neuronwriter.getUserQueries();
    if (queries.length > 0) {
      testQueryId = queries[0].id;
    }
  });

  it("should evaluate title and description and return SEO score", async () => {
    if (!testQueryId) {
      console.log("No test query available, skipping test");
      return;
    }

    const result = await caller.neuronwriter.evaluateTitleDescription({
      queryId: testQueryId,
      title: "【2025年最新】FX会社おすすめ比較ランキング！初心者向け口座の選び方",
      description: "FX会社選びで失敗しない！スプレッド、約定力、ツールを徹底比較。初心者でも安心の少額取引対応、デモ口座が充実したFX会社を厳選してご紹介します。",
    });

    expect(result).toBeDefined();
    console.log("SEO Evaluation Result:", JSON.stringify(result, null, 2));

    // Check if result contains expected fields
    if (result.content_score !== undefined) {
      expect(typeof result.content_score).toBe("number");
      console.log(`✓ SEO Score: ${result.content_score}/100`);
    }
  }, 30000); // 30 second timeout for API call
});
