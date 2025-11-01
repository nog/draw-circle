/**
 * ScoreCalculator - スコア計算エンジン
 * 円の品質、スピード、サイズを評価してスコアを計算します
 */
console.log('ScoreCalculator.js が読み込まれました');

class ScoreCalculator {
    constructor() {
        // スコア計算の設定値
        this.config = {
            // 品質スコア設定（より厳密な評価）
            quality: {
                maxScore: 100,
                circularityWeight: 0.5,    // 円形度の重み（0.4 → 0.5に増加）
                closureWeight: 0.35,       // 閉じ具合の重み（0.3 → 0.35に増加）
                smoothnessWeight: 0.15     // 滑らかさの重み（0.3 → 0.15に減少）
            },
            
            // スピード倍率設定（品質重視のため範囲を縮小）
            speed: {
                maxMultiplier: 1.5,  // 3.0 → 1.5に縮小
                minMultiplier: 0.5,  // 0.1 → 0.5に縮小
                optimalTime: 300,    // 200ms → 300msに緩和
                maxTime: 8000        // 5000ms → 8000msに緩和
            },
            
            // サイズ倍率設定（品質重視のため範囲を縮小）
            size: {
                maxMultiplier: 1.3,  // 3.0 → 1.3に縮小
                minMultiplier: 0.7,  // 0.1 → 0.7に縮小
                minDiameter: 30,     // 50px → 30pxに緩和
                optimalRatio: 0.6    // 0.8 → 0.6に緩和（より小さい円でも高評価）
            }
        };
        
        console.log('ScoreCalculator が初期化されました');
    }
    
    /**
     * 円品質スコアの計算（0-100点）
     * @param {Object} path - 描画パスデータ
     * @param {number} canvasWidth - Canvasの幅
     * @param {number} canvasHeight - Canvasの高さ
     * @returns {number} 品質スコア（0-100）
     */
    calculateCircleQuality(path, canvasWidth = 400, canvasHeight = 400) {
        if (!path || !path.points || path.points.length < 3) {
            return 0;
        }
        
        const points = path.points;
        
        // 円の中心と半径を計算
        const center = this.calculateCenter(points);
        const avgRadius = this.calculateAverageRadius(points, center);
        
        // 各品質要素を計算
        const circularity = this.calculateCircularity(points, center, avgRadius);
        const closure = this.calculateClosure(points);
        const smoothness = this.calculateSmoothness(points);
        
        // 重み付き合計で最終品質スコアを計算
        const qualityScore = 
            circularity * this.config.quality.circularityWeight +
            closure * this.config.quality.closureWeight +
            smoothness * this.config.quality.smoothnessWeight;
        
        // 0-100の範囲にクランプ
        const finalScore = Math.max(0, Math.min(100, qualityScore));
        
        console.log(`品質スコア計算: 円形度=${circularity.toFixed(1)}, 閉じ具合=${closure.toFixed(1)}, 滑らかさ=${smoothness.toFixed(1)}, 最終=${finalScore.toFixed(1)}`);
        
        return Math.round(finalScore);
    }
    
    /**
     * 円の中心座標を計算
     * @param {Array} points - 描画点の配列
     * @returns {Object} 中心座標 {x, y}
     */
    calculateCenter(points) {
        let sumX = 0;
        let sumY = 0;
        
        for (const point of points) {
            sumX += point.x;
            sumY += point.y;
        }
        
        return {
            x: sumX / points.length,
            y: sumY / points.length
        };
    }
    
    /**
     * 平均半径を計算
     * @param {Array} points - 描画点の配列
     * @param {Object} center - 中心座標
     * @returns {number} 平均半径
     */
    calculateAverageRadius(points, center) {
        let sumRadius = 0;
        
        for (const point of points) {
            const radius = Math.sqrt(
                Math.pow(point.x - center.x, 2) + 
                Math.pow(point.y - center.y, 2)
            );
            sumRadius += radius;
        }
        
        return sumRadius / points.length;
    }
    
