// このファイルを src/config.js として複製し、自分の値を入れる。
// config.js は .gitignore に入れてあるので、コミットされない。

// Firebaseコンソール > プロジェクトの設定 > マイアプリ から取得する
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Google Books APIキー(空でも動くが、429エラーが出やすくなる)
// Google Cloud Console で Books API を有効化し、
// リファラ制限(https://<ユーザー名>.github.io/*)をかけたキーを使う
export const GOOGLE_BOOKS_KEY = "";
