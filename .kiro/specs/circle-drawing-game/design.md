# 設計文書

## 概要

円描画ゲームは、HTML5 Canvas APIとJavaScriptを使用したシングルページアプリケーション（SPA）として実装されます。タッチイベントを処理し、リアルタイムで描画を追跡し、数学的アルゴリズムを使用して円の品質を評価してスコアを計算します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────┐
│           ブラウザ環境               │
├─────────────────────────────────────┤
│  UI Layer (HTML/CSS)                │
│  ├─ ゲーム画面                      │
│  ├─ スコア表示                      │
│  └─ フィードバック表示              │
├─────────────────────────────────────┤
│  Game Engine (JavaScript)          │
│  ├─ GameController                 │
│  ├─ DrawingEngine                  │
│  ├─ ScoreCalculator                │
│  └─ UIManager                      │
├─────────────────────────────────────┤
│  Canvas API                        │
│  ├─ タッチイベント処理              │
│  ├─ 描画レンダリング               │
│  └─ アニメーション                 │
└─────────────────────────────────────┘
```

### 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **描画**: HTML5 Canvas API
- **イベント処理**: Touch Events API, Pointer Events API
- **アニメーション**: RequestAnimationFrame API
- **レスポンシブ**: CSS Media Queries, Viewport Meta Tag
- **PWA**: Web App Manifest, Service Worker API
- **アイコン**: SVG/PNG形式の複数サイズアイコン

## コンポーネントとインターフェース

### 1. GameController

ゲーム全体の状態管理とコンポーネント間の調整を行います。

```javascript
class GameController {
  constructor()
  startGame()
  endGame()
  resetGame()
  updateScore(score)
  getCurrentState()
}
```

### 2. DrawingEngine

タッチ入力の処理と描画パスの管理を行います。

```javascript
class DrawingEngine {
  constructor(canvas)
  startDrawing(x, y, timestamp)
  continueDrawing(x, y, timestamp)
  endDrawing(timestamp)
  getDrawingPath()
  clearCanvas(clearHistory)
  onDrawingComplete(path) // 描画完了時のコールバック
}
```

### 3. ScoreCalculator

円の品質を評価してスコアを計算します。

```javascript
class ScoreCalculator {
  calculateCircleQuality(path) // 0-100点、小数点以下3桁まで計算
  calculateTotalScore(qualityScore) // 品質スコアから最終スコアを計算
  calculateCompleteScore(path) // 包括的なスコアデータを返す
  getQualityLevel(qualityScore) // 品質レベルの判定
}
```

### 4. UIManager

ユーザーインターフェースの更新と視覚的フィードバックを管理します。

```javascript
class UIManager {
  initialize() // UI要素を初期化
  showResultModal(scoreData, circleImageData) // 結果モーダルを表示
  hideResultModal() // 結果モーダルを非表示
  updateScoreDisplay(scoreData) // スコア表示を更新
  showScoreBreakdown(breakdown) // スコア内訳を10段階評価で表示
  drawCirclePreview(circleImageData) // プレビューキャンバスに円を描画（理想円と中心点を含む）
  updateEvaluationMessage(scoreData) // 評価メッセージを更新
  formatScore(value, decimals = 3) // スコアを指定桁数でフォーマット
  shareDirectly() // 結果を直接シェア（モーダル内容を含む画像を生成）
  generateScreenshotForShare() // シェア用スクリーンショットを生成（10段階評価を含む）
  clearFeedback() // フィードバックをクリア
}
```

## データモデル

### DrawingPath

```javascript
{
  points: [
    { x: number, y: number, timestamp: number }
  ],
  startTime: number,
  endTime: number,
  isComplete: boolean
}
```

### ScoreData

```javascript
{
  qualityScore: number,      // 0-100（小数点以下3桁）
  totalScore: number,        // 最終スコア（整数）
  timestamp: number,         // スコア計算時刻（ミリ秒）
  pathId: number | null,     // 描画パスID
  pointCount: number,        // 描画点の数
  breakdown: {               // スコア内訳
    circularity: number,     // 円形度（0-100、小数点以下4桁）
    closure: number,         // 始点終点距離（0-100、小数点以下4桁）
    smoothness: number       // 滑らかさ（0-100、小数点以下4桁）
  },
  idealCircle: {             // 理想円の情報
    center: { x: number, y: number },
    radius: number
  }
}
```

### GameState

```javascript
{
  isPlaying: boolean,
  currentScore: number,
  totalScore: number,
  circlesDrawn: number,
  bestScore: number
}
```

## スコア計算アルゴリズム

### 円品質スコア（0-100点）

円の品質は以下の要素で評価されます：

- **円形度**: 描画パスが理想的な円にどれだけ近いか（小数点以下4桁で計算）
- **始点終点距離**: 開始点と終了点の距離（小数点以下4桁で計算）
- **滑らかさ**: パス上の点の分布の均一性（小数点以下4桁で計算）

```javascript
// 円形度の計算（小数点以下4桁）
function calculateCircularity(points) {
  const center = calculateCenter(points);
  const avgRadius = calculateAverageRadius(points, center);
  const radiusVariance = calculateRadiusVariance(points, center, avgRadius);
  const circularity = Math.max(0, 100 - (radiusVariance / avgRadius) * 100);
  return Math.round(circularity * 10000) / 10000; // 小数点以下4桁
}