    /**
     * 円形度を計算（理想的な円からの偏差）
     * @param {Array} points - 描画点の配列
     * @param {Object} center - 中心座標
     * @param {number} avgRadius - 平均半径
     * @returns {number} 円形度スコア（0-100）
     */
    calculateCircularity(points, center, avgRadius) {
        if (avgRadius === 0) return 0;
        
        let sumSquaredDeviation = 0;
        
        for (const point of points) {
            const radius = Math.sqrt(
                Math.pow(point.x - center.x, 2) + 
                Math.pow(point.y - center.y, 2)
            );
            const deviation = Math.abs(radius - avgRadius);
            sumSquaredDeviation += deviation * deviation;
        }
        
        // 標準偏差を計算
        const standardDeviation = Math.sqrt(sumSquaredDeviation / points.length);
        
        // 偏差率を計算（半径に対する偏差の割合）
        const deviationRatio = standardDeviation / avgRadius;
        
        // 円形度スコア（偏差が小さいほど高スコア）
        const circularityScore = Math.max(0, 100 - (deviationRatio * 200));
        
        return circularityScore;
    }
    
    /**
     * 閉じ具合を計算（開始点と終了点の距離）
     * @param {Array} points - 描画点の配列
     * @returns {number} 閉じ具合スコア（0-100）
     */
    calculateClosure(points) {
        if (points.length < 2) return 0;
        
        const startPoint = points[0];
        const endPoint = points[points.length - 1];
        
        // 開始点と終了点の距離
        const distance = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) + 
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        
        // 円の推定直径（描画範囲から計算）
        const bounds = this.calculateBounds(points);
        const estimatedDiameter = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY
        );
        
        if (estimatedDiameter === 0) return 0;
        
        // 距離比率（直径に対する開始終了点距離の割合）
        const distanceRatio = distance / estimatedDiameter;
        
        // 閉じ具合スコア（距離が小さいほど高スコア）
        const closureScore = Math.max(0, 100 - (distanceRatio * 300));
        
        return closureScore;
    }
    
    /**
     * 滑らかさを計算（角度変化の一貫性）
     * @param {Array} points - 描画点の配列
     * @returns {number} 滑らかさスコア（0-100）
     */
    calculateSmoothness(points) {
        if (points.length < 5) return 50; // 点数が少ない場合は中程度のスコア
        
        let angleChanges = [];
        
        // 連続する3点間の角度変化を計算
        for (let i = 2; i < points.length; i++) {
            const p1 = points[i - 2];
            const p2 = points[i - 1];
            const p3 = points[i];
            
            // ベクトルの角度を計算
            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
            
            // 角度差を計算（-π から π の範囲に正規化）
            let angleDiff = angle2 - angle1;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            angleChanges.push(Math.abs(angleDiff));
        }
        
        if (angleChanges.length === 0) return 50;
        
        // 角度変化の標準偏差を計算
        const avgAngleChange = angleChanges.reduce((sum, change) => sum + change, 0) / angleChanges.length;
        const variance = angleChanges.reduce((sum, change) => sum + Math.pow(change - avgAngleChange, 2), 0) / angleChanges.length;
        const standardDeviation = Math.sqrt(variance);
        
        // 滑らかさスコア（標準偏差が小さいほど高スコア）
        const smoothnessScore = Math.max(0, 100 - (standardDeviation * 100));
        
        return smoothnessScore;
    }
    
    /**
     * 描画範囲の境界を計算
     * @param {Array} points - 描画点の配列
     * @returns {Object} 境界情報 {minX, maxX, minY, maxY}
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
     * スピード倍率の計算
     * @param {number} drawingTime - 描画時間（ミリ秒）
     * @returns {number} スピード倍率（0.1-3.0）
     */
    calculateSpeedScore(drawingTime) {
        if (drawingTime <= 0) return this.config.speed.minMultiplier;
        
        const { optimalTime, maxTime, maxMultiplier, minMultiplier } = this.config.speed;
        
        // 最適時間以下の場合は最大倍率
        if (drawingTime <= optimalTime) {
            return maxMultiplier;
        }
        
        // 最大時間以上の場合は最小倍率
        if (drawingTime >= maxTime) {
            return minMultiplier;
        }
        
        // 指数関数的に減少する倍率計算
        // 時間が長くなるほど急激にスコアが下がる
        const timeRatio = (drawingTime - optimalTime) / (maxTime - optimalTime);
        const exponentialDecay = Math.pow(minMultiplier / maxMultiplier, timeRatio);
        const speedMultiplier = maxMultiplier * exponentialDecay;
        
        // 範囲をクランプ
        const finalMultiplier = Math.max(minMultiplier, Math.min(maxMultiplier, speedMultiplier));
        
        console.log(`スピード倍率計算: 時間=${drawingTime}ms, 倍率=${finalMultiplier.toFixed(2)}`);
        
        return Math.round(finalMultiplier * 100) / 100; // 小数点2桁で丸める
    }
    
    /**
     * 描画時間の測定と記録
     * @param {Object} path - 描画パスデータ
     * @returns {number} 描画時間（ミリ秒）
     */
    measureDrawingTime(path) {
        if (!path || !path.startTime || !path.endTime) {
            console.warn('描画時間の測定に必要なデータが不足しています');
            return 0;
        }
        
        const drawingTime = path.endTime - path.startTime;
        
        // 異常に短い時間や長い時間をフィルタリング
        if (drawingTime < 50) {
            console.warn(`描画時間が異常に短いです: ${drawingTime}ms`);
            return 50; // 最小時間を設定
        }
        
        if (drawingTime > 30000) {
            console.warn(`描画時間が異常に長いです: ${drawingTime}ms`);
            return 30000; // 最大時間を設定
        }
        
        console.log(`描画時間測定: ${drawingTime}ms`);
        return drawingTime;
    }
    
    /**
     * 時間に基づく倍率計算アルゴリズム（詳細版）
     * @param {number} drawingTime - 描画時間（ミリ秒）
     * @param {Object} options - 計算オプション
     * @returns {Object} 詳細なスピード分析結果
     */
    analyzeSpeedPerformance(drawingTime, options = {}) {
        const {
            showDetails = false,
            customOptimalTime = null,
            customMaxTime = null
        } = options;
        
        const optimalTime = customOptimalTime || this.config.speed.optimalTime;
        const maxTime = customMaxTime || this.config.speed.maxTime;
        
        // 基本的なスピード倍率
        const speedMultiplier = this.calculateSpeedScore(drawingTime);
        
        // パフォーマンス分類
        let performanceLevel = '';
        let performanceMessage = '';
        
        if (drawingTime <= optimalTime) {
            performanceLevel = 'excellent';
            performanceMessage = '素晴らしいスピードです！';
        } else if (drawingTime <= optimalTime * 2) {
            performanceLevel = 'good';
            performanceMessage = '良いスピードです';
        } else if (drawingTime <= optimalTime * 4) {
            performanceLevel = 'average';
            performanceMessage = '平均的なスピードです';
        } else if (drawingTime <= maxTime) {
            performanceLevel = 'slow';
            performanceMessage = 'もう少し速く描いてみましょう';
        } else {
            performanceLevel = 'very_slow';
            performanceMessage = 'かなりゆっくりです';
        }
        
        const result = {
            drawingTime,
            speedMultiplier,
            performanceLevel,
            performanceMessage,
            isOptimal: drawingTime <= optimalTime,
            timeRatio: drawingTime / optimalTime
        };
        
        if (showDetails) {
            console.log('スピード分析結果:', result);
        }
        
        return result;
    }
    
    /**
     * サイズ倍率の計算
     * @param {number} diameter - 円の直径（ピクセル）
     * @param {number} canvasWidth - Canvasの幅
     * @param {number} canvasHeight - Canvasの高さ
     * @returns {number} サイズ倍率（0.1-3.0）
     */
    calculateSizeScore(diameter, canvasWidth = 400, canvasHeight = 400) {
        if (diameter <= 0) return this.config.size.minMultiplier;
        
        const { minDiameter, optimalRatio, maxMultiplier, minMultiplier } = this.config.size;
        
        // 最大直径を画面サイズから計算
        const maxDiameter = Math.min(canvasWidth, canvasHeight) * optimalRatio;
        
        // 最小直径以下の場合は最小倍率
        if (diameter <= minDiameter) {
            return minMultiplier;
        }
        
        // 最大直径以上の場合は最大倍率
        if (diameter >= maxDiameter) {
            return maxMultiplier;
        }
        
        // 線形に増加する倍率計算
        const sizeRatio = (diameter - minDiameter) / (maxDiameter - minDiameter);
        const sizeMultiplier = minMultiplier + (maxMultiplier - minMultiplier) * sizeRatio;
        
        // 範囲をクランプ
        const finalMultiplier = Math.max(minMultiplier, Math.min(maxMultiplier, sizeMultiplier));
        
        console.log(`サイズ倍率計算: 直径=${diameter.toFixed(1)}px, 最大=${maxDiameter.toFixed(1)}px, 倍率=${finalMultiplier.toFixed(2)}`);
        
        return Math.round(finalMultiplier * 100) / 100; // 小数点2桁で丸める
    }
    
    /**
     * 円の直径を計算
     * @param {Array} points - 描画点の配列
     * @returns {number} 円の直径（ピクセル）
     */
    calculateDiameter(points) {
        if (!points || points.length < 2) {
            return 0;
        }
        
        // 描画範囲の境界を取得
        const bounds = this.calculateBounds(points);
        
        // 幅と高さから直径を計算（より大きい方を採用）
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const diameter = Math.max(width, height);
        
        console.log(`直径計算: 幅=${width.toFixed(1)}px, 高さ=${height.toFixed(1)}px, 直径=${diameter.toFixed(1)}px`);
        
        return diameter;
    }
    
    /**
     * より正確な円の直径計算（中心からの最大距離を使用）
     * @param {Array} points - 描画点の配列
     * @returns {number} 円の直径（ピクセル）
     */
    calculateDiameterFromCenter(points) {
        if (!points || points.length < 2) {
            return 0;
        }
        
        // 円の中心を計算
        const center = this.calculateCenter(points);
        
        // 中心からの最大距離を求める
        let maxDistance = 0;
        for (const point of points) {
            const distance = Math.sqrt(
                Math.pow(point.x - center.x, 2) + 
                Math.pow(point.y - center.y, 2)
            );
            maxDistance = Math.max(maxDistance, distance);
        }
        
        // 直径は最大距離の2倍
        const diameter = maxDistance * 2;
        
        console.log(`中心基準直径計算: 中心=(${center.x.toFixed(1)}, ${center.y.toFixed(1)}), 最大距離=${maxDistance.toFixed(1)}px, 直径=${diameter.toFixed(1)}px`);
        
        return diameter;
    }
    
    /**
     * サイズに基づく倍率計算アルゴリズム（詳細版）
     * @param {Array} points - 描画点の配列
     * @param {number} canvasWidth - Canvasの幅
     * @param {number} canvasHeight - Canvasの高さ
     * @param {Object} options - 計算オプション
     * @returns {Object} 詳細なサイズ分析結果
     */
    analyzeSizePerformance(points, canvasWidth = 400, canvasHeight = 400, options = {}) {
        const {
            showDetails = false,
            useAccurateDiameter = true,
            customMinDiameter = null
        } = options;
        
        // 直径を計算（正確な方法または境界ベース）
        const diameter = useAccurateDiameter 
            ? this.calculateDiameterFromCenter(points)
            : this.calculateDiameter(points);
        
        // サイズ倍率を計算
        const sizeMultiplier = this.calculateSizeScore(diameter, canvasWidth, canvasHeight);
        
        // 画面サイズに対する比率
        const maxPossibleDiameter = Math.min(canvasWidth, canvasHeight) * this.config.size.optimalRatio;
        const screenRatio = diameter / maxPossibleDiameter;
        
        // サイズ分類
        let sizeLevel = '';
        let sizeMessage = '';
        
        if (diameter >= maxPossibleDiameter * 0.8) {
            sizeLevel = 'excellent';
            sizeMessage = '素晴らしい大きさです！';
        } else if (diameter >= maxPossibleDiameter * 0.6) {
            sizeLevel = 'good';
            sizeMessage = '良いサイズです';
        } else if (diameter >= maxPossibleDiameter * 0.4) {
            sizeLevel = 'average';
            sizeMessage = '平均的なサイズです';
        } else if (diameter >= this.config.size.minDiameter) {
            sizeLevel = 'small';
            sizeMessage = 'もう少し大きく描いてみましょう';
        } else {
            sizeLevel = 'very_small';
            sizeMessage = 'かなり小さいです';
        }
        
        const result = {
            diameter,
            sizeMultiplier,
            sizeLevel,
            sizeMessage,
            screenRatio,
            maxPossibleDiameter,
            isOptimal: diameter >= maxPossibleDiameter * 0.8
        };
        
        if (showDetails) {
            console.log('サイズ分析結果:', result);
        }
        
        return result;
    }
    
    /**
     * 最終スコアの計算（品質のみ）
     * @param {number} qualityScore - 品質スコア（0-100）
     * @param {number} speedMultiplier - スピード倍率（参考値として保持）
     * @param {number} sizeMultiplier - サイズ倍率（参考値として保持）
     * @returns {number} 最終スコア
     */
    calculateTotalScore(qualityScore, speedMultiplier, sizeMultiplier) {
        // 入力値の検証
        if (qualityScore < 0) {
            console.warn('スコア計算で負の値が検出されました');
            return 0;
        }
        
        // 品質スコアがそのまま最終スコア
        const finalScore = Math.round(qualityScore);
        
        console.log(`品質のみスコア計算: 品質=${qualityScore} = 最終スコア=${finalScore}`);
        
        return finalScore;
    }
    
    /**
     * 包括的なスコア計算（全要素を統合）
     * @param {Object} path - 描画パスデータ
     * @param {number} canvasWidth - Canvasの幅
     * @param {number} canvasHeight - Canvasの高さ
     * @param {Object} options - 計算オプション
     * @returns {Object} 完全なスコアデータ
     */
    calculateCompleteScore(path, canvasWidth = 400, canvasHeight = 400, options = {}) {
        const {
            showDetails = false,
            useAccurateDiameter = true
        } = options;
        
        // 描画時間を測定
        const drawingTime = this.measureDrawingTime(path);
        
        // 各要素を計算
        const qualityScore = this.calculateCircleQuality(path, canvasWidth, canvasHeight);
        const speedMultiplier = this.calculateSpeedScore(drawingTime);
        
        // 直径を計算
        const diameter = useAccurateDiameter 
            ? this.calculateDiameterFromCenter(path.points)
            : this.calculateDiameter(path.points);
        
        const sizeMultiplier = this.calculateSizeScore(diameter, canvasWidth, canvasHeight);
        
        // 最終スコアを計算
        const totalScore = this.calculateTotalScore(qualityScore, speedMultiplier, sizeMultiplier);
        
        // 詳細分析（オプション）
        const speedAnalysis = showDetails 
            ? this.analyzeSpeedPerformance(drawingTime, { showDetails: false })
            : null;
        
        const sizeAnalysis = showDetails 
            ? this.analyzeSizePerformance(path.points, canvasWidth, canvasHeight, { showDetails: false, useAccurateDiameter })
            : null;
        
        // スコアデータ構造を作成
        const scoreData = {
            // 基本スコア情報
            qualityScore,
            speedMultiplier,
            sizeMultiplier,
            totalScore,
            
            // 測定値
            drawingTime,
            diameter,
            
            // メタデータ
            timestamp: Date.now(),
            pathId: path.id || null,
            pointCount: path.points ? path.points.length : 0,
            
            // 詳細分析（オプション）
            speedAnalysis,
            sizeAnalysis,
            
            // パフォーマンス評価
            performance: this.evaluateOverallPerformance(qualityScore, speedMultiplier, sizeMultiplier)
        };
        
        if (showDetails) {
            console.log('完全スコア計算結果:', scoreData);
        }
        
        return scoreData;
    }
    
    /**
     * 総合パフォーマンス評価
     * @param {number} qualityScore - 品質スコア
     * @param {number} speedMultiplier - スピード倍率
     * @param {number} sizeMultiplier - サイズ倍率
     * @returns {Object} パフォーマンス評価
     */
    evaluateOverallPerformance(qualityScore, speedMultiplier, sizeMultiplier) {
        // 各要素の評価レベルを計算
        const qualityLevel = this.getQualityLevel(qualityScore);
        const speedLevel = this.getSpeedLevel(speedMultiplier);
        const sizeLevel = this.getSizeLevel(sizeMultiplier);
        
        // 総合評価を計算
        const averageScore = (qualityScore + (speedMultiplier * 33.33) + (sizeMultiplier * 33.33)) / 3;
        const overallLevel = this.getOverallLevel(averageScore);
        
        // 改善提案を生成
        const suggestions = this.generateImprovementSuggestions(qualityLevel, speedLevel, sizeLevel);
        
        return {
            qualityLevel,
            speedLevel,
            sizeLevel,
            overallLevel,
            averageScore: Math.round(averageScore),
            suggestions
        };
    }
    
    /**
     * 品質レベルの判定
     * @param {number} qualityScore - 品質スコア
     * @returns {string} 品質レベル
     */
    getQualityLevel(qualityScore) {
        if (qualityScore >= 80) return 'excellent';
        if (qualityScore >= 60) return 'good';
        if (qualityScore >= 40) return 'average';
        if (qualityScore >= 20) return 'poor';
        return 'very_poor';
    }
    
    /**
     * スピードレベルの判定
     * @param {number} speedMultiplier - スピード倍率
     * @returns {string} スピードレベル
     */
    getSpeedLevel(speedMultiplier) {
        if (speedMultiplier >= 2.5) return 'excellent';
        if (speedMultiplier >= 1.5) return 'good';
        if (speedMultiplier >= 0.8) return 'average';
        if (speedMultiplier >= 0.3) return 'slow';
        return 'very_slow';
    }
    
    /**
     * サイズレベルの判定
     * @param {number} sizeMultiplier - サイズ倍率
     * @returns {string} サイズレベル
     */
    getSizeLevel(sizeMultiplier) {
        if (sizeMultiplier >= 2.5) return 'excellent';
        if (sizeMultiplier >= 1.5) return 'good';
        if (sizeMultiplier >= 0.8) return 'average';
        if (sizeMultiplier >= 0.3) return 'small';
        return 'very_small';
    }
    
    /**
     * 総合レベルの判定
     * @param {number} averageScore - 平均スコア
     * @returns {string} 総合レベル
     */
    getOverallLevel(averageScore) {
        if (averageScore >= 80) return 'master';
        if (averageScore >= 60) return 'skilled';
        if (averageScore >= 40) return 'intermediate';
        if (averageScore >= 20) return 'beginner';
        return 'novice';
    }
    
    /**
     * 改善提案の生成
     * @param {string} qualityLevel - 品質レベル
     * @param {string} speedLevel - スピードレベル
     * @param {string} sizeLevel - サイズレベル
     * @returns {Array} 改善提案の配列
     */
    generateImprovementSuggestions(qualityLevel, speedLevel, sizeLevel) {
        const suggestions = [];
        
        // 品質に関する提案
        if (qualityLevel === 'poor' || qualityLevel === 'very_poor') {
            suggestions.push('より丸く、滑らかな円を描くよう心がけましょう');
            suggestions.push('開始点と終了点をできるだけ近づけて閉じた円にしましょう');
        } else if (qualityLevel === 'average') {
            suggestions.push('一定の速度で描くとより滑らかな円になります');
        }
        
        // スピードに関する提案
        if (speedLevel === 'slow' || speedLevel === 'very_slow') {
            suggestions.push('もう少し速く描いてスピードボーナスを獲得しましょう');
        } else if (speedLevel === 'excellent') {
            suggestions.push('素晴らしいスピードです！この調子を保ちましょう');
        }
        
        // サイズに関する提案
        if (sizeLevel === 'small' || sizeLevel === 'very_small') {
            suggestions.push('より大きな円を描いてサイズボーナスを獲得しましょう');
        } else if (sizeLevel === 'excellent') {
            suggestions.push('完璧なサイズです！');
        }
        
        // 総合的な提案
        if (suggestions.length === 0) {
            suggestions.push('素晴らしい円です！この調子で続けましょう');
        }
        
        return suggestions;
    }
    
    /**
     * スコア履歴の管理
     * @param {Object} scoreData - スコアデータ
     * @param {Array} history - 既存の履歴配列
     * @param {number} maxHistory - 最大履歴数
     * @returns {Array} 更新された履歴配列
     */
    updateScoreHistory(scoreData, history = [], maxHistory = 50) {
        // 新しいスコアを履歴に追加
        const updatedHistory = [...history, scoreData];
        
        // 履歴サイズの管理
        if (updatedHistory.length > maxHistory) {
            updatedHistory.shift(); // 古いスコアを削除
        }
        
        return updatedHistory;
    }
    
    /**
     * 統計情報の計算
     * @param {Array} scoreHistory - スコア履歴
     * @returns {Object} 統計情報
     */
    calculateStatistics(scoreHistory) {
        if (!scoreHistory || scoreHistory.length === 0) {
            return {
                totalCircles: 0,
                averageScore: 0,
                bestScore: 0,
                averageQuality: 0,
                averageSpeed: 0,
                averageSize: 0
            };
        }
        
        const totalCircles = scoreHistory.length;
        const totalScore = scoreHistory.reduce((sum, score) => sum + score.totalScore, 0);
        const totalQuality = scoreHistory.reduce((sum, score) => sum + score.qualityScore, 0);
        const totalSpeed = scoreHistory.reduce((sum, score) => sum + score.speedMultiplier, 0);
        const totalSize = scoreHistory.reduce((sum, score) => sum + score.sizeMultiplier, 0);
        
        const bestScore = Math.max(...scoreHistory.map(score => score.totalScore));
        
        return {
            totalCircles,
            averageScore: Math.round(totalScore / totalCircles),
            bestScore,
            averageQuality: Math.round(totalQuality / totalCircles),
            averageSpeed: Math.round((totalSpeed / totalCircles) * 100) / 100,
            averageSize: Math.round((totalSize / totalCircles) * 100) / 100
        };
    }
}