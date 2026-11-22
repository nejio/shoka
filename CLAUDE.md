# 書架 (Shoka) — Claude Code 向けプロジェクト指示

読書記録のPWA。React + Firebase + GitHub Pages。日本語で開発する。

公開URL: https://nejio.github.io/shoka/

---

## 最初に読むこと

### 変更を加えたら必ず実行する

```bash
npm test          # 純粋関数のテスト(115件)。UIを変えても必ず通しておく
npm run build     # bundle.js を生成
```

テストが落ちたまま提案しない。落ちたら原因を特定してから進める。

### 版数は3箇所を必ず揃える

デプロイのたびに、次の3つを**同じ番号に**上げる。1つでも忘れると反映されない。

| ファイル | 該当箇所 |
|---|---|
| `index.html` | `<script src="bundle.js?v=NN">` |
| `sw.js` | `const VERSION = "vNN"` |
| `src/version.js` | `BUILD` と `BUILD_LABEL` |

`src/version.js` の値は設定画面の最下部に表示される。
**端末で動いている版はここで確認できる**ので、推測で切り分けない。

### デプロイ

`bundle.js` / `index.html` / `sw.js` をGitHubへ push すれば Pages に反映される。
`fonts/` `icons/` `manifest.json` は変更時のみ。

---

## 構成

```
src/
├─ app.jsx              認証ゲート・タブ・全ハンドラの配線
├─ version.js           版数(ASCIIのみ。findstrで検索できるように)
├─ config.js            Firebase設定とAPIキー(gitignore。config.example.jsを複製して作る)
├─ lib/                 ロジック。原則すべて純粋関数でテストを書く
│   ├─ firebase.js      初期化・オフライン永続化・Google認証
│   ├─ books.js         Firestore CRUD(唯一の書き込み口)
│   ├─ validate.js      入力検証
│   ├─ tags.js          タグ分類(大分類10+形式2、細分93)
│   ├─ progress.js      進捗の単位(ページ/％)
│   ├─ sessions.js      足あとの修正・削除
│   ├─ holding.js       保有状況(紙/電子/図書館/気になる本/手放した)
│   ├─ memo.js          メモの集約と全体検索
│   ├─ study.js         書斎(関心の地図)と知識の地図
│   ├─ stats.js         日別集計・ストリーク
│   ├─ biblio.js        書誌の正規化・タグ推定・著者抽出
│   ├─ biblioApi.js     openBD → Google Books の順に問い合わせ
│   ├─ dedupe.js        重複判定
│   ├─ dates.js         日付(JSTずれ対策)
│   ├─ prefs.js         ユーザー設定(Firestore)
│   └─ account.js       書き出しとアカウント削除
└─ components/          画面。ロジックは持たせずlibを呼ぶ
```

### データ構造

`users/{uid}/books/{id}` — 1冊 = 1ドキュメント

| 項目 | 内容 |
|---|---|
| `status` | `stacked` / `reading` / `finished` / `setaside` |
| `tags` | 配列。先頭が主タグ(色に使う)。旧`tag`も読めるようにしてある |
| `sessions` | `[{date, toPage, memo?}]` 読書の足あと |
| `holding` | `null`(紙で所有) または `{type, service?, dueDate?, returned?}` |
| `progressUnit` | `page` / `percent`。未設定なら保有状況から判定 |
| `rating` | 1〜5 または `null`(未評価) |

`users/{uid}` — オンボーディング表示済みなどの設定

---

## 過去に踏んだ罠(再発させない)

同じ失敗を繰り返さないために記録している。

### Service Workerで成果物を事前取得しない
`bundle.js?v=N` をprecacheすると、`sw.js`だけ先にデプロイされた瞬間に
**古い中身が新しい名前で焼き付き**、以後どれだけ正しくデプロイしても直らない。
現在は「実際に読み込めた時に保存する」方式にしてある。戻さないこと。

### `Number(null)` は `0` になる
`Number.isFinite(0)` は true なので、null を弾いたつもりが通過する。
評価が勝手に星1になる不具合の原因だった。
`validate.js` の `normalizeRating` に集約済み。同種の変換を書くときは注意。

### 日付は `toISOString()` を使わない
UTC変換で日本時間では1日ずれる。`dates.js` の `isoLocal` を使う。

### 1日に複数件あり得るものを単数で持たない
暦の読了記録を `finish`(単数)で持っていたため、同じ日に2冊読むと
上書きされていた。現在は `finished`(配列)。

### Windowsの `findstr` は日本語を検索できない
コンソールがShift-JIS、ファイルがUTF-8のため一致しない。
ビルド確認には**ASCII文字列**(`shoka-build-vNN` など)を使う。

### importし忘れは画面が真っ白になる
`test/imports.test.mjs` が import/export の対応を検証している。
エラー境界(`errorboundary.jsx`)により、壊れてもタブ単位で止まる。

---

## 設計方針

機能を足すときは、この思想に反していないか確認する。

- **積読は消化すべき負債ではなく、関心の地図**。読めという圧をかけない
- **通知は出さない**。想起は画面内の静かな表示に留める(例外: 図書館の返却期限)
- **登録フォームは最小限**。星・タグ以外は「もっと詳しく」の中
- **購買導線は作らない**(書店リンク・価格・セール通知)
- **ロジックはlibに置き、純粋関数にしてテストを書く**。componentsに判断を持たせない

---

## 開発の作法

- 日本語で応答する
- 推測で原因を断定せず、実際にコードを読んで確認する
- 破壊的な変更(データ構造の変更・分類の改訂)は実装前に相談する
- 不具合の原因が自分の実装にある場合は、そう明言する
