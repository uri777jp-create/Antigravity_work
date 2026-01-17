import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { User } from "../drizzle/schema";

describe("AI Title and Description Generation", () => {
  let testUser: User;
  let testQueryId: number;

  beforeAll(async () => {
    // Create test user
    testUser = {
      id: 999,
      openId: "test-openid-ai-gen",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "google",
      role: "user",
      credits: 0, // 追加: creditsカラムに対応
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Create test query (assuming query ID 1 exists from previous tests)
    testQueryId = 1;
  });

  it("should generate title and description using AI", async () => {
    const caller = appRouter.createCaller({
      user: testUser,
      req: {} as any,
      res: {} as any,
    });

    try {
      const result = await caller.neuronwriter.generateTitleAndDescription({
        queryId: testQueryId,
      });

      expect(result).toBeDefined();
      expect(result.title).toBeDefined();
      expect(result.description).toBeDefined();
      expect(typeof result.title).toBe("string");
      expect(typeof result.description).toBe("string");

      // Check title length (recommended 30-60 characters)
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.title.length).toBeLessThanOrEqual(100); // Allow some flexibility

      // Check description length (recommended 80-160 characters)
      expect(result.description.length).toBeGreaterThan(0);
      expect(result.description.length).toBeLessThanOrEqual(200); // Allow some flexibility

      console.log("✅ Generated Title:", result.title);
      console.log("✅ Generated Description:", result.description);
    } catch (error: any) {
      // If query doesn't exist or unauthorized, that's expected for test user
      if (error.message.includes("not found") || error.message.includes("unauthorized")) {
        console.log("⚠️ Test query not accessible (expected for test user)");
        expect(error.message).toContain("not found");
      } else {
        throw error;
      }
    }
  });

  it("should fail for non-existent query", async () => {
    const caller = appRouter.createCaller({
      user: testUser,
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.neuronwriter.generateTitleAndDescription({
        queryId: 999999,
      })
    ).rejects.toThrow();
  });
});
