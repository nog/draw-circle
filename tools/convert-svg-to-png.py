#!/usr/bin/env python3
"""
SVGをヘッドレスブラウザでPNGに変換するスクリプト
"""
import os
import sys
import base64
from pathlib import Path

# Playwrightのインポートを試みる
try:
    from playwright.sync_api import sync_playwright
    HAS_PLAYWRIGHT = True
except ImportError:
    HAS_PLAYWRIGHT = False
    print("Playwrightがインストールされていません。インストール中...")
    os.system(f"{sys.executable} -m pip install playwright")
    os.system(f"{sys.executable} -m playwright install chromium")
    try:
        from playwright.sync_api import sync_playwright
        HAS_PLAYWRIGHT = True
    except ImportError:
        print("エラー: Playwrightのインストールに失敗しました")
        sys.exit(1)

def convert_svg_to_png(svg_path, png_path, width=1200, height=630):
    """SVGファイルをPNGに変換"""
    svg_path = Path(svg_path).resolve()
    png_path = Path(png_path).resolve()
    
    if not svg_path.exists():
        print(f"エラー: SVGファイルが見つかりません: {svg_path}")
        sys.exit(1)
    
    # SVGファイルを読み込む
    with open(svg_path, 'r', encoding='utf-8') as f:
        svg_content = f.read()
    
    # HTMLページを作成
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ margin: 0; padding: 0; }}
            #svg-container {{ width: {width}px; height: {height}px; }}
        </style>
    </head>
    <body>
        <div id="svg-container">{svg_content}</div>
    </body>
    </html>
    """
    
    print("ヘッドレスブラウザを起動中...")
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': width, 'height': height})
        
        # HTMLをロード
        page.set_content(html_content)
        
        # SVG要素を取得してスクリーンショット
        print("PNGに変換中...")
        svg_element = page.query_selector('#svg-container svg')
        if svg_element:
            svg_element.screenshot(path=str(png_path))
        else:
            # SVG要素が見つからない場合はページ全体をスクリーンショット
            page.screenshot(path=str(png_path))
        
        browser.close()
    
    print(f"✓ PNGファイルを作成しました: {png_path}")
    print(f"  サイズ: {width}x{height}px")

if __name__ == "__main__":
    # スクリプトのディレクトリを取得
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    svg_file = project_root / "images" / "ogp-image.svg"
    png_file = project_root / "images" / "ogp-image.png"
    
    print("=== SVG to PNG Converter ===")
    print(f"入力: {svg_file}")
    print(f"出力: {png_file}")
    print()
    
    convert_svg_to_png(svg_file, png_file)
