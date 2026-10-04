// 書斎(積読=知の環境)のロジック(純粋関数)

import { getTags, mainTag, isMajor, subsOf, parentOf, UNTAGGED } from "./tags.js";
import { isGone, isWanted } from "./holding.js";

export const isStacked = (b) => b.status === "stacked";
/** 書斎の地図の対象: 積んである本と、いま読んでいる本 */
export const isActive = (b) => b.status === "stacked" || b.status === "reading";
export const isFinished = (b) => b.status === "finished";
export const isSetAside = (b) => b.status === "setaside";

/**
 * 本が属する大分類を決める。
 * 主タグから順に見て、最初に見つかった大分類。なければ細分の親。
 * どちらもなければ自作タグ(またはその本の主タグ)を独立した群れとして扱う。
 */
export function groupOf(book) {
  const tags = getTags(book);
  const major = tags.find(isMajor);
  if (major) return major;
  for (const t of tags) {
    const p = parentOf(t);
    if (p) return p;
  }
  return tags[0] || UNTAGGED;
}

/**
 * タグの階層地図。渡された本のリストをそのまま集計する(絞り込みは呼び出し側)。
 * 各本はちょうど1回だけ現れる。大分類の群れを作り、内側を細分で小分けする。
 * @returns [{ tag, total, subs: [{ tag, books }], rest: [books] }] 冊数の多い順
 */
export function buildTagMap(list) {
  const groups = {};
  list.forEach((b) => {
    const major = groupOf(b);
    const g = (groups[major] = groups[major] || { tag: major, total: 0, subs: {}, rest: [] });
    g.total++;
    const subList = subsOf(major);
    const sub = getTags(b).find((t) => subList.includes(t));
    if (sub) (g.subs[sub] = g.subs[sub] || []).push(b);
    else g.rest.push(b);
  });

  const recent = (a, b) =>
    String(b.end || b.stackedAt || b.start || "").localeCompare(String(a.end || a.stackedAt || a.start || ""));
  return Object.values(groups)
    .map((g) => ({
      tag: g.tag,
      total: g.total,
      subs: Object.entries(g.subs)
        .map(([tag, books]) => ({ tag, books: [...books].sort(recent) }))
        .sort((a, b) => b.books.length - a.books.length || a.tag.localeCompare(b.tag)),
      rest: [...g.rest].sort(recent),
    }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag));
}

/** 書斎の地図に載る本: 積読・読書中・気になる本。出ていった本は外す */
export const inStudy = (b) => isActive(b) && !isGone(b);

/**
 * 関心の地図: これから読む本 + いま読んでいる本 + 気になる本。
 * 手放した本・返却済みの図書館本は「これから読む予定」ではないので外す。
 */
export function buildStudyMap(books) {
  return buildTagMap(books.filter(inStudy));
}

/** 分布バー用: 手元にある本のみ(気になる本を混ぜると分布が歪む) */
export function buildOwnedMap(books) {
  return buildTagMap(books.filter((b) => inStudy(b) && !isWanted(b)));
}

/**
 * 知識の地図: 読み終えた本の主題別分布。
 * @param fromDate 指定するとその日以降の読了のみ(直近1年など)
 */
export function buildKnowledgeMap(books, fromDate = null) {
  return buildTagMap(
    books.filter((b) => isFinished(b) && b.end && (!fromDate || b.end >= fromDate))
  );
}

/**
 * 主タグ以外に付けられているタグの分布(副次的な関心)。
 * 群れの配置には使わないが、統計としては意味があるので別に出す。
 */
export function secondaryTags(list, limit = 8) {
  const tally = {};
  list.forEach((b) => {
    const g = groupOf(b);
    getTags(b).forEach((t) => {
      if (t !== g && !subsOf(g).includes(t)) tally[t] = (tally[t] || 0) + 1;
    });
  });
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

/** 日付から決定的に整数を作る(同じ日は同じ結果) */
function dayHash(dateStr) {
  let h = 0;
  for (const ch of String(dateStr)) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  return h;
}

/**
 * 今日の一冊: 積読から日替わりで1冊を静かに選ぶ。
 * 同じ日なら何度開いても同じ本(気まぐれに変わらない)。
 */
export function pickBookOfTheDay(books, today) {
  const pool = books.filter((b) => isStacked(b) && !isWanted(b) && !isGone(b));
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return sorted[dayHash(today) % sorted.length];
}

/**
 * 想起: 読了直後、同じタグの積読を返す(最大n冊)。
 * 「同じ関心の本が山にある」と気づかせるための静かな提示。
 */
export function relatedStacked(books, tags, excludeId = null, n = 3) {
  const want = Array.isArray(tags) ? tags : [tags];
  return books
    .filter((b) => isStacked(b) && !isWanted(b) && !isGone(b) && b.id !== excludeId && getTags(b).some((t) => want.includes(t)))
    .slice(0, n);
}