// 始点終点距離の計算（小数点以下4桁）
function calculateClosure(points) {
  // ... 計算処理 ...
  const closure = Math.max(0, 100 - (distanceRatio * 300));
  return Math.round(closure * 10000) / 10000; // 小数点以下4桁
}

// 滑らかさの計算（小数点以下4桁）
function calculateSmoothness(points) {
  // ... 計算処理 ...
  const smoothness = Math.max(0, 100 - (standardDeviation * 100));
  return Math.round(smoothness * 10000) / 10000; // 小数点以下4桁
}

// 最終品質スコアの計算（小数点以下3桁）
function calculateCircleQuality(path) {
  const circularity = calculateCircularity(points); // 4桁精度
  const closure = calculateClosure(points);         // 4桁精度
  const smoothness = calculateSmoothness(points);   // 4桁精度
  
  // 重み付き合計
  const qualityScore = 
    circularity * 0.5 +    // 円形度の重み
    closure * 0.35 +       // 始点終点距離の重み
    smoothness * 0.15;     // 滑らかさの重み
  
  // 最終スコアは小数点以下3桁
  return Math.round(qualityScore * 1000) / 1000;
}
```

## エラーハンドリング

### タッチイベントエラー

- タッチイベントが利用できない場合のマウスイベントフォールバック
- 複数タッチの無効化
- イベントリスナーの適切な削除

### Canvas エラー

- Canvas APIサポートの確認
- コンテキスト取得失敗時の処理
- 描画エラーの回復

### パフォーマンス対策

- RequestAnimationFrame の使用
- 描画パスの点数制限（最大1000点）
- メモリリークの防止

## テスト戦略

### 単体テスト

- ScoreCalculator の各計算メソッド
- DrawingEngine のパス処理
- UIManager の状態更新

### 統合テスト

- タッチイベントから描画完了までの流れ
- スコア計算と表示の連携
- ゲーム状態の遷移

### デバイステスト

- iOS Safari での動作確認
- Android Chrome での動作確認
- 異なる画面サイズでの表示確認
- タッチ精度とレスポンス時間の測定

## 視覚的フィードバックの設計

### スコア内訳の表示

円の評価結果を視覚的に理解しやすくするため、結果モーダルのプレビューキャンバスに以下の要素を表示します：

#### 理想円と中心点の表示

結果モーダルのプレビューキャンバス（`#previewCanvas`）に、描いた円と共に理想円と中心点を重ねて表示します。これにより、プレイヤーは自分の円と理想的な円を視覚的に比較できます。

```javascript
// 理想円の描画
function drawIdealCircle(ctx, center, radius) {
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)'; // 半透明の青
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]); // 点線
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 中心点の描画
function drawCenterPoint(ctx, center) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 100, 100, 0.8)'; // 半透明の赤
  ctx.beginPath();
  ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
  ctx.fill();
  // 十字マーカー
  ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(center.x - 10, center.y);
  ctx.lineTo(center.x + 10, center.y);
  ctx.moveTo(center.x, center.y - 10);
  ctx.lineTo(center.x, center.y + 10);
  ctx.stroke();
  ctx.restore();
}
```

