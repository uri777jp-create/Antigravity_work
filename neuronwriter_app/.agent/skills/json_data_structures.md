---
description: NeuronWriter_APPで使用する主要なJSONデータ構造の定義
---

# JSON Data Structures

このスキルは、アプリ内で使用される主要なJSONデータ構造を定義します。

## サンプルファイル一覧

| ファイル | キーワード | 検索意図 | コンテンツタイプ | 競合数 |
|---------|-----------|---------|----------------|--------|
| `sample.json` | Dify Windows ローカル | informational (100%) | blog-post (96%) | 28件 |
| `sample1.json` | AI 画像生成 おすすめ | informational (100%) | **listicle** (81%) | 32件 |
| `sample2.json` | Python 独学 ロードマップ | informational (100%) | guide (100%) | 28件 |
| `sample3.json` | ChatGPT 料金プラン 比較 | informational (100%) | comparison (90%) | 30件 |

---

## 1. NeuronWriter API レスポンス（get-query）

NeuronWriter APIから取得される推奨データの完全な構造。

### トップレベル構造
```json
{
  "ideas": { ... },           // コンテンツアイデア
  "competitors": [ ... ],     // 競合サイト分析（最大30件）
  "metrics": { ... },         // 目標指標
  "terms": { ... },           // 推奨キーワード（構造化）
  "terms_txt": { ... },       // 推奨キーワード（テキスト形式）
  "status": "ready",          // ステータス
  "keyword": "検索キーワード", // 分析対象キーワード
  "language": "Japanese",     // 言語
  "engine": "google.co.jp",   // 検索エンジン
  "project": "プロジェクトID",
  "query": "クエリID",
  "serp_summary": { ... },    // SERP分析結果
  "query_url": "https://app.neuronwriter.com/analysis/view/...",
  "share_url": "https://app.neuronwriter.com/analysis/share/...",
  "readonly_url": "https://app.neuronwriter.com/analysis/content-preview/..."
}
```

---

### ideas（アイデア提案）

コンテンツ作成のためのアイデアと質問を提供。

```json
{
  "suggest_questions": [],         // サジェスト質問（通常は空配列）
  "people_also_ask": [             // 「他の人はこちらも質問」
    { "q": "質問テキスト" }
  ],
  "topic_matrix": {                // トピックマトリクス（重要度付き質問）
    "質問テキスト": { "importance": 10 }  // importance: 1-10
  },
  "content_questions": []          // コンテンツ質問（通常は空配列）
}
```

#### topic_matrix の特徴
- **importance（重要度）**: 1-10のスケール
- 重要度が高い質問（8-10）は記事の見出しとして使用推奨
- 3つのサンプルでは平均10個程度の質問が含まれる

---

### competitors（競合分析）

検索上位の競合サイトの詳細分析データ。

```json
[
  {
    "rank": 1,                      // 検索順位
    "url": "https://競合ページURL",
    "title": "ページタイトル",
    "desc": "メタディスクリプション",
    "headers": [                    // 見出し構成（重要！）
      ["h1", "H1見出しテキスト"],
      ["h2", "H2見出しテキスト"],
      ["h3", "H3見出しテキスト"]
    ],
    "content_score": 54,            // コンテンツスコア (0-100)
    "readability": 24,              // 読みやすさスコア (低いほど読みやすい)
    "word_count": 1402,             // 文字数
    "content_len": 3547             // コンテンツ長
  }
]
```

#### 競合分析の統計値（3サンプル比較）

| 指標 | sample.json | sample2.json | sample3.json |
|------|-------------|--------------|--------------|
| 競合数 | 28件 | 28件 | 30件 |
| 平均文字数 | ~2,000 | ~4,000 | ~3,500 |
| 平均スコア | ~45 | ~55 | ~55 |
| 平均読みやすさ | ~35 | ~28 | ~28 |

---

### metrics（目標指標）

記事作成時の目標値。

```json
{
  "word_count": { 
    "median": 2147,      // 競合の中央値
    "target": 2147       // 目標値
  },
  "readability": { 
    "median": 39,        // 競合の中央値
    "target": 39         // 目標値
  }
}
```

#### 3サンプルの目標値比較

| サンプル | 目標文字数 | 目標読みやすさ |
|---------|-----------|---------------|
| Dify | 2,147 | 39 |
| Python ロードマップ | 4,068 | 26 |
| ChatGPT 料金 | 5,102 | 27 |

---

### terms（推奨キーワード）

コンテンツに含めるべき推奨キーワードの詳細分析。

```json
{
  "title": [                        // タイトル用キーワード
    { "t": "キーワード", "usage_pc": 50 }
  ],
  "desc": [                         // ディスクリプション用
    { "t": "キーワード", "usage_pc": 30 }
  ],
  "h1": [                           // H1見出し用
    { "t": "キーワード", "usage_pc": 40 }
  ],
  "h2": [                           // H2見出し用
    { "t": "キーワード", "usage_pc": 50 }
  ],
  "content_basic": [                // 本文用（基本キーワード）
    { 
      "t": "キーワード",
      "usage_pc": 100,              // 競合での使用率
      "sugg_usage": [2, 7]          // 推奨使用回数 [最小, 最大]
    }
  ],
  "content_extended": [             // 本文用（拡張キーワード）
    { "t": "キーワード", "usage_pc": 0, "sugg_usage": [1, 1] }
  ],
  "entities": [                     // 関連エンティティ
    {
      "t": "Docker",                // エンティティ名
      "importance": 75.5,           // 重要度
      "relevance": 0.755,           // 関連性
      "confidence": 5.89,           // 信頼度
      "links": [                    // 参照リンク
        ["wikipedia", "http://ja.wikipedia.org/wiki/Docker"]
      ]
    }
  ]
}
```

