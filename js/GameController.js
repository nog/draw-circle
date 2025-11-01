/**
 * GameController - ゲーム状態管理クラス
 * ゲーム全体の状態管理とコンポーネント間の調整を行います
 */
console.log('GameController.js が読み込まれました');

class GameController {
    constructor() {
        // ゲーム状態
        this.gameState = {
            isPlaying: false,
            currentScore: 0,
            totalScore: 0,
            circlesDrawn: 0,
            bestScore: 0,
            sessionStartTime: null
        };
        
        // スコア履歴
        this.scoreHistory = [];
        
        // コンポーネント参照
        this.drawingEngine = null;
        this.scoreCalculator = null;
        this.uiManager = null;
        
        // イベントリスナー
        this.eventListeners = new Map();
        
        console.log('GameController が初期化されました');
    }
    
    /**
     * ゲームコンポーネントを初期化
     */
    initialize(drawingEngine, scoreCalculator, uiManager) {
        this.drawingEngine = drawingEngine;
        this.scoreCalculator = scoreCalculator;
        this.uiManager = uiManager;
        
        // DrawingEngineのコールバック設定
        if (this.drawingEngine) {
            this.drawingEngine.onDrawingComplete = (path) => {
                this.handleDrawingComplete(path);
            };
        }
        
        // UIManagerの初期化
        if (this.uiManager) {
            this.uiManager.initialize();
        }
        
        // ローカルストレージからベストスコアを読み込み
        this.loadBestScore();
        
        console.log('GameController のコンポーネント初期化が完了しました');
    }
    
    /**
     * ゲームを開始
     */
    startGame() {
        this.gameState.isPlaying = true;
        this.gameState.sessionStartTime = Date.now();
        
        // イベントの発火
        this.emitEvent('gameStarted', this.gameState);
        
        console.log('ゲームが開始されました');
    }
    
    /**
     * ゲームを終了
     */
    endGame() {
        this.gameState.isPlaying = false;
        
        // ベストスコアの更新
        if (this.gameState.totalScore > this.gameState.bestScore) {
            this.gameState.bestScore = this.gameState.totalScore;
            this.saveBestScore();
        }
        
        // イベントの発火
        this.emitEvent('gameEnded', this.gameState);
        
        console.log('ゲームが終了されました');
    }
    
    /**
     * ゲームをリセット
     */
    resetGame() {
        // 現在のスコアと履歴をクリア
        this.gameState.currentScore = 0;
        this.gameState.totalScore = 0;
        this.gameState.circlesDrawn = 0;
        this.scoreHistory = [];
        
        // 描画エンジンのクリア
        if (this.drawingEngine) {
            this.drawingEngine.clearCanvas(true);
        }
        
        // UIの更新
        if (this.uiManager) {
            this.uiManager.clearFeedback();
        }
        
        // イベントの発火
        this.emitEvent('gameReset', this.gameState);
        
        console.log('ゲームがリセットされました');
    }
    
    /**
     * 次の円の準備（描画エリアのみクリア）
     */
    prepareNextCircle() {
        // 描画エンジンのクリア
        if (this.drawingEngine) {
            this.drawingEngine.clearCanvas(true);
        }
        
        // UIフィードバックのクリア
        if (this.uiManager) {
            this.uiManager.clearFeedback();
        }
        
        console.log('次の円の準備が完了しました');
    }
    
    /**
     * 描画完了時の処理
     */
    handleDrawingComplete(path) {
        if (!this.scoreCalculator || !path) {
            console.warn('ScoreCalculator または描画パスが無効です');
            return;
        }
        
        try {
            // Canvasサイズを取得
            const canvas = this.drawingEngine.canvas;
            const canvasWidth = canvas ? canvas.width : 400;
            const canvasHeight = canvas ? canvas.height : 400;
            
            // スコア計算（完全版を使用）
            const scoreData = this.scoreCalculator.calculateCompleteScore(path, canvasWidth, canvasHeight, {
                showDetails: true,
                useAccurateDiameter: true
            });
            
            // ゲーム状態の更新
            this.updateScore(scoreData);
            
            // スコア履歴に追加
            this.addToScoreHistory(scoreData, path);
            
            // 結果モーダルを表示
            if (this.uiManager) {
                this.uiManager.showResultModal(scoreData, path);
            }
            
            console.log('描画完了処理が完了しました:', scoreData);
            
        } catch (error) {
            console.error('描画完了処理でエラーが発生しました:', error);
        }
    }
    
