import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStudyMap, secondaryTags, groupOf, pickBookOfTheDay, relatedStacked, isStacked, isSetAside } from "../src/lib/study.js";
import { findActiveDuplicate } from "../src/lib/dedupe.js";

const mk = (id, over = {}) => ({
  id, title: "本" + id, tag: "小説", status: "stacked", isbn: null,
  stackedAt: "2026-07-01", coverUrl: null, note: "", sessions: [], ...over,
});

test("buildStudyMap: 群れを冊数の多い順に並べ、読了・見送りは含めない", () => {
  const books = [
    mk("a", { tags: ["経済・経営"] }), mk("b", { tags: ["経済・経営"] }), mk("c", { tags: ["経済・経営"] }),
    mk("d", { tags: ["小説"] }),
    mk("e", { tags: ["歴史"] }), mk("f", { tags: ["歴史"] }),
    mk("z", { tags: ["経済・経営"], status: "finished" }),
    mk("y", { tags: ["経済・経営"], status: "setaside" }),
  ];
  const map = buildStudyMap(books);
  assert.deepEqual(map.map((g) => [g.tag, g.total]), [["経済・経営", 3], ["歴史", 2], ["小説", 1]]);
});

test("buildStudyMap: 群れの中は積んだ日の新しい順", () => {
  const books = [
    mk("a", { tags: ["歴史"], stackedAt: "2026-07-01" }),
    mk("b", { tags: ["歴史"], stackedAt: "2026-07-20" }),
    mk("c", { tags: ["歴史"], stackedAt: "2026-07-10" }),
  ];
  assert.deepEqual(buildStudyMap(books)[0].rest.map((b) => b.id), ["b", "c", "a"]);
});

test("buildStudyMap: 細分は大分類の内側に入り、本は重複しない", () => {
  const books = [
    mk("a", { tags: ["小説", "SF・ファンタジー"] }),
    mk("b", { tags: ["小説", "SF・ファンタジー"] }),
    mk("c", { tags: ["小説", "ミステリ・サスペンス"] }),
    mk("d", { tags: ["小説"] }),
  ];
  const [g] = buildStudyMap(books);
  assert.equal(g.tag, "小説");
  assert.equal(g.total, 4);
  assert.deepEqual(g.subs.map((s) => [s.tag, s.books.length]), [["SF・ファンタジー", 2], ["ミステリ・サスペンス", 1]]);
  assert.equal(g.rest.length, 1);
  const ids = [...g.subs.flatMap((s) => s.books), ...g.rest].map((b) => b.id);
  assert.equal(new Set(ids).size, 4);
});

test("groupOf: 大分類がなければ細分の親、それもなければ自作タグ", () => {
  assert.equal(groupOf(mk("a", { tags: ["経済・経営", "テクノロジー"] })), "経済・経営");
  assert.equal(groupOf(mk("b", { tags: ["金融・投資"] })), "経済・経営"); // 細分だけ→親へ
  assert.equal(groupOf(mk("c", { tags: ["中国EV"] })), "中国EV");         // 自作タグは独立
  assert.equal(groupOf(mk("d", { tag: "技術" })), "技術");                 // 旧タグも独立
});

test("secondaryTags: 群れに使われていない副次タグだけを数える", () => {
  const books = [
    mk("a", { tags: ["小説", "SF・ファンタジー", "海外"] }),
    mk("b", { tags: ["小説", "海外"] }),
    mk("c", { tags: ["歴史", "中国"] }),
  ];
  const sec = secondaryTags(books);
  const map = Object.fromEntries(sec.map((s) => [s.tag, s.count]));
  assert.equal(map["海外"], 2);
  assert.equal(map["中国"], 1);
  assert.equal(map["SF・ファンタジー"], undefined, "細分は群れ内で表示済みなので副次に含めない");
  assert.equal(map["小説"], undefined);
});

