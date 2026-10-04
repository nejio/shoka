# 書架 — セットアップ&検証手順(Phase 1+3)

## 初回セットアップ(完了済みの人はスキップ)

1. Firebaseプロジェクト作成、Authentication で Google 有効化
2. 承認済みドメインに `<ユーザー名>.github.io` を追加
3. Firestore Database 作成
4. `src/lib/firebase.js` の firebaseConfig を自分の値に貼り替え
5. `npm install`

## Phase 3 で必要な作業

### Firestoreルールの再公開(必須)

コレクションが `readings` → `books` に変わったため、
Firestoreコンソール > ルール に `firestore.rules` の新しい内容を貼り付けて「公開」。

### 旧テストデータの掃除(任意)

Phase 1 で作った `users/{uid}/readings` のテスト記録は新アプリには表示されません。
残っていても実害はありませんが、消す場合は Firestore コンソールの
「データ」タブから readings コレクションを削除してください。

## ビルドと起動

```bash
npm test        # ユニットテスト14件
npm run dev     # watchビルド(起動しっぱなしが正常)
# 別のコマンドプロンプトで:
npx serve .     # http://localhost:3000 を開く
```

## Phase 3 スモークテスト

- [ ] サインイン後、空の状態で「最初の一冊から〜」が表示される
- [ ] 「読了を記録」で1冊登録 → 読了一覧・本棚・暦(濃いマス)に反映
- [ ] 「読み始めた本」で総ページ数付きで登録 → 読書中カードが出る
- [ ] 「進捗を記録」で到達ページ入力 → %とバーが更新、暦に薄いマスが付く
- [ ] 前回より小さいページを入れる → エラーで弾かれる
- [ ] 総ページ数と同じ値を入れる → 自動で読了フォームが開く
- [ ] 「読了にする」→ 本棚に移動し、詳細に「読書の足あと」が出る
- [ ] 同じ書名をもう一度読了 → 「再」バッジ+詳細に再読比較
- [ ] 詳細から削除(二段確認)できる
- [ ] 機内モードで読了登録 → ⏳表示 → 復帰で消える
- [ ] 統計: 連続読書 / 日別ページ数 / 月別 / タグ変遷が表示される

## 構成

```
shoka/
├── index.html                  # 器(?v= でキャッシュバスティング)
├── build.mjs                   # esbuild
├── firestore.rules             # users/{uid}/books 本人のみ
├── src/
│   ├── app.jsx                 # 認証ゲート・同期バー・タブ・配線
│   ├── lib/
│   │   ├── firebase.js         # 初期化・オフライン永続・Google認証
│   │   ├── books.js            # books CRUD(購読/読了/読書開始/進捗/読了化/削除)
│   │   ├── validate.js         # 入力検証(純粋関数)
│   │   ├── stats.js            # 集計(日別マップ/ページ数/ストリーク)
│   │   └── dates.js            # 日付処理(JSTずれ対策)
│   └── components/
│       ├── common.jsx          # トークン・Stars・TagChip
│       ├── calendar.jsx        # 読書暦(薄/濃)
│       ├── shelf.jsx           # 月別本棚
│       ├── records.jsx         # 登録・読書中カード・一覧
│       ├── stats.jsx           # 統計タブ
│       └── detail.jsx          # 詳細(足あと/再読/削除)
└── test/lib.test.mjs           # ユニットテスト14件
```

## データ設計 v2

`users/{uid}/books/{autoId}`

| フィールド | 型 | 備考 |
|---|---|---|
| title / author / tag | string | tagは既定8種+自由 |
| pages | number \| null | 総ページ数 |
| status | "reading" \| "finished" | |
| start | string | 読始日 |
| end | string \| null | 読了日(読書中はnull) |
| rating | number \| null | 1-5(読書中はnull) |
| note | string | 読了時の感想 |
| sessions | [{date, toPage}] | 到達ページの足あと(本docに埋め込み) |
| isbn / coverUrl | string \| null | Phase 2 で活用 |
| reread | boolean | 読了時に同名判定 |
| createdAt / updatedAt | timestamp | |

## Google Books APIキーの設定(429エラー対策)

キーなしのGoogle Books APIはIP共有クォータのため「HTTP 429」が出やすい。
無料のAPIキーを設定すると自分専用の枠(十分な量)になる。

1. https://console.cloud.google.com を開き、上部のプロジェクト選択で
   Firebaseと同じプロジェクト(shoka)を選ぶ
2. 「APIとサービス」>「ライブラリ」で「Books API」を検索して「有効にする」
3. 「APIとサービス」>「認証情報」>「認証情報を作成」>「APIキー」
4. 作成されたキーの「キーを制限」を開き:
   - アプリケーションの制限: 「ウェブサイト」→ `https://nejio.github.io/*` と
     `http://localhost:*` を追加
   - APIの制限: 「キーを制限」→ Books API のみ
5. キーの文字列を `src/lib/biblioApi.js` の `GOOGLE_BOOKS_KEY = ""` に貼る
6. `npm run build` して再デプロイ

※ リファラ制限済みキーなので bundle.js に含まれて公開されても悪用できない。
