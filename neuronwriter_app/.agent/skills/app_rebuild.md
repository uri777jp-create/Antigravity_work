---
description: neuronwriter_appの再構築に必要な設計・設定・コアロジックの完全ガイド
---

# App Rebuild Skill

このスキルは、`neuronwriter_app` を新規プロジェクトで再構築する際に必要な情報を網羅します。

---

## 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| **フロントエンド** | React | 19.2.1 |
| **ルーティング** | Wouter | 3.3.5 |
| **状態管理/API** | tRPC + TanStack Query | 11.6.0 / 5.90.2 |
| **スタイリング** | Tailwind CSS | 4.1.14 |
| **UIコンポーネント** | Radix UI + shadcn/ui | 各種 |
| **バックエンド** | Express + tRPC | 4.21.2 |
| **ORM** | Drizzle ORM | 0.44.5 |
| **データベース** | MySQL (Railway) | - |
| **ビルド** | Vite | 7.1.7 |
| **言語** | TypeScript | 5.9.3 |

---

## データベーススキーマ

### users テーブル
```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

### projects テーブル
```typescript
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  neuronProjectId: varchar("neuronProjectId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### queries テーブル
```typescript
export const queries = mysqlTable("queries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId").notNull(),
  neuronQueryId: varchar("neuronQueryId", { length: 255 }).notNull(),
  keyword: varchar("keyword", { length: 500 }).notNull(),
  language: varchar("language", { length: 10 }).notNull(),
  searchEngine: varchar("searchEngine", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "ready", "error"]).default("pending").notNull(),
  title: text("title"),
  description: text("description"),
  leadText: text("leadText"),
  seoScore: int("seoScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### contents テーブル
```typescript
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  queryId: int("queryId").notNull(),
  htmlContent: longtext("htmlContent").notNull(),
  evaluationScore: int("evaluationScore"),
  seoAnalysis: text("seoAnalysis"),
  isAutoSaved: int("isAutoSaved").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### outlines テーブル
```typescript
export const outlines = mysqlTable("outlines", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  queryId: int("queryId").notNull(),
  structure: longtext("structure").notNull(), // JSON形式
  seoScore: int("seoScore"),
  wordCount: int("wordCount"),
  keywordUsage: text("keywordUsage"), // JSON
  version: int("version").default(1).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

## 外部API連携

### NeuronWriter API

**Base URL**: `https://app.neuronwriter.com/neuron-api/0.5/writer`
**認証**: `X-API-KEY` ヘッダー

| エンドポイント | メソッド | 用途 |
|---------------|---------|------|
| `/list-projects` | POST | プロジェクト一覧取得 |
| `/new-query` | POST | 新規クエリ作成 |
| `/get-query` | POST | クエリ詳細・推奨データ取得 |
| `/list-queries` | POST | クエリ一覧取得 |
| `/import-content` | POST | コンテンツ保存（タイトル・本文） |
| `/get-content` | POST | 保存済みコンテンツ取得 |
| `/evaluate-content` | POST | SEOスコア評価 |

### Tavily API

**Base URL**: `https://api.tavily.com/search`
**認証**: `api_key` フィールド

**ファクトチェック用推奨設定**:
```typescript
{
  search_depth: "advanced",
  include_answer: true,
  include_raw_content: true,
  topic: "news",
  max_results: 5
}
```

### LLM API (OpenRouter)

**Base URL**: `https://openrouter.ai/api/v1/chat/completions`
**認証**: `Bearer` トークン

**モデル設定**:
- 通常: `x-ai/grok-4-fast`
- ファクトチェック: `deepseek/deepseek-r1`

---

## 環境変数

```env
# データベース
DATABASE_URL=mysql://user:pass@host:port/dbname

# 認証
JWT_SECRET=your_secret_key
VITE_APP_ID=your_app_id

# NeuronWriter API
X_API_KEY=n-xxxxxxxxxxxx

# Tavily API
TAVILY_API_KEY=tvly-xxxxxxxxxxxx

# LLM API (OpenRouter)
BUILT_IN_FORGE_API_KEY=sk-or-v1-xxxxxxxxxxxx
BUILT_IN_FORGE_API_URL=https://openrouter.ai/api/v1/chat/completions
LLM_MODEL=x-ai/grok-4-fast

# ファクトチェック専用
HALLUCINATION_LLM_API_KEY=sk-or-v1-xxxxxxxxxxxx
HALLUCINATION_LLM_MODEL=deepseek/deepseek-r1
```

---

## tRPC APIエンドポイント

### neuronwriter ルーター

| エンドポイント | 種別 | 用途 |
|---------------|------|------|
| `listProjects` | query | プロジェクト一覧 |
| `syncProject` | mutation | プロジェクト同期 |
| `getProjectById` | query | プロジェクト詳細 |
| `createQuery` | mutation | 新規クエリ作成 |
| `getUserQueries` | query | ユーザーのクエリ一覧 |
| `getQueryById` | query | クエリ詳細 |
| `saveContent` | mutation | コンテンツ保存 |
| `getContent` | query | コンテンツ取得 |
| `evaluateContent` | mutation | SEO評価 |
| `generateTitleAndDescription` | mutation | AI: タイトル・ディスクリプション生成 |
| `saveTitleDescription` | mutation | タイトル・ディスクリプション保存 |
| `generateLeadText` | mutation | AI: リード文生成 |
| `saveLeadText` | mutation | リード文保存 |
| `generateOutline` | mutation | AI: 目次生成 |
| `updateOutline` | mutation | 目次保存 |
| `writeSectionWithSearch` | mutation | AI: H3本文生成 |
| `writeChapterWithSearch` | mutation | AI: H2章全体生成 |
| `factCheckSection` | mutation | ファクトチェック |

---

## ページ構成

| ページ | パス | 用途 |
|-------|-----|------|
| `Home.tsx` | `/` | ランディングページ |
| `Login.tsx` | `/login` | ログイン |
| `Dashboard.tsx` | `/dashboard` | ダッシュボード |
| `NewQuery.tsx` | `/new-query` | 新規クエリ作成 |
| `QueriesList.tsx` | `/queries` | クエリ一覧 |
| `QueryDetail.tsx` | `/query/:id` | クエリ詳細（メイン編集画面） |
| `AdminDashboard.tsx` | `/admin` | 管理者ダッシュボード |

---

## 重要コンポーネント

### OutlineEditor
目次の編集・本文生成を担当する最重要コンポーネント。
- ドラッグ&ドロップで見出し順序変更
- H2/H3のレベル切り替え
- 見出しごとのAI本文生成
- 章単位の保存

### SEOScoreBar
SEOスコアをプログレスバーで表示。

### DashboardLayout
サイドバー付きレイアウト。

---

## コア機能のフロー

```
1. プロジェクト選択
   ↓
2. クエリ作成（キーワード入力）
   ↓
3. NeuronWriterがSERP分析
   ↓
4. AI: タイトル・ディスクリプション生成
   ↓
5. AI: リード文生成
   ↓
6. AI: 目次構成生成
   ↓
7. 目次編集（H2/H3調整）
   ↓
8. AI: 各章の本文生成（Web検索連動）
   ↓
9. ファクトチェック
   ↓
10. コンテンツ完成 → エクスポート
```

---

## 不要な可能性があるファイル

| ファイル | 理由 |
|---------|------|
| `ComponentShowcase.tsx` | デモ用 |
| `test-llm-*.mjs` | テスト用 |
| `update_router.js` | 一時的なスクリプト |
| `todo.md` | 開発メモ |
| `*.test.ts` | テストファイル（必要に応じて移行） |

---

## 再構築時の注意点

1. **環境変数の移行を最優先**
2. **DBスキーマは `drizzle/schema.ts` からコピー**
3. **NeuronWriter APIクライアントは忠実に再実装**
4. **プロンプトは `content_creation.md` スキルを参照**
5. **Tailwind 4の設定に注意**（v3とは異なる）

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-17 | 初版作成 |
