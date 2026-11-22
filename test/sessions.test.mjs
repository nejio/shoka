import { test } from "node:test";
import assert from "node:assert/strict";
import { editSessionProgress, removeSession, sameSessionAt } from "../src/lib/sessions.js";

const book = (over = {}) => ({
  id: "b1", title: "本", pages: 300, status: "reading", holding: null,
  sessions: [
    { date: "2026-07-01", toPage: 20, memo: "はじまり" },
    { date: "2026-07-02", toPage: 80 },
    { date: "2026-07-03", toPage: 200 },
  ],
  ...over,
});

test("editSessionProgress: 前後の間に収まる値に直せる(メモと日付は残る)", () => {
  const r = editSessionProgress(book(), 0, "30");
  assert.ok(r.ok);
  assert.deepEqual(r.value[0], { date: "2026-07-01", toPage: 30, memo: "はじまり" });
  assert.equal(r.value.length, 3);
});

test("editSessionProgress: 打ち間違いで大きくなった最後の記録を直せる", () => {
  // 20のつもりで200と打った。直せなければ、以後は200より先しか記録できない
  const r = editSessionProgress(book(), 2, 100);
  assert.ok(r.ok);
  assert.equal(r.value[2].toPage, 100);
});

test("editSessionProgress: 元の配列は書き換えない", () => {
  const b = book();
  editSessionProgress(b, 1, 90);
  assert.equal(b.sessions[1].toPage, 80);
});

test("editSessionProgress: 前の記録以下・次の記録以上は弾く", () => {
  assert.equal(editSessionProgress(book(), 1, 20).ok, false);   // 前回と同じ
  assert.equal(editSessionProgress(book(), 1, 10).ok, false);   // 前回より手前
  assert.equal(editSessionProgress(book(), 1, 200).ok, false);  // 次と同じ
  assert.match(editSessionProgress(book(), 1, 250).error, /次の記録/);
});

test("editSessionProgress: 0・空・null・文字は弾く(Number(null)は0になる点に注意)", () => {
  for (const v of [0, "", null, undefined, "あ", -5]) {
    assert.equal(editSessionProgress(book(), 0, v).ok, false, `入力 ${String(v)}`);
  }
});

test("editSessionProgress: 総ページ数・100％の上限を守る", () => {
  assert.match(editSessionProgress(book(), 2, 301).error, /総ページ数/);
  assert.equal(editSessionProgress(book(), 2, 300).ok, true);
  const pct = book({ progressUnit: "percent", pages: null });
  assert.match(editSessionProgress(pct, 2, 101).error, /100％/);
  assert.match(editSessionProgress(pct, 1, 20).error, /20％/);
});

test("editSessionProgress: 総ページ数が不明なら上限なし", () => {
  assert.equal(editSessionProgress(book({ pages: null }), 2, 5000).ok, true);
});

test("editSessionProgress: 存在しない番号は弾く", () => {
  assert.equal(editSessionProgress(book(), 9, 50).ok, false);
  assert.equal(editSessionProgress(book({ sessions: undefined }), 0, 50).ok, false);
});

test("removeSession: 指定した足あとだけ消える", () => {
  const r = removeSession(book(), 1);
  assert.ok(r.ok);
  assert.deepEqual(r.value.map((s) => s.toPage), [20, 200]);
});

test("removeSession: 最後の記録を消すと、次の記録はその手前から続けられる", () => {
  const b = book();
  const r = removeSession(b, 2);
  assert.deepEqual(r.value.map((s) => s.toPage), [20, 80]);
  assert.equal(removeSession(b, 7).ok, false);
});

test("sameSessionAt: 同じ場所に同じ足あとがあれば真、ずれていれば偽", () => {
  const shown = book();
  assert.ok(sameSessionAt(shown, book(), 1));
  // 別の端末で足あとが1件増えて、index 1 の中身が入れ替わった
  const latest = book({ sessions: [shown.sessions[0], { date: "2026-07-01", toPage: 50 }, ...shown.sessions.slice(1)] });
  assert.ok(sameSessionAt(shown, latest, 0));
  assert.ok(!sameSessionAt(shown, latest, 1));
  // 別の端末で到達点が直された
  assert.ok(!sameSessionAt(shown, book({ sessions: [shown.sessions[0], { date: "2026-07-02", toPage: 90 }, shown.sessions[2]] }), 1));
  // 範囲外・欠損
  assert.ok(!sameSessionAt(shown, book({ sessions: [] }), 0));
  assert.ok(!sameSessionAt(shown, null, 0));
});
