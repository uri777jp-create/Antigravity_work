# NeuronWriter SEO Content Management Tool - TODO

## Database Schema
- [x] Create projects table to store NeuronWriter project references
- [x] Create queries table to store search queries and their status
- [x] Create contents table to store article content and revisions

## Backend API Integration
- [x] Implement new-query endpoint wrapper in tRPC
- [x] Implement get-query endpoint wrapper in tRPC
- [x] Implement list-projects endpoint wrapper in tRPC
- [x] Implement list-queries endpoint wrapper in tRPC
- [x] Implement import-content endpoint wrapper in tRPC
- [x] Implement get-content endpoint wrapper in tRPC
- [x] Implement evaluate-content endpoint wrapper in tRPC

## Frontend UI Components
- [x] Create project selector dropdown component
- [x] Create keyword input form for new query creation
- [x] Create query history list component
- [x] Create content recommendation display component
- [x] Create content editor component
- [x] Create SEO evaluation results display component
- [x] Create revision history viewer component

## Pages
- [x] Create Dashboard page with project overview
- [x] Create New Query page with keyword form
- [x] Create Query Details page with recommendations
- [x] Create Content Editor page
- [x] Create Query History page

## User Authentication
- [x] Link queries and contents to authenticated users
- [x] Implement user-specific data filtering

## Testing
- [x] Write vitest tests for all tRPC procedures
- [x] Test NeuronWriter API integration

## Design & Polish
- [x] Apply elegant design with consistent color palette
- [x] Implement responsive layout
- [x] Add loading states and error handling
- [x] Add success/error notifications

## Bug Fixes
- [x] Fix NeuronWriter API 401 authentication error
- [x] Verify API key configuration
- [x] Test API connection with correct credentials
- [x] Update API endpoints to use correct NeuronWriter API base URL
- [x] Change from /api/v1/ to /neuron-api/0.5/writer/
- [x] Update HTTP methods based on GAS code reference

## New Issues
- [x] Fix Create Query button not working
- [x] Review NeuronWriter API manual for correct implementation
- [x] Update new-query API endpoint and parameters

## Current Issues
- [x] Fix 403 error on /query/1 page
- [x] Debug getQueryRecommendations API call
- [x] Check get-query endpoint parameters

## Urgent Tasks
- [x] Delete test files that call actual NeuronWriter API
- [x] Remove create-query.test.ts (created 1 query)
- [x] Remove get-query.test.ts (no creation but uses real API)
- [x] Remove api-response.test.ts if it exists
- [x] Add warning comments to prevent future API calls in tests

## JSON Data History Management
- [x] Create query_snapshots table to store JSON data versions
- [x] Add database helper functions for snapshot management
- [x] Implement saveSnapshot tRPC procedure
- [x] Implement getSnapshots tRPC procedure
- [x] Implement getLatestSnapshot tRPC procedure
- [x] Add "Refresh Data" button with warning message
- [x] Display snapshot history with version numbers and dates
- [x] Show JSON data comparison between versions
- [x] Add JSON download functionality

## Bug Fix - Snapshot Save Error
- [x] Investigate database INSERT error for querySnapshots table
- [x] Check snapshotData column type (TEXT vs JSON)
- [x] Fix data serialization issue
- [ ] Test snapshot save functionality

## Feature Redesign - Query History Management
- [x] Remove Refresh Data button from QueryDetail page
- [x] Remove snapshot-related tRPC procedures (saveSnapshot, getSnapshots, getLatestSnapshot)
- [x] Remove query_snapshots table from schema
- [ ] Group queries by keyword in QueriesList page
- [ ] Show creation date for each query in the same keyword group
- [ ] Add "Create New Query with Same Keyword" button
- [ ] Implement query comparison view for same keyword queries

## Localization - Japanese UI
- [x] Translate Home page to Japanese
- [x] Translate Dashboard page to Japanese
- [x] Translate NewQuery page to Japanese
- [x] Translate QueriesList page to Japanese
- [x] Translate QueryDetail page to Japanese
- [x] Update button labels and form fields to Japanese
- [x] Update error messages and notifications to Japanese

## JSON推薦データの構造化表示機能
- [x] NeuronWriter APIレスポンスの全カテゴリーを分析
- [x] metrics、terms、ideas以外のカテゴリーも表示
- [x] 各カテゴリーを折りたたみ可能なアコーディオンUIで実装
- [x] JSONの階層構造を見やすいカード形式で表示
- [x] 数値データはグラフ化または強調表示
- [x] 配列データはテーブル形式で表示

## Bug Fix - React Rendering Error
- [x] Fix "Objects are not valid as a React child" error in QueryDetail page
- [x] Update renderQuestions function to handle object data structure
- [x] Test with actual API response data

## SERP分析の日本語化と説明追加
- [x] 英語用語（informational, listicle等）を日本語に変換
- [x] インテントとコンテンツタイプの説明文を追加
- [x] ツールチップまたは説明パネルでSERP分析の意味を解説

## タイトル・メタディスクリプション作成機能
- [x] タイトル入力フィールドと文字数カウンター実装
- [x] ディスクリプション入力フィールドと文字数カウンター実装
- [x] AI自動生成ボタンとtRPCプロシージャ実装
- [x] 推奨キーワードをバッジ表示
- [x] キーワード使用率の可視化機能
- [x] Google検索結果プレビュー機能
- [x] 「コンテンツ編集」タブを「コンテンツ作成」に変更

