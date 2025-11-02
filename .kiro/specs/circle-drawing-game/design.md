# 設計文書

## 概要

円描画ゲームは、HTML5 Canvas APIとJavaScriptを使用したシングルページアプリケーション（SPA）として実装されます。タッチイベントを処理し、リアルタイムで描画を追跡し、数学的アルゴリズムを使用して円の品質を評価し、スピードとサイズに基づいてスコアを計算します。

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
  clearCanvas()
}
```

### 3. ScoreCalculator

円の品質、スピード、サイズを評価してスコアを計算します。

```javascript
class ScoreCalculator {
  calculateCircleQuality(path)
  calculateSpeedScore(drawingTime)
  calculateSizeScore(diameter)
  calculateTotalScore(quality, speed, size)
}
```

### 4. UIManager

ユーザーインターフェースの更新と視覚的フィードバックを管理します。

```javascript
class UIManager {
  updateScore(score)
  showScoreAnimation(score)
  showFeedback(message, type)
  updateGameState(state)
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
  qualityScore: number,    // 0-100
  speedMultiplier: number, // 0.1-3.0
  sizeMultiplier: number,  // 0.1-3.0
  totalScore: number,
  drawingTime: number,
  diameter: number
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

### 1. 円品質スコア（0-100点）

円の品質は以下の要素で評価されます：

- **円形度**: 描画パスが理想的な円にどれだけ近いか
- **閉じ具合**: 開始点と終了点の距離
- **滑らかさ**: パス上の点の分布の均一性

```javascript
// 円形度の計算
function calculateCircularity(points) {
  const center = calculateCenter(points);
  const avgRadius = calculateAverageRadius(points, center);
  const radiusVariance = calculateRadiusVariance(points, center, avgRadius);
  return Math.max(0, 100 - (radiusVariance / avgRadius) * 100);
}
```

### 2. スピード倍率（0.1-3.0倍）

描画時間に基づく倍率計算：

```javascript
function calculateSpeedMultiplier(drawingTime) {
  const maxTime = 5000; // 5秒
  const minTime = 200;  // 0.2秒
  
  if (drawingTime <= minTime) return 3.0;
  if (drawingTime >= maxTime) return 0.1;
  
  // 指数関数的に減少
  return 3.0 * Math.pow(0.1/3.0, (drawingTime - minTime) / (maxTime - minTime));
}
```

### 3. サイズ倍率（0.1-3.0倍）

円の直径に基づく倍率計算：

```javascript
function calculateSizeMultiplier(diameter) {
  const maxDiameter = Math.min(canvas.width, canvas.height) * 0.8;
  const minDiameter = 50;
  
  if (diameter >= maxDiameter) return 3.0;
  if (diameter <= minDiameter) return 0.1;
  
  // 線形に増加
  return 0.1 + (2.9 * (diameter - minDiameter) / (maxDiameter - minDiameter));
}
```

### 4. 最終スコア

```javascript
totalScore = qualityScore * speedMultiplier * sizeMultiplier
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