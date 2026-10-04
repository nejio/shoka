import { test } from "node:test";
import assert from "node:assert/strict";
import { findActiveDuplicate } from "../src/lib/dedupe.js";

const mk = (over) => ({
  id: "x", title: "本", tag: "小説", status: "stacked", isbn: null,
  start: null, end: null, rating: null, note: "", sessions: [], reread: false,
  ...over,
});

test("書名一致でアクティブな本を検出(前後空白は無視)", () => {
  const books = [mk({ id: "a", title: "三体", status: "stacked" })];
  assert.equal(findActiveDuplicate(books, { title: " 三体 " })?.id, "a");
  assert.equal(findActiveDuplicate(books, { title: "三体Ⅱ" }), null);
});

test("読了は重複判定の対象外(再読を許容)", () => {
  const books = [mk({ id: "f", title: "敗者のゲーム", status: "finished", end: "2026-05-01" })];
  assert.equal(findActiveDuplicate(books, { title: "敗者のゲーム" }), null);
});

test("双方にISBNがあればISBN優先(書名が違っても同一判定)", () => {
  const books = [mk({ id: "a", title: "旧版タイトル", isbn: "9784065212341", status: "reading", start: "2026-07-01" })];
  assert.equal(findActiveDuplicate(books, { title: "新装版タイトル", isbn: "978-4-06-521234-1" })?.id, "a");
});

test("片方にしかISBNがなければ書名で判定", () => {
  const books = [mk({ id: "a", title: "三体", isbn: "9784065212341" })];
  assert.equal(findActiveDuplicate(books, { title: "三体" })?.id, "a");
  assert.equal(findActiveDuplicate(books, { title: "別の本" }), null);
});

test("空入力はnull", () => {
  assert.equal(findActiveDuplicate([mk({})], { title: "" }), null);
});