    /**
     * スコアを更新
     */
    updateScore(scoreData) {
        this.gameState.currentScore = Math.round(scoreData.totalScore);
        this.gameState.circlesDrawn++;
        
        // イベントの発火
        this.emitEvent('scoreUpdated', {
            scoreData: scoreData,
            gameState: this.gameState
        });
    }
    
    /**
     * スコア履歴に追加
     */
    addToScoreHistory(scoreData, path) {
        const historyEntry = {
            timestamp: Date.now(),
            scoreData: scoreData,
            pathInfo: {
                pointCount: path.points.length,
                drawingTime: path.endTime - path.startTime,
                diameter: this.calculatePathDiameter(path)
            }
        };
        
        this.scoreHistory.push(historyEntry);
        
        // 履歴の上限を設定（メモリ管理）
        if (this.scoreHistory.length > 100) {
            this.scoreHistory.shift();
        }
    }
    
    /**
     * パスの直径を計算（簡易版）
     */
    calculatePathDiameter(path) {
        if (!path.points || path.points.length < 2) return 0;
        
        let minX = path.points[0].x, maxX = path.points[0].x;
        let minY = path.points[0].y, maxY = path.points[0].y;
        
        for (const point of path.points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        return Math.max(maxX - minX, maxY - minY);
    }
    
    /**
     * 現在のゲーム状態を取得
     */
    getCurrentState() {
        return { ...this.gameState };
    }
    
    /**
     * スコア履歴を取得
     */
    getScoreHistory() {
        return [...this.scoreHistory];
    }
    
    /**
     * 統計情報を取得
     */
    getGameStats() {
        const avgScore = this.scoreHistory.length > 0 
            ? this.scoreHistory.reduce((sum, entry) => sum + entry.scoreData.totalScore, 0) / this.scoreHistory.length
            : 0;
            
        const avgDrawingTime = this.scoreHistory.length > 0
            ? this.scoreHistory.reduce((sum, entry) => sum + entry.pathInfo.drawingTime, 0) / this.scoreHistory.length
            : 0;
        
        return {
            totalCircles: this.gameState.circlesDrawn,
            totalScore: this.gameState.totalScore,
            bestScore: this.gameState.bestScore,
            averageScore: Math.round(avgScore),
            averageDrawingTime: Math.round(avgDrawingTime),
            sessionDuration: this.gameState.sessionStartTime 
                ? Date.now() - this.gameState.sessionStartTime 
                : 0
        };
    }
    
    /**
     * ベストスコアをローカルストレージから読み込み
     */
    loadBestScore() {
        try {
            const saved = localStorage.getItem('circleGame_bestScore');
            if (saved) {
                this.gameState.bestScore = parseInt(saved, 10) || 0;
            }
        } catch (error) {
            console.warn('ベストスコアの読み込みに失敗しました:', error);
        }
    }
    
    /**
     * ベストスコアをローカルストレージに保存
     */
    saveBestScore() {
        try {
            localStorage.setItem('circleGame_bestScore', this.gameState.bestScore.toString());
        } catch (error) {
            console.warn('ベストスコアの保存に失敗しました:', error);
        }
    }
    
    /**
     * イベントリスナーを追加
     */
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    /**
     * イベントリスナーを削除
     */
    removeEventListener(eventType, callback) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * イベントを発火
     */
    emitEvent(eventType, data) {
        if (this.eventListeners.has(eventType)) {
            const listeners = this.eventListeners.get(eventType);
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`イベント ${eventType} のコールバックでエラー:`, error);
                }
            });
        }
    }
    
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        this.eventListeners.clear();
        this.scoreHistory = [];
        this.drawingEngine = null;
        this.scoreCalculator = null;
        this.uiManager = null;
        
        console.log('GameController が破棄されました');
    }
}