#### スコア内訳の10段階評価表示

各評価要素（円形度、始点終点距離、滑らかさ）を10段階評価（0-10の整数）で表示します：

```javascript
function showScoreBreakdown(breakdown) {
  // 100点満点を10段階に変換（0-10の整数）
  const circularityValue = Math.round(Math.min(100, Math.max(0, breakdown.circularity)) / 10);
  const closureValue = Math.round(Math.min(100, Math.max(0, breakdown.closure)) / 10);
  const smoothnessValue = Math.round(Math.min(100, Math.max(0, breakdown.smoothness)) / 10);

  // 各スコア表示要素を取得
  const circularityScore = document.getElementById('circularityScore');
  const closureScore = document.getElementById('closureScore');
  const smoothnessScore = document.getElementById('smoothnessScore');

  // 10段階評価を表示
  circularityScore.textContent = circularityValue;
  closureScore.textContent = closureValue;
  smoothnessScore.textContent = smoothnessValue;
}
```

#### CSS スタイル

```css
.score-breakdown {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.score-item {
  text-align: center;
}

.score-label {
  font-size: 12px;
  color: #a0a0a0;
  margin-bottom: 5px;
}

.score-value {
  font-size: 24px;
  font-weight: bold;
  color: #00d4ff;
}
```

### コンソールログの削除

スコア計算時のコンソールログ出力を削除し、視覚的フィードバックのみに集中します：

```javascript
// 削除する例
// console.log('Circularity:', circularity);
// console.log('Closure:', closure);
// console.log('Smoothness:', smoothness);
// console.log('Quality Score:', qualityScore);
```

## パフォーマンス最適化

### 描画最適化

- Canvas の適切なサイズ設定
- 不要な再描画の削減
- アニメーションの最適化

### メモリ管理

- イベントリスナーの適切な削除
- 描画パスデータの定期的なクリア
- オブジェクトプールの使用

### モバイル最適化

- タッチ遅延の削減（touch-action: none）
- ビューポートの固定
- スクロール防止の実装

## PWA機能設計

### Webアプリマニフェスト

