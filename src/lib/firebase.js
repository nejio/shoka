import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "firebase/auth";

import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);

// オフライン永続キャッシュ。書き込みはオフライン中もローカルにキューされ、
// オンライン復帰時に自動送信される。単一タブ運用(PWA)前提。
// オフライン用の保存領域。
// 単一タブ方式(persistentSingleTabManager)は保存領域を1インスタンスが占有するため、
// PWAとブラウザのタブを同時に開いた場合や、OSにPWAを強制終了された場合に
// 占有権が残り、次回起動時にデータを一切読めなくなることがある。
// 複数タブ方式にすると、インスタンス間で調停されるのでこの問題が起きない。
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
} catch (e) {
  // 端末でIndexedDBが使えない等で初期化に失敗した場合も、
  // オフライン保存を諦めるだけで、アプリ自体は動かす
  console.warn("オフライン保存を利用できません", e);
  _db = getFirestore(app);
}
export const db = _db;

export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export async function signIn() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    // PWAスタンドアロンや一部WebViewではpopupが使えないためredirectへ
    if (
      e.code === "auth/popup-blocked" ||
      e.code === "auth/popup-closed-by-user" ||
      e.code === "auth/operation-not-supported-in-this-environment"
    ) {
      await signInWithRedirect(auth, provider);
    } else {
      throw e;
    }
  }
}

export function signOut() {
  return fbSignOut(auth);
}

/** リダイレクト戻りの取りこぼし防止。起動時に一度呼ぶ */
export function resolveRedirect() {
  return getRedirectResult(auth).catch(() => null);
}

export { onAuthStateChanged };
