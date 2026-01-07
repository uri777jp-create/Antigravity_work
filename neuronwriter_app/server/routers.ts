import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  neuronwriter: router({
    // Project management
    listProjects: publicProcedure.query(async () => {
      const { listProjects } = await import("./neuronwriter");
      return await listProjects();
    }),

    getUserProjects: protectedProcedure.query(async ({ ctx }) => {
      const { getUserProjects } = await import("./db");
      return await getUserProjects(ctx.user.id);
    }),

    syncProject: protectedProcedure
      .input(
        z.object({
          neuronProjectId: z.string(),
          name: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createProject } = await import("./db");
        const result = await createProject({
          userId: ctx.user.id,
          neuronProjectId: input.neuronProjectId,
          name: input.name,
        });
        return { success: true, projectId: result[0].insertId };
      }),

    getProjectById: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getDb } = await import("./db");
        const { projects } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return undefined;
        const result = await db.select().from(projects).where(eq(projects.id, input.projectId)).limit(1);
        const project = result.length > 0 ? result[0] : undefined;
        if (!project || project.userId !== ctx.user.id) {
          throw new Error("Project not found or unauthorized");
        }
        return project;
      }),

    // Query management
    createQuery: protectedProcedure
      .input(
        z.object({
          projectId: z.number(),
          neuronProjectId: z.string(),
          keyword: z.string(),
          language: z.string(),
          searchEngine: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createNewQuery } = await import("./neuronwriter");
        const { createQuery } = await import("./db");

        const result = await createNewQuery({
          project: input.neuronProjectId,
          keyword: input.keyword,
          language: input.language,
          engine: input.searchEngine,
        });

        const dbQuery = await createQuery({
          userId: ctx.user.id,
          projectId: input.projectId,
          neuronQueryId: result.query || input.keyword,
          keyword: input.keyword,
          language: input.language,
          searchEngine: input.searchEngine,
          status: "pending",
        });

        return { success: true, queryId: dbQuery.insertId, neuronQueryId: result.query, neuronResult: result };
      }),

    getUserQueries: protectedProcedure.query(async ({ ctx }) => {
      const { getUserQueries } = await import("./db");
      return await getUserQueries(ctx.user.id);
    }),

    getQueryById: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }
        return query;
      }),

    getQueryRecommendations: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const { getQuery } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        // Use the neuronQueryId which is the actual query ID from NeuronWriter API
        const result = await getQuery(query.neuronQueryId);

        // Update status if ready
        if (result.status === "ready") {
          const { updateQueryStatus } = await import("./db");
          await updateQueryStatus(input.queryId, "ready");
        }

        return result;
      }),

    listQueriesFromNeuron: protectedProcedure
      .input(
        z.object({
          neuronProjectId: z.string(),
          status: z.enum(["ready", "pending", "error"]).optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const { listQueries } = await import("./neuronwriter");
        return await listQueries({
          project: input.neuronProjectId,
          status: input.status,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Content management
    saveContent: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          htmlContent: z.string(),
          neuronProjectId: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const { importContent } = await import("./neuronwriter");
        const { createContent } = await import("./db");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        // Save to NeuronWriter
        const neuronResult = await importContent({
          project: input.neuronProjectId,
          query: query.neuronQueryId,
          html: input.htmlContent,
        });

        // Save to local database
        await createContent({
          userId: ctx.user.id,
          queryId: input.queryId,
          htmlContent: input.htmlContent,
          isAutoSaved: 0,
        });

        return { success: true, neuronResult };
      }),

    getContent: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          neuronProjectId: z.string(),
          includeAutosave: z.boolean().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const { getContent } = await import("./neuronwriter");
        const { getContentsByQueryId } = await import("./db");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const neuronContent = await getContent({
          project: input.neuronProjectId,
          query: query.keyword,
          include_autosave: input.includeAutosave,
        });

        const localRevisions = await getContentsByQueryId(input.queryId);

        return { neuronContent, localRevisions };
      }),

    evaluateContent: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          neuronProjectId: z.string(),
          htmlContent: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const { evaluateContent } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const result = await evaluateContent({
          project: input.neuronProjectId,
          query: query.keyword,
          html: input.htmlContent,
        });

        return result;
      }),

    // AI generation
    generateTitleAndDescription: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById } = await import("./db");
        const { getQuery } = await import("./neuronwriter");
        const { invokeLLM } = await import("./_core/llm");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const recommendations = await getQuery(query.neuronQueryId);

        // 推奨データからキーワードを抽出
        const titleKeywords = recommendations.terms?.title?.slice(0, 15).map((t: any) => `${t.t}(使用率${t.usage_pc}%)`).join(", ") || "";
        const descKeywords = recommendations.terms?.desc?.slice(0, 15).map((t: any) => `${t.t}(使用率${t.usage_pc}%)`).join(", ") || "";

        // SERP分析データを詳細に取得
        const serpSummary = recommendations.serp_summary || {};
        const intents = serpSummary.intents || [];
        const contentTypes = serpSummary.content_types || [];

        // インテント情報を整形
        const topIntent = intents.length > 0 ? intents[0] : { type: 'informational', percentage: 0 };
        const intentInfo = intents.map((i: any) => `${i.type || i.name}(${i.percentage || i.pc}%)`).join(", ") || "情報提供型";

        // コンテンツタイプ情報を整形
        const topContentType = contentTypes.length > 0 ? contentTypes[0] : { type: 'article', percentage: 0 };
        const contentTypeInfo = contentTypes.map((c: any) => `${c.type || c.name}(${c.percentage || c.pc}%)`).join(", ") || "記事";

        const prompt = `以下のSERP分析データと推奨キーワードを元に、検索上位表示を狙えるタイトルとメタディスクリプションを生成してください。

## ターゲットキーワード
${query.keyword}

## SERP分析結果（検索上位ページの傾向）

### 検索意図（インテント）
${intentInfo}
→ 主要な検索意図は「${topIntent.type || topIntent.name || '情報提供型'}」です。この意図に合った表現を使用してください。

### コンテンツタイプ
${contentTypeInfo}
→ 主要なコンテンツタイプは「${topContentType.type || topContentType.name || '記事'}」です。この形式に適したタイトル構成にしてください。

## タイトル推奨キーワード（使用率順）
${titleKeywords}

## ディスクリプション推奨キーワード（使用率順）
${descKeywords}

## 生成ルール

### タイトルの要件
- 30-60文字
- 使用率の高い推奨キーワードを優先的に含める
- 検索意図に合った表現：
  - 情報提供型: 「解説」「紹介」「ガイド」「まとめ」
  - 取引型: 「おすすめ」「人気」「比較」「ランキング」
  - ナビゲーション型: ブランド名やサービス名を含める
- コンテンツタイプに合った構成：
  - リスト型記事: 「○選」「○つ」などの数字を含める
  - 比較記事: 「比較」「徹底比較」を含める
  - 教育コンテンツ: 「初心者向け」「入門」を含める
- 「【】」や「｜」を使って視認性を高める

### ディスクリプションの要件
- 80-160文字
- 推奨キーワードを自然に含める
- ユーザーの悩みやニーズに共感する導入
- 記事を読むメリットを明確に伝える
- クリックを促すCTA要素を含める

必ず以下のJSON形式で返答してください：
{
  "title": "タイトル文字列",
  "description": "ディスクリプション文字列"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたはSEOライティングの専門家です。ユーザーのクリック率を高める魅力的なタイトルとディスクリプションを作成します。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_object",
          },
        });

        // LLMレスポンスの検証
        if (!response?.choices?.[0]?.message?.content) {
          throw new Error("LLMからの応答が不正です");
        }

        const content = response.choices[0].message.content;
        const contentString = typeof content === "string" ? content : JSON.stringify(content);

        let result;
        try {
          result = JSON.parse(contentString);
        } catch (e) {
          throw new Error(`LLMレスポンスのJSON解析に失敗しました: ${contentString.substring(0, 100)}`);
        }

        // タイトルとディ        // NeuronWriterに保存（titleとdescriptionは別パラメータで送信）
        const { getProjectById } = await import("./db");
        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        const { importContent } = await import("./neuronwriter");
        // 本文は空のプレースホルダー（APIはhtmlがurlが必須）
        const importResult = await importContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          title: result.title || "",
          description: result.description || "",
          html: "<p></p>",
        })        // 保存後のスコアを取得（evaluateContentを使用）
        let seoScore = 0;
        if (importResult.status === "ok") {
          const { evaluateContent } = await import("./neuronwriter");
          // タイトルとディスクリプションのみで評価
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html: "<p></p>",
            title: result.title || "",
            description: result.description || "",
          });
          seoScore = Math.round(evaluation.content_score || 0);
        }

        // ローカルDBにも保存
        const { updateQueryTitleDescription } = await import("./db");
        await updateQueryTitleDescription(input.queryId, {
          title: result.title || "",
          description: result.description || "",
          seoScore,
        });

        return {
          title: result.title || "",
          description: result.description || "",
          seoScore,
          saved: importResult.status === "ok",
        };
      }),

    // タイトル・ディスクリプションを手動保存
    saveTitleDescription: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          title: z.string(),
          description: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById, updateQueryTitleDescription } = await import("./db");
        const { importContent, getQuery } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        // NeuronWriterに保存（titleとdescriptionは別パラメータで送信）
        // 本文は空のプレースホルダー（APIはhtmlがurlが必須）
        const importResult = await importContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          title: input.title,
          description: input.description,
          html: "<p></p>",
        });

        // 保存後のスコアを取得（evaluateContentを使用）
        let seoScore = 0;
        if (importResult.status === "ok") {
          const { evaluateContent } = await import("./neuronwriter");
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html: "<p></p>",
            title: input.title,
            description: input.description,
          });
          seoScore = Math.round(evaluation.content_score || 0);
        }

        // ローカルDBに保存
        await updateQueryTitleDescription(input.queryId, {
          title: input.title,
          description: input.description,
          seoScore,
        });

        return {
          title: input.title,
          description: input.description,
          seoScore,
          saved: importResult.status === "ok",
        };
      }),

    evaluateTitleDescription: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          title: z.string(),
          description: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById } = await import("./db");
        const { evaluateContent } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        // タイトルとディスクリプションをHTMLに変換
        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${input.title}</title>
  <meta name="description" content="${input.description}">
</head>
<body>
  <h1>${input.title}</h1>
  <p>${input.description}</p>
</body>
</html>
`;

        // NeuronWriter APIで評価
        const evaluation = await evaluateContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          html,
        });

        return evaluation;
      }),

    // Lead text (リード文) generation
    generateLeadText: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById, updateQueryTitleDescription } = await import("./db");
        const { getQuery, evaluateContent, importContent } = await import("./neuronwriter");
        const { invokeLLM } = await import("./_core/llm");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        const recommendations = await getQuery(query.neuronQueryId);

        // 推奨データからキーワードを抽出（本文用）
        const articleKeywords = recommendations.terms?.h?.slice(0, 20).map((t: any) => `${t.t}(使用率${t.avgTopTen || t.usage_pc || 0}%)`).join(", ") || "";

        // SERP分析データを詳細に取得
        const serpSummary = recommendations.serp_summary || {};
        const intents = serpSummary.intents || [];
        const contentTypes = serpSummary.content_types || [];

        // インテント情報を整形
        const topIntent = intents.length > 0 ? intents[0] : { type: 'informational', percentage: 0 };
        const intentInfo = intents.map((i: any) => `${i.type || i.name}(${i.percentage || i.pc}%)`).join(", ") || "情報提供型";

        // コンテンツタイプ情報を整形
        const topContentType = contentTypes.length > 0 ? contentTypes[0] : { type: 'article', percentage: 0 };
        const contentTypeInfo = contentTypes.map((c: any) => `${c.type || c.name}(${c.percentage || c.pc}%)`).join(", ") || "記事";

        const prompt = `以下のSERP分析データと推奨キーワードを元に、検索上位表示を狙えるリード文（導入文）を生成してください。

## ターゲットキーワード
${query.keyword}

## 既存コンテンツ
- タイトル: ${query.title || "未設定"}
- ディスクリプション: ${query.description || "未設定"}

## SERP分析結果（検索上位ページの傾向）

### 検索意図（インテント）
${intentInfo}
→ 主要な検索意図は「${topIntent.type || topIntent.name || '情報提供型'}」です。

### コンテンツタイプ
${contentTypeInfo}
→ 主要なコンテンツタイプは「${topContentType.type || topContentType.name || '記事'}」です。

## 本文推奨キーワード（使用率順）
${articleKeywords}

## リード文の生成ルール

### 基本要件
- 200-400文字程度
- 推奨キーワードを自然に含める
- タイトルやディスクリプションと重複しない内容

### 検索意図に合わせた書き方
- 情報提供型: 読者の疑問に答える導入、「この記事では〜を解説します」
- 取引型: 読者の悩みに共感、「おすすめを紹介」「比較して解説」
- ナビゲーション型: サービスの特徴やメリットを簡潔に

### コンテンツタイプに合わせた書き方
- リスト型記事: 「この記事では○つの○○を紹介します」
- 比較記事: 「徹底比較して、あなたに最適な○○を見つけましょう」
- 教育コンテンツ: 「初心者の方でもわかるように解説します」

### 構成
1. 読者の悩みやニーズに共感する導入
2. 記事を読むメリットを明確に伝える
3. 記事の内容を簡潔に予告する

必ず以下のJSON形式で返答してください：
{
  "leadText": "リード文の内容"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたはSEOライティングの専門家です。読者の興味を引きつけ、記事を読み進めたくなるリード文を作成します。" },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_object",
          },
        });

        if (!response?.choices?.[0]?.message?.content) {
          throw new Error("LLMからの応答が不正です");
        }

        const content = response.choices[0].message.content;
        const contentString = typeof content === "string" ? content : JSON.stringify(content);

        let result;
        try {
          result = JSON.parse(contentString);
        } catch (e) {
          throw new Error(`LLMレスポンスのJSON解析に失敗しました: ${contentString.substring(0, 100)}`);
        }

        // NeuronWriterに保存（リード文を含むHTMLを送信）
        const leadHtml = `<p>${result.leadText || ""}</p>`;
        const importResult = await importContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          title: query.title || "",
          description: query.description || "",
          html: leadHtml,
        });

        // スコアを取得
        let seoScore = 0;
        if (importResult.status === "ok") {
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html: leadHtml,
            title: query.title || "",
            description: query.description || "",
          });
          seoScore = Math.round(evaluation.content_score || 0);
        }

        // ローカルDBに保存
        await updateQueryTitleDescription(input.queryId, {
          leadText: result.leadText || "",
          seoScore,
        });

        return {
          leadText: result.leadText || "",
          seoScore,
          saved: importResult.status === "ok",
        };
      }),

    // Save lead text manually
    saveLeadText: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          leadText: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById, updateQueryTitleDescription } = await import("./db");
        const { importContent, evaluateContent } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        // NeuronWriterに保存
        const leadHtml = `<p>${input.leadText}</p>`;
        const importResult = await importContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          title: query.title || "",
          description: query.description || "",
          html: leadHtml,
        });

        // スコアを取得
        let seoScore = 0;
        if (importResult.status === "ok") {
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html: leadHtml,
            title: query.title || "",
            description: query.description || "",
          });
          seoScore = Math.round(evaluation.content_score || 0);
        }

        // ローカルDBに保存
        await updateQueryTitleDescription(input.queryId, {
          leadText: input.leadText,
          seoScore,
        });

        return {
          leadText: input.leadText,
          seoScore,
          saved: importResult.status === "ok",
        };
      }),

    // Outline generation
    generateOutline: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          targetScore: z.number().optional().default(70),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById, createOutline } = await import("./db");
        const { getQuery, evaluateContent } = await import("./neuronwriter");
        const { invokeLLM } = await import("./_core/llm");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        // 推薦データを取得
        const recommendations = await getQuery(query.neuronQueryId);

        // 現在のスコアをevaluateContentで取得
        let currentScore = 0;
        if (query.title || query.description) {
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html: "<p></p>",
            title: query.title || "",
            description: query.description || "",
          });
          currentScore = Math.round(evaluation.content_score || 0);
        }
        const scoreGap = input.targetScore - currentScore;

        // キーワード情報を抽出（使用率付き）
        const topKeywords = recommendations.terms?.h?.slice(0, 25).map((t: any) => `${t.t}(使用率${t.avgTopTen || t.usage_pc || Math.round(t.p * 100)}%)`).join("、") || "";
        const h2Keywords = recommendations.terms?.h2?.slice(0, 20).map((t: any) => `${t.t}(使用率${t.avgTopTen || t.usage_pc || 0}%)`).join("、") || "";

        // SERP分析データを詳細に取得
        const serpSummary = recommendations.serp_summary || {};
        const intents = serpSummary.intents || [];
        const contentTypes = serpSummary.content_types || [];

        // インテント情報を整形
        const topIntent = intents.length > 0 ? intents[0] : { type: 'informational', percentage: 0 };
        const intentInfo = intents.map((i: any) => `${i.type || i.name}(${i.percentage || i.pc}%)`).join(", ") || "情報提供型";

        // コンテンツタイプ情報を整形
        // コンテンツタイプ情報を整形
        const topContentType = contentTypes.length > 0 ? contentTypes[0] : { type: 'article', percentage: 0 };
        const secondContentType = contentTypes.length > 1 ? contentTypes[1] : null;

        let contentTypeInfo = "";
        let contentTypeInstruction = "";

        // ハイブリッド判定（1位と2位が両方とも重要、あるいは僅差の場合）
        const isHybridType = secondContentType && (secondContentType.percentage || secondContentType.pc || 0) >= 30;

        if (isHybridType) {
          const type1Name = topContentType.type || topContentType.name || '記事';
          const type2Name = secondContentType.type || secondContentType.name || '記事';
          contentTypeInfo = `主要なタイプ: ${type1Name}(${topContentType.percentage || topContentType.pc}%), 次点: ${type2Name}(${secondContentType.percentage || secondContentType.pc}%)`;
          contentTypeInstruction = `主要なコンテンツタイプは「${type1Name}」と「${type2Name}」の傾向が強く出ています。**両方の要素を取り入れたハイブリッドな構成**にしてください（例: ${type1Name}の網羅性と${type2Name}の読みやすさを両立）。`;
        } else {
          contentTypeInfo = contentTypes.map((c: any) => `${c.type || c.name}(${c.percentage || c.pc}%)`).join(", ") || "記事";
          contentTypeInstruction = `主要なコンテンツタイプは「${topContentType.type || topContentType.name || '記事'}」です。この形式に適した構成にしてください。`;
        }

        // 文字数ターゲットによる追加指示
        const targetWordCount = recommendations.metrics?.word_count?.target || 0;
        if (targetWordCount >= 5000) {
          contentTypeInstruction += `\nまた、目標文字数が${targetWordCount}文字と非常に多いため、**網羅的な「完全ガイド」のような深堀りした構成**にしてください。H3見出しを多めに配置し、トピックを徹底的に解説する必要があります。`;
        } else if (targetWordCount >= 3000) {
          contentTypeInstruction += `\n目標文字数が${targetWordCount}文字と多めであるため、情報の網羅性を意識してH2・H3見出しを構成してください。`;
        }

        // 競合記事の見出し構成を抽出
        const competitorOutlines = recommendations.serp?.slice(0, 5).map((item: any, idx: number) => {
          const headings = item.headings || [];
          const headingList = headings.slice(0, 10).map((h: any) => {
            const level = h.level || h.tag?.replace('h', '') || 2;
            const indent = level === 2 ? '' : level === 3 ? '  ' : '    ';
            return `${indent}h${level}: ${h.text || h.content || ''}`;
          }).join('\n');
          return `【競合${idx + 1}: ${item.title || 'タイトルなし'}】\n${headingList || '見出しデータなし'}`;
        }).join("\n\n") || "データなし";

        // コンテンツアイデアを抽出
        const contentIdeas = recommendations.questions?.slice(0, 15).map((q: any) => {
          if (typeof q === "string") return q;
          if (typeof q === "object" && q.q) return q.q;
          return "";
        }).filter(Boolean).join("\n") || "データなし";

        const prompt = `以下のSERP分析データと推奨キーワードを元に、検索上位表示を狙える記事の目次構成を作成してください。

