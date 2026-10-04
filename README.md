# 書架 (Shoka)

読書記録のPWA。読んだ本を積み上げ、関心の地図として眺められる。

https://nejio.github.io/shoka/

## できること

- 読了・読書中・積読・気になる本の記録(バーコード / 書名検索で書誌を自動取得)
- 読書暦(1日1マス、ジャンルの色で塗られる)
- 本棚(月ごとの棚 / 主題別の知識の地図)
- 書斎(積読を関心の地図として俯瞰、見送り機能)
- 覚書(読みながらのメモと感想を時系列で / 全体検索)
- 電子書籍の％進捗、図書館の返却期限、統計

## 開発

```bash
npm install
cp src/config.example.js src/config.js   # 値を自分のものに書き替える
npm test
npm run build
npx serve .                              # http://localhost:3000
```

詳細は `CLAUDE.md`、初期設定は `docs/SETUP.md`、デプロイは `docs/DEPLOY.md`。

## 構成

React + esbuild / Firebase (Firestore + Google認証) / GitHub Pages + Service Worker

外部フレームワークは使わず、ビルド成果物は単一の `bundle.js`。
