/**
 * 円描画ゲーム - メインエントリーポイント
 * モバイルブラウザでの円描画ゲームを初期化し、実行します
 */
console.log('main.js が読み込まれました');

// グローバル変数
let gameController = null;
let drawingEngine = null;
let scoreCalculator = null;
let uiManager = null;

// DOMが読み込まれた後にゲームを初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('「円を描け！」を初期化中...');
    console.log('現在時刻:', new Date().toISOString());
    
    // DOM要素の存在確認
    console.log('DOM要素確認:');
    console.log('gameCanvas:', document.getElementById('gameCanvas'));
    console.log('resultModal:', document.getElementById('resultModal'));
    console.log('previewCanvas:', document.getElementById('previewCanvas'));
    
    // Canvas要素の取得
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvasエレメントが見つかりません');
        showError('Canvasエレメントが見つかりません');
        return;
    }
    
    // Canvas APIサポートの確認
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Canvas 2D APIがサポートされていません');
        showError('お使いのブラウザはこのゲームをサポートしていません');
        return;
    }
    
    // Canvasサイズの設定
    resizeCanvas();
    
    // クラスの存在確認
    console.log('クラス存在確認:');
    console.log('DrawingEngine:', typeof DrawingEngine);
    console.log('ScoreCalculator:', typeof ScoreCalculator);
    console.log('UIManager:', typeof UIManager);
    console.log('GameController:', typeof GameController);
    
    // 各コンポーネントの初期化
    try {
        // DrawingEngineの初期化
        if (typeof DrawingEngine === 'undefined') {
            throw new Error('DrawingEngineクラスが見つかりません');
        }
        drawingEngine = new DrawingEngine(canvas);
        console.log('DrawingEngine が正常に初期化されました');
        
        // ScoreCalculatorの初期化
        if (typeof ScoreCalculator === 'undefined') {
            throw new Error('ScoreCalculatorクラスが見つかりません');
        }
        scoreCalculator = new ScoreCalculator();
        console.log('ScoreCalculator が正常に初期化されました');
        
        // UIManagerの初期化
        if (typeof UIManager === 'undefined') {
            throw new Error('UIManagerクラスが見つかりません');
        }
        uiManager = new UIManager();
        console.log('UIManager が正常に初期化されました');
        
        // GameControllerの初期化と統合
        if (typeof GameController === 'undefined') {
            throw new Error('GameControllerクラスが見つかりません');
        }
        gameController = new GameController();
        gameController.initialize(drawingEngine, scoreCalculator, uiManager);
        console.log('GameController が正常に初期化されました');
        
        // グローバル参照を設定（UIManagerから参照するため）
        window.gameController = gameController;
        
        // ゲーム開始
        gameController.startGame();
        
    } catch (error) {
        console.error('ゲームコンポーネントの初期化に失敗しました:', error);
        console.error('エラー詳細:', error.message);
        console.error('スタックトレース:', error.stack);
        showError(`ゲームの初期化に失敗しました: ${error.message}`);
        return;
    }
    
    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', function() {
        // デバイス向き変更時は少し遅延させてリサイズ
        setTimeout(handleResize, 100);
    });
    
    // リセットボタンは削除されたため、この処理は不要
    
    // ゲームイベントリスナーの設定
    setupGameEventListeners();
    
    console.log('「円を描け！」の初期化が完了しました');
});

/**
 * Canvasサイズをコンテナに合わせて調整
 */
function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    const gameArea = document.querySelector('.game-area');
    
    if (!canvas || !gameArea) return;
    
    // コンテナのサイズを取得
    const containerRect = gameArea.getBoundingClientRect();
    const padding = 20; // パディングを考慮
    
    // アスペクト比を維持しながらサイズを調整
    const maxWidth = containerRect.width - padding;
    const maxHeight = containerRect.height - padding;
    
    // 正方形に近い形で最適なサイズを計算
    const size = Math.min(maxWidth, maxHeight);
    
    // Canvas の実際のサイズを設定
    canvas.width = size;
    canvas.height = size;
    
    // CSS でのサイズも設定
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    
    console.log(`Canvas サイズを調整: ${size}x${size}px`);
}

/**
 * リサイズ処理（DrawingEngine対応）
 */
function handleResize() {
    // 現在の描画状態を保存
    let pathHistory = null;
    if (drawingEngine) {
        pathHistory = drawingEngine.getPathHistory();
    }
    
    // Canvasサイズを調整
    resizeCanvas();
    
    // DrawingEngineの描画設定を再初期化
    if (drawingEngine) {
        drawingEngine.initializeDrawingSettings();
        
        // 保存したパス履歴を復元
        if (pathHistory && pathHistory.length > 0) {
            drawingEngine.pathHistory = pathHistory;
            drawingEngine.redrawCompletedPaths();
        }
    }
}

/**
 * ゲームイベントリスナーの設定
 */
function setupGameEventListeners() {
    if (!gameController) return;
    
    // スコア更新時のイベント
    gameController.addEventListener('scoreUpdated', function(data) {
        console.log('スコアが更新されました:', data);
        
        // スコア表示にパルスエフェクトを追加
        const totalScoreElement = document.getElementById('totalScore');
        if (totalScoreElement) {
            totalScoreElement.classList.add('score-pulse');
            setTimeout(() => {
                totalScoreElement.classList.remove('score-pulse');
            }, 600);
        }
    });
    
    // ゲーム開始時のイベント
    gameController.addEventListener('gameStarted', function(gameState) {
        console.log('ゲームが開始されました:', gameState);
    });
    
    // ゲーム終了時のイベント
    gameController.addEventListener('gameEnded', function(gameState) {
        console.log('ゲームが終了しました:', gameState);
    });
    
    // ゲームリセット時のイベント
    gameController.addEventListener('gameReset', function(gameState) {
        console.log('ゲームがリセットされました:', gameState);
    });
}

/**
 * UI要素の更新（レガシー関数 - 互換性のため残す）
 */
function updateUI() {
    // 新しいUIでは不要
    console.log('UI更新（新しいUIでは自動処理）');
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    const gameArea = document.querySelector('.game-area');
    if (gameArea) {
        gameArea.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #ff6b6b;
                text-align: center;
                padding: 20px;
            ">
                <h2>エラーが発生しました</h2>
                <p>${message}</p>
                <p style="margin-top: 20px; font-size: 14px; color: #a0a0a0;">
                    最新のモバイルブラウザでお試しください
                </p>
            </div>
        `;
    }
}

// タッチイベントのパッシブリスナー設定（パフォーマンス最適化）
document.addEventListener('touchstart', function() {}, { passive: false });
document.addEventListener('touchmove', function() {}, { passive: false });
document.addEventListener('touchend', function() {}, { passive: false });