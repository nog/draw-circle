/**
 * UIManager - ユーザーインターフェース管理クラス
 * 結果モーダル表示とシェア機能を管理します
 */
console.log('UIManager.js が読み込まれました');

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
        
        console.log('UIManager が初期化されました');
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
        
        console.log('UIManager の初期化が完了しました');
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
            
            // プレビューキャンバスに円を描画
            this.drawCirclePreview(circleImageData);
            
            // スコア情報を更新
            this.updateScoreDisplay(scoreData);
            
            // 評価メッセージを更新
            this.updateEvaluationMessage(scoreData);
            
            // モーダルを表示
            this.elements.resultModal.classList.add('show');
            this.animationState.modalVisible = true;
            
            console.log('結果モーダルを表示しました:', scoreData);
            
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
        
        console.log('結果モーダルを非表示にしました');
    }
    
    /**
     * スコア表示を更新
     */
    updateScoreDisplay(scoreData) {
        // メインスコア更新（品質スコアと同じ）
        if (this.elements.mainScore) {
            this.elements.mainScore.textContent = Math.round(scoreData.qualityScore);
        }
    }
    
    /**
     * 円のプレビューを描画
     */
    drawCirclePreview(circleImageData) {
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
            
            // 中央配置のオフセットを計算
            const offsetX = (canvas.width - originalWidth * scale) / 2 - bounds.minX * scale;
            const offsetY = (canvas.height - originalHeight * scale) / 2 - bounds.minY * scale;
            
            // 描画スタイルを設定
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 8;
            
            // 円を描画
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
        
        // 円のプレビューを描画
        this.drawScreenshotCircle(ctx, circleData, canvas.width, canvas.height);
        
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
        
        // 装飾的な円形パターン
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(width * 0.8, height * 0.2, 100 + i * 50, 0, 2 * Math.PI);
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
    
    /**
     * スクリーンショットのタイトルを描画
     */
    drawScreenshotTitle(ctx, width) {
        // メインタイトル
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 80px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('円を描け！', width / 2, 120);
        
        // サブタイトル
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '32px Arial, sans-serif';
        ctx.fillText('完璧な円を目指そう', width / 2, 170);
    }
    
    /**
     * スクリーンショットの円を描画
     */
    drawScreenshotCircle(ctx, circleData, width, height) {
        if (!circleData || !circleData.points || circleData.points.length < 2) {
            return;
        }
        
        // 円を中央に大きく描画
        const centerX = width / 2;
        const centerY = height / 2 - 50;
        const maxSize = 300;
        
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
        
        // 円を描画
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        
        ctx.beginPath();
        const firstPoint = circleData.points[0];
        ctx.moveTo(firstPoint.x * scale + offsetX, firstPoint.y * scale + offsetY);
        
        for (let i = 1; i < circleData.points.length; i++) {
            const point = circleData.points[i];
            ctx.lineTo(point.x * scale + offsetX, point.y * scale + offsetY);
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    /**
     * スクリーンショットのスコア情報を描画
     */
    drawScreenshotScore(ctx, scoreData, width, height) {
        const quality = Math.round(scoreData.qualityScore);
        
        // メインスコア
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 140px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${quality}点`, width / 2, height - 200);
        
        // 評価レベル
        let level = '';
        if (quality >= 95) level = 'マスター';
        else if (quality >= 90) level = 'エキスパート';
        else if (quality >= 80) level = '上級者';
        else if (quality >= 70) level = '中級者';
        else if (quality >= 60) level = '初級者';
        else level = '練習中';
        
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.fillText(level, width / 2, height - 130);
        
        // URL
        ctx.fillStyle = '#a0a0a0';
        ctx.font = '24px Arial, sans-serif';
        ctx.fillText(window.location.href, width / 2, height - 80);
        
        // ハッシュタグ
        ctx.font = '28px Arial, sans-serif';
        ctx.fillText('#円を描け #DrawCircle', width / 2, height - 40);
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
        
        // 円のプレビューを描画
        this.drawScreenshotCircle(ctx, circleData, canvas.width, canvas.height);
        
        // スコア情報を描画
        this.drawScreenshotScore(ctx, scoreData, canvas.width, canvas.height);
        
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
        const score = Math.round(scoreData.totalScore);
        const quality = Math.round(scoreData.qualityScore);
        const timeInSeconds = (scoreData.drawingTime / 1000).toFixed(1);
        
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
                const score = Math.round(scoreData.totalScore);
                const fileName = `円を描け_${score}点.png`;
                
                // Fileオブジェクトを作成
                const file = new File([blob], fileName, { type: 'image/png' });
                
                // シェア用テキスト
                const shareText = `「円を描け！」で${score}点を獲得しました！🎯\n\n完璧な円を目指そう！\n#円を描け #DrawCircle`;
                
                try {
                    // Web Share APIでシェア
                    await navigator.share({
                        title: '円を描け！',
                        text: shareText,
                        files: [file]
                    });
                    
                    this.showSuccess('シェアしました！');
                    console.log('画像シェアが完了しました');
                    
                } catch (shareError) {
                    console.log('シェアがキャンセルされました:', shareError);
                    
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
        
        console.log('UIManager が破棄されました');
    }
}