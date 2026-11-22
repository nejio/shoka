import { db } from "./firebase.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { validateFinished, validateReadingStart, validateSession, validateFinish, validateStacked, normalizeRating } from "./validate.js";
import { lastPage } from "./stats.js";
import { normalizeTags, getTags } from "./tags.js";
import { normalizeHolding } from "./holding.js";
import { progressUnit, progressMax, lastProgress, reachedEnd } from "./progress.js";
import { editSessionProgress, removeSession, sameSessionAt, STALE_SESSION_MESSAGE } from "./sessions.js";
import { writeBatch, runTransaction } from "firebase/firestore";

const col = (uid) => collection(db, "users", uid, "books");
const ref = (uid, id) => doc(db, "users", uid, "books", id);

/**
 * 足あと(sessions 配列)を含む更新を、できるだけ他の端末の変更を壊さずに行う。
 * sessions は配列を丸ごと書く作りなので、古い画面の内容で書くと、
 * 別の端末で増えた足あとを消してしまう。
 *  - オンライン: 書く直前にサーバーの最新を読み直し、その本に build を当てて書く
 *  - オフライン(または応答が遅いとき): 手元の本に build を当てて従来どおり書く。
 *    トランザクションはオフラインでは使えず、オフライン記録を殺さないための妥協
 * build(本, 最新を読み直したか) は更新するフィールドを返す。不正なら Error を投げる。
 */
const TX_TIMEOUT_MS = 5000;
const isOfflineError = (e) =>
  e && (e.code === "unavailable" || e.code === "deadline-exceeded" || /offline|timeout/i.test(e.message || ""));

async function updateWithLatest(uid, book, build) {
  const r = ref(uid, book.id);
  if (typeof navigator === "undefined" || navigator.onLine !== false) {
    let timer;
    try {
      return await Promise.race([
        runTransaction(db, async (tx) => {
          const snap = await tx.get(r);
          if (!snap.exists()) throw new Error("この本はすでに削除されています");
          const fields = build({ id: book.id, ...snap.data() }, true);
          tx.update(r, { ...fields, updatedAt: serverTimestamp() });
          return fields;
        }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), TX_TIMEOUT_MS); }),
      ]);
    } catch (e) {
      if (!isOfflineError(e)) throw e; // 入力の不備や「別の端末で変わった」はそのまま見せる
    } finally {
      clearTimeout(timer);
    }
  }
  const fields = build(book, false);
  await updateDoc(r, { ...fields, updatedAt: serverTimestamp() });
  return fields;
}

/** 番号指定の編集用: 最新を読み直せたときだけ、画面に出ていた足あとと同じか照合する */
const assertSameSession = (shown, latest, fresh, index) => {
  if (fresh && !sameSessionAt(shown, latest, index)) throw new Error(STALE_SESSION_MESSAGE);
};

/**
 * 蔵書を購読。orderByは単一フィールド(複合インデックス不要)にし、
 * 表示順の細かい制御は各ビューでクライアント側ソートする。
 */
export function subscribeBooks(uid, onData, onError) {
  const q = query(col(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          pending: d.metadata.hasPendingWrites,
        }))
      );
    },
    onError
  );
}