```json
{
  "name": "円描画ゲーム",
  "short_name": "円描画",
  "description": "スマートフォンで楽しむ円描画スキルゲーム",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4285f4",
  "orientation": "portrait",
  "icons": [
    {
      "src": "icons/icon-180.png",
      "sizes": "180x180",
      "type": "image/png"
    },
    {
      "src": "icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### アイコンデザイン

- **基本デザイン**: 円形のモチーフを使用した視覚的に分かりやすいアイコン
- **カラーパレット**: ゲームのテーマカラーに合わせた青系統の色使い
- **サイズ**: 180x180px（iOS Safari用）、192x192px（PWA標準）、512x512px（高解像度）
- **形式**: PNG形式（透明背景対応）

### 基本キャッシュ機能

```javascript
// 軽量なキャッシュ戦略（オンライン前提）
const CACHE_NAME = 'circle-game-v1';
const staticAssets = [
  '/styles.css',
  '/js/main.js',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 基本的なキャッシュ機能のみ実装
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(staticAssets))
  );
});
```

### PWA機能の統合

1. **マニフェストファイルの配置**: `/manifest.json`
2. **サービスワーカーの登録**: メインJSファイルでの登録処理
3. **アイコンファイルの配置**: `/icons/` ディレクトリ
4. **HTMLでのマニフェスト参照**: `<link rel="manifest" href="/manifest.json">`

## SNS共有最適化設計

### OGP（Open Graph Protocol）メタタグ

SNSでのURL共有時に適切な情報を表示するため、以下のOGPメタタグをHTMLに実装します：

```html
<!-- 基本的なOGPタグ -->
<meta property="og:title" content="円を描け！ - 完璧な円を目指すスキルゲーム">
<meta property="og:description" content="スマートフォンで楽しむ円描画ゲーム。大きくて綺麗な円を素早く描いて高得点を目指そう！">
<meta property="og:type" content="website">
<meta property="og:url" content="https://yourdomain.com/">
<meta property="og:image" content="https://yourdomain.com/images/ogp-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="円を描け！ゲーム画面">
<meta property="og:site_name" content="円を描け！">
<meta property="og:locale" content="ja_JP">
```

### Twitter Card メタタグ

X（旧Twitter）での表示を最適化するため、以下のTwitter Cardメタタグを実装します：

```html
<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="円を描け！ - 完璧な円を目指すスキルゲーム">
<meta name="twitter:description" content="スマートフォンで楽しむ円描画ゲーム。大きくて綺麗な円を素早く描いて高得点を目指そう！">
<meta name="twitter:image" content="https://yourdomain.com/images/ogp-image.png">
<meta name="twitter:image:alt" content="円を描け！ゲーム画面">
```

### OGP画像の設計

SNS共有用の画像は以下の仕様で作成します：

- **サイズ**: 1200x630ピクセル（OGP推奨サイズ）
- **形式**: PNG形式（JPEGも可）
- **ファイルサイズ**: 1MB以下推奨
- **配置場所**: `/images/ogp-image.png`
- **デザイン要素**:
  - ゲームタイトル「円を描け！」を大きく表示
  - 円を描いているイメージまたは完成した円のビジュアル
  - ゲームの特徴を示すキャッチコピー
  - ブランドカラー（青系統）を使用した背景

### 追加のメタタグ

検索エンジンとSNS以外のプラットフォームにも対応するため、以下のメタタグも追加します：

```html
<!-- 一般的なメタタグ -->
<meta name="description" content="スマートフォンで楽しむ円描画ゲーム。大きくて綺麗な円を素早く描いて高得点を目指そう！">
<meta name="keywords" content="円描画,ゲーム,スマートフォン,スキルゲーム,無料ゲーム">
<meta name="author" content="円を描け！">

<!-- 正規URL -->
<link rel="canonical" href="https://yourdomain.com/">
```

### SNS共有機能の実装方針

1. **静的メタタグ**: 基本的なOGP/Twitter Cardタグは静的にHTMLに記述
2. **画像の事前準備**: OGP画像は事前に作成してサーバーに配置
3. **URLの絶対パス**: すべての画像URLは絶対パス（https://から始まる完全なURL）で指定
4. **動的シェア画像生成**: シェアボタン押下時に、モーダル表示内容（描いた円、理想円、中心点、10段階評価）を含む画像を動的に生成
5. **テスト方法**: 
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

## シェア画像の動的生成設計

### シェア画像の構成要素

シェアボタン押下時に生成される画像には、結果モーダルに表示されているすべての情報を含めます：

1. **背景とタイトル**: ゲームタイトル「円を描け！」
2. **円のビジュアル**:
   - 描いた円（光る青色の線）
   - 理想円（点線、半透明の青）
   - 中心点（十字マーカー、半透明の赤）
3. **スコア情報**:
   - 品質スコア（小数点以下3桁）
   - 評価レベル（マスター、エキスパート等）
4. **スコア内訳の10段階評価**:
   - 円形度: 0-10の整数
   - 始点終点距離: 0-10の整数
   - 滑らかさ: 0-10の整数
5. **URL・ハッシュタグ**: ゲームURLと#円を描け

### 実装メソッド

```javascript
// シェア用スクリーンショット生成（10段階評価を含む）
generateScreenshotForShare() {
  // 1080x1080のCanvasを作成
  // 背景、タイトル、円（理想円・中心点含む）を描画
  // スコア情報を描画
  // 10段階評価を描画（円形度、始点終点距離、滑らかさ）
  // Web Share APIでシェア
}

// 10段階評価をシェア画像に描画
drawScreenshotScoreBreakdown(ctx, breakdown, width, height) {
  // 100点満点を10段階に変換
  const circularityValue = Math.round(breakdown.circularity / 10);
  const closureValue = Math.round(breakdown.closure / 10);
  const smoothnessValue = Math.round(breakdown.smoothness / 10);
  
  // 各評価項目をテキストで描画
  // 例: "円形度: 8/10"
}
```