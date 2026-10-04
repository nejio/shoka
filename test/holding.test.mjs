import { test } from "node:test";
import assert from "node:assert/strict";
import {
  holdingType, holdingLabel, isInHand, isGone, isWanted, hasDueDate, daysUntilDue,
  dueLabel, isDueSoon, normalizeHolding, HOLDING_TYPES,
} from "../src/lib/holding.js";
import { buildStudyMap, buildOwnedMap, buildKnowledgeMap, pickBookOfTheDay, relatedStacked } from "../src/lib/study.js";

const mk = (over = {}) => ({ id: "x", title: "本", status: "stacked", tags: ["歴史"], ...over });

test("未設定は「紙で所有」とみなす", () => {
  const b = mk({});
  assert.equal(holdingType(b), "paper");
  assert.equal(holdingLabel(b), "紙で所有");
  assert.ok(isInHand(b));
});

test("holdingLabel: 種別ごとの表示", () => {
  assert.equal(holdingLabel(mk({ holding: { type: "ebook", service: "Kindle" } })), "電子書籍(Kindle)");
  assert.equal(holdingLabel(mk({ holding: { type: "ebook" } })), "電子書籍");
  assert.equal(holdingLabel(mk({ holding: { type: "library" } })), "図書館");
  assert.equal(holdingLabel(mk({ holding: { type: "library", returned: true } })), "図書館(返却済み)");
  assert.equal(holdingLabel(mk({ holding: { type: "released" } })), "手放した");
});

test("isInHand: 手放した本・返却済みは手元にない", () => {
  assert.ok(isInHand(mk({ holding: { type: "ebook", service: "Kindle" } })));
  assert.ok(isInHand(mk({ holding: { type: "library", dueDate: "2026-08-03" } })));
  assert.ok(!isInHand(mk({ holding: { type: "released" } })));
  assert.ok(!isInHand(mk({ holding: { type: "library", returned: true } })));
});

test("返却期限: 残り日数と表示", () => {
  const b = mk({ holding: { type: "library", dueDate: "2026-08-03" } });
  assert.ok(hasDueDate(b));
  assert.equal(daysUntilDue(b, "2026-08-03"), 0);
  assert.equal(daysUntilDue(b, "2026-08-01"), 2);
  assert.equal(daysUntilDue(b, "2026-08-05"), -2);
  assert.equal(dueLabel(b, "2026-08-03"), "返却は今日");
  assert.equal(dueLabel(b, "2026-08-02"), "返却は明日");
  assert.equal(dueLabel(b, "2026-08-05"), "返却期限すぎ");
  assert.equal(dueLabel(b, "2026-07-20"), "返却 8/3");
});

test("返却期限: 返却済み・期限なし・図書館以外は期限を持たない", () => {
  assert.ok(!hasDueDate(mk({ holding: { type: "library", returned: true, dueDate: "2026-08-03" } })));
  assert.ok(!hasDueDate(mk({ holding: { type: "library" } })));
  assert.ok(!hasDueDate(mk({ holding: { type: "ebook" } })));
  assert.equal(dueLabel(mk({}), "2026-08-01"), null);
});

test("isDueSoon: 3日以内または超過", () => {
  const b = mk({ holding: { type: "library", dueDate: "2026-08-03" } });
  assert.ok(isDueSoon(b, "2026-08-01"));
  assert.ok(isDueSoon(b, "2026-08-05"));
  assert.ok(!isDueSoon(b, "2026-07-25"));
});

test("normalizeHolding: 紙・未設定はnull、余分な項目は落とす", () => {
  assert.equal(normalizeHolding(null), null);
  assert.equal(normalizeHolding({ type: "paper" }), null);
  assert.deepEqual(normalizeHolding({ type: "ebook", service: " Kindle " }), { type: "ebook", service: "Kindle" });
  assert.deepEqual(normalizeHolding({ type: "ebook", service: "", dueDate: "2026-08-03" }), { type: "ebook" });
  assert.deepEqual(
    normalizeHolding({ type: "library", dueDate: "2026-08-03", service: "Kindle" }),
    { type: "library", returned: false, dueDate: "2026-08-03" }
  );
  // 返却済みなら期限は保持しない
  assert.deepEqual(normalizeHolding({ type: "library", returned: true, dueDate: "2026-08-03" }), { type: "library", returned: true });
  assert.deepEqual(normalizeHolding({ type: "unknown" }), null);
});

