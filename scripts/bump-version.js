#!/usr/bin/env node

/**
 * index.htmlのキャッシュバスティング用タイムスタンプを更新するスクリプト
 * JavaScriptファイルが更新された時に手動で実行できます
 */

const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');

try {
    // 現在のタイムスタンプを取得
    const currentTimestamp = Date.now();

    // index.htmlを読み込み
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');

    // 現在の値を確認
    const currentMatch = htmlContent.match(/window\.CACHE_BUSTER\s*=\s*(\d+);?/);
    if (currentMatch) {
        console.log(`現在のタイムスタンプ: ${currentMatch[1]}`);
    } else {
        console.warn('⚠️  CACHE_BUSTERが見つかりませんでした');
    }

    // window.CACHE_BUSTER の値を更新（セミコロンの有無に対応）
    const updatedContent = htmlContent.replace(
        /window\.CACHE_BUSTER\s*=\s*\d+;?/,
        `window.CACHE_BUSTER = ${currentTimestamp};`
    );

    // 実際に変更があったか確認
    if (htmlContent === updatedContent) {
        console.warn('⚠️  ファイルが更新されませんでした。パターンが一致していない可能性があります。');
        process.exit(1);
    }

    // index.htmlに書き込み
    fs.writeFileSync(indexHtmlPath, updatedContent, 'utf8');

    const date = new Date(currentTimestamp);
    console.log(`✅ タイムスタンプを更新しました: ${currentTimestamp} (${date.toISOString()})`);

} catch (error) {
    console.error('❌ タイムスタンプ更新に失敗しました:', error.message);
    process.exit(1);
}
