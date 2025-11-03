/**
 * UIManager - ユーザーインターフェース管理クラス
 * 結果モーダル表示とシェア機能を管理します
 */
class UIManager {
    constructor() {
        // DOM要素の参照
        this.elements = {
            resultModal: null,
            previewCanvas: null,
            mainScore: null,
            evaluationMessage: null,
            shareDirectButton: null,
            nextButton: null
        };

        // アニメーション状態
        this.animationState = {
            modalVisible: false,
            modalTimeout: null
        };

        // 描画した円のデータ保存用
        this.lastCircleData = null;
    }

    /**
     * UIManagerを初期化してDOM要素を取得
     */
    initialize() {
        // DOM要素の取得
        this.elements.resultModal = document.getElementById('resultModal');
        this.elements.previewCanvas = document.getElementById('previewCanvas');
        this.elements.mainScore = document.getElementById('mainScore');
        this.elements.evaluationMessage = document.getElementById('evaluationMessage');
        this.elements.shareDirectButton = document.getElementById('shareDirectButton');
        this.elements.nextButton = document.getElementById('nextButton');

        // 必須要素の存在確認
        const requiredElements = ['resultModal', 'previewCanvas', 'mainScore'];
        const missingElements = requiredElements.filter(id => !this.elements[id]);

        if (missingElements.length > 0) {
            console.warn('必須のUI要素が見つかりません:', missingElements);
        }

        // イベントリスナーの設定
        this.setupEventListeners();

        // 初期状態の設定
        this.hideResultModal();
    }

    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // 次の円ボタン
        if (this.elements.nextButton) {
            this.elements.nextButton.addEventListener('click', () => {
                this.hideResultModal();
                // GameControllerに次の円の準備を通知
                if (window.gameController) {
                    window.gameController.prepareNextCircle();
                }
            });
        }

        // 直接シェアボタン
        if (this.elements.shareDirectButton) {
            this.elements.shareDirectButton.addEventListener('click', () => {
                this.shareDirectly();
            });
        }

        // モーダル外クリックで閉じる
        if (this.elements.resultModal) {
            this.elements.resultModal.addEventListener('click', (e) => {
                if (e.target === this.elements.resultModal) {
                    this.hideResultModal();
                    if (window.gameController) {
                        window.gameController.prepareNextCircle();
                    }
                }
            });
        }
    }

    /**
     * 結果モーダルを表示（新しいメインメソッド）
     */
    showResultModal(scoreData, circleImageData) {
        if (!scoreData || !this.elements.resultModal) {
            console.warn('スコアデータまたはモーダル要素が無効です');
            return;
        }

        try {
            // 円のデータを保存
            this.lastCircleData = { scoreData, circleImageData };

            // プレビューキャンバスに円を描画（理想円と中心点を含む）
            this.drawCirclePreview(circleImageData, scoreData.idealCircle);

            // スコア情報を更新
            this.updateScoreDisplay(scoreData);

            // スコア内訳をバーグラフで表示
            if (scoreData.breakdown) {
                this.showScoreBreakdown(scoreData.breakdown);
            }

            // 評価メッセージを更新
            this.updateEvaluationMessage(scoreData);

            // モーダルを表示
            this.elements.resultModal.classList.add('show');
            this.animationState.modalVisible = true;

        } catch (error) {
            console.error('結果モーダル表示でエラーが発生しました:', error);
        }
    }

    /**
     * 結果モーダルを非表示
     */
    hideResultModal() {
        if (this.elements.resultModal) {
            this.elements.resultModal.classList.remove('show');
            this.animationState.modalVisible = false;
        }

        if (this.animationState.modalTimeout) {
            clearTimeout(this.animationState.modalTimeout);
            this.animationState.modalTimeout = null;
        }
    }

    /**
     * スコアを指定桁数でフォーマット
     * @param {number} value - フォーマットする値
     * @param {number} decimals - 小数点以下の桁数（デフォルト: 3）
     * @returns {string} フォーマットされたスコア文字列
     */
    formatScore(value, decimals = 3) {
        if (typeof value !== 'number' || isNaN(value)) {
            return '0.000';
        }
        return value.toFixed(decimals);
    }

    /**
     * スコア表示を更新
     */
    updateScoreDisplay(scoreData) {
        // メインスコア更新（品質スコアを小数点以下3桁で表示）
        if (this.elements.mainScore) {
            this.elements.mainScore.textContent = this.formatScore(scoreData.qualityScore, 3);
        }
    }

    /**
     * スコア内訳を10段階評価で表示
     * @param {Object} breakdown - スコア内訳データ（circularity, closure, smoothness）
     */
    showScoreBreakdown(breakdown) {
        if (!breakdown) {
            console.warn('スコア内訳データが無効です');
            return;
        }

        // 各スコア表示要素を取得
        const circularityScore = document.getElementById('circularityScore');
        const closureScore = document.getElementById('closureScore');
        const smoothnessScore = document.getElementById('smoothnessScore');

        if (!circularityScore || !closureScore || !smoothnessScore) {
            console.warn('スコア内訳表示要素が見つかりません');
            return;
        }

        // 100点満点を10段階に変換（0-10の整数）
        const circularityValue = Math.round(Math.min(100, Math.max(0, breakdown.circularity)) / 10);
        const closureValue = Math.round(Math.min(100, Math.max(0, breakdown.closure)) / 10);
        const smoothnessValue = Math.round(Math.min(100, Math.max(0, breakdown.smoothness)) / 10);

        // 10段階評価を表示
        circularityScore.textContent = circularityValue;
        closureScore.textContent = closureValue;
        smoothnessScore.textContent = smoothnessValue;
    }

    /**
     * 円のプレビューを描画（理想円と中心点を含む）
     * @param {Object} circleImageData - 描画パスデータ
     * @param {Object} idealCircle - 理想円データ（オプション）
     */
    drawCirclePreview(circleImageData, idealCircle = null) {
        if (!this.elements.previewCanvas || !circleImageData) {
            console.warn('プレビューキャンバスまたは円データが無効です');
            return;
        }

        const canvas = this.elements.previewCanvas;
        const ctx = canvas.getContext('2d');

        // キャンバスサイズを設定
        canvas.width = 200;
        canvas.height = 200;

        // 背景をクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 円を描画（縮小して中央に配置）
        if (circleImageData.points && circleImageData.points.length > 1) {
            // 元の円の境界を計算
            const bounds = this.calculateBounds(circleImageData.points);
            const originalWidth = bounds.maxX - bounds.minX;
            const originalHeight = bounds.maxY - bounds.minY;
            const originalSize = Math.max(originalWidth, originalHeight);

            // スケールを計算（余白を考慮）
            const targetSize = Math.min(canvas.width, canvas.height) * 0.8;
            const scale = originalSize > 0 ? targetSize / originalSize : 1;

            // 元の円の中心を計算
            const originalCenterX = (bounds.minX + bounds.maxX) / 2;
            const originalCenterY = (bounds.minY + bounds.maxY) / 2;

            // キャンバスの中心を計算
            const canvasCenterX = canvas.width / 2;
            const canvasCenterY = canvas.height / 2;

            // 中央配置のオフセットを計算（元の中心をキャンバスの中心に配置）
            const offsetX = canvasCenterX - originalCenterX * scale;
            const offsetY = canvasCenterY - originalCenterY * scale;

            // 理想円を先に描画（背景として）
            if (idealCircle && idealCircle.center && idealCircle.radius > 0) {
                const scaledCenter = {
                    x: idealCircle.center.x * scale + offsetX,
                    y: idealCircle.center.y * scale + offsetY
                };
                const scaledRadius = idealCircle.radius * scale;

                // 理想円を描画（点線、半透明の青）
                ctx.save();
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(scaledCenter.x, scaledCenter.y, scaledRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();

                // 中心点を描画（半透明の赤）
                ctx.save();
                const pointColor = 'rgba(255, 100, 100, 0.8)';
                
                // 中心の円
                ctx.fillStyle = pointColor;
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(scaledCenter.x, scaledCenter.y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // 十字マーカー
                ctx.strokeStyle = pointColor;
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                const markerSize = 8;
                
                ctx.beginPath();
                ctx.moveTo(scaledCenter.x - markerSize, scaledCenter.y);
                ctx.lineTo(scaledCenter.x + markerSize, scaledCenter.y);
                ctx.moveTo(scaledCenter.x, scaledCenter.y - markerSize);
                ctx.lineTo(scaledCenter.x, scaledCenter.y + markerSize);
                ctx.stroke();
                ctx.restore();
            }

            // 描いた円を描画（前景として）
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 8;

            ctx.beginPath();
            const firstPoint = circleImageData.points[0];
            ctx.moveTo(firstPoint.x * scale + offsetX, firstPoint.y * scale + offsetY);

            for (let i = 1; i < circleImageData.points.length; i++) {
                const point = circleImageData.points[i];
                ctx.lineTo(point.x * scale + offsetX, point.y * scale + offsetY);
            }

            ctx.stroke();
        }
    }

    /**
     * 評価メッセージを更新
     */
    updateEvaluationMessage(scoreData) {
        if (!this.elements.evaluationMessage) return;

        let message = '';
        const quality = scoreData.qualityScore;

        // 品質のみに基づく評価メッセージ
        if (quality >= 95) {
            message = '🏆 完璧な円です！マスターレベル！';
        } else if (quality >= 90) {
            message = '✨ 素晴らしい円です！エキスパート！';
        } else if (quality >= 80) {
            message = '👍 とても良い円ですね！上級者！';
        } else if (quality >= 70) {
            message = '😊 良い円です！中級者！';
        } else if (quality >= 60) {
            message = '📈 まずまずの円ですね！';
        } else if (quality >= 40) {
            message = '💪 もう少し丸く描いてみましょう！';
        } else {
            message = '📝 円形を意識して練習しましょう！';
        }

        // 高得点の場合は特別メッセージ
        if (quality >= 90) {
            message += ' 🎉 ハイスコア！';
        } else if (quality >= 80) {
            message += ' 🎊 高得点！';
        }

        this.elements.evaluationMessage.textContent = message;
    }

    /**
     * 描画範囲の境界を計算
     */
    calculateBounds(points) {
        if (points.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        let minX = points[0].x;
        let maxX = points[0].x;
        let minY = points[0].y;
        let maxY = points[0].y;

        for (const point of points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }

        return { minX, maxX, minY, maxY };
    }

    /**
     * 結果をスクリーンショットとして保存
     */
    saveScreenshot() {
        if (!this.lastCircleData) {
            console.warn('保存するデータがありません');
            return;
        }

        try {
            // 結果画面のスクリーンショットを生成（保存用）
            this.generateResultScreenshot(false);
        } catch (error) {
            console.error('スクリーンショット生成エラー:', error);
            this.showError('スクリーンショットの生成に失敗しました');
        }
    }

    /**
     * 結果をスクリーンショットとして直接シェア
     */
    shareScreenshot() {
        if (!this.lastCircleData) {
            console.warn('シェアするデータがありません');
            return;
        }

        // Web Share APIの対応確認
        if (!navigator.share) {
            this.showError('お使いのブラウザは直接シェアに対応していません。スクショ保存をご利用ください。');
            return;
        }

        try {
            // 結果画面のスクリーンショットを生成（シェア用）
            this.generateResultScreenshot(true);
        } catch (error) {
            console.error('スクリーンショット生成エラー:', error);
            this.showError('スクリーンショットの生成に失敗しました');
        }
    }

    /**
     * 結果画面のスクリーンショットを生成
     * @param {boolean} forShare - シェア用かダウンロード用か
     */
    generateResultScreenshot(forShare = false) {
        const scoreData = this.lastCircleData.scoreData;
        const circleData = this.lastCircleData.circleImageData;

        // Canvasを作成（SNS投稿に適したサイズ）
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 1080x1080のスクエア画像（Instagram等に最適）
        canvas.width = 1080;
        canvas.height = 1080;

        // 背景を描画
        this.drawScreenshotBackground(ctx, canvas.width, canvas.height);

        // タイトルを描画
        this.drawScreenshotTitle(ctx, canvas.width);

        // 円のプレビューを描画（理想円と中心点を含む）
        this.drawScreenshotCircle(ctx, circleData, scoreData.idealCircle, canvas.width, canvas.height);

        // スコア情報を描画
        this.drawScreenshotScore(ctx, scoreData, canvas.width, canvas.height);

        if (forShare) {
            // 直接シェア
            this.shareScreenshotImage(canvas, scoreData);
        } else {
            // ダウンロード
            this.downloadScreenshot(canvas, scoreData);
        }
    }

    /**
     * スクリーンショットの背景を描画
     */
    drawScreenshotBackground(ctx, width, height) {
        // グラデーション背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f3460');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    /**
     * スクリーンショットのタイトルを描画
     */
    drawScreenshotTitle(ctx, width) {
        // メインタイトル（グロー効果付き）
        ctx.save();
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 88px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';
        ctx.shadowBlur = 20;
        ctx.fillText('円を描け！', width / 2, 110);
        ctx.restore();
    }

    /**
     * スクリーンショットの円を描画（理想円と中心点を含む）
     * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
     * @param {Object} circleData - 描画パスデータ
     * @param {Object} idealCircle - 理想円データ（オプション）
     * @param {number} width - キャンバス幅
     * @param {number} height - キャンバス高さ
     */
    drawScreenshotCircle(ctx, circleData, idealCircle, width, height) {
        if (!circleData || !circleData.points || circleData.points.length < 2) {
            return;
        }

        // 円を中央上部に配置（タイトルとスコアの間）
        const centerX = width / 2;
        const centerY = height * 0.35; // 画面の35%の位置（上部寄り）
        const maxSize = 380; // サイズを大きく

        // 元の円の境界を計算
        const bounds = this.calculateBounds(circleData.points);
        const originalWidth = bounds.maxX - bounds.minX;
        const originalHeight = bounds.maxY - bounds.minY;
        const originalSize = Math.max(originalWidth, originalHeight);

        if (originalSize === 0) return;

        // スケールを計算
        const scale = maxSize / originalSize;
        const offsetX = centerX - (bounds.minX + originalWidth / 2) * scale;
        const offsetY = centerY - (bounds.minY + originalHeight / 2) * scale;

        // 理想円を先に描画（背景として）
        if (idealCircle && idealCircle.center && idealCircle.radius > 0) {
            const scaledCenter = {
                x: idealCircle.center.x * scale + offsetX,
                y: idealCircle.center.y * scale + offsetY
            };
            const scaledRadius = idealCircle.radius * scale;

            // 理想円を描画（点線、半透明の青）
            ctx.save();
            ctx.strokeStyle = 'rgba(100, 150, 255, 0.65)';
            ctx.lineWidth = 5;
            ctx.setLineDash([12, 8]);
            ctx.shadowColor = 'rgba(100, 150, 255, 0.4)';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(scaledCenter.x, scaledCenter.y, scaledRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // 中心点を描画（半透明の赤）
            ctx.save();
            const pointColor = 'rgba(255, 100, 100, 0.9)';
            
            // 中心の円（グロー効果）
            ctx.fillStyle = pointColor;
            ctx.shadowColor = 'rgba(255, 100, 100, 0.6)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(scaledCenter.x, scaledCenter.y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // 十字マーカー
            ctx.strokeStyle = pointColor;
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            ctx.shadowBlur = 8;
            const markerSize = 24;
            
            ctx.beginPath();
            ctx.moveTo(scaledCenter.x - markerSize, scaledCenter.y);
            ctx.lineTo(scaledCenter.x + markerSize, scaledCenter.y);
            ctx.moveTo(scaledCenter.x, scaledCenter.y - markerSize);
            ctx.lineTo(scaledCenter.x, scaledCenter.y + markerSize);
            ctx.stroke();
            ctx.restore();
        }

        // 描いた円を描画（前景として）
        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        const firstPoint = circleData.points[0];
        ctx.moveTo(firstPoint.x * scale + offsetX, firstPoint.y * scale + offsetY);

        for (let i = 1; i < circleData.points.length; i++) {
            const point = circleData.points[i];
            ctx.lineTo(point.x * scale + offsetX, point.y * scale + offsetY);
        }

        ctx.stroke();
        ctx.restore();
    }

    /**
     * スクリーンショットのスコア情報を描画
     */
    drawScreenshotScore(ctx, scoreData, width, height) {
        const quality = this.formatScore(scoreData.qualityScore, 3);

        // メインスコア
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 120px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${quality}点`, width / 2, height - 370);

        // 評価レベル（数値として評価）
        const qualityNum = parseFloat(quality);
        let level = '';
        if (qualityNum >= 95) level = 'マスター';
        else if (qualityNum >= 90) level = 'エキスパート';
        else if (qualityNum >= 80) level = '上級者';
        else if (qualityNum >= 70) level = '中級者';
        else if (qualityNum >= 60) level = '初級者';
        else level = '練習中';

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillText(level, width / 2, height - 310);

        // スコア内訳の10段階評価を描画
        if (scoreData.breakdown) {
            this.drawScreenshotScoreBreakdown(ctx, scoreData.breakdown, width, height);
        }

        // URL
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '22px Arial, sans-serif';
        ctx.fillText(window.location.href, width / 2, height - 50);

        // ハッシュタグ
        ctx.font = '26px Arial, sans-serif';
        ctx.fillText('#円を描け #DrawCircle', width / 2, height - 20);
    }

    /**
     * スクリーンショットにスコア内訳の10段階評価を描画
     * @param {CanvasRenderingContext2D} ctx - Canvas描画コンテキスト
     * @param {Object} breakdown - スコア内訳データ（circularity, closure, smoothness）
     * @param {number} width - キャンバス幅
     * @param {number} height - キャンバス高さ
     */
    drawScreenshotScoreBreakdown(ctx, breakdown, width, height) {
        if (!breakdown) {
            console.warn('スコア内訳データが無効です');
            return;
        }

        // 100点満点を10段階に変換（0-10の整数）
        const circularityValue = Math.round(Math.min(100, Math.max(0, breakdown.circularity)) / 10);
        const closureValue = Math.round(Math.min(100, Math.max(0, breakdown.closure)) / 10);
        const smoothnessValue = Math.round(Math.min(100, Math.max(0, breakdown.smoothness)) / 10);

        // スコア内訳の描画位置（スコアの下、URLの上）
        const startY = height - 190;
        const itemWidth = width / 3;
        const boxPadding = 60;
        const boxHeight = 140;

        // 背景ボックス（角丸）
        const boxX = boxPadding;
        const boxY = startY - 60;
        const boxWidth = width - boxPadding * 2;
        const radius = 15;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxWidth - radius, boxY);
        ctx.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius, radius);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
        ctx.arcTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight, radius);
        ctx.lineTo(boxX + radius, boxY + boxHeight);
        ctx.arcTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius, radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.arcTo(boxX, boxY, boxX + radius, boxY, radius);
        ctx.closePath();
        ctx.fill();

        // ボックスの枠線
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 各評価項目を描画
        const items = [
            { label: '円形度', value: circularityValue, x: itemWidth * 0.5 },
            { label: '始点終点距離', value: closureValue, x: itemWidth * 1.5 },
            { label: '滑らかさ', value: smoothnessValue, x: itemWidth * 2.5 }
        ];

        items.forEach((item, index) => {
            // 区切り線（最初の項目以外）
            if (index > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(item.x - itemWidth / 2, startY - 50);
                ctx.lineTo(item.x - itemWidth / 2, startY + 70);
                ctx.stroke();
            }

            // ラベル
            ctx.fillStyle = '#b0b0b0';
            ctx.font = '26px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.label, item.x, startY - 10);

            // 値（10段階評価）- グラデーション効果
            const gradient = ctx.createLinearGradient(0, startY + 10, 0, startY + 60);
            gradient.addColorStop(0, '#00d4ff');
            gradient.addColorStop(1, '#00ff88');
            ctx.fillStyle = gradient;
            ctx.font = 'bold 52px Arial, sans-serif';
            ctx.fillText(`${item.value}/10`, item.x, startY + 50);
        });
    }

    /**
     * スクリーンショットをダウンロード
     */
    downloadScreenshot(canvas, scoreData) {
        try {
            // 画像をBlob形式で生成
            canvas.toBlob((blob) => {
                if (!blob) {
                    this.showError('画像の生成に失敗しました');
                    return;
                }

                // ダウンロードリンクを作成
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;

                // ファイル名を生成（スコアと日時を含む）
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10);
                const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
                const score = Math.round(scoreData.totalScore);
                link.download = `円を描け_${score}点_${dateStr}_${timeStr}.png`;

                // ダウンロードを実行
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // URLを解放
                URL.revokeObjectURL(url);

                this.showSuccess('スクリーンショットを保存しました！');

            }, 'image/png', 0.9);

        } catch (error) {
            console.error('ダウンロードエラー:', error);
            this.showError('ダウンロードに失敗しました');
        }
    }

    /**
     * 直接シェア機能（Web Share API + 画像）
     */
    shareDirectly() {
        if (!this.lastCircleData) {
            console.warn('シェアするデータがありません');
            return;
        }

        try {
            // スクリーンショットを生成してシェア
            this.generateScreenshotForShare();
        } catch (error) {
            console.error('直接シェアエラー:', error);
            this.showError('シェアに失敗しました');
        }
    }

    /**
     * シェア用スクリーンショットを生成
     */
    generateScreenshotForShare() {
        const scoreData = this.lastCircleData.scoreData;
        const circleData = this.lastCircleData.circleImageData;

        // Canvasを作成
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 1080x1080のスクエア画像
        canvas.width = 1080;
        canvas.height = 1080;

        // 背景を描画
        this.drawScreenshotBackground(ctx, canvas.width, canvas.height);

        // タイトルを描画
        this.drawScreenshotTitle(ctx, canvas.width);

        // 円のプレビューを描画（理想円と中心点を含む）
        this.drawScreenshotCircle(ctx, circleData, scoreData.idealCircle, canvas.width, canvas.height);

        // スコア情報を描画
        this.drawScreenshotScore(ctx, scoreData, canvas.width, canvas.height);

        // スコア内訳の10段階評価を描画
        if (scoreData.breakdown) {
            this.drawScreenshotScoreBreakdown(ctx, scoreData.breakdown, canvas.width, canvas.height);
        }

        // 画像をBlobに変換してシェア
        canvas.toBlob((blob) => {
            if (!blob) {
                this.showError('画像の生成に失敗しました');
                return;
            }

            this.shareWithWebAPI(blob, scoreData);

        }, 'image/png', 0.9);
    }

    /**
     * Web Share APIでシェア
     */
    shareWithWebAPI(imageBlob, scoreData) {
        const quality = this.formatScore(scoreData.qualityScore, 3);

        // シェア用テキスト
        const shareText = `「円を描け！」で${quality}点を獲得しました！🎯\n\n完璧な円を目指そう！\n${window.location.href}\n\n#円を描け #DrawCircle`;

        // Web Share API が利用可能で画像シェアに対応している場合
        if (navigator.share && navigator.canShare) {
            const shareData = {
                title: '円を描け！',
                text: shareText,
                files: [new File([imageBlob], 'circle-result.png', { type: 'image/png' })]
            };

            // 画像シェアが可能かチェック
            if (navigator.canShare(shareData)) {
                navigator.share(shareData)
                    .then(() => {
                        console.log('画像付きシェアが完了しました');
                        this.showSuccess('シェアしました！');
                    })
                    .catch((error) => {
                        console.log('画像付きシェアがキャンセルされました:', error);
                        this.fallbackTextShare(shareText);
                    });
                return;
            }
        }

        // フォールバック: テキストのみシェア
        this.fallbackTextShare(shareText);
    }

    /**
     * フォールバック: テキストのみシェア
     */
    fallbackTextShare(shareText) {
        if (navigator.share) {
            navigator.share({
                title: '円を描け！',
                text: shareText,
                url: window.location.href
            }).then(() => {
                console.log('テキストシェアが完了しました');
                this.showSuccess('シェアしました！（画像は別途保存してください）');
            }).catch((error) => {
                console.log('シェアがキャンセルされました:', error);
                this.copyToClipboard(shareText);
            });
        } else {
            // Web Share APIが利用できない場合はクリップボードにコピー
            this.copyToClipboard(shareText);
        }
    }

    /**
     * クリップボードにコピー
     */
    copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showSuccess('結果をクリップボードにコピーしました！');
            }).catch(() => {
                this.showError('コピーに失敗しました');
            });
        } else {
            // 古いブラウザ対応
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();

            try {
                document.execCommand('copy');
                this.showSuccess('結果をクリップボードにコピーしました！');
            } catch (error) {
                this.showError('コピーに失敗しました');
            }

            document.body.removeChild(textArea);
        }
    }

    /**
     * スクリーンショットを直接シェア
     */
    shareScreenshotImage(canvas, scoreData) {
        try {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    this.showError('画像の生成に失敗しました');
                    return;
                }

                // ファイル名を生成
                const quality = this.formatScore(scoreData.qualityScore, 3);
                const fileName = `円を描け_${quality}点.png`;

                // Fileオブジェクトを作成
                const file = new File([blob], fileName, { type: 'image/png' });

                // シェア用テキスト
                const shareText = `「円を描け！」で${quality}点を獲得しました！🎯\n\n完璧な円を目指そう！\n#円を描け #DrawCircle`;

                try {
                    // Web Share APIでシェア
                    await navigator.share({
                        title: '円を描け！',
                        text: shareText,
                        files: [file]
                    });

                    this.showSuccess('シェアしました！');

                } catch (shareError) {
                    // シェアがキャンセルされた場合は、ダウンロードを提案
                    if (shareError.name !== 'AbortError') {
                        this.showError('シェアに失敗しました。スクショ保存をお試しください。');
                    }
                }

            }, 'image/png', 0.9);

        } catch (error) {
            console.error('シェアエラー:', error);
            this.showError('シェアに失敗しました');
        }
    }



    /**
     * エラーメッセージを表示
     */
    showError(message, duration = 3000) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 107, 107, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1100;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, duration);
    }

    /**
     * 成功メッセージを表示
     */
    showSuccess(message, duration = 2000) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 255, 136, 0.9);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            z-index: 1100;
            font-size: 14px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;
        successDiv.textContent = message;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, duration);
    }

    /**
     * すべてのフィードバックをクリア（互換性のため）
     */
    clearFeedback() {
        this.hideResultModal();
    }

    /**
     * リソースのクリーンアップ
     */
    destroy() {
        // タイムアウトのクリア
        if (this.animationState.modalTimeout) {
            clearTimeout(this.animationState.modalTimeout);
        }

        // 参照のクリア
        this.elements = {};
        this.animationState = {
            modalVisible: false,
            modalTimeout: null
        };
    }
}