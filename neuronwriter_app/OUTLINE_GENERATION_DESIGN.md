# 目次構成AI自動生成機能 設計書

## 概要
NeuronWriter APIの推薦データを活用して、目標SEOスコア（70ポイント）を超える目次構成をAI自動生成する機能を実装する。

## 要件

### 機能要件
1. **目次構成の自動生成**
   - NeuronWriter APIの推薦データ（キーワード、SERP分析、競合分析、コンテンツアイデア）を元にLLMで目次を生成
   - 階層構造（H2, H3）を持つ目次を生成
   - 推奨キーワードを適切に配置

2. **SEOスコア評価**
   - 生成した目次をHTMLに変換してNeuronWriter APIで評価
   - 目標スコア（70ポイント）に達するまで自動調整
   - スコアが低い場合は、キーワード追加や構成変更を提案

3. **ユーザー編集機能**
   - 生成された目次を手動で編集可能
   - 編集後もSEOスコアをリアルタイム評価
   - 見出しの追加・削除・並び替え

4. **保存と管理**
   - 生成した目次をデータベースに保存
   - 複数バージョンの履歴管理
   - 目次からの本文生成へのスムーズな移行

### 非機能要件
- レスポンス時間：目次生成は30秒以内
- ユーザビリティ：直感的なUI、ドラッグ&ドロップで並び替え
- 拡張性：将来的に本文生成機能との統合

## データ構造

### データベーススキーマ拡張
```typescript
// outlines テーブル
export const outlines = sqliteTable("outlines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  queryId: integer("query_id").notNull().references(() => queries.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  
  // 目次データ（JSON形式）
  structure: text("structure", { mode: "json" }).notNull(), // { headings: [{ level: 2, text: "見出し1", keywords: ["キーワード1"] }] }
  
  // メタデータ
  seoScore: integer("seo_score"), // 評価スコア
  wordCount: integer("word_count"), // 推定文字数
  keywordUsage: text("keyword_usage", { mode: "json" }), // キーワード使用状況
  
  // バージョン管理
  version: integer("version").notNull().default(1),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
```

### 目次構造の型定義
```typescript
interface OutlineHeading {
  id: string; // ユニークID（フロントエンドでの操作用）
  level: 2 | 3; // H2 or H3
  text: string; // 見出しテキスト
  keywords: string[]; // 使用キーワード
  order: number; // 表示順序
}

interface OutlineStructure {
  headings: OutlineHeading[];
  metadata: {
    totalKeywords: number;
    usedKeywords: string[];
    unusedKeywords: string[];
  };
}
```

## API設計

### tRPCプロシージャ

#### 1. generateOutline
```typescript
generateOutline: protectedProcedure
  .input(z.object({
    queryId: z.number(),
    targetScore: z.number().optional().default(70),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. 推薦データを取得
    // 2. LLMで目次を生成
    // 3. HTMLに変換してSEOスコア評価
    // 4. スコアが低い場合は再生成（最大3回）
    // 5. データベースに保存
    return { outline, seoScore };
  });
```

#### 2. updateOutline
```typescript
updateOutline: protectedProcedure
  .input(z.object({
    outlineId: z.number(),
    structure: z.any(), // OutlineStructure
  }))
  .mutation(async ({ input, ctx }) => {
    // 目次を更新してSEOスコアを再評価
    return { outline, seoScore };
  });
```

#### 3. getOutlinesByQuery
```typescript
getOutlinesByQuery: protectedProcedure
  .input(z.object({
    queryId: z.number(),
  }))
  .query(async ({ input, ctx }) => {
    // クエリに紐づく目次の履歴を取得
    return { outlines };
  });
```

#### 4. evaluateOutline
```typescript
evaluateOutline: protectedProcedure
  .input(z.object({
    queryId: z.number(),
    structure: z.any(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 目次をHTMLに変換してSEOスコアを評価
    return { seoScore, wordCount, keywordUsage };
  });
```

## LLMプロンプト設計

### システムプロンプト
```
あなたはSEOライティングの専門家です。与えられたキーワードと推薦データを元に、
検索エンジンで上位表示されやすい記事の目次構成を作成してください。

以下の点に注意してください：
1. 推奨キーワードを適切に見出しに配置する
2. ユーザーの検索意図（informational, transactional等）に合わせた構成にする
3. 競合記事の見出し構造を参考にする
4. H2とH3の階層構造を適切に使用する
5. 見出しは具体的で、読者の疑問に答える内容にする

出力形式：JSON
{
  "headings": [
    { "level": 2, "text": "見出しテキスト", "keywords": ["キーワード1", "キーワード2"] }
  ]
}
```

### ユーザープロンプト
```
以下のデータを元に、SEO最適化された記事の目次構成を作成してください。

【メインキーワード】
{keyword}

【推奨キーワード（使用率順）】
{top_keywords}

【検索意図】
{search_intent}

【競合記事の見出し例】
{competitor_headings}

【コンテンツアイデア】
{content_ideas}

目標：SEOスコア70ポイント以上
見出し数：H2を5-8個、各H2に対してH3を2-4個
```

## UI設計

### コンポーネント構成
```
QueryDetail.tsx
├── Tabs
│   ├── 推薦データ
│   ├── コンテンツ作成
│   │   ├── タイトル・ディスクリプション（既存）
│   │   ├── 目次構成（新規）★
│   │   │   ├── AI生成ボタン
│   │   │   ├── OutlineEditor
│   │   │   │   ├── HeadingItem（ドラッグ可能）
│   │   │   │   ├── AddHeadingButton
│   │   │   │   └── DeleteButton
│   │   │   ├── SEOScoreBar（既存コンポーネント再利用）
│   │   │   └── キーワード使用状況
│   │   └── 本文コンテンツ（既存）
│   └── SEO評価
```

### OutlineEditorコンポーネント
- ドラッグ&ドロップで見出しの並び替え
- レベル変更（H2 ⇔ H3）
- 見出しテキストのインライン編集
- キーワードバッジ表示
- 推奨キーワードのサジェスト機能

## 実装フェーズ

### Phase 1: データベーススキーマ拡張
- outlinesテーブルの作成
- マイグレーション実行

### Phase 2: バックエンドAPI実装
- generateOutlineプロシージャ
- updateOutlineプロシージャ
- evaluateOutlineプロシージャ
- LLMプロンプト最適化

### Phase 3: フロントエンドUI実装
- OutlineEditorコンポーネント
- HeadingItemコンポーネント
- ドラッグ&ドロップ機能
- SEOスコア表示統合

### Phase 4: テストと検証
- vitestでAPI動作確認
- 実際のクエリでSEOスコア70超えを検証
- UI操作のテスト

### Phase 5: チェックポイント保存
- todo.md更新
- チェックポイント保存
- ユーザーへの報告

## 成功基準
1. 生成された目次がSEOスコア70ポイント以上を達成
2. ユーザーが直感的に目次を編集できる
3. リアルタイムでSEOスコアが更新される
4. 推奨キーワードの80%以上が目次に含まれる
