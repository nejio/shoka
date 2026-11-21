import { test } from "node:test";
import assert from "node:assert/strict";
import { isoLocal, ym, fmtD, isDateStr, daysAgo } from "../src/lib/dates.js";
import {
  validateFinished, validateReadingStart, validateSession, validateFinish,
} from "../src/lib/validate.js";
import {
  lastPage, buildDayMap, buildPagesByDay, calcReadingStreak,
} from "../src/lib/stats.js";

/* ---- dates ---- */
test("isoLocal: ローカル日付で整形される(UTCずれなし)", () => {
  assert.equal(isoLocal(new Date(2026, 0, 1)), "2026-01-01");
});

test("ym / fmtD / isDateStr / daysAgo", () => {
  assert.equal(ym("2026-07-20"), "2026-07");
  assert.equal(fmtD("2026-07-20"), "2026/07/20");
  assert.equal(fmtD(null), "—");
  assert.ok(isDateStr("2026-07-20"));
  assert.ok(!isDateStr("2026/07/20"));
  assert.equal(daysAgo(1, new Date(2026, 6, 20)), "2026-07-19");
  assert.equal(daysAgo(20, new Date(2026, 6, 20)), "2026-06-30"); // 月またぎ
});

/* ---- validate: 一発読了 ---- */
test("validateFinished: 書名のみで通る(startは読了日に補完)", () => {
  const r = validateFinished({ title: " 三体 ", end: "2026-07-20" });
  assert.ok(r.ok);
  assert.equal(r.value.title, "三体");
  assert.equal(r.value.start, "2026-07-20");
  assert.equal(r.value.rating, null); // 未指定なら未評価(勝手に3を入れない)
});

test("validateFinished: 不正入力の拒否と正規化", () => {
  assert.ok(!validateFinished({ title: "", end: "2026-07-20" }).ok);
  assert.ok(!validateFinished({ title: "x", end: "20/07/2026" }).ok);
  assert.ok(!validateFinished({ title: "x", start: "2026-07-21", end: "2026-07-20" }).ok);
  assert.equal(validateFinished({ title: "x", end: "2026-07-20", rating: 9 }).value.rating, 5);
  assert.equal(validateFinished({ title: "x", end: "2026-07-20" }).value.rating, null);
  assert.equal(validateFinished({ title: "x", end: "2026-07-20", pages: -5 }).value.pages, null);
  assert.equal(validateFinished({ title: "x", end: "2026-07-20", pages: "320" }).value.pages, 320);
});

test("validateFinished: ISBN(ハイフン許容・書籍JAN下段は弾く)", () => {
  assert.equal(
    validateFinished({ title: "x", end: "2026-07-20", isbn: "978-4-06-521234-1" }).value.isbn,
    "9784065212341"
  );
  assert.ok(!validateFinished({ title: "x", end: "2026-07-20", isbn: "1923055012003" }).ok);
});

/* ---- validate: 読み始め ---- */
test("validateReadingStart: 書名と読始日で通る", () => {
  const r = validateReadingStart({ title: "深夜特急(3)", tag: "小説", start: "2026-07-18", pages: "320" });
  assert.ok(r.ok);
  assert.equal(r.value.pages, 320);
  assert.ok(!("end" in r.value));
});

test("validateReadingStart: 読始日必須", () => {
  assert.ok(!validateReadingStart({ title: "x" }).ok);
});

/* ---- validate: セッション ---- */
test("validateSession: 到達ページの前進を要求", () => {
  assert.ok(validateSession({ date: "2026-07-20", toPage: "120" }, 80, 320).ok);
  const back = validateSession({ date: "2026-07-20", toPage: 60 }, 80, 320);
  assert.ok(!back.ok);
  assert.match(back.error, /p\.80/);
});

