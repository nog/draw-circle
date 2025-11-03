/**
 * ScoreCalculator - スコア計算エンジン
 * 円の品質、スピード、サイズを評価してスコアを計算します
 */
console.log('ScoreCalculator.js が読み込まれました');

class ScoreCalculator {
    constructor() {
        // スコア計算の設定値
        this.config = {
            // 品質スコア設定
            quality: {
                maxScore: 100,
                circularityWeight: 0.5,    // 円形度の重み
                closureWeight: 0.35,       // 閉じ具合の重み
                smoothnessWeight: 0.15     // 滑らかさの重み
            }
        };

        console.log('ScoreCalculator が初期化されました');
    }

    /**
     * 円品質スコアの計算（0-100点）
     * @param {Object} path - 描画パスデータ
     * @returns {number} 品質スコア（0-100）
     */
    calculateCircleQuality(path) {
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
        const clampedScore = Math.max(0, Math.min(100, qualityScore));

        // 小数点以下3桁で丸める
        const finalScore = Math.round(clampedScore * 1000) / 1000;

        console.log(`品質スコア計算: 円形度=${circularity.toFixed(4)}, 閉じ具合=${closure.toFixed(4)}, 滑らかさ=${smoothness.toFixed(4)}, 最終=${finalScore.toFixed(3)}`);

        return finalScore;
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

        // 小数点以下4桁で丸める
        return Math.round(circularityScore * 10000) / 10000;
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

        // 小数点以下4桁で丸める
        return Math.round(closureScore * 10000) / 10000;
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

        // 小数点以下4桁で丸める
        return Math.round(smoothnessScore * 10000) / 10000;
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
     * 最終スコアの計算（品質のみ）
     * @param {number} qualityScore - 品質スコア（0-100）
     * @returns {number} 最終スコア
     */
    calculateTotalScore(qualityScore) {
        // 入力値の検証
        if (qualityScore < 0) {
            console.warn('スコア計算で負の値が検出されました');
            return 0;
        }

        // 品質スコアがそのまま最終スコア
        const finalScore = Math.round(qualityScore);

        console.log(`スコア計算: 品質=${qualityScore} = 最終スコア=${finalScore}`);

        return finalScore;
    }

    /**
     * 包括的なスコア計算
     * @param {Object} path - 描画パスデータ
     * @returns {Object} 完全なスコアデータ
     */
    calculateCompleteScore(path) {
        // 品質スコアを計算
        const qualityScore = this.calculateCircleQuality(path);

        // 最終スコアを計算
        const totalScore = this.calculateTotalScore(qualityScore);

        // スコアデータ構造を作成
        const scoreData = {
            qualityScore,
            totalScore,
            timestamp: Date.now(),
            pathId: path.id || null,
            pointCount: path.points ? path.points.length : 0
        };

        console.log('スコア計算結果:', scoreData);

        return scoreData;
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