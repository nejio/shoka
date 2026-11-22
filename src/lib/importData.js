// 書き出したJSON(account.js の exportAccountData)を読み込むための検証と整形(純粋関数)
//
// 方針:
//  - 追加のみ。すでに同じ id の本があれば飛ばす(上書きしない)。
//    書き出したファイルを同じアカウントへ2回取り込んでも、重複しない。
//  - 取り込む項目は、アプリが保存している項目だけ(未知の項目は捨てる)。
//  - 壊れた値は直せる範囲で直し、直せない本は理由つきで読み飛ばす。
//  - 設定(prefs)は取り込まない。

import { isDateStr } from "./dates.js";
import { validateStacked, normalizeRating } from "./validate.js";
import { normalizeHolding } from "./holding.js";

export const MAX_IMPORT_BOOKS = 5000;
const STATUSES = ["stacked", "reading", "finished", "setaside"];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

/** 足あとを整える: 不正な行を捨て、日付順にし、到達点が増えていく行だけ残す */
export function cleanSessions(raw) {
  if (!Array.isArray(raw)) return [];
  const rows = raw
    .filter((s) => s && isDateStr(s.date))
    .map((s) => ({ date: s.date, toPage: Math.round(Number(s.toPage)), memo: String(s.memo || "").trim().slice(0, 2000) }))
    .filter((s) => Number.isFinite(s.toPage) && s.toPage > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const out = [];
  let last = 0;
  rows.forEach((s) => {
    if (s.toPage <= last) return; // 到達点は常に増えていく
    last = s.toPage;
    const v = { date: s.date, toPage: s.toPage };
    if (s.memo) v.memo = s.memo;
    out.push(v);
  });
  return out;
}

/**
 * 1冊分を検証・整形する。
 * @returns { ok: true, value, createdAtMs } | { ok: false, reason }
 *   value は Firestore に書くフィールド(createdAt / updatedAt は含まない)
 */
export function sanitizeBook(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "本のデータではありません" };
  if (!STATUSES.includes(raw.status)) return { ok: false, reason: "状態(積読・読書中・読了・見送り)が不明です" };

  // ISBNが不正でも本自体は取り込む(ISBNだけ落とす)
  const isbnText = String(raw.isbn || "").replace(/[-\s]/g, "");
  const isbn = /^(97[89])?\d{9}[\dX]$/.test(isbnText) ? isbnText : null;
  const base = validateStacked({ ...raw, isbn, title: typeof raw.title === "string" ? raw.title : "" });
  if (!base.ok) return { ok: false, reason: base.error };

  const value = {
    ...base.value,
    status: raw.status,
    holding: normalizeHolding(raw.holding),
    sessions: cleanSessions(raw.sessions),
    note: String(raw.note || "").trim().slice(0, 2000),
    rating: normalizeRating(raw.rating),
    reread: raw.reread === true,
    progressUnit: raw.progressUnit === "percent" || raw.progressUnit === "page" ? raw.progressUnit : null,
    stackedAt: isDateStr(raw.stackedAt) ? raw.stackedAt : null,
    start: isDateStr(raw.start) ? raw.start : null,
    end: isDateStr(raw.end) ? raw.end : null,
  };

  if (value.status === "finished") {
    if (!value.end) return { ok: false, reason: "読了日がありません" };
    if (!value.start || value.start > value.end) value.start = value.end;
  } else {
    value.end = null;
    value.rating = null;
    if (value.status === "reading" && !value.start) return { ok: false, reason: "読始日がありません" };
  }

  const ms = typeof raw.createdAt === "string" ? Date.parse(raw.createdAt) : NaN;
  return { ok: true, value, createdAtMs: Number.isFinite(ms) ? ms : null };
}

/**
 * ファイルの中身(文字列)を解析する。
 * @param text         JSON文字列
 * @param existingIds  すでにある本の id の集合(飛ばす対象)
 * @returns { ok: false, error }
 *        | { ok: true, items: [{ id|null, value, createdAtMs }], existing: 飛ばした冊数, rejected: [{ title, reason }] }
 */
export function parseImport(text, existingIds = new Set()) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "ファイルを読み取れませんでした(JSONではありません)" };
  }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.books) ? data.books : null;
  if (!list) return { ok: false, error: "蔵書のデータが見つかりません。書架から書き出したファイルを選んでください" };
  if (list.length > MAX_IMPORT_BOOKS) {
    return { ok: false, error: `一度に取り込めるのは${MAX_IMPORT_BOOKS}冊までです(このファイルは${list.length}冊)` };
  }

  const seen = new Set(existingIds);
  const items = [];
  const rejected = [];
  let existing = 0;

  list.forEach((raw) => {
    const id = raw && typeof raw.id === "string" && ID_PATTERN.test(raw.id) ? raw.id : null;
    if (id && seen.has(id)) { existing++; return; }
    const r = sanitizeBook(raw);
    if (!r.ok) {
      rejected.push({ title: (raw && typeof raw.title === "string" && raw.title.trim()) || "(書名なし)", reason: r.reason });
      return;
    }
    if (id) seen.add(id);
    items.push({ id, value: r.value, createdAtMs: r.createdAtMs });
  });

  return { ok: true, items, existing, rejected };
}