/** 一発読了の登録 */
export async function addFinishedBook(uid, input, existing = []) {
  const v = validateFinished(input);
  if (!v.ok) throw new Error(v.error);
  const reread = existing.some((b) => b.status === "finished" && b.title === v.value.title);
  const r = await addDoc(col(uid), {
    ...v.value,
    status: "finished",
    holding: normalizeHolding(input.holding),
    sessions: [],
    reread,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

/** 読み始めた本の登録(読書中) */
export async function addReadingBook(uid, input) {
  const v = validateReadingStart(input);
  if (!v.ok) throw new Error(v.error);
  const r = await addDoc(col(uid), {
    ...v.value,
    status: "reading",
    holding: normalizeHolding(input.holding),
    progressUnit: input.progressUnit || null,
    end: null,
    rating: null,
    note: "",
    sessions: [],
    reread: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

/** 進捗(到達ページ)を追加 */
export async function addSession(uid, book, session) {
  let added;
  await updateWithLatest(uid, book, (b) => {
    const v = validateSession(session, lastProgress(b), progressMax(b), progressUnit(b));
    if (!v.ok) throw new Error(v.error);
    added = v.value;
    return { sessions: [...(b.sessions || []), v.value].sort((x, y) => x.date.localeCompare(y.date)) };
  });
  return added;
}

/** 読書中→読了 */
export async function finishBook(uid, book, input, existing = []) {
  const v = validateFinish(input);
  if (!v.ok) throw new Error(v.error);
  const { end, rating, note } = v.value;
  const reread = existing.some(
    (b) => b.id !== book.id && b.status === "finished" && b.title === book.title
  );
  await updateWithLatest(uid, book, (b) => {
    // 読了日に到達記録がなければ最終ページのセッションを補完(暦に読了日を刻む)
    let sessions = b.sessions || [];
    const max = progressMax(b);
    if (max && (!sessions.length || sessions[sessions.length - 1].date !== end)) {
      const lp = lastProgress(b);
      if (max > lp) {
        sessions = [...sessions, { date: end, toPage: max }].sort((x, y) =>
          x.date.localeCompare(y.date)
        );
      }
    }
    return {
      status: "finished",
      start: b.start || end, // 積読からの直接読了化は読始日を読了日で補完
      end,
      rating,
      note,
      sessions,
      reread,
    };
  });
}

export async function deleteBook(uid, id) {
  await deleteDoc(ref(uid, id));
}

/** タグを変更(複数タグ。先頭が主タグ=色に使われる) */
export async function updateTags(uid, id, tags) {
  const arr = normalizeTags(tags);
  await updateDoc(ref(uid, id), { tags: arr, tag: arr[0], updatedAt: serverTimestamp() });
}

/** タグ名を一括変更(該当する全書籍を更新)。toが既存タグなら統合になる */
export async function renameTagEverywhere(uid, books, from, to) {
  const target = String(to || "").trim().slice(0, 20);
  if (!target) throw new Error("新しいタグ名を入力してください");
  const affected = books.filter((b) => getTags(b).includes(from));
  if (!affected.length) return 0;
  const batch = writeBatch(db);
  affected.forEach((b) => {
    const next = normalizeTags(getTags(b).map((t) => (t === from ? target : t)));
    batch.update(ref(uid, b.id), { tags: next, tag: next[0], updatedAt: serverTimestamp() });
  });
  await batch.commit();
  return affected.length;
}

/** タグを削除(該当する全書籍から取り除く。空になる本は未分類に) */
export async function deleteTagEverywhere(uid, books, tag) {
  const affected = books.filter((b) => getTags(b).includes(tag));
  if (!affected.length) return 0;
  const batch = writeBatch(db);
  affected.forEach((b) => {
    const next = normalizeTags(getTags(b).filter((t) => t !== tag));
    batch.update(ref(uid, b.id), { tags: next, tag: next[0], updatedAt: serverTimestamp() });
  });
  await batch.commit();
  return affected.length;
}

/** 積読の登録(持っているが未着手) */
export async function addStackedBook(uid, input) {
  const v = validateStacked(input);
  if (!v.ok) throw new Error(v.error);
  const r = await addDoc(col(uid), {
    ...v.value,
    status: "stacked",
    holding: normalizeHolding(input.holding),
    stackedAt: input.stackedAt || null, // 積んだ日
    start: null,
    end: null,
    rating: null,
    note: (input.note || "").trim().slice(0, 2000), // なぜ気になったか
    sessions: [],
    reread: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return r.id;
}

/** 積読 → 見送り(蔵書には残るが、関心の地図からは退く) */
export async function setAside(uid, id) {
  await updateDoc(ref(uid, id), { status: "setaside", updatedAt: serverTimestamp() });
}

/** 見送り → 積読に戻す */
export async function reviveToStack(uid, id) {
  await updateDoc(ref(uid, id), { status: "stacked", updatedAt: serverTimestamp() });
}

/** 気になる本を入手した(保有状況を紙で所有に戻す) */
export async function markAcquired(uid, id) {
  await updateDoc(ref(uid, id), { holding: null, updatedAt: serverTimestamp() });
}

/** 保有状況を更新(nullで未設定=紙で所有に戻す) */
export async function updateHolding(uid, id, holding) {
  await updateDoc(ref(uid, id), {
    holding: normalizeHolding(holding),
    updatedAt: serverTimestamp(),
  });
}

/** 進捗メモを後から編集する(index番目の足あと) */
export async function updateSessionMemo(uid, book, index, memo) {
  await updateWithLatest(uid, book, (b, fresh) => {
    assertSameSession(book, b, fresh, index);
    const sessions = [...(b.sessions || [])];
    if (!sessions[index]) throw new Error("その記録が見つかりません");
    const text = String(memo || "").trim().slice(0, 2000);
    if (text) sessions[index] = { ...sessions[index], memo: text };
    else { const { memo: _drop, ...rest } = sessions[index]; sessions[index] = rest; }
    return { sessions };
  });
}

/** 足あとの到達点を直す(index番目)。前後の記録の間に収まる値だけ受け付ける */
export async function updateSessionProgress(uid, book, index, toPage) {
  await updateWithLatest(uid, book, (b, fresh) => {
    assertSameSession(book, b, fresh, index);
    const r = editSessionProgress(b, index, toPage);
    if (!r.ok) throw new Error(r.error);
    return { sessions: r.value };
  });
}

/** 足あとを削除する(index番目。メモも一緒に消える) */
export async function deleteSession(uid, book, index) {
  await updateWithLatest(uid, book, (b, fresh) => {
    assertSameSession(book, b, fresh, index);
    const r = removeSession(b, index);
    if (!r.ok) throw new Error(r.error);
    return { sessions: r.value };
  });
}

/** 進捗の単位を変更(ページ ⇄ ％)。記録済みの足あとは消さない */
export async function updateProgressUnit(uid, id, unit) {
  const u = unit === "percent" ? "percent" : "page";
  await updateDoc(ref(uid, id), { progressUnit: u, updatedAt: serverTimestamp() });
}

/** 評価を更新(nullで未評価に戻せる) */
export async function updateRating(uid, id, rating) {
  await updateDoc(ref(uid, id), { rating: normalizeRating(rating), updatedAt: serverTimestamp() });
}

/** 読始日・読了日を更新(順序の妥当性を検証する) */
export async function updateDates(uid, id, { start, end }) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || "");
  if (!ok(start)) throw new Error("読み始めた日の形式が不正です");
  const patch = { start, updatedAt: serverTimestamp() };
  if (end !== null && end !== undefined) {
    if (!ok(end)) throw new Error("読み終えた日の形式が不正です");
    if (start > end) throw new Error("読み始めた日が読み終えた日より後になっています");
    patch.end = end;
  }
  await updateDoc(ref(uid, id), patch);
}

/** 積んだ日を更新 */
export async function updateStackedAt(uid, id, date) {
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("日付の形式が不正です");
  await updateDoc(ref(uid, id), { stackedAt: date || null, updatedAt: serverTimestamp() });
}

/** 積読のひとこと(なぜ気になったか)を更新 */
export async function updateNote(uid, id, note) {
  await updateDoc(ref(uid, id), {
    note: (note || "").trim().slice(0, 2000),
    updatedAt: serverTimestamp(),
  });
}

/** 積読→読書中(読始日を刻む) */
export async function startReading(uid, id, startDate) {
  await updateDoc(ref(uid, id), {
    status: "reading",
    start: startDate,
    updatedAt: serverTimestamp(),
  });
}

/** 書影(とISBN)を後から補完 */
export async function updateCover(uid, id, { coverUrl, isbn = null }) {
  if (!coverUrl) throw new Error("書影が見つかりませんでした");
  const patch = { coverUrl, updatedAt: serverTimestamp() };
  if (isbn) patch.isbn = isbn;
  await updateDoc(ref(uid, id), patch);
}
