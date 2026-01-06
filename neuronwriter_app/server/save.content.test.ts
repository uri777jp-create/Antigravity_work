import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getUserByOpenId } from "./db";

describe("Save Content", () => {
  let testUserId: number;
  let testQueryId: number;
  let testNeuronProjectId: string;

  beforeAll(async () => {
    // Get test user
    const testUser = await getUserByOpenId(process.env.OWNER_OPEN_ID || "");
    if (!testUser) {
      throw new Error("Test user not found");
    }
    testUserId = testUser.id;

    // Get existing queries for testing
    const { getUserQueries, getProjectById } = await import("./db");
    const queries = await getUserQueries(testUserId);
    if (queries.length > 0) {
      testQueryId = queries[0].id;
      const project = await getProjectById(queries[0].projectId);
      if (project) {
        testNeuronProjectId = project.neuronProjectId;
      }
    } else {
      throw new Error("No queries found for testing. Please create a query first.");
    }
  });

  it("should save content to NeuronWriter using neuronQueryId", { timeout: 30000 }, async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, openId: process.env.OWNER_OPEN_ID || "", role: "admin" },
      req: {} as any,
      res: {} as any,
    });

    const testHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>テストタイトル</title>
  <meta name="description" content="テストディスクリプション">
</head>
<body>
  <h1>テストタイトル</h1>
  <p>テストコンテンツです。</p>
</body>
</html>`;

    const result = await caller.neuronwriter.saveContent({
      queryId: testQueryId,
      neuronProjectId: testNeuronProjectId,
      htmlContent: testHtml,
    });

    console.log("Save content result:", JSON.stringify(result, null, 2));

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.neuronResult).toBeDefined();
    
    console.log(`✓ Content saved successfully`);
    console.log(`✓ NeuronWriter response status: ${result.neuronResult?.status || "unknown"}`);
  });
});
