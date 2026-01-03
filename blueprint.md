# JSON設計書ベースSEO記事生成アプリ 設計書

---

## 1. 本設計書の目的

本設計書は、**SERP分析JSONを唯一の設計書（Single Source of Truth）** として用い、
検索順位1位レベルの **長文SEO記事（約1万字以上）を安定的・再現性高く生成する** ための
アプリケーション設計を詳細に定義するものである。

対象は以下を満たす記事生成：
- キーワードごとに変化するSERP構造へ完全適応
- informational / transactional 意図の両立
- comparison / listicle 型コンテンツへの最適化
- 人的判断に依存しない自動構成・自動執筆

---

## 2. 全体アーキテクチャ概要

```
SERP設計書JSON
   ↓
① 構成決定フェーズ（Structure生成）
   ↓
② 競合Headers現実補正
   ↓
③ 本文生成フェーズ（H2単位）
   ↓
完成記事（Markdown / HTML）
```

---

## 3. 入力データ定義（SERP設計書JSON）

本アプリケーションは、以下の情報を含むJSONを入力とする。

### 3.1 基本情報
- keyword
- language
- engine

### 3.2 SERPサマリー
- top_intent
- intent_stats
- top_content_type
- content_type_stats

### 3.3 メトリクス
- word_count.target
- readability.target

### 3.4 競合情報
- competitors[].headers

### 3.5 検索疑問
- ideas.people_also_ask

このJSONは **分析結果ではなく設計書そのもの** として扱う。

---

## 4. フェーズ①：構成決定フェーズ（Structure生成）

### 4.1 目的

SERP設計書JSONを解釈し、
**記事に必要なH1 / H2 / H3構成を自動生成** する。

---

### 4.2 設計思想

- キーワードは直接評価しない
- JSONの状態のみで構成を決定
- 長文化は構造で担保する

---

### 4.3 H1生成ルール

- top_content_type に基づき主構造ワードを付与

例：
- comparison → 「比較」「おすすめ」「ランキング」

---

### 4.4 H2骨格生成ルール（comparison型）

必須role：
- introduction
- conclusion
- comparison_points
- comparison_table
- conditional_recommendation
- faq
- caution
- summary

---

### 4.5 intentによる順序補正

- informational ≥ transactional
  - introduction → conclusion
- transactional > informational
  - conclusion → introduction

FAQ・summaryは常に後方固定

---

### 4.6 listicle補正

- listicle ≥ 50 の場合
  - conclusion / conditional_recommendation にH3追加

---

### 4.7 metricsによる長文化保証

- word_count.target ≥ 10000
  - H2数 ≥ 8
  - conditional_recommendation 必須
  - FAQ複数対応

---

## 5. フェーズ②：競合Headers自動抽出ロジック

### 5.1 目的

SERP上位記事が実際に使用している見出し構造を抽出し、
構成ルールへ現実補正として注入する。

---

### 5.2 処理フロー

```
競合headers
 ↓
正規化
 ↓
分類
 ↓
頻度集計
 ↓
選別
 ↓
構成へマージ
```

---

### 5.3 正規化

- 表記揺れ統一
- 意味ベース集約

---

### 5.4 分類

- comparison_points
- conditional_recommendation
- faq
- introduction

---

### 5.5 頻度評価

- 50%以上：必須
- 30%以上：推奨
- 20%未満：除外

---

### 5.6 構成への統合

- 既存構成を破壊しない
- H3として追加注入

---

## 6. フェーズ③：本文生成フェーズ

### 6.1 基本方針

- H2単位で生成
- H3は内部ガイド
- roleが行為を制御

---

### 6.2 H2単位生成の理由

- 思考の一貫性維持
- 長文破綻防止
- 文脈分断回避

---

### 6.3 role定義

| role | 役割 |
|---|---|
| introduction | 前提説明 |
| conclusion | 結論提示 |
| comparison_points | 判断軸定義 |
| comparison_table | 事実整理 |
| conditional_recommendation | 条件別提案 |
| faq | 疑問解消 |
| caution | 失敗回避 |
| summary | 行動整理 |

---

### 6.4 文字数ガイド（レンジ指定）

| role | 文字数目安 |
|---|---|
| introduction | 1000–1500 |
| conclusion | 1200–1800 |
| comparison_points | 2000–3000 |
| comparison_table | 1800–2500 |
| conditional_recommendation | 1800–2500 |
| faq | 1000–1500 |
| caution | 600–1000 |
| summary | 300–500 |

---

### 6.5 本文生成入力仕様

各H2生成時に渡す情報：
- h2
- h3
- role
- length_guide
- global_rules
- context（前セクション要約）

---

### 6.6 生成ループ

```
for section in structure.sections:
  generate section text
  update context
```

---

### 6.7 ガードルール

- 文字数不足 → 深掘り
- 重複検知 → 視点変更
- role逸脱 → 再生成

---

## 7. 本設計の特性まとめ

- キーワード依存なし
- JSON依存設計
- 再現性100%
- 1万字以上の自然生成
- エージェント／Workflow化容易

---

## 8. 想定される実装先

- Dify Workflow
- MCP Server
- カスタムAPI（Node / Python）

---

## 9. 結論

本設計は、
**SEO記事生成を「執筆」から「構造制御」へ昇華** させるものであり、
検索順位1位を狙う長文記事を安定的に量産可能とする。

---

（設計書ここまで）

