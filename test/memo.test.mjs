import { test } from "node:test";
import assert from "node:assert/strict";
import { memosOf, allMemos, booksWithMemo, searchBooks, excerpt } from "../src/lib/memo.js";
import { validateSession } from "../src/lib/validate.js";

const finished = {
  id: "a", title: "三体", author: "劉慈欣", tags: ["小説", "SF・ファンタジー"],
  status: "finished", start: "2026-07-28", end: "2026-08-01", pages: 400,
  note: "スケールの跳躍に圧倒された",
  sessions: [
    { date: "2026-07-30", toPage: 120, memo: "第3章の議論が鋭い" },
    { date: "2026-07-31", toPage: 260 },
    { date: "2026-08-01", toPage: 400, memo: "終盤で一気に加速する" },
  ],
};
const stacked = {
  id: "b", title: "積んである本", tags: ["歴史"], status: "stacked",
  stackedAt: "2026-08-05", note: "書評で見かけた", sessions: [],
};
const noMemo = { id: "c", title: "無記録", tags: ["小説"], status: "stacked", sessions: [] };

test("memosOf: 進捗メモと総括メモを取り出す(空メモは除く)", () => {
  const m = memosOf(finished);
  assert.equal(m.length, 3, "進捗メモ2件+感想1件");
  assert.deepEqual(m.map((x) => x.kind).sort(), ["progress", "progress", "review"]);
  // 日付の新しい順
  assert.equal(m[0].date, "2026-08-01");
  // 進捗メモには到達点が添えられる
  const prog = m.find((x) => x.text === "第3章の議論が鋭い");
  assert.equal(prog.progress, "p.120");
});

test("memosOf: 積読の理由は why として扱い、積んだ日を時点にする", () => {
  const m = memosOf(stacked);
  assert.equal(m.length, 1);
  assert.equal(m[0].kind, "why");
  assert.equal(m[0].date, "2026-08-05");
});

test("memosOf: メモが無ければ空", () => {
  assert.deepEqual(memosOf(noMemo), []);
});

test("allMemos: 全蔵書のメモを日付の新しい順に並べる", () => {
  const all = allMemos([finished, stacked, noMemo]);
  assert.equal(all.length, 4);
  assert.equal(all[0].date, "2026-08-05");
  assert.equal(booksWithMemo([finished, stacked, noMemo]), 2);
});

test("検索: 書名・著者・タグ・メモを横断する", () => {
  const books = [finished, stacked, noMemo];
  assert.equal(searchBooks(books, "三体").length, 1);
  assert.equal(searchBooks(books, "劉慈欣").length, 1);
  assert.equal(searchBooks(books, "歴史").length, 1);
  assert.equal(searchBooks(books, "議論").length, 1, "メモの中身で見つかる");
  assert.equal(searchBooks(books, "存在しない語").length, 0);
  assert.equal(searchBooks(books, "").length, 0, "空文字は全件返さない");
});

test("検索: 複数語はすべて含む本だけを返す(AND)", () => {
  const books = [finished, stacked];
  assert.equal(searchBooks(books, "三体 議論").length, 1);
  assert.equal(searchBooks(books, "三体 歴史").length, 0);
});

test("検索: 一致したメモを添え、書名一致を優先して並べる", () => {
  const r = searchBooks([finished], "議論");
  assert.equal(r[0].memos.length, 1);
  assert.equal(r[0].memos[0].text, "第3章の議論が鋭い");

  const other = { ...stacked, id: "z", title: "議論の技術", note: "" };
  const r2 = searchBooks([finished, other], "議論");
  assert.equal(r2[0].book.title, "議論の技術", "書名一致が先");
});

test("excerpt: 長いメモは一致箇所の前後だけを切り出す", () => {
  const long = "あ".repeat(100) + "重要な一節" + "い".repeat(100);
  const e = excerpt(long, "重要");
  assert.ok(e.includes("重要な一節"));
  assert.ok(e.length < long.length);
  assert.ok(e.startsWith("…") && e.endsWith("…"));
  // 短い文はそのまま
  assert.equal(excerpt("短い", "短い"), "短い");
});

test("進捗の記録: メモは任意で、空なら保存しない", () => {
  const withMemo = validateSession({ date: "2026-08-10", toPage: 50, memo: " 面白い " }, 0, 300, "page");
  assert.equal(withMemo.value.memo, "面白い");
  const without = validateSession({ date: "2026-08-10", toPage: 50 }, 0, 300, "page");
  assert.ok(!("memo" in without.value), "空メモは足あとに残さない");
  const blank = validateSession({ date: "2026-08-10", toPage: 50, memo: "   " }, 0, 300, "page");
  assert.ok(!("memo" in blank.value));
});