## Bug Fix - AI Generation Error
- [x] Fix "Cannot read properties of undefined (reading '0')" error in generateTitleAndDescription
- [x] Add proper error handling for LLM response
- [x] Test with actual query data

## Bug Fix - LLM Response Structure
- [x] Investigate actual LLM API response structure
- [x] Fix response validation logic
- [x] Simplify error handling
- [x] Test with real query data

## SEOスコア自動評価機能
- [x] タイトル・ディスクリプションをHTMLに変換してevaluate-contentに送信
- [x] evaluateTitleDescriptionプロシージャを実装
- [x] getProjectById関数をdb.tsに追加
- [x] AI生成後に自動的にSEOスコアを取得
- [x] スコアをtoast通知で表示
- [x] vitestテストを作成して機能を検証

## SEOスコア表示とリアルタイム更新機能
- [x] 横長プログレスバー + スコアカードコンポーネントを作成
- [x] スコアに応じた色分け表示（赤→オレンジ→緑）
- [x] 目標スコアマーカーをプログレスバーに表示
- [x] 文字数・キーワード使用率を表示
- [x] スコア確認ボタンを追加
- [x] リアルタイム更新機能（デバウンス処理で入力停止後2秒で自動更新）
- [x] コンテンツ作成タブにSEOスコアパネルを追加

## Bug Fix - NaN Error in SEOScoreBar
- [x] Fix "Received NaN for the `children` attribute" error
- [x] Add default values for undefined props
- [x] Add NaN防止 validation for all numeric props
- [x] Test with actual query data

## Outline Generation Feature
- [x] データベーススキーマ拡張（outlinesテーブル追加）
- [x] バックエンドAPI実装（generateOutline, evaluateOutline, getOutlinesByQuery, updateOutline）
- [x] OutlineEditorコンポーネント作成（ドラッグ&ドロップ、レベル変更、キーワード挿入）
- [x] QueryDetailページに目次生成UI追加
- [x] AI自動生成機能（LLMで目次生成、目標スコア達成まで最大3回試行）
- [x] SEOスコア評価機能（NeuronWriter API連携）
- [x] 推奨キーワード表示と挿入機能
- [x] リアルタイムスコア更新機能
- [x] vitestテスト作成（evaluateOutlineは成功）

## Improved Workflow - Import Content Integration
- [x] タイトル・ディスクリプション作成後に/import-contentで自動保存
- [x] 保存後に実際のSEOスコアを取得して表示
- [x] 目次生成時に現在のスコアとギャップを計算
- [x] 目次生成AIにスコアギャップ情報を渡して最適化
- [x] 目次保存後も/import-contentで累積スコアを更新（evaluate-contentで評価）
- [x] スコア履歴を表示（toast通知でスコア増分を表示）
- [x] 各ステップでのスコア増分を可視化

## Bug Fixes
- [x] 保存ボタンの403エラーを修正（query.keywordをquery.neuronQueryIdに変更）
- [x] 保存ボタンを押すとタイトル・ディスクリプションが消える問題を修正（DB永続化実装）
- [x] タイトル・ディスクリプションをDBに保存してリロード後も復元
- [x] 基本情報にプロジェクトIDとクエリIDを表示
- [x] import-contentでタイトル・ディスクリプションが重複してインポートされる問題を修正（title/descriptionを別パラメータで送信）
- [x] NeuronWriterからのSEOスコアが正確に読み込まれない問題を修正（evaluateContentを使用）

## Lead Text (リード文) Feature
- [x] queriesテーブルにleadTextカラムを追加
- [x] リード文のAI生成プロシージャを追加
- [x] リード文の保存プロシージャを追加
- [x] フロントエンドUIにリード文セクションを追加
- [x] リード文の推奨キーワード表示を追加

## Outline Persistence (目次永続化) Feature
- [x] 現在のoutlinesテーブルスキーマを確認
- [x] saveOutline tRPCプロシージャを実装（既存の更新または新規作成）
- [x] getOutlineByQueryId tRPCプロシージャを実装
- [x] フロントエンドで目次生成後に自動保存
- [x] ページ読み込み時にDBから目次を復元
- [x] 目次編集後の保存ボタン機能を追加
- [x] Vitestテストを作成

## Keyword Display Improvement (キーワード全表示)
- [x] タイトル推奨キーワードを全て表示
- [x] H1推奨キーワードを全て表示
- [x] H2推奨キーワードを全て表示
- [x] 基本コンテンツキーワードを全て表示
- [x] 「他○件...」の省略表示を廃止

## Competitor Analysis Layout Improvement (競合分析レイアウト改善)
- [x] 文字数・コンテンツスコア・可読性を一列に表示
- [x] 見出し数を階層構造（h1, h2, h3）で表示
- [x] スクロール可能な見出しリストを追加

## SERP Analysis Integration (SERP分析データ活用)
- [x] タイトル生成にSERP分析データ（インテント・コンテンツタイプ）を追加
- [x] ディスクリプション生成にSERP分析データを追加
- [x] リード文生成にSERP分析データを追加
- [x] 目次生成にSERP分析データを追加
- [x] フロントエンドからSERP分析データをバックエンドに送信
