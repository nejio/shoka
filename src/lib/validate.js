import { isDateStr } from "./dates.js";
import { normalizeTags, STARTER_TAGS } from "./tags.js";

// 後方互換のためTAGSを維持(初期タグセット)
export const TAGS = STARTER_TAGS;

const cleanTitle = (s) => (s || "").trim();

const cleanPages = (p) => {
  const n = Math.round(Number(p));
  return Number.isFinite(n) && n > 0 && n <= 10000 ? n : null;
};
const cleanIsbn = (isbn) => String(isbn || "").replace(/[-\s]/g, "");

/**
 * 評価の正規化。1〜5 の整数、それ以外はすべて null(未評価)。
 * null/undefined/空文字/0 を「未評価」として扱う。
 * Number(null) が 0 になる点に注意が必要で、ここで明示的に弾いている。
 */
export function normalizeRating(input) {
  if (input === null || input === undefined || input === "") return null;
  const n = Math.round(Number(input));
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(5, n);
}

function baseFields(input) {
  const title = cleanTitle(input.title);
  if (!title) return { error: "書名は必須です" };
  if (title.length > 200) return { error: "書名が長すぎます" };
  const isbn = cleanIsbn(input.isbn);
  if (isbn && !/^(97[89])?\d{9}[\dX]$/.test(isbn)) return { error: "ISBNの形式が不正です" };
  const tags = normalizeTags(input.tags || input.tag);
  return {
    value: {
      title,
      author: (input.author || "").trim().slice(0, 100),
      tags,
      tag: tags[0], // 旧フィールドも維持(既存コード・ロールバック用)
      pages: cleanPages(input.pages),
      isbn: isbn || null,
      coverUrl: (input.coverUrl || "").trim() || null,
    },
  };
}

/** 一発読了の登録(従来動線) */
export function validateFinished(input) {
  const base = baseFields(input);
  if (base.error) return { ok: false, error: base.error };

  const end = input.end;
  if (!isDateStr(end)) return { ok: false, error: "読了日の形式が不正です" };
  let start = input.start;
  if (!isDateStr(start)) start = end;
  if (start > end) return { ok: false, error: "読始日が読了日より後になっています" };

  // 評価は任意。未指定・null・0 はすべて「未評価」とする。
  // Number(null) は 0 になり isFinite を通ってしまうため、先に弾く必要がある。
  const rating = normalizeRating(input.rating);

  return {
    ok: true,
    value: {
      ...base.value,
      start,
      end,
      rating,
      note: (input.note || "").trim().slice(0, 2000),
    },
  };
}

/** 読み始めた本の登録(読書中) */
export function validateReadingStart(input) {
  const base = baseFields(input);
  if (base.error) return { ok: false, error: base.error };
  const start = input.start;
  if (!isDateStr(start)) return { ok: false, error: "読始日の形式が不正です" };
  return { ok: true, value: { ...base.value, start } };
}

/** 積読の登録(未着手・日付なし) */
export function validateStacked(input) {
  const base = baseFields(input);
  if (base.error) return { ok: false, error: base.error };
  return { ok: true, value: { ...base.value } };
}

/**
 * 進捗セッション(到達点方式)。
 * unit が "percent" なら値は%(上限100)、"page" ならページ番号。
 */
export function validateSession(input, last = 0, max = null, unit = "page") {
  if (!isDateStr(input.date)) return { ok: false, error: "日付の形式が不正です" };
  const pct = unit === "percent";
  const label = (v) => (pct ? `${v}％` : `p.${v}`);
  const toPage = Math.round(Number(input.toPage));
  if (!Number.isFinite(toPage) || toPage <= 0) {
    return { ok: false, error: pct ? "どこまで読んだか(％)を入力してください" : "到達ページを入力してください" };
  }
  if (toPage <= last) return { ok: false, error: `前回(${label(last)})より先を入力してください` };
  const limit = pct ? 100 : max;
  if (limit && toPage > limit) {
    return { ok: false, error: pct ? "100％を超えています" : `総ページ数(${max}p)を超えています` };
  }
  const memo = String(input.memo || "").trim().slice(0, 2000);
  const value = { date: input.date, toPage };
  if (memo) value.memo = memo;   // 空のメモは保存しない(足あとを汚さない)
  return { ok: true, value };
}

/** 読了化(読書中→読了) */
export function validateFinish(input) {
  if (!isDateStr(input.end)) return { ok: false, error: "読了日の形式が不正です" };
  const rating = normalizeRating(input.rating);
  return {
    ok: true,
    value: { end: input.end, rating, note: (input.note || "").trim().slice(0, 2000) },
  };
}