test("validateSession: 総ページ超過と不正値を拒否", () => {
  assert.ok(!validateSession({ date: "2026-07-20", toPage: 500 }, 80, 320).ok);
  assert.ok(!validateSession({ date: "2026-07-20", toPage: 0 }, 0, null).ok);
  assert.ok(!validateSession({ date: "bad", toPage: 10 }, 0, null).ok);
  // 総ページ未設定なら上限チェックなし
  assert.ok(validateSession({ date: "2026-07-20", toPage: 500 }, 80, null).ok);
});

/* ---- validate: 読了化 ---- */
test("validateFinish: 評価クランプと未評価", () => {
  const r = validateFinish({ end: "2026-07-20", rating: 0, note: "  良かった  " });
  assert.ok(r.ok);
  assert.equal(r.value.rating, null, "0は未評価として扱う");
  assert.equal(validateFinish({ end: "2026-07-20" }).value.rating, null);
  assert.equal(validateFinish({ end: "2026-07-20", rating: null }).value.rating, null);
  assert.equal(validateFinish({ end: "2026-07-20", rating: 4 }).value.rating, 4);
  assert.equal(r.value.note, "良かった");
});

/* ---- stats ---- */
const mkBook = (over) => ({
  id: "b1", title: "T", tag: "小説", pages: 300, status: "finished",
  start: "2026-07-10", end: "2026-07-12", rating: 4, note: "", sessions: [], reread: false,
  ...over,
});

test("lastPage", () => {
  assert.equal(lastPage(mkBook()), 0);
  assert.equal(lastPage(mkBook({ sessions: [{ date: "2026-07-10", toPage: 50 }, { date: "2026-07-11", toPage: 120 }] })), 120);
});

test("buildDayMap: 読了日と読んだ日を区別する", () => {
  const b = mkBook({
    sessions: [{ date: "2026-07-10", toPage: 100 }, { date: "2026-07-12", toPage: 300 }],
  });
  const m = buildDayMap([b]);
  assert.deepEqual(m["2026-07-10"].finished, []);
  assert.equal(m["2026-07-10"].reads.length, 1);
  assert.deepEqual(m["2026-07-12"].finished, [b]);
  assert.equal(m["2026-07-11"], undefined);
});

test("buildDayMap: 1日に複数冊読了しても、すべて残る", () => {
  const a = mkBook({ id: "a", start: "2026-07-12", end: "2026-07-12" });
  const b = mkBook({ id: "b", start: "2026-07-12", end: "2026-07-12" });
  const c = mkBook({ id: "c", start: "2026-07-12", end: "2026-07-12" });
  const m = buildDayMap([a, b, c]);
  assert.equal(m["2026-07-12"].finished.length, 3, "後の本で上書きされてはいけない");
  assert.deepEqual(m["2026-07-12"].finished.map((x) => x.id), ["a", "b", "c"]);
});

test("評価: null や 0 を渡しても星が付かない", () => {
  // Number(null) は 0 になるため、明示的に弾かないと星1になってしまう
  [undefined, null, 0, "", -3].forEach((v) => {
    assert.equal(
      validateFinished({ title: "x", end: "2026-07-20", rating: v }).value.rating,
      null,
      `rating=${JSON.stringify(v)} が未評価にならない`
    );
  });
  assert.equal(validateFinished({ title: "x", end: "2026-07-20", rating: "4" }).value.rating, 4);
});

test("buildPagesByDay: セッション差分と1日読了の計上", () => {
  const multi = mkBook({
    sessions: [{ date: "2026-07-10", toPage: 100 }, { date: "2026-07-12", toPage: 300 }],
  });
  const oneShot = mkBook({ id: "b2", start: "2026-07-12", end: "2026-07-12", pages: 250 });
  const spanNoSessions = mkBook({ id: "b3", start: "2026-07-01", end: "2026-07-05", pages: 400 });
  const m = buildPagesByDay([multi, oneShot, spanNoSessions]);
  assert.equal(m["2026-07-10"], 100);
  assert.equal(m["2026-07-12"], 200 + 250); // 差分200 + 1日読了250
  assert.equal(m["2026-07-03"], undefined); // 複数日・セッションなしは計上しない
});