## ターゲットキーワード
${query.keyword}

## SERP分析結果（検索上位ページの傾向）

### 検索意図（インテント）
${intentInfo}
→ 主要な検索意図は「${topIntent.type || topIntent.name || '情報提供型'}」です。

### コンテンツタイプ
${contentTypeInfo}
→ ${contentTypeInstruction}

## 推奨キーワード（使用率順）

### 本文推奨キーワード
${topKeywords}

### H2見出し推奨キーワード
${h2Keywords}

## 競合記事の見出し構成（参考）
${competitorOutlines}

## よくある質問・コンテンツアイデア
${contentIdeas}

## 現在の状況
- 現在のSEOスコア: ${currentScore}ポイント
- 目標SEOスコア: ${input.targetScore}ポイント
- 必要なスコア増加: ${scoreGap}ポイント

## 目次構成の生成ルール

### 基本要件
- 目標SEOスコア: ${input.targetScore}ポイント以上を達成する目次構成
- 現在のスコア${currentScore}点から${scoreGap}点を追加で獲得する必要があります
- スコアギャップが大きい場合（40点以上）: H2を7-10個、各H2にH3を3-5個作成
- スコアギャップが中程度の場合（20-40点）: H2を5-7個、各H2にH3を2-4個作成
- スコアギャップが小さい場合（20点未満）: H2を4-6個、各H2にH3を1-3個作成

