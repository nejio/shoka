import { test } from "node:test";
import assert from "node:assert/strict";
import {
  progressUnit, isPercent, progressMax, lastProgress, progressPct,
  formatProgress, progressLabel, reachedEnd, deltaToPages, progressHint,
} from "../src/lib/progress.js";
import { validateSession } from "../src/lib/validate.js";
import { buildPagesByDay } from "../src/lib/stats.js";

const paper = (over = {}) => ({ id: "p", status: "reading", pages: 300, sessions: [], ...over });
const ebook = (over = {}) => ({ id: "e", status: "reading", holding: { type: "ebook", service: "Kindle" }, sessions: [], ...over });

test("進捗の単位: 電子書籍は％、紙はページが既定", () => {
  assert.equal(progressUnit(paper()), "page");
  assert.equal(progressUnit(ebook()), "percent");
  assert.ok(isPercent(ebook()));
  assert.ok(!isPercent(paper()));
});

test("進捗の単位: 明示された指定が既定より優先される", () => {
  assert.equal(progressUnit(paper({ progressUnit: "percent" })), "percent");
  assert.equal(progressUnit(ebook({ progressUnit: "page", pages: 300 })), "page");
});

test("上限: ％は常に100、ページは総ページ数(不明ならnull)", () => {
  assert.equal(progressMax(ebook()), 100);
  assert.equal(progressMax(paper()), 300);
  assert.equal(progressMax(paper({ pages: null })), null);
});

test("到達点と割合", () => {
  const e = ebook({ sessions: [{ date: "2026-08-01", toPage: 42 }] });
  assert.equal(lastProgress(e), 42);
  assert.equal(progressPct(e), 42);

  const p = paper({ sessions: [{ date: "2026-08-01", toPage: 150 }] });
  assert.equal(progressPct(p), 50);

  // ページ数不明の紙の本は割合を出せない
  assert.equal(progressPct(paper({ pages: null, sessions: [{ date: "2026-08-01", toPage: 80 }] })), null);
  assert.equal(progressPct(paper()), null); // 未記録
});

test("表示: 単位に応じた文字列", () => {
  assert.equal(formatProgress(ebook(), 42), "42％");
  assert.equal(formatProgress(paper(), 120), "p.120");
  assert.equal(progressLabel(ebook({ sessions: [{ date: "d", toPage: 42 }] })), "42％まで / 100％");
  assert.equal(progressLabel(paper({ sessions: [{ date: "d", toPage: 120 }] })), "p.120まで / p.300");
  assert.equal(progressLabel(paper()), null);
  assert.equal(progressHint(ebook()), "1％〜");
  assert.equal(progressHint(paper({ sessions: [{ date: "d", toPage: 120 }] })), "p.121〜");
});

test("読了判定: ％は100、ページは総ページ数で到達とみなす", () => {
  assert.ok(reachedEnd(ebook(), 100));
  assert.ok(!reachedEnd(ebook(), 99));
  assert.ok(reachedEnd(paper(), 300));
  assert.ok(!reachedEnd(paper({ pages: null }), 999)); // 総数不明なら判定しない
});

test("検証: ％は100を超えられず、前回より先でなければならない", () => {
  assert.ok(validateSession({ date: "2026-08-01", toPage: 42 }, 10, 100, "percent").ok);
  const over = validateSession({ date: "2026-08-01", toPage: 120 }, 10, 100, "percent");
  assert.ok(!over.ok);
  assert.match(over.error, /100/);
  const back = validateSession({ date: "2026-08-01", toPage: 5 }, 10, 100, "percent");
  assert.ok(!back.ok);
  assert.match(back.error, /10％/);
  // ページの場合はページ表記でエラーが出る
  const backPage = validateSession({ date: "2026-08-01", toPage: 5 }, 10, 300, "page");
  assert.match(backPage.error, /p\.10/);
});

test("統計: ％の進捗は総ページ数が分かるときだけ実ページ数に換算する", () => {
  assert.equal(deltaToPages(paper(), 40), 40);
  assert.equal(deltaToPages(ebook({ pages: 300 }), 40), 120); // 40% × 300p
  assert.equal(deltaToPages(ebook(), 40), 0);                 // 総ページ不明は数えない
  assert.equal(deltaToPages(paper(), -5), 0);
});

test("統計: ％で記録した本が日別ページ数に正しく反映される", () => {
  const books = [
    ebook({ id: "e1", pages: 400, sessions: [
      { date: "2026-08-01", toPage: 25 },
      { date: "2026-08-02", toPage: 50 },
    ]}),
    paper({ id: "p1", sessions: [{ date: "2026-08-01", toPage: 60 }] }),
    ebook({ id: "e2", sessions: [{ date: "2026-08-01", toPage: 30 }] }), // 総ページ不明
  ];
  const m = buildPagesByDay(books);
  assert.equal(m["2026-08-01"], 100 + 60); // 25%×400=100p、紙60p、総数不明は0
  assert.equal(m["2026-08-02"], 100);      // 25%分=100p
});
