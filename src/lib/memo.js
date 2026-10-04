// 読書メモの集約と、蔵書全体の検索。
// メモは2種類ある:
//   - 進捗メモ … 読みながら、その時々に書き留めるひとこと(sessions[].memo)
//   - 総括メモ … 読了時の感想、積読の「なぜ気になったか」(book.note)
// どちらも同じ「メモ」として扱い、時系列に並べられるようにする。

import { getTags } from "./tags.js";
import { formatProgress } from "./progress.js";

/** 検索用に文字列を揃える(大文字小文字・前後空白を無視) */
const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * 1冊の本が持つメモをすべて取り出す。
 * @returns [{ id, book, date, text, kind, progress }] 日付の新しい順
 */
export function memosOf(book) {
  const out = [];
  (book.sessions || []).forEach((s, i) => {
    const text = (s.memo || "").trim();
    if (!text) return;
    out.push({
      id: `${book.id}:s${i}`,
      book,
      date: s.date,
      text,
      kind: "progress",
      progress: formatProgress(book, s.toPage),
    });
  });
  const note = (book.note || "").trim();
  if (note) {
    out.push({
      id: `${book.id}:note`,
      book,
      // 読了本は読了日、それ以外は積んだ日/読始日を時点とする
      date: book.end || book.stackedAt || book.start || "",
      text: note,
      kind: book.status === "finished" ? "review" : "why",
      progress: null,
    });
  }
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** 蔵書すべてのメモを日付の新しい順に並べる */
export function allMemos(books) {
  return (books || [])
    .flatMap(memosOf)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** メモを1つでも持つ本の数 */
export function booksWithMemo(books) {
  return (books || []).filter((b) => memosOf(b).length > 0).length;
}

/* ============ 検索 ============ */

/**
 * 蔵書を横断して検索する。
 * 対象は 書名・著者・タグ・メモ(進捗メモと総括メモの両方)。
 * 利用者は「メモを検索している」のではなく「あの話どこで読んだか」を
 * 探しているので、対象を限定しない。
 * 空白区切りの語はすべて含む本だけを返す(AND条件)。
 */
export function searchBooks(books, queryText) {
  const terms = norm(queryText).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return (books || [])
    .map((b) => {
      const memos = memosOf(b);
      const haystack = [
        b.title,
        b.author,
        ...getTags(b),
        b.note,
        ...memos.map((m) => m.text),
      ].map(norm).join(" ");

      if (!terms.every((t) => haystack.includes(t))) return null;

      // どのメモが一致したかを添える(検索結果でその一節を見せるため)
      const hitMemos = memos.filter((m) => terms.some((t) => norm(m.text).includes(t)));
      const inTitle = terms.some((t) => norm(b.title).includes(t));
      return { book: b, memos: hitMemos, inTitle };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 書名に一致したものを先に、次いで新しい順
      if (a.inTitle !== b.inTitle) return a.inTitle ? -1 : 1;
      const da = a.book.end || a.book.start || a.book.stackedAt || "";
      const db = b.book.end || b.book.start || b.book.stackedAt || "";
      return String(db).localeCompare(String(da));
    });
}

/** 一致箇所の前後を切り出して、長いメモを要約表示する */
export function excerpt(text, queryText, span = 40) {
  const t = String(text || "");
  const terms = norm(queryText).split(/\s+/).filter(Boolean);
  const i = terms.length ? norm(t).indexOf(terms[0]) : -1;
  if (i < 0 || t.length <= span * 2) return t;
  const from = Math.max(0, i - span);
  const to = Math.min(t.length, i + span);
  return (from > 0 ? "…" : "") + t.slice(from, to) + (to < t.length ? "…" : "");
}
