# ストーリーズメーカー

## 公開手順（GitHub Pages）
1. このフォルダの中身をGitHubリポジトリの `main` ブランチにアップロード
2. リポジトリの Settings → Pages → Source を **GitHub Actions** にする
3. 数分後に公開URLが発行されます（以降は push するたび自動更新）

## スタンプを追加する
`stamps/カテゴリー名/画像ファイル` の形で画像（png / svg / webp / jpg）を置くだけ。
フォルダ名がタブ名になります。並び順は `01_ドリンク` のように先頭に数字を付けると指定できます（表示では数字は消えます）。

## テンプレートを追加する
`templates/カテゴリー名/〇〇.json` を置くだけ。キャンバスは 1080×1920。座標は各要素の**中心位置**です。
```json
{
  "name": "テンプレート名",
  "background": "#FEF4E8",
  "photo": {"x": 90, "y": 200, "w": 900, "h": 1100},
  "objects": [
    {"type": "text", "text": "文字", "x": 540, "y": 1450, "font": "serif", "fontSize": 96, "fill": "#5D321A"},
    {"type": "stamp", "src": "stamps/03_デコ/heart.svg", "x": 900, "y": 230, "w": 220, "angle": 15}
  ]
}
```
- `font`: `sans`（ゴシック）/ `serif`（明朝）　`photo` を省略すると写真は全面表示
- JSONに誤りがあると、そのテンプレートだけ表示されません（Actionsのログに表示）

## ローカル確認
`node scripts/generate-manifest.mjs` のあと `python3 -m http.server` → http://localhost:8000

## 注意
無料のGitHub Pagesはリポジトリが公開になります。URLを知らない人には見つかりにくいだけで、機密情報は入れないでください。

## 補足
アプリはGitHub上の `stamps` / `templates` フォルダを直接読むため、Source が「Deploy from a branch」でも「GitHub Actions」でも、画像やJSONを追加・削除するだけで反映されます（公開反映に1〜3分、一覧のキャッシュ最大3分）。反映されないときは画面の「初期化」を押してください。`manifest.json` は読み込み失敗時の予備で、無くても動きます。
