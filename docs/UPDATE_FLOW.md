# 書架 — 今後のアップデート手順(貼り替え作業ゼロ運用)

## 初回だけやること(今回)

1. このzipを展開し、作業フォルダを1つ決めて置く
   (例: C:\Users\kensu\dev\shoka ← 以後ずっとこのフォルダを使う)
2. `src/config.js` を開き、Google Books APIキーを1回だけ貼る
   (Firebase設定は貼り付け済み)
3. `npm install` → `npm run build` → いつもの3ファイルをアップロード

## 次回以降のアップデート(毎回これだけ)

1. Claudeから受け取ったzipを展開する
2. 中身を**作業フォルダに上書きコピー**する
   (アップデートzipに config.js は入っていないので、設定は絶対に消えない)
3. `npm run build`
4. `bundle.js` / `index.html` / `sw.js` をアップロード

## 安全装置

- `npm run build` は `src/config.js` が無いと明示的なエラーで止まります
  (別フォルダで誤ビルドして YOUR_API_KEY のままデプロイする事故は起きない)
- `findstr "YOUR_API_KEY" bundle.js` の確認はもう不要です