#### フィールド説明

| フィールド | 説明 | 例 |
|-----------|------|-----|
| `t` | キーワードテキスト | "python" |
| `usage_pc` | 競合での使用率（%） | 100 = 全競合が使用 |
| `sugg_usage` | 推奨使用回数 `[最小, 最大]` | [3, 10] |
| `importance` | エンティティの重要度 | 75.5 |
| `relevance` | 関連性スコア（0-1） | 0.755 |
| `confidence` | 信頼度 | 5.89 |

---

### terms_txt（テキスト形式キーワード）

LLMプロンプトに直接使用できるテキスト形式。

```json
{
  "title": "python\nロードマップ\n学習\n独学",
  "desc_title": "python\nロードマップ\n学習\n記事\n独学",
  "h1": "python\nロードマップ\n学習\n独学",
  "h2": "python\n学習\nロードマップ\nまとめ",
  "content_basic": "python\n学習\nロードマップ\n独学\n...",
  "content_basic_w_ranges": "python: 28-96x\n学習: 17-51x\n...",
  "content_extended": "メリット\n年間",
  "content_extended_w_ranges": "メリット: 1-8x\n年間: 1x",
  "entities": "Python\nプログラミング\nプログラミング言語\n..."
}
```

---

### serp_summary（SERP分析）

検索結果の傾向分析。

```json
{
  "top_intent": "informational",    // 主要検索意図
  "intent_stats": {                 // 意図別割合
    "informational": 100,
    "navigational": 7.1,
    "transactional": 0,
    "commercial": 0
  },
  "top_content_type": "blog-post",  // 主要コンテンツタイプ
  "content_type_stats": {           // タイプ別割合
    "guide": 82.1,
    "blog-post": 96.4,
    "comparison": 50.0,
    "educational": 100,
    "video": 7.1
  }
}
```

#### 検索意図（Intent）の種類

| 意図 | 日本語 | 説明 |
|------|--------|------|
| informational | 情報収集型 | 知識や情報を求める |
| navigational | ナビゲーション型 | 特定サイトへのアクセス |
| transactional | 取引型 | 購入・ダウンロード等 |
| commercial | 商業調査型 | 製品比較・レビュー |

#### コンテンツタイプの種類

| タイプ | 日本語 | 説明 |
|--------|--------|------|
| guide | ガイド記事 | 手順や方法を解説 |
| blog-post | ブログ記事 | 一般的なブログ形式 |
| comparison | 比較記事 | 製品・サービスの比較 |
| **listicle** | リスト記事 | 「〇選」「おすすめ10選」形式 |
| educational | 教育コンテンツ | 学習向けコンテンツ |
| video | 動画 | YouTube等の動画 |
| product-page | 製品ページ | 商品紹介ページ |
| landing-page | LP | ランディングページ |
| tool | ツール | オンラインツール |
| news | ニュース | ニュース記事 |
| review | レビュー | 製品レビュー |
| short-answer | 短答 | Q&Aサイト等 |
| social-media | SNS | ソーシャルメディア |

---

## 2. LLM出力フォーマット

### タイトル・ディスクリプション
```json
{
  "title": "30-60文字のタイトル",
  "description": "80-160文字のディスクリプション"
}
```

### リード文
```json
{
  "leadText": "200-400文字のリード文"
}
```

### 目次構成（Outline）
```json
{
  "headings": [
    {
      "id": "h0",
      "level": 2,
      "text": "見出しテキスト",
      "keywords": ["キーワード1", "キーワード2"],
      "order": 0
    }
  ]
}
```

### 本文生成（Chapter Writing）
```json
{
  "h2_intro": "<p>H2直下の導入文</p>",
  "h3_contents": [
    { "heading": "H3見出し", "content": "<p>本文</p>" }
  ]
}
```

---

## 3. ファクトチェック結果

```json
{
  "overallScore": 85,
  "claims": [
    {
      "claim": "主張テキスト",
      "status": "verified | contradicted | unverified",
      "reasoning": "判定理由",
      "sources": [{ "title": "出典", "url": "..." }],
      "tavilyAnswer": "検索結果回答"
    }
  ],
  "summary": "検証結果の要約"
}
```

---

## 4. DB保存用構造

### Outline（outlines テーブル）
```json
{
  "structure": "{\"headings\":[...]}",
  "seoScore": 72,
  "wordCount": 3500,
  "keywordUsage": "{\"キーワード\":回数}",
  "version": 1,
  "isActive": 1
}
```

---

## 5. ユーザー認証（Context User）

```typescript
{
  id: number,
  openId: string,
  name: string | null,
  email: string | null,
  passwordHash: string | null,
  loginMethod: string | null,
  role: "user" | "admin",
  credits: number,
  createdAt: Date,
  updatedAt: Date,
  lastSignedIn: Date
}
```

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-17 | 3つのサンプルJSONから詳細な構造を抽出・更新 |
| 2026-01-17 | 検索意図・コンテンツタイプの種類一覧を追加 |
| 2026-01-17 | 各指標の比較表を追加 |
