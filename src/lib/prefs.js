import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// 端末をまたいで共有したい設定(オンボーディング表示済みなど)を
// users/{uid} のドキュメントに置く。蔵書は users/{uid}/books のサブコレクション。

const prefRef = (uid) => doc(db, "users", uid);

/** 設定を読む。失敗しても空オブジェクトを返し、アプリを止めない */
export async function getPrefs(uid) {
  try {
    const snap = await getDoc(prefRef(uid));
    return snap.exists() ? snap.data() : {};
  } catch {
    return {};
  }
}

/** 設定を部分更新する(失敗しても例外を投げない) */
export async function setPrefs(uid, patch) {
  try {
    await setDoc(prefRef(uid), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
    return true;
  } catch {
    return false;
  }
}
