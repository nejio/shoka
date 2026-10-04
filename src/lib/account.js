import { db, auth } from "./firebase.js";
import {
  collection, getDocs, writeBatch, doc, deleteDoc, query, limit,
} from "firebase/firestore";
import { deleteUser, reauthenticateWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getPrefs } from "./prefs.js";

const BATCH_LIMIT = 450; // Firestoreの上限は500。余裕を持たせる

/** 蔵書と設定をすべて読み出し、書き出し用のオブジェクトにする */
export async function exportAccountData(uid) {
  const snap = await getDocs(collection(db, "users", uid, "books"));
  const books = snap.docs.map((d) => {
    const v = { id: d.id, ...d.data() };
    // Firestoreのタイムスタンプは日時文字列に直す
    ["createdAt", "updatedAt"].forEach((k) => {
      if (v[k] && typeof v[k].toDate === "function") v[k] = v[k].toDate().toISOString();
    });
    return v;
  });
  const prefs = await getPrefs(uid);
  if (prefs.updatedAt && typeof prefs.updatedAt.toDate === "function") {
    prefs.updatedAt = prefs.updatedAt.toDate().toISOString();
  }
  return {
    app: "書架 (Shoka)",
    schema: 2,
    exportedAt: new Date().toISOString(),
    bookCount: books.length,
    prefs,
    books,
  };
}

/** 書き出したデータをファイルとして保存させる */
export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * アカウントを完全に削除する。
 * データ → 認証 の順で消す(認証を先に消すとデータを消す権限を失うため)。
 * @param onProgress 削除した冊数を通知する
 */
export async function deleteAccount(uid, onProgress = () => {}) {
  if (!navigator.onLine) throw new Error("削除にはインターネット接続が必要です");
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("サインインし直してください");

  // 1) 蔵書を450件ずつ削除(必要な分だけ読むので冊数が多くても重くならない)
  const col = collection(db, "users", uid, "books");
  let deleted = 0;
  for (;;) {
    const snap = await getDocs(query(col, limit(BATCH_LIMIT)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    onProgress(deleted);
    if (snap.size < BATCH_LIMIT) break;
  }

  // 2) ユーザー設定を削除
  try {
    await deleteDoc(doc(db, "users", uid));
  } catch {
    // 設定がなくても続行
  }

  // 3) 認証アカウントを削除(最近サインインしていない場合は再認証)
  try {
    await deleteUser(user);
  } catch (e) {
    if (e.code !== "auth/requires-recent-login" && e.code !== "auth/user-token-expired") throw e;
    // 最近サインインしていない場合は本人確認が要る
    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
    } catch (re) {
      if (
        re.code === "auth/popup-blocked" ||
        re.code === "auth/popup-closed-by-user" ||
        re.code === "auth/operation-not-supported-in-this-environment"
      ) {
        throw new Error(
          "本人確認のため、一度サインアウトしてからサインインし直し、もう一度お試しください" +
          "(蔵書のデータは既に削除されています)"
        );
      }
      throw re;
    }
    await deleteUser(auth.currentUser);
  }
}
