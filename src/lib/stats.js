// 集計ロジック(純粋関数)
import { isoLocal } from "./dates.js";
import { deltaToPages } from "./progress.js";

/** 最終到達ページ */
export const lastPage = (b) =>
  b.sessions && b.sessions.length ? b.sessions[b.sessions.length - 1].toPage : 0;

/**
 * 日別の読書活動: date -> { finished: [book], reads: [book] }
 * 1日に複数冊読み終えることがあるので、読了は配列で持つ。
 * finish(単数)にすると後から処理された本で上書きされてしまう。
 */
export function buildDayMap(books) {
  const m = {};
  const at = (d) => (m[d] = m[d] || { finished: [], reads: [] });
  books.forEach((b) => {
    (b.sessions || []).forEach((s) => {
      const e = at(s.date);
      if (!e.reads.includes(b)) e.reads.push(b);
    });
    if (b.status === "finished" && b.end) {
      const e = at(b.end);
      if (!e.finished.includes(b)) e.finished.push(b);
    }
  });
  return m;
}

/** 日別ページ数(セッション差分+セッションなし1日読了の総頁) */
export function buildPagesByDay(books) {
  const m = {};
  books.forEach((b) => {
    let prev = 0;
    (b.sessions || []).forEach((s) => {
      // %で記録している本は、総ページ数が分かる場合だけ実ページ数に換算する
      m[s.date] = (m[s.date] || 0) + deltaToPages(b, s.toPage - prev);
      prev = s.toPage;
    });
    if (b.status === "finished" && !(b.sessions || []).length && b.pages && b.start === b.end) {
      m[b.end] = (m[b.end] || 0) + b.pages;
    }
  });
  return m;
}

/**
 * 「読書した日」(進捗 or 読了)の連続日数。
 * 今日まだ記録していなくても、昨日までの連続は途切れていない扱いにする
 * (朝に開いて「0日」と出て責められているように見えないように)。
 */
export function calcReadingStreak(books, today) {
  const dayMap = buildDayMap(books);
  let n = 0;
  const d = new Date(today + "T00:00:00");
  if (!dayMap[isoLocal(d)]) d.setDate(d.getDate() - 1);
  while (dayMap[isoLocal(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** 直近60日の読了から月換算ペースを返す */
export function monthlyPace(books, today) {
  const from = new Date(today + "T00:00:00");
  from.setDate(from.getDate() - 60);
  const fromStr = isoLocal(from);
  const n = books.filter((b) => b.status === "finished" && b.end >= fromStr && b.end <= today).length;
  return n / 2;
}

/**
 * 統計の主役を判定: "books"(冊数中心) | "pages"(ページ・読書日中心)
 * 月10冊以上の速いペースなら冊数、それ以外はページ・読書日。
 */
export function chooseStatsFocus(books, today) {
  return monthlyPace(books, today) >= 10 ? "books" : "pages";
}

/** 期間内の読書日数(進捗 or 読了があった日) */
export function readingDaysIn(books, fromStr, toStr) {
  const dayMap = buildDayMap(books);
  return Object.keys(dayMap).filter((d) => d >= fromStr && d <= toStr).length;
}
