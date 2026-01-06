import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getUserByOpenId, getQueryById } from "./db";

describe("Title and Description Persistence", () => {
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

  it("should save title and description to local DB", { timeout: 30000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const testTitle = "テストタイトル - " + Date.now();
    const testDescription = "テストディスクリプション - " + Date.now();

    const result = await caller.neuronwriter.saveTitleDescription({
      queryId: testQueryId,
      title: testTitle,
      description: testDescription,
    });

    console.log("Save result:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.title).toBe(testTitle);
    expect(result.description).toBe(testDescription);
    expect(result.saved).toBe(true);

    // Verify it was saved to the database
    const updatedQuery = await getQueryById(testQueryId);
    expect(updatedQuery).toBeDefined();
    expect(updatedQuery?.title).toBe(testTitle);
    expect(updatedQuery?.description).toBe(testDescription);

    console.log(`✓ Title saved: ${updatedQuery?.title}`);
    console.log(`✓ Description saved: ${updatedQuery?.description}`);
    console.log(`✓ SEO Score: ${updatedQuery?.seoScore}`);
  });

  it("should retrieve saved title and description on query fetch", { timeout: 10000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const query = await caller.neuronwriter.getQueryById({ queryId: testQueryId });

    expect(query).toBeDefined();
    expect(query?.title).toBeDefined();
    expect(query?.description).toBeDefined();

    console.log(`✓ Retrieved title: ${query?.title}`);
    console.log(`✓ Retrieved description: ${query?.description}`);
    console.log(`✓ Retrieved SEO score: ${query?.seoScore}`);
  });
});
