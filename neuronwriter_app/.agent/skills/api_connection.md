---
description: API接続の正しい作法と聖域の定義
---

# API Connection Skill

このスキルは、`neuronwriter_app` プロジェクトにおけるAPI接続の正しい実装パターンを定義します。
エージェントはこのルールに従い、**勝手な書き換えを行わない**こと。

---

## 1. 認証（APIキー）の扱い方

### ルール
- **APIキーは必ず環境変数で管理する**
- コード内にAPIキーをハードコードしてはならない
- 環境変数は `server/_core/env.ts` で一元管理する

### 正しいパターン
```typescript
// server/_core/env.ts で定義
export const ENV = {
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // 他のキーもここに追加
};

// 使用時は ENV からインポート
import { ENV } from "./_core/env";
const apiKey = ENV.tavilyApiKey;
```

### 禁止パターン
```typescript
// ❌ ハードコード禁止
const API_KEY = "sk-xxxxxxxxxxxxx";

// ❌ 直接 process.env を各所で使用
const key = process.env.SOME_API_KEY; // env.ts に集約すること
```

---

## 2. エラーハンドリングの共通ルール

### ルール
- **API呼び出し前にキーの存在確認**を行う
- **HTTPステータスコードを確認**し、失敗時はエラーメッセージを含めて例外をスロー
- **JSON解析エラーを catch** する

### 正しいパターン
```typescript
export async function callExternalAPI(query: string) {
  // 1. キーの存在確認
  if (!ENV.apiKey) {
    throw new Error("API_KEY is not configured in .env");
  }

  // 2. API呼び出し
  const response = await fetch("https://api.example.com/endpoint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ENV.apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  // 3. HTTPエラー確認
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  // 4. JSON解析（try-catchは呼び出し元で対応可）
  return await response.json();
}
```

---

## 3. タイムアウトとリトライ

### 現状の規定
- **タイムアウト**: 現時点では `fetch` のデフォルト（ブラウザ/Node依存）
- **リトライ**: 現時点では未実装（将来的に検討）

### 推奨ガイドライン（将来実装時）
```typescript
// タイムアウト付きfetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ...
  });
} finally {
  clearTimeout(timeoutId);
}

// リトライロジック（将来）
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

---

## 4. 聖域（勝手に書き換えてはいけないファイル）

以下のファイルはAPI接続の**核心部分**であり、エージェントが**勝手に構造を変更してはならない**。
変更が必要な場合は、**必ずユーザーに確認**を取ること。

| ファイル | 役割 | 禁止事項 |
|---------|------|---------|
| `server/_core/env.ts` | 環境変数の一元管理 | 変数の削除、名前変更 |
| `server/_core/llm.ts` | LLM呼び出しの共通インターフェース | `invokeLLM` 関数のシグネチャ変更 |
| `server/_core/tavily.ts` | Web検索APIの共通インターフェース | `searchTavily` 関数のシグネチャ変更 |
| `server/neuronwriter.ts` | NeuronWriter API クライアント | `apiClient` の設定変更、関数削除 |

### 許可される変更
- バグ修正（エラーハンドリングの強化など）
- 新しいオプションパラメータの追加（既存パラメータはデフォルト値で互換性維持）
- console.log の追加/削除（デバッグ用）

### 禁止される変更
- 関数名の変更
- 必須パラメータの追加/変更
- 戻り値の型の破壊的変更
- 環境変数名の変更

---

## 5. 新しいAPIを追加する場合のチェックリスト

1. [ ] APIキーは `server/_core/env.ts` に追加したか？
2. [ ] キーの存在確認を呼び出し前に行っているか？
3. [ ] HTTPエラー時のエラーメッセージは適切か？
4. [ ] TypeScriptの型定義を作成したか？
5. [ ] 既存の `_core/*.ts` パターンに沿っているか？

---

## 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2026-01-16 | 初版作成 |