test("関心の地図: 手放した本・返却済みは外れる", () => {
  const books = [
    mk({ id: "a" }),
    mk({ id: "b", holding: { type: "released" } }),
    mk({ id: "c", holding: { type: "library", returned: true } }),
    mk({ id: "d", holding: { type: "ebook", service: "Kindle" } }),
  ];
  const map = buildStudyMap(books);
  const ids = map.flatMap((g) => [...g.subs.flatMap((s) => s.books), ...g.rest]).map((b) => b.id);
  assert.deepEqual(ids.sort(), ["a", "d"]);
});

test("知識の地図: 手放しても読書履歴は残る", () => {
  const books = [
    mk({ id: "a", status: "finished", end: "2026-07-01", holding: { type: "released" } }),
    mk({ id: "b", status: "finished", end: "2026-07-02", holding: { type: "library", returned: true } }),
  ];
  assert.equal(buildKnowledgeMap(books)[0].total, 2, "売却・返却で履歴が消えてはいけない");
});

test("HOLDING_TYPESは5種", () => {
  assert.equal(HOLDING_TYPES.length, 5);
  assert.deepEqual(HOLDING_TYPES.map(([k]) => k), ["paper", "ebook", "library", "wanted", "released"]);
});


/* ---- 気になる本(未入手) ---- */
const wanted = (over = {}) => mk({ holding: { type: "wanted" }, ...over });

test("気になる本: 手元にはないが、出ていった本ではない", () => {
  const b = wanted({ id: "w" });
  assert.ok(isWanted(b));
  assert.ok(!isInHand(b), "まだ持っていない");
  assert.ok(!isGone(b), "出ていった本ではない");
  assert.equal(holdingLabel(b), "気になる本");
});

test("isGone: 手放した本と返却済みのみ", () => {
  assert.ok(isGone(mk({ holding: { type: "released" } })));
  assert.ok(isGone(mk({ holding: { type: "library", returned: true } })));
  assert.ok(!isGone(mk({})));
  assert.ok(!isGone(mk({ holding: { type: "ebook" } })));
});

test("関心の地図: 気になる本は残り、出ていった本は外れる", () => {
  const books = [
    mk({ id: "own" }),
    wanted({ id: "want" }),
    mk({ id: "gone", holding: { type: "released" } }),
  ];
  const ids = buildStudyMap(books)
    .flatMap((g) => [...g.subs.flatMap((s) => s.books), ...g.rest])
    .map((b) => b.id);
  assert.deepEqual(ids.sort(), ["own", "want"]);
});

test("分布バー用の地図は手元にある本のみ(気になる本を含まない)", () => {
  const books = [mk({ id: "own" }), wanted({ id: "want" })];
  const ids = buildOwnedMap(books)
    .flatMap((g) => [...g.subs.flatMap((s) => s.books), ...g.rest])
    .map((b) => b.id);
  assert.deepEqual(ids, ["own"]);
});

test("今日の一冊と想起は、持っている本だけを対象にする", () => {
  const books = [wanted({ id: "w1" }), wanted({ id: "w2" })];
  assert.equal(pickBookOfTheDay(books, "2026-08-01"), null, "気になる本を薦めてはいけない");
  assert.equal(relatedStacked(books, ["歴史"], null).length, 0);

  const withOwned = [...books, mk({ id: "own" })];
  assert.equal(pickBookOfTheDay(withOwned, "2026-08-01").id, "own");
  assert.deepEqual(relatedStacked(withOwned, ["歴史"], null).map((b) => b.id), ["own"]);
});

test("normalizeHolding: 気になる本は余分な項目を持たない", () => {
  assert.deepEqual(
    normalizeHolding({ type: "wanted", service: "Kindle", dueDate: "2026-08-03" }),
    { type: "wanted" }
  );
});
