import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImport, sanitizeBook, cleanSessions, MAX_IMPORT_BOOKS } from "../src/lib/importData.js";

const finished = (over = {}) => ({
  id: "abc123", title: "本A", author: "著者", tags: ["小説"], pages: 300,
  status: "finished", start: "2026-07-01", end: "2026-07-05", rating: 4, note: "よかった",
  sessions: [{ date: "2026-07-02", toPage: 100 }, { date: "2026-07-05", toPage: 300, memo: "読了" }],
  holding: null, reread: false, createdAt: "2026-07-01T00:00:00.000Z", ...over,
});
const file = (books) => JSON.stringify({ app: "書架 (Shoka)", schema: 2, books });

test("書き出した形のファイルをそのまま取り込める", () => {
  const r = parseImport(file([finished()]));
  assert.ok(r.ok);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].id, "abc123");
  assert.equal(r.items[0].value.title, "本A");
  assert.equal(r.items[0].value.tag, "小説");
  assert.equal(r.items[0].createdAtMs, Date.parse("2026-07-01T00:00:00.000Z"));
  assert.deepEqual(r.items[0].value.sessions[1], { date: "2026-07-05", toPage: 300, memo: "読了" });
});

test("同じ id の本は飛ばす(上書きしない・2回取り込んでも増えない)", () => {
  const r = parseImport(file([finished(), finished({ id: "zzz", title: "本B" })]), new Set(["abc123"]));
  assert.equal(r.existing, 1);
  assert.deepEqual(r.items.map((x) => x.id), ["zzz"]);
  // ファイル内の同じ id の重複も1冊だけ
  const dup = parseImport(file([finished(), finished()]));
  assert.equal(dup.items.length, 1);
  assert.equal(dup.existing, 1);
});

test("読めない・形が違うファイルはエラーにする", () => {
  assert.equal(parseImport("これはJSONではない").ok, false);
  assert.equal(parseImport(JSON.stringify({ foo: 1 })).ok, false);
  assert.equal(parseImport(JSON.stringify("文字列")).ok, false);
  // 本の配列だけのファイルも受ける
  assert.ok(parseImport(JSON.stringify([finished()])).ok);
});

test("上限を超えるファイルは受けない", () => {
  const many = Array.from({ length: MAX_IMPORT_BOOKS + 1 }, (_, i) => finished({ id: "x" + i }));
  assert.equal(parseImport(file(many)).ok, false);
});

test("直せない本は理由つきで読み飛ばし、他の本は取り込む", () => {
  const r = parseImport(file([
    finished({ id: "ok1" }),
    finished({ id: "bad1", title: "  " }),               // 書名なし
    finished({ id: "bad2", title: "状態不明", status: "???" }),
    finished({ id: "bad3", title: "読了日なし", end: null }),
    { id: "bad4", title: "読始日なし", status: "reading" },
    null,
  ]));
  assert.deepEqual(r.items.map((x) => x.id), ["ok1"]);
  assert.equal(r.rejected.length, 5);
  assert.ok(r.rejected.every((x) => x.reason));
});

test("壊れた値は直して取り込む(ISBN・日付・評価・読始日)", () => {
  const r = sanitizeBook(finished({ isbn: "不正", rating: null, start: "2026-08-01", end: "2026-07-05", stackedAt: "昨日" }));
  assert.ok(r.ok);
  assert.equal(r.value.isbn, null);
  assert.equal(r.value.rating, null, "null は未評価のまま(星1にならない)");
  assert.equal(r.value.start, "2026-07-05", "読始日が読了日より後なら読了日に揃える");
  assert.equal(r.value.stackedAt, null);
});

test("積読・読書中は、読了日と評価を持ち込まない", () => {
  const r = sanitizeBook({ title: "積読本", status: "stacked", end: "2026-07-05", rating: 5, tags: ["歴史"] });
  assert.ok(r.ok);
  assert.equal(r.value.end, null);
  assert.equal(r.value.rating, null);
  assert.equal(r.value.reread, false);
});

test("未知の項目は取り込まない(書き込み項目は決まったものだけ)", () => {
  const r = sanitizeBook(finished({ evil: "x", __proto__: { a: 1 }, id: "q", createdAt: "x", updatedAt: "y" }));
  assert.ok(r.ok);
  assert.ok(!("evil" in r.value));
  assert.ok(!("id" in r.value));
  assert.ok(!("createdAt" in r.value));
  assert.equal(r.createdAtMs, null, "日時が読めなければ null(呼び出し側で現在時刻にする)");
});

test("不正な id は取り込み時に新しく振る", () => {
  const r = parseImport(file([finished({ id: "a/b" }), finished({ id: "", title: "別" })]));
  assert.deepEqual(r.items.map((x) => x.id), [null, null]);
});

test("cleanSessions: 不正な行を捨て、日付順にし、到達点が増える行だけ残す", () => {
  const out = cleanSessions([
    { date: "2026-07-03", toPage: 200 },
    { date: "2026-07-01", toPage: 50, memo: " はじまり " },
    { date: "2026-07-02", toPage: 30 },        // 前より小さい → 捨てる
    { date: "bad", toPage: 10 },
    { date: "2026-07-04", toPage: 0 },
    { date: "2026-07-05", toPage: null },       // Number(null)=0 の罠
    null,
  ]);
  assert.deepEqual(out, [{ date: "2026-07-01", toPage: 50, memo: "はじまり" }, { date: "2026-07-03", toPage: 200 }]);
  assert.deepEqual(cleanSessions(undefined), []);
});

test("電子書籍・図書館の保有状況と%単位が保たれる", () => {
  const r = sanitizeBook({
    title: "電子", status: "reading", start: "2026-07-01", progressUnit: "percent",
    holding: { type: "ebook", service: "Kindle", junk: 1 },
    sessions: [{ date: "2026-07-02", toPage: 40 }],
  });
  assert.ok(r.ok);
  assert.deepEqual(r.value.holding, { type: "ebook", service: "Kindle" });
  assert.equal(r.value.progressUnit, "percent");
});
