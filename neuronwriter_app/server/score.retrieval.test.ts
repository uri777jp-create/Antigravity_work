import { describe, it, expect, beforeAll } from "vitest";
import { evaluateContent, getQuery } from "./neuronwriter";
import { getUserByOpenId, getUserQueries, getProjectById } from "./db";

describe("Score Retrieval via evaluateContent", () => {
  let testQueryNeuronId: string;
  let testProjectNeuronId: string;

  beforeAll(async () => {
    const testUser = await getUserByOpenId(process.env.OWNER_OPEN_ID || "");
    if (!testUser) {
      throw new Error("Test user not found");
    }

    const queries = await getUserQueries(testUser.id);
    if (queries.length === 0) {
      throw new Error("No queries found for testing.");
    }

    testQueryNeuronId = queries[0].neuronQueryId;
    const project = await getProjectById(queries[0].projectId);
    if (!project) {
      throw new Error("Project not found");
    }
    testProjectNeuronId = project.neuronProjectId;
  });

  it("should return content_score from evaluateContent", { timeout: 30000 }, async () => {
    // Test with a realistic title and description
    const testTitle = "【2025年最新】FX会社おすすめ比較ランキング！初心者にも人気の選び方と紹介";
    const testDescription = "FX会社選びに迷ったら必見！主要なFX会社を徹底比較し、初心者の方におすすめの口座を紹介します。スワップポイント、取引単位、手数料など、あなたのトレードスタイルに合ったFX会社の選び方と人気ランキングを解説。";

    const evaluation = await evaluateContent({
      project: testProjectNeuronId,
      query: testQueryNeuronId,
      html: "<p></p>",
      title: testTitle,
      description: testDescription,
    });

    console.log("Evaluation response:", JSON.stringify(evaluation, null, 2));
    console.log("Content score:", evaluation.content_score);

    expect(evaluation).toHaveProperty("content_score");
    expect(typeof evaluation.content_score).toBe("number");
    // With a good title and description, score should be > 0
    expect(evaluation.content_score).toBeGreaterThanOrEqual(0);
  });

  it("should return higher score with more keyword-rich content", { timeout: 30000 }, async () => {
    // Get recommendations to understand what keywords are expected
    const recommendations = await getQuery(testQueryNeuronId);
    
    // Extract top keywords
    const topKeywords = recommendations.terms?.h?.slice(0, 10).map((t: any) => t.t) || [];
    console.log("Top keywords:", topKeywords);

    // Create content with keywords
    const keywordRichTitle = `【2025年最新】FX会社おすすめ比較ランキング！初心者にも人気の証券会社選び方`;
    const keywordRichDescription = `FX初心者の方必見！主要なFX会社を徹底比較し、最新の人気ランキング形式で紹介します。スワップポイント、取引単位、手数料など、あなたに合ったFX会社の選び方を解説。口座開設前に知っておきたい情報が満載です。`;
    const keywordRichHtml = `
      <h2>FX会社を徹底比較！失敗しない選び方とおすすめランキング</h2>
      <p>FX初心者の方必見！主要なFX会社を徹底比較し、最新の人気ランキング形式で紹介します。</p>
      <h3>なぜFX会社の比較が必要なのか？</h3>
      <p>FX会社によってスプレッド、スワップポイント、取引単位が異なります。</p>
      <h2>FX会社比較の最重要ポイント5選</h2>
      <h3>【手数料・コスト】スプレッドの狭さと取引手数料を比較</h3>
      <p>取引コストを抑えるためには、スプレッドが狭いFX会社を選ぶことが重要です。</p>
    `;

    const evaluation = await evaluateContent({
      project: testProjectNeuronId,
      query: testQueryNeuronId,
      html: keywordRichHtml,
      title: keywordRichTitle,
      description: keywordRichDescription,
    });

    console.log("Keyword-rich content score:", evaluation.content_score);

    expect(evaluation.content_score).toBeGreaterThan(0);
    // With keyword-rich content, score should be meaningful
    console.log(`✓ Score with keyword-rich content: ${evaluation.content_score}`);
  });
});