test("pickBookOfTheDay: 同じ日なら同じ本、積読がなければnull", () => {
  const books = [mk("a"), mk("b"), mk("c")];
  const p1 = pickBookOfTheDay(books, "2026-07-25");
  const p2 = pickBookOfTheDay(books, "2026-07-25");
  assert.equal(p1.id, p2.id);
  assert.ok(["a", "b", "c"].includes(p1.id));
  assert.equal(pickBookOfTheDay([mk("f", { status: "finished" })], "2026-07-25"), null);
  assert.equal(pickBookOfTheDay([], "2026-07-25"), null);
});

test("pickBookOfTheDay: 日が変われば選び直される可能性がある", () => {
  const books = Array.from({ length: 20 }, (_, i) => mk("b" + i));
  const picks = new Set();
  for (let d = 1; d <= 20; d++) picks.add(pickBookOfTheDay(books, `2026-07-${String(d).padStart(2, "0")}`).id);
  assert.ok(picks.size > 1, "日替わりで複数の本が選ばれる");
});

test("relatedStacked: 同じタグの積読を返し、自分と読了は除く", () => {
  const books = [
    mk("a", { tag: "歴史" }), mk("b", { tag: "歴史" }),
    mk("self", { tag: "歴史", status: "finished" }),
    mk("c", { tag: "SF" }),
  ];
  const rel = relatedStacked(books, "歴史", "self");
  assert.deepEqual(rel.map((b) => b.id), ["a", "b"]);
  assert.equal(relatedStacked(books, "投資", null).length, 0);
});

test("見送りも重複判定の対象(復活扱いにするため)", () => {
  const books = [mk("a", { title: "積読の本", status: "setaside" })];
  const dup = findActiveDuplicate(books, { title: "積読の本" });
  assert.equal(dup?.status, "setaside");
});

test("isStacked / isSetAside", () => {
  assert.ok(isStacked(mk("a")));
  assert.ok(!isStacked(mk("a", { status: "setaside" })));
  assert.ok(isSetAside(mk("a", { status: "setaside" })));
});

/* ---- 書斎(積読+読書中) と 知識の地図(読了) ---- */
import { buildKnowledgeMap, isActive, isFinished } from "../src/lib/study.js";

test("isActive: 積読と読書中が対象、読了・見送りは対象外", () => {
  assert.ok(isActive(mk("a", { status: "stacked" })));
  assert.ok(isActive(mk("b", { status: "reading" })));
  assert.ok(!isActive(mk("c", { status: "finished" })));
  assert.ok(!isActive(mk("d", { status: "setaside" })));
});

test("関心の地図: 読み始めても地図から消えない", () => {
  const stacked = mk("a", { status: "stacked", tags: ["歴史"] });
  const started = mk("a", { status: "reading", tags: ["歴史"], start: "2026-07-20" });
  assert.equal(buildStudyMap([stacked])[0].total, 1);
  assert.equal(buildStudyMap([started])[0].total, 1, "読書中になると消えてしまう");
});

test("知識の地図: 読了のみを集計し、期間で絞り込める", () => {
  const books = [
    mk("a", { status: "finished", end: "2026-07-01", tags: ["歴史"] }),
    mk("b", { status: "finished", end: "2023-05-01", tags: ["歴史"] }),
    mk("c", { status: "finished", end: "2026-06-01", tags: ["テクノロジー"] }),
    mk("d", { status: "stacked", tags: ["歴史"] }),      // 積読は入らない
    mk("e", { status: "reading", tags: ["歴史"] }),      // 読書中も入らない
  ];
  const all = buildKnowledgeMap(books);
  assert.deepEqual(all.map((g) => [g.tag, g.total]), [["歴史", 2], ["テクノロジー", 1]]);

  const recent = buildKnowledgeMap(books, "2026-01-01");
  assert.deepEqual(recent.map((g) => [g.tag, g.total]).sort(), [["テクノロジー", 1], ["歴史", 1]].sort());
});

test("知識の地図: 読了日のない本は除外される", () => {
  const books = [mk("a", { status: "finished", end: null, tags: ["歴史"] })];
  assert.equal(buildKnowledgeMap(books).length, 0);
  assert.ok(isFinished(books[0]));
});