test("calcReadingStreak: 進捗の日も読了の日も連続に数える", () => {
  const reading = mkBook({
    id: "r1", status: "reading", end: null, rating: null,
    sessions: [{ date: "2026-07-19", toPage: 50 }, { date: "2026-07-20", toPage: 90 }],
  });
  const done = mkBook({ id: "f1", start: "2026-07-18", end: "2026-07-18" });
  assert.equal(calcReadingStreak([reading, done], "2026-07-20"), 3);
  assert.equal(calcReadingStreak([done], "2026-07-20"), 0); // 昨日も今日も活動なし
  assert.equal(calcReadingStreak([], "2026-07-20"), 0);
  // 今日まだ記録していなくても、昨日までの連続は保たれる
  assert.equal(calcReadingStreak([reading, done], "2026-07-21"), 3);
  // 一昨日で途切れていれば0
  assert.equal(calcReadingStreak([reading, done], "2026-07-22"), 0);
});

/* ---- 統計の自動適応 ---- */
import { monthlyPace, chooseStatsFocus, readingDaysIn } from "../src/lib/stats.js";

test("monthlyPace: 直近60日の読了を月換算", () => {
  const recent = (d, id) => mkBook({ id, start: d, end: d });
  const books = [
    recent("2026-07-20", "a"), recent("2026-07-01", "b"), recent("2026-06-10", "c"),
    recent("2026-04-01", "old"), // 60日より前は除外
  ];
  assert.equal(monthlyPace(books, "2026-07-22"), 1.5);
  assert.equal(monthlyPace([], "2026-07-22"), 0);
});

test("chooseStatsFocus: 月10冊以上でbooks、未満でpages", () => {
  const many = [];
  for (let i = 1; i <= 22; i++) {
    const d = `2026-07-${String(Math.min(i, 22)).padStart(2, "0")}`;
    many.push(mkBook({ id: "m" + i, start: d, end: d }));
  }
  assert.equal(chooseStatsFocus(many, "2026-07-22"), "books"); // 22冊/60日 = 11/月
  assert.equal(chooseStatsFocus(many.slice(0, 6), "2026-07-22"), "pages"); // 3/月
});

test("readingDaysIn: 期間内の読書日数", () => {
  const b = mkBook({
    sessions: [{ date: "2026-07-01", toPage: 50 }, { date: "2026-07-03", toPage: 90 }],
    start: "2026-07-01", end: "2026-07-05",
  });
  assert.equal(readingDaysIn([b], "2026-07-01", "2026-07-31"), 3); // 1日,3日,読了5日
  assert.equal(readingDaysIn([b], "2026-07-02", "2026-07-04"), 1);
});

/* ---- 積読 ---- */
import { validateStacked } from "../src/lib/validate.js";

test("validateStacked: 書名だけで通り、日付フィールドを持たない", () => {
  const r = validateStacked({ title: "積んでる本", tag: "歴史", pages: "400" });
  assert.ok(r.ok);
  assert.equal(r.value.pages, 400);
  assert.ok(!("start" in r.value));
  assert.ok(!("end" in r.value));
  assert.ok(!validateStacked({ title: "" }).ok);
});

test("積読は暦・ページ集計・ストリークに影響しない", () => {
  const stacked = mkBook({ id: "st1", status: "stacked", start: null, end: null, rating: null, sessions: [] });
  assert.deepEqual(buildDayMap([stacked]), {});
  assert.deepEqual(buildPagesByDay([stacked]), {});
  assert.equal(calcReadingStreak([stacked], "2026-07-24"), 0);
});

/* ---- タグ任意化 ---- */
test("タグ未指定でも登録できる(未分類になる)", () => {
  const r = validateFinished({ title: "本", end: "2026-08-10" });
  assert.ok(r.ok);
  assert.deepEqual(r.value.tags, ["未分類"]);
  const r2 = validateReadingStart({ title: "本", start: "2026-08-10" });
  assert.ok(r2.ok);
  assert.deepEqual(r2.value.tags, ["未分類"]);
});
