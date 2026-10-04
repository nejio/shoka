# Claude Code への移行手順

現在のフォルダ(Downloads配下)から、独立したリポジトリに移す。

## 1. 配置

```
C:\Users\kensu\
├─ KnowledgeBase\          ← 既存(文書)
│   ├─ PersonalKnowledge\
│   └─ WorkKnowledge\
└─ Projects\               ← 新設(動くもの)
    └─ shoka\
```

知識と成果物を分ける。書架はビルド成果物・依存関係・デプロイ対象を持つため、
メダリオン構造(Bronze→Silver→Gold)には馴染まない。

```cmd
mkdir C:\Users\kensu\Projects
```

## 2. 展開と設定

このzipを `C:\Users\kensu\Projects\shoka` に展開し、設定を作る。

```cmd
cd /d C:\Users\kensu\Projects\shoka
copy src\config.example.js src\config.js
```

`src\config.js` を開き、**現在使っている config.js の中身をそのまま貼る**
(Firebase設定とGoogle Books APIキー)。

```cmd
npm install
npm test
npm run build
```

`npm test` が103件パスすれば移行成功。

## 3. Gitリポジトリにする

既に `nejio/shoka` が存在し、成果物だけが入っている。
ここにソースを加える形にする。

```cmd
git init
git remote add origin https://github.com/nejio/shoka.git
git fetch origin
git checkout -b main
git branch --set-upstream-to=origin/main main
git add .
git commit -m "ソースを含めてGit管理に移行"
git push -u origin main --force
```

`--force` を使うのは、既存リポジトリの履歴(ブラウザからのアップロード)を
このコミットで置き換えるため。**公開中のPagesは直後に再ビルドされる**ので、
`bundle.js` `index.html` `sw.js` が含まれていることを push 前に確認する。

`git status` で `src/config.js` が **表示されない**ことを確認すること
(.gitignore済み。表示されたら中止して .gitignore を見直す)。

## 4. Claude Code で開く

```cmd
cd /d C:\Users\kensu\Projects\shoka
claude
```

`CLAUDE.md` が自動で読まれ、構成・作法・過去に踏んだ罠が共有される。

## 5. 以後のデプロイ

zipの受け渡しは不要になる。

```cmd
npm test
npm run build
git add -A
git commit -m "変更の内容"
git push
```

push すると GitHub Pages に反映される。
**版数3箇所(index.html / sw.js / src/version.js)を揃えるのは今まで通り。**

## 6. PersonalKnowledge に知見を置く

`docs/lessons-pwa.md` を PersonalKnowledge の appdev Domain に配置する。
書架固有ではなく、同じ構成のアプリ全般に効く内容にしてある。

```
PersonalKnowledge\10-appdev\x3-gold\lessons-pwa.md
```

Gold(成熟した知見)に置くのが妥当。新しく踏んだ罠は、
まず Bronze に書き留めて、再現性が確認できたら Gold に上げる運用が合う。

## 変わること

| | これまで | これから |
|---|---|---|
| コードの受け渡し | zipを展開して上書き | 直接編集 |
| 変更箇所の把握 | 手順書を読む | `git diff` |
| 壊したときの復旧 | 手作業 | `git revert` / `git checkout` |
| 「反映されない」の切り分け | 推測 | `git log` と版数表示 |

今回の一連の不具合(Service Workerの焼き付き、評価の星1)は、
バージョン管理があれば切り分けがずっと速かった。
