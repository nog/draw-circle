/**
 * DrawingEngine - Canvas描画エンジン
 * タッチ入力の処理と描画パスの管理を行います
 */
console.log('DrawingEngine.js が読み込まれました');

class DrawingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.currentPath = null;
        this.drawingStartTime = 0;
        
        // 描画パス管理
        this.pathHistory = [];
        this.maxPathHistory = 10; // 最大保持パス数
        
        // アニメーション管理
        this.animationId = null;
        this.lastDrawTime = 0;
        this.drawingSmoothing = true;
        
        // 描画設定の初期化
        this.initializeDrawingSettings();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        console.log('DrawingEngine が初期化されました');
    }
    
    /**
     * 描画設定の初期化
     */
    initializeDrawingSettings() {
        // 高品質な描画設定
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.shadowColor = '#00d4ff';
        this.ctx.shadowBlur = 5;
        
        // アンチエイリアシングの設定
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // 描画スタイルの設定
        this.drawingStyles = {
            active: {
                strokeStyle: '#00d4ff',
                shadowColor: '#00d4ff',
                shadowBlur: 8,
                lineWidth: 3,
                globalAlpha: 1.0
            },
            completed: {
                strokeStyle: '#4a9eff',
                shadowColor: '#4a9eff',
                shadowBlur: 3,
                lineWidth: 2,
                globalAlpha: 0.7
            }
        };
        
        console.log('描画設定を初期化しました');
    }
    
    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // タッチサポートの確認
        this.touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (this.touchSupported) {
            // タッチイベント（モバイル）- パッシブ無効でスクロール防止
            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { 
                passive: false, 
                capture: true 
            });
            this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { 
                passive: false, 
                capture: true 
            });
            this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { 
                passive: false, 
                capture: true 
            });
            this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { 
                passive: false, 
                capture: true 
            });
            
            console.log('タッチイベントリスナーを設定しました');
        }
        
        // マウスイベント（デスクトップフォールバック）
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // 右クリックメニューとドラッグの無効化
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
        this.canvas.addEventListener('selectstart', (e) => e.preventDefault());
        
        // ページスクロール防止（ゲームエリア全体）
        document.body.addEventListener('touchstart', this.preventScroll.bind(this), { passive: false });
        document.body.addEventListener('touchmove', this.preventScroll.bind(this), { passive: false });
        
        console.log('イベントリスナーを設定しました');
    }
    
    /**
     * 描画開始
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} timestamp - タイムスタンプ
     */
    startDrawing(x, y, timestamp) {
        this.isDrawing = true;
        this.drawingStartTime = timestamp;
        
        // 新しい描画パスを初期化
        this.currentPath = {
            points: [{ x, y, timestamp }],
            startTime: timestamp,
            endTime: null,
            isComplete: false,
            id: Date.now() + Math.random() // ユニークID
        };
        
        // アクティブな描画スタイルを適用
        this.applyDrawingStyle('active');
        
        // 描画開始点を設定
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        
        // 開始点に小さな点を描画
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
        this.ctx.fill();
        
        console.log(`描画開始: (${x}, ${y}) at ${timestamp}`);
    }
    
    /**
     * 描画継続
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {number} timestamp - タイムスタンプ
     */
    continueDrawing(x, y, timestamp) {
        if (!this.isDrawing || !this.currentPath) return;
        
        // 前の点との距離チェック（スムージング）
        const lastPoint = this.currentPath.points[this.currentPath.points.length - 1];
        const distance = Math.sqrt(Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2));
        
        // 最小距離フィルター（ノイズ除去）
        if (distance < 2) return;
        
        // パスに点を追加
        this.currentPath.points.push({ x, y, timestamp });
        
        // スムーズな描画のためのリアルタイム更新
        this.drawSmoothLine(lastPoint, { x, y });
        
        // パフォーマンス最適化：点数制限
        if (this.currentPath.points.length > 1000) {
            console.warn('描画パスの点数が上限に達しました');
            // 古い点を間引く
            this.currentPath.points = this.currentPath.points.filter((_, index) => index % 2 === 0);
        }
    }
    
    /**
     * スムーズな線の描画
     * @param {Object} fromPoint - 開始点
     * @param {Object} toPoint - 終了点
     */
    drawSmoothLine(fromPoint, toPoint) {
        // アクティブな描画スタイルを適用
        this.applyDrawingStyle('active');
        
        if (this.drawingSmoothing && this.currentPath.points.length > 2) {
            // ベジェ曲線を使用したスムーズな描画
            const points = this.currentPath.points;
            const len = points.length;
            
            if (len >= 3) {
                const p1 = points[len - 3];
                const p2 = points[len - 2];
                const p3 = points[len - 1];
                
                // 制御点の計算
                const cp1x = p1.x + (p2.x - p1.x) * 0.5;
                const cp1y = p1.y + (p2.y - p1.y) * 0.5;
                const cp2x = p2.x + (p3.x - p2.x) * 0.5;
                const cp2y = p2.y + (p3.y - p2.y) * 0.5;
                
                this.ctx.beginPath();
                this.ctx.moveTo(cp1x, cp1y);
                this.ctx.quadraticCurveTo(p2.x, p2.y, cp2x, cp2y);
                this.ctx.stroke();
            }
        } else {
            // 直線描画
            this.ctx.beginPath();
            this.ctx.moveTo(fromPoint.x, fromPoint.y);
            this.ctx.lineTo(toPoint.x, toPoint.y);
            this.ctx.stroke();
        }
    }
    
    /**
     * 描画スタイルの適用
     * @param {string} styleType - 'active' または 'completed'
     */
    applyDrawingStyle(styleType) {
        const style = this.drawingStyles[styleType];
        if (!style) return;
        
        this.ctx.strokeStyle = style.strokeStyle;
        this.ctx.shadowColor = style.shadowColor;
        this.ctx.shadowBlur = style.shadowBlur;
        this.ctx.lineWidth = style.lineWidth;
        this.ctx.globalAlpha = style.globalAlpha;
    }
    
    /**
     * 完成したパスの再描画
     */
    redrawCompletedPaths() {
        // 完成済みパスを薄い色で再描画
        this.pathHistory.forEach(path => {
            if (path.isComplete && path.points.length > 1) {
                this.applyDrawingStyle('completed');
                this.drawPath(path);
            }
        });
    }
    
    /**
     * パス全体の描画
     * @param {Object} path - 描画パス
     */
    drawPath(path) {
        if (!path || !path.points || path.points.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
            this.ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        this.ctx.stroke();
    }
    
    /**
     * 描画終了
     * @param {number} timestamp - タイムスタンプ
     */
    endDrawing(timestamp) {
        if (!this.isDrawing || !this.currentPath) return;
        
        this.isDrawing = false;
        this.currentPath.endTime = timestamp;
        this.currentPath.isComplete = true;
        
        // 一ストローク毎にリセットするため、履歴には追加しない
        // 代わりに現在のパスのコピーを作成してコールバックに渡す
        const completedPath = { ...this.currentPath };
        
        // 完成したパスを完了スタイルで再描画
        this.applyDrawingStyle('completed');
        this.drawPath(this.currentPath);
        
        console.log(`描画終了: ${timestamp}, 描画時間: ${timestamp - this.drawingStartTime}ms`);
        console.log(`点数: ${this.currentPath.points.length}`);
        
        // 描画完了イベントを発火（コピーを渡す）
        this.onDrawingComplete(completedPath);
    }
    
    /**
     * 現在の描画パスを取得
     * @returns {Object|null} 描画パスデータ
     */
    getDrawingPath() {
        return this.currentPath;
    }
    
    /**
     * Canvasをクリア
     * @param {boolean} clearHistory - パス履歴もクリアするか
     */
    clearCanvas(clearHistory = false) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.currentPath = null;
        this.isDrawing = false;
        
        // 一ストローク毎のリセットモードでは常に履歴をクリア
        this.pathHistory = [];
        console.log('Canvasをクリアしました（次の円の準備完了）');
    }
    
    /**
     * 最後のパスを取り消し
     */
    undoLastPath() {
        if (this.pathHistory.length > 0) {
            this.pathHistory.pop();
            this.clearCanvas(false); // 履歴は保持してCanvasのみクリア
            console.log('最後のパスを取り消しました');
            return true;
        }
        return false;
    }
    
    /**
     * パス履歴の取得
     * @returns {Array} パス履歴の配列
     */
    getPathHistory() {
        return [...this.pathHistory]; // コピーを返す
    }
    
    /**
     * 描画統計の取得
     * @returns {Object} 描画統計情報
     */
    getDrawingStats() {
        return {
            totalPaths: this.pathHistory.length,
            currentPathPoints: this.currentPath ? this.currentPath.points.length : 0,
            isDrawing: this.isDrawing,
            drawingTime: this.isDrawing ? performance.now() - this.drawingStartTime : 0
        };
    }
    
    /**
     * 描画完了時のコールバック（オーバーライド可能）
     * @param {Object} path - 完成した描画パス
     */
    onDrawingComplete(path) {
        // サブクラスまたは外部でオーバーライドして使用
        console.log('描画が完了しました:', path);
    }
    
    /**
     * ページスクロール防止
     */
    preventScroll(event) {
        // Canvas上でのタッチのみスクロールを防止
        if (event.target === this.canvas || this.canvas.contains(event.target)) {
            event.preventDefault();
        }
    }
    
    /**
     * タッチ座標の正規化（高DPI対応）
     */
    getTouchCoordinates(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }
    
    /**
     * マルチタッチの検出と無効化
     */
    isValidTouch(event) {
        // 複数の指でのタッチを無効化
        if (event.touches && event.touches.length > 1) {
            console.log('マルチタッチが検出されました - 無効化');
            return false;
        }
        return true;
    }
    
    // === タッチイベントハンドラー ===
    
    /**
     * タッチ開始イベント処理
     */
    handleTouchStart(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // マルチタッチチェック
        if (!this.isValidTouch(event)) {
            return;
        }
        
        const touch = event.touches[0];
        const coords = this.getTouchCoordinates(touch);
        
        // 高精度タイムスタンプを使用
        const timestamp = performance.now();
        
        this.startDrawing(coords.x, coords.y, timestamp);
    }
    
    /**
     * タッチ移動イベント処理
     */
    handleTouchMove(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (!this.isDrawing) return;
        
        // マルチタッチチェック
        if (!this.isValidTouch(event)) {
            // マルチタッチが検出された場合は描画を終了
            this.endDrawing(performance.now());
            return;
        }
        
        const touch = event.touches[0];
        const coords = this.getTouchCoordinates(touch);
        
        // 高精度タイムスタンプを使用
        const timestamp = performance.now();
        
        this.continueDrawing(coords.x, coords.y, timestamp);
    }
    
    /**
     * タッチ終了イベント処理
     */
    handleTouchEnd(event) {
        event.preventDefault();
        event.stopPropagation();
        
        if (this.isDrawing) {
            // 高精度タイムスタンプを使用
            const timestamp = performance.now();
            this.endDrawing(timestamp);
        }
    }
    
    // === マウスイベントハンドラー（フォールバック） ===
    
    /**
     * マウス座標の正規化
     */
    getMouseCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }
    
    /**
     * マウス押下イベント処理
     */
    handleMouseDown(event) {
        // タッチデバイスではマウスイベントを無視
        if (this.touchSupported) return;
        
        event.preventDefault();
        
        // 左クリックのみ有効
        if (event.button !== 0) return;
        
        const coords = this.getMouseCoordinates(event);
        const timestamp = performance.now();
        
        this.startDrawing(coords.x, coords.y, timestamp);
    }
    
    /**
     * マウス移動イベント処理
     */
    handleMouseMove(event) {
        // タッチデバイスではマウスイベントを無視
        if (this.touchSupported) return;
        
        if (!this.isDrawing) return;
        
        const coords = this.getMouseCoordinates(event);
        const timestamp = performance.now();
        
        this.continueDrawing(coords.x, coords.y, timestamp);
    }
    
    /**
     * マウス離上イベント処理
     */
    handleMouseUp(event) {
        // タッチデバイスではマウスイベントを無視
        if (this.touchSupported) return;
        
        if (this.isDrawing) {
            const timestamp = performance.now();
            this.endDrawing(timestamp);
        }
    }
    
    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // タッチイベントリスナーの削除
        if (this.touchSupported) {
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
            this.canvas.removeEventListener('touchend', this.handleTouchEnd);
            this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
        }
        
        // マウスイベントリスナーの削除
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseUp);
        
        // その他のイベントリスナーの削除
        this.canvas.removeEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.removeEventListener('dragstart', (e) => e.preventDefault());
        this.canvas.removeEventListener('selectstart', (e) => e.preventDefault());
        
        // ページレベルのイベントリスナーの削除
        document.body.removeEventListener('touchstart', this.preventScroll);
        document.body.removeEventListener('touchmove', this.preventScroll);
        
        // 描画状態のリセット
        this.isDrawing = false;
        this.currentPath = null;
        
        console.log('DrawingEngine のリソースをクリーンアップしました');
    }
}