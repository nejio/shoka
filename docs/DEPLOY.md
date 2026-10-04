# 書架 — GitHub Pages デプロイ手順(Phase 4)

## 0. 事前ビルド(ローカル)

```bash
cd shokaフォルダ
npm run build
```

`bundle.js` が本番用(minify済み)に更新されます。

## 1. GitHubリポジトリ作成

1. https://github.com/new を開く
2. Repository name: `shoka`(何でも可。URLの一部になります)
3. **Public** を選択(PrivateのPagesは有料プランが必要)
4. 他はそのまま「Create repository」

※ ソースコード(src/)は上げないので、Publicでも設計・configの中身が丸見えになるのは
   bundle.js(難読化済み)と静的ファイルのみです。firebaseConfigは元々公開前提の値です。

## 2. ファイルのアップロード

リポジトリ画面の「uploading an existing file」リンク(または Add file > Upload files)から、
以下を**この構成のまま**ドラッグ&ドロップ:

```
index.html
bundle.js
manifest.json
sw.js
icons/  (フォルダごと: icon-192.png, icon-512.png, apple-touch-icon.png)
```

アップしないもの: src/, node_modules/, package.json, build.mjs, test/, firestore.rules

「Commit changes」で確定。

## 3. GitHub Pages を有効化

1. リポジトリの Settings > Pages
2. Source: 「Deploy from a branch」
3. Branch: `main` / フォルダ `/ (root)` → Save
4. 1〜2分待つと上部に公開URLが表示される:
   `https://<ユーザー名>.github.io/shoka/`

## 4. Firebaseの承認済みドメイン確認

Firebaseコンソール > Authentication > Settings > 承認済みドメイン に
`<ユーザー名>.github.io` があることを確認(前に追加済みのはず)。
なければ追加。これがないとサインインが `auth/unauthorized-domain` で失敗します。

## 5. 動作確認とインストール

1. スマホのChromeで公開URLを開く
2. サインイン → 記録が表示される(ローカルと同じデータが見えれば成功)
3. メニュー(⋮)>「ホーム画面に追加」または「アプリをインストール」
4. ホーム画面の藍色の「書」アイコンから起動 → 全画面(standalone)で開けばPWA化成功

### PWAスモークテスト

- [ ] ホーム画面から起動してサインイン状態が維持されている
- [ ] 機内モードで起動 → アプリが開き、過去の記録が見える(SW+Firestoreキャッシュ)
- [ ] 機内モードのまま読了を1冊登録 → ⏳ → 機内モード解除 → 同期される
- [ ] PCとスマホで同じ記録が見える

## 6. 更新のデプロイ運用(毎回)

コードを変更したら:

1. `npm run build`
2. `index.html` の `bundle.js?v=N` を **+1**
3. `sw.js` の `VERSION = "vN"` を **同じ番号に** +1
4. 変更したファイル(通常 bundle.js / index.html / sw.js)をリポジトリに再アップロード

※ 2と3の番号を揃えるのを忘れると、古いbundleがキャッシュされ続けます。
※ PWAは起動時に新SWを検出→次回起動で切り替わります。即時反映したい場合は
   アプリを完全に閉じて開き直してください。

## トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 404 Not Found | Pagesの反映待ち(数分)。またはBranch設定を確認 |
| サインインできない(unauthorized-domain) | 手順4のドメイン追加 |
| 真っ白な画面 | bundle.jsがアップされていない/?v=とファイルの不一致。F12のConsoleを確認 |
| 更新が反映されない | 手順6の番号上げ忘れ。sw.jsとindex.htmlの両方を確認 |
