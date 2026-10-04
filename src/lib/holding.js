// 保有状況(holding)。読書の進行(status)とは直交する軸。
// 未設定(null) = 紙で所有 とみなす。バーコードで登録できる本は物理的に持っているため。

import { isDateStr, todayLocal } from "./dates.js";

export const HOLDING_TYPES = [
  ["paper", "紙で所有"],
  ["ebook", "電子書籍"],
  ["library", "図書館"],
  ["wanted", "気になる本"],
  ["released", "手放した"],
];

/** 主要な電子書籍サービス(自由入力も可) */
export const EBOOK_SERVICES = [
  "Kindle", "楽天Kobo", "BOOK☆WALKER", "Apple Books",
  "Google Play ブックス", "honto", "ebookjapan", "DMMブックス",
];

export const holdingType = (book) => book?.holding?.type || "paper";

export function holdingLabel(book) {
  const h = book?.holding;
  if (!h || h.type === "paper") return "紙で所有";
  if (h.type === "ebook") return h.service ? `電子書籍(${h.service})` : "電子書籍";
  if (h.type === "library") return h.returned ? "図書館(返却済み)" : "図書館";
  if (h.type === "wanted") return "気になる本";
  if (h.type === "released") return "手放した";
  return "紙で所有";
}

/** まだ入手していない「気になる本」か */
export const isWanted = (book) => book?.holding?.type === "wanted";

/** いま手元にあるか。気になる本・手放した本・返却済みの図書館本は手元にない */
export function isInHand(book) {
  const h = book?.holding;
  if (!h) return true;
  if (h.type === "released" || h.type === "wanted") return false;
  if (h.type === "library" && h.returned) return false;
  return true;
}

/**
 * 自分の生活から出ていった本か(手放した・図書館に返した)。
 * 「気になる本」はまだ入ってきていないだけなので、これには含まない。
 */
export function isGone(book) {
  const h = book?.holding;
  if (!h) return false;
  if (h.type === "released") return true;
  if (h.type === "library" && h.returned) return true;
  return false;
}

/** 返却期限が設定されていて、まだ返していない図書館の本か */
export function hasDueDate(book) {
  const h = book?.holding;
  return !!(h && h.type === "library" && !h.returned && isDateStr(h.dueDate));
}

/**
 * 返却期限までの残り日数。期限なしはnull。
 * 0=今日が期限、負=超過。
 */
export function daysUntilDue(book, today = todayLocal()) {
  if (!hasDueDate(book)) return null;
  const due = new Date(book.holding.dueDate + "T00:00:00");
  const now = new Date(today + "T00:00:00");
  return Math.round((due - now) / 86400000);
}

/** 期限の短い表示(例: 返却 8/3 / 返却は明日 / 返却期限すぎ) */
export function dueLabel(book, today = todayLocal()) {
  const d = daysUntilDue(book, today);
  if (d === null) return null;
  if (d < 0) return "返却期限すぎ";
  if (d === 0) return "返却は今日";
  if (d === 1) return "返却は明日";
  const [, m, day] = book.holding.dueDate.split("-");
  return `返却 ${parseInt(m)}/${parseInt(day)}`;
}

/** 期限が近い(3日以内)か超過している */
export function isDueSoon(book, today = todayLocal()) {
  const d = daysUntilDue(book, today);
  return d !== null && d <= 3;
}

/** 入力を検証・正規化する。nullを返したら「未設定(紙で所有)」 */
export function normalizeHolding(input) {
  if (!input || !input.type || input.type === "paper") return null;
  const type = HOLDING_TYPES.some(([k]) => k === input.type) ? input.type : "paper";
  if (type === "paper") return null;

  const out = { type };
  if (type === "wanted") return { type: "wanted" };
  if (type === "ebook") {
    const s = String(input.service || "").trim().slice(0, 40);
    if (s) out.service = s;
  }
  if (type === "library") {
    out.returned = !!input.returned;
    if (!out.returned && isDateStr(input.dueDate)) out.dueDate = input.dueDate;
  }
  return out;
}