### 検索意図に合わせた構成
- 情報提供型: 「とは」「方法」「解説」「ポイント」などの見出し
- 取引型: 「おすすめ」「ランキング」「比較」「選び方」などの見出し
- ナビゲーション型: サービス名、機能、料金などの見出し

### コンテンツタイプに合わせた構成
- リスト型記事: 「○選」「○つの方法」など数字を含む見出し
- 比較記事: 「比較表」「メリット・デメリット」などの見出し
- 教育コンテンツ: 「初心者向け」「基本」「入門」などの見出し

### その他の要件
- 推奨キーワードを自然に見出しに含める（使用率が高いキーワードを優先）
- 競合記事の見出し構成を参考に、より充実した構成にする
- 読者の疑問に答える具体的な見出しにする
- よくある質問を見出しに反映させる

必ず以下のJSON形式で返答してください：
{
  "headings": [
    { "level": 2, "text": "見出しテキスト", "keywords": ["キーワード1", "キーワード2"] },
    { "level": 3, "text": "小見出しテキスト", "keywords": ["キーワード3"] }
  ]
}`;

        // LLMで目次を生成（最大3回試行）
        let bestOutline: any = null;
        let bestScore = 0;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts && bestScore < input.targetScore) {
          attempts++;

          const response = await invokeLLM({
            messages: [
              { role: "system", content: "あなたはSEOライティングの専門家です。検索エンジンで上位表示されやすい記事の目次構成を作成します。" },
              { role: "user", content: prompt },
            ],
            response_format: {
              type: "json_object",
            },
          });

          if (!response?.choices?.[0]?.message?.content) {
            throw new Error("LLMからの応答が不正です");
          }

          const content = response.choices[0].message.content;
          const contentString = typeof content === "string" ? content : JSON.stringify(content);

          let outline;
          try {
            outline = JSON.parse(contentString);
          } catch (e) {
            throw new Error(`LLMレスポンスのJSON解析に失敗しました: ${contentString.substring(0, 100)}`);
          }

          // 目次をHTMLに変換
          const headingsHtml = outline.headings.map((h: any) => {
            const tag = `h${h.level}`;
            return `<${tag}>${h.text}</${tag}>`;
          }).join("\n");

          const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${query.keyword}</title>
</head>
<body>
${headingsHtml}
</body>
</html>
`;

          // SEOスコアを評価
          const evaluation = await evaluateContent({
            project: project.neuronProjectId,
            query: query.neuronQueryId,
            html,
          });

          const score = evaluation.content_score || 0;

          if (score > bestScore) {
            bestScore = score;
            bestOutline = {
              headings: outline.headings.map((h: any, idx: number) => ({
                id: `h${idx}`,
                level: h.level,
                text: h.text,
                keywords: h.keywords || [],
                order: idx,
              })),
              evaluation,
            };
          }

          // 目標スコアに達したら終了
          if (score >= input.targetScore) {
            break;
          }
        }

        if (!bestOutline) {
          throw new Error("目次の生成に失敗しました");
        }

        // データベースに保存
        const structure = JSON.stringify({ headings: bestOutline.headings });
        const keywordUsage = JSON.stringify(bestOutline.evaluation.terms || {});

        const savedOutline = await createOutline({
          userId: ctx.user.id,
          queryId: input.queryId,
          structure,
          seoScore: Math.round(bestScore),
          wordCount: bestOutline.evaluation.word_count || 0,
          keywordUsage,
          version: 1,
          isActive: 1,
        });

        return {
          outline: savedOutline,
          structure: bestOutline.headings,
          seoScore: Math.round(bestScore),
          currentScore,
          scoreGap,
          attempts,
        };
      }),

    getOutlinesByQuery: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { getQueryById, getOutlinesByQueryId } = await import("./db");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const outlines = await getOutlinesByQueryId(input.queryId);
        return outlines;
      }),

    updateOutline: protectedProcedure
      .input(
        z.object({
          outlineId: z.number(),
          structure: z.string(), // JSON string
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getOutlineById, updateOutline, getQueryById, getProjectById } = await import("./db");
        const { importContent } = await import("./neuronwriter");

        const outline = await getOutlineById(input.outlineId);
        if (!outline || outline.userId !== ctx.user.id) {
          throw new Error("Outline not found or unauthorized");
        }

        await updateOutline(input.outlineId, {
          structure: input.structure,
        });

        // NeuronWriterへ同期
        try {
          const query = await getQueryById(outline.queryId);
          if (query) {
            const project = await getProjectById(query.projectId);
            if (project) {
              const parsed = JSON.parse(input.structure);
              // 目次をHTMLタグに変換
              const headingsHtml = parsed.headings.map((h: any) => {
                const tag = `h${h.level}`;
                let html = `<${tag}>${h.text}</${tag}>`;
                if (h.content) {
                  html += `\n${h.content}`;
                }
                return html;
              }).join("\n");

              // リード文がある場合はHTMLの先頭に追加
              let fullHtml = headingsHtml;
              if (query.leadText) {
                // リード文はプレーンテキストかHTMLか不明だが、安全のためpタグで囲む（改行はbrに変換など簡易的）
                // 既存実装のleadTextはTextarea入力なので改行コードが含まれる可能性あり
                const formattedLead = query.leadText.split('\n').map(line => line.trim()).filter(Boolean).map(line => `<p>${line}</p>`).join('');
                fullHtml = `${formattedLead}\n${headingsHtml}`;
              }

              // Import用パラメータ構築
              // タイトル・ディスクリプションが設定されていれば送る
              const importParams: any = {
                project: project.neuronProjectId,
                query: query.neuronQueryId,
                html: fullHtml,
              };

              if (query.title) {
                importParams.title = query.title;
              }
              if (query.description) {
                importParams.description = query.description;
              }

              await importContent(importParams);
            }
          }
        } catch (e) {
          console.error("NeuronWriter sync failed:", e);
          // Sync失敗はログに出すが、ローカル保存は成功しているのでエラーにはしない
        }

        return { success: true };
      }),

    evaluateOutline: protectedProcedure
      .input(
        z.object({
          queryId: z.number(),
          structure: z.string(), // JSON string
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { getQueryById, getProjectById } = await import("./db");
        const { evaluateContent } = await import("./neuronwriter");

        const query = await getQueryById(input.queryId);
        if (!query || query.userId !== ctx.user.id) {
          throw new Error("Query not found or unauthorized");
        }

        const project = await getProjectById(query.projectId);
        if (!project) {
          throw new Error("Project not found");
        }

        // 構造をパース
        const parsed = JSON.parse(input.structure);
        const headingsHtml = parsed.headings.map((h: any) => {
          const tag = `h${h.level}`;
          return `<${tag}>${h.text}</${tag}>`;
        }).join("\n");

        const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${query.keyword}</title>
</head>
<body>
${headingsHtml}
</body>
</html>
`;

        // SEOスコアを評価
        const evaluation = await evaluateContent({
          project: project.neuronProjectId,
          query: query.neuronQueryId,
          html,
        });

        return evaluation;
      }),

    // Snapshot management removed - each new query gets a new ID

    writeSectionWithSearch: protectedProcedure
      .input(
        z.object({
          heading: z.string(),
          keywords: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { searchTavily } = await import("./_core/tavily");
        const { invokeLLM } = await import("./_core/llm");

        // 1. TavilyでWeb検索
        // 見出しそのままだと検索意図がブレる可能性があるため、少し補足する
        const searchQuery = `${input.heading} ${input.keywords?.join(" ") || ""} 解説`;
        console.log(`Searching Web for: ${searchQuery}`);

        let searchContext = "";
        try {
          const searchResults = await searchTavily(searchQuery, 5);
          searchContext = searchResults.results
            .map((r, i) => `【出典${i + 1}】${r.title} (${r.url})\n${r.content}`)
            .join("\n\n");
        } catch (e) {
          console.error("Tavily search failed:", e);
          throw new Error("Web検索に失敗しました。APIキー設定を確認してください。");
        }

        // 2. LLMで執筆
        const prompt = `あなたはプロのWebライターです。
以下の「見出し」について、提供された「Web検索結果」**のみ**を情報源として、事実に即した記事セクションを執筆してください。

## 執筆対象の見出し
${input.heading}

## 推奨キーワード（文脈に自然に含めてください）
${input.keywords?.join(", ") || "特になし"}

## Web検索結果（これを唯一の事実情報として扱うこと）
${searchContext}

## 執筆ルール
1. **検索結果に含まれない情報は一切書かないでください**（ハルシネーション防止）。
2. 情報が不足している場合は、「検索結果からは詳細が不明ですが」と断りを入れるか、書ける範囲で記述してください。
3. 読者に語りかけるような、丁寧かつ読みやすい文体（です・ます調）で書いてください。
4. 適切なHTMLタグ（<p>, <ul>, <li>, <strong>など）を使用して構造化してください（hタグは不要）。
5. 300文字〜600文字程度で簡潔にまとめてください。
6. 出典への言及（例：「出典1によると〜」）は文脈上自然であれば含めても良いですが、必須ではありません。

出力はHTML形式の本文のみを返してください。`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたは事実に基づき正確な記事を書くライターです。" },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        let content = "";
        if (typeof rawContent === "string") {
          content = rawContent;
        } else if (Array.isArray(rawContent)) {
          content = rawContent
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        }

        // マークダウンのコードブロックが含まれていたら除去
        const cleanContent = content.replace(/```html/g, "").replace(/```/g, "").trim();

        return { content: cleanContent, references: searchContext };
      }),

    writeChapterWithSearch: protectedProcedure
      .input(
        z.object({
          h2: z.object({
            heading: z.string(),
            keywords: z.array(z.string()).optional(),
          }),
          h3s: z.array(z.object({
            heading: z.string(),
            keywords: z.array(z.string()).optional(),
          })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { searchTavily } = await import("./_core/tavily");
        const { invokeLLM } = await import("./_core/llm");

        // 1. TavilyでWeb検索（章全体を網羅する検索）
        // H2とH3のキーワードを組み合わせて検索クエリを作成
        const mainKeywords = input.h2.keywords?.join(" ") || "";
        const subKeywords = input.h3s.map(h => h.heading).join(" "); // H3の見出し自体をキーワードとして扱う
        const searchQuery = `${input.h2.heading} ${mainKeywords} ${subKeywords} 解説`;
        console.log(`Searching Web for Chapter: ${searchQuery}`);

        let searchContext = "";
        let referenceLinks: { title: string; url: string }[] = [];

        try {
          // 章単位なので少し多めに取得
          const searchResults = await searchTavily(searchQuery, 7);
          referenceLinks = searchResults.results.map(r => ({ title: r.title, url: r.url }));
          searchContext = searchResults.results
            .map((r, i) => `【出典${i + 1}】${r.title} (${r.url})\n${r.content}`)
            .join("\n\n");
        } catch (e) {
          console.error("Tavily search failed:", e);
          throw new Error("Web検索に失敗しました。APIキー設定を確認してください。");
        }

        // 2. LLMで執筆
        const h3Structure = input.h3s.map(h => `- ${h.heading} (キーワード: ${h.keywords?.join(", ") || "なし"})`).join("\n");

        const prompt = `あなたはSEOに強いプロのWebライターです。
以下の「章構成」と「取材メモ（Web検索結果）」を元に、読者の悩みを解決する高品質な記事の1章（Chapter）を執筆してください。

## 執筆対象の章構成
### 大見出し (H2)
${input.h2.heading}
(キーワード: ${input.h2.keywords?.join(", ") || "なし"})

### 小見出し構成 (H3)
${h3Structure}

## 取材メモ（Web検索結果）
${searchContext}

## 執筆指示
1. **「取材メモ」の内容をそのままコピペせず、あなたの言葉で咀嚼・再構成して執筆してください**。
2. 複数の情報源からの情報を統合し、一つの読み物として成立させてください。
3. H2直下の「導入文」と、各H3の「本文」を明確に分けて執筆してください。
4. **JSON形式**で出力してください。

## 出力フォーマット（JSON）
必ず以下のJSON形式で返答してください：
{
  "h2_intro": "H2直下に配置する導入文（HTML形式、<p>など使用）",
  "h3_contents": [
    {
      "heading": "H3の見出しテキスト（入力のH3と一致させてください）",
      "content": "このH3に対応する本文（HTML形式、<h3>タグは含めないでください。<p><ul><li>などで構成）"
    },
    ...
  ]
}
`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "あなたは読者に寄り添う記事を書くプロのライターです。指定されたJSONフォーマットで確実に出力してください。" },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" }
        });

        const rawContent = response.choices[0]?.message?.content;

        let result = { h2_intro: "", h3_contents: [] };
        try {
          const contentString = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
          result = JSON.parse(contentString);
        } catch (e) {
          console.error("Failed to parse LLM JSON response:", e);
          // フォールバック: 生テキストをH2イントロに入れておく
          result = { h2_intro: typeof rawContent === "string" ? rawContent : "", h3_contents: [] };
        }

        const referencesText = referenceLinks.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}`).join("\n\n");

        return {
          content: result.h2_intro,
          h3Contents: result.h3_contents,
          references: referencesText
        };
      }),

    factCheckSection: protectedProcedure
      .input(
        z.object({
          heading: z.string(),
          content: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { searchTavily } = await import("./_core/tavily");
        const { invokeLLM } = await import("./_core/llm");

        // 1. LLMで検証すべき事実（クレーム）を抽出
        const extractionPrompt = `以下の記事セクションから、ファクトチェック（事実確認）が必要な具体的な主張、数値、固有名詞、日付などを抽出してください。

## 記事セクション
見出し: ${input.heading}
本文: ${input.content}

## 抽出ルール
- 検証可能な客観的な事実のみを抽出してください。
- 一般常識や主観的な意見は除外してください。
- 最大5つまで抽出してください。
- JSON形式で出力してください: { "claims": ["主張1", "主張2", ...] }`;

        const extractionResponse = await invokeLLM({
          messages: [{ role: "user", content: extractionPrompt }],
          response_format: { type: "json_object" }
        });

        const extractionContent = extractionResponse.choices[0]?.message?.content;
        let claims: string[] = [];
        try {
          const parsed = JSON.parse(typeof extractionContent === "string" ? extractionContent : JSON.stringify(extractionContent));
          claims = parsed.claims || [];
        } catch (e) {
          console.error("Fact check extraction failed:", e);
          return { results: [] };
        }

        if (claims.length === 0) {
          return { results: [] };
        }

        // 2. Tavilyで裏取り検索
        const searchQuery = `${input.heading} ${claims.join(" ")}`;
        console.log(`Fact Check Search: ${searchQuery}`);

        let searchContext = "";
        try {
          const searchResults = await searchTavily(searchQuery, 5);
          searchContext = searchResults.results
            .map((r, i) => `【出典${i + 1}】${r.title} (${r.url})\n${r.content}`)
            .join("\n\n");
        } catch (e) {
          console.error("Fact check search failed:", e);
          // 検索失敗時は検証不能として返す
          return { results: claims.map(c => ({ claim: c, status: "unverified", reason: "検索に失敗しました" })) };
        }

        // 3. LLMで事実検証
        const verificationPrompt = `あなたは厳格なファクトチェッカーです。
以下の「検証対象の主張」が、「検索結果」と整合しているか判定してください。

## 検証対象の主張
${claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## 検索結果（証拠）
${searchContext}

## 判定ルール
- **Verified (検証OK)**: 検索結果に明確な証拠があり、主張が正しい。
- **Contradicted (矛盾)**: 検索結果と矛盾している、または誤りである。
- **Unverified (検証不能)**: 検索結果からは判断できない、情報が見つからない。

## 出力フォーマット（JSON）
{
  "results": [
    {
      "claim": "主張テキスト",
      "status": "verified" | "contradicted" | "unverified",
      "reason": "判定理由（簡潔に）",
      "sourceUrl": "根拠となる出典URL（あれば）"
    },
    ...
  ]
}`;

        const verificationResponse = await invokeLLM({
          messages: [{ role: "system", content: "あなたは客観的なファクトチェッカーです。" }, { role: "user", content: verificationPrompt }],
          response_format: { type: "json_object" }
        });

        const verificationContent = verificationResponse.choices[0]?.message?.content;
        let results = [];
        try {
          const parsed = JSON.parse(typeof verificationContent === "string" ? verificationContent : JSON.stringify(verificationContent));
          results = parsed.results || [];
        } catch (e) {
          console.error("Fact check verification failed:", e);
          return { results: [] };
        }

        return { results };
      }),
  }),
});

export type AppRouter = typeof appRouter;
