import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIsbn, isBookBarcode, tagFromCcode, inferTag,
  parseOpenBD, parseGoogleBooks,
} from "../src/lib/biblio.js";

/* ---- ISBN ---- */
test("normalizeIsbn: 13桁はそのまま、10桁は13桁化", () => {
  assert.equal(normalizeIsbn("978-4-06-521234-1"), "9784065212341");
  assert.equal(normalizeIsbn("9784065212341"), "9784065212341");
  // ISBN-10 → 13(チェックディジット再計算)
  assert.equal(normalizeIsbn("4062748231"), "9784062748230");
  assert.equal(normalizeIsbn("garbage"), null);
  assert.equal(normalizeIsbn(""), null);
});

test("isBookBarcode: 978/979のみ書籍、192始まりの下段は弾く", () => {
  assert.ok(isBookBarcode("9784065212341"));
  assert.ok(isBookBarcode("9791234567896"));
  assert.ok(!isBookBarcode("1923055012003")); // 書籍JAN下段
  assert.ok(!isBookBarcode("4901234567894")); // 一般JAN
  assert.ok(!isBookBarcode("978406521234"));  // 桁不足
});

/* ---- タグ推定 ---- */
test("tagFromCcode: 内容コードとジャンルからタグ", () => {
  assert.equal(tagFromCcode("0193"), "小説"); // 93=小説
  assert.equal(tagFromCcode("0033"), "経済・経営"); // 33=経済
  assert.equal(tagFromCcode("0021"), "歴史"); // 21=歴史
  assert.equal(tagFromCcode("3055"), "技術・工学"); // 55=技術
  assert.equal(tagFromCcode("bad"), null);
});

test("inferTag: Cコード優先、なければキーワード、最後はnull", () => {
  assert.equal(inferTag({ ccode: "0193" }), "小説");
  assert.equal(inferTag({ categories: ["Business & Economics"] }), "経済・経営");
  assert.equal(inferTag({ categories: ["Fiction"], title: "宇宙SF傑作選" }), "小説");
  assert.equal(inferTag({ title: "プログラミング入門" }), "技術・工学");
  assert.equal(inferTag({ title: "謎の書物" }), null);
});

/* ---- openBD正規化 ---- */
test("parseOpenBD: summaryとonixから抽出", () => {
  const item = {
    summary: {
      isbn: "9784065212341", title: "サンプル本",
      author: "山田太郎／著", cover: "https://example.com/c.jpg",
    },
    onix: {
      DescriptiveDetail: {
        Extent: [{ ExtentType: "11", ExtentValue: "320" }],
        Subject: [{ SubjectSchemeIdentifier: "78", SubjectCode: "0193" }],
      },
    },
  };
  const r = parseOpenBD(item);
  assert.equal(r.title, "サンプル本");
  assert.equal(r.author, "山田太郎"); // ／著 を除去
  assert.equal(r.pages, 320);
  assert.equal(r.tag, "小説");
  assert.equal(r.source, "openBD");
});

test("parseOpenBD: null安全", () => {
  assert.equal(parseOpenBD(null), null);
  const r = parseOpenBD({ summary: { isbn: "9784065212341", title: "題" } });
  assert.equal(r.pages, null);
  assert.equal(r.tag, null);
});

/* ---- Google Books正規化 ---- */
test("parseGoogleBooks: volumeInfoから抽出、httpをhttpsに", () => {
  const vi = {
    title: "Sapiens", authors: ["Yuval Noah Harari"],
    pageCount: 443, categories: ["History"],
    industryIdentifiers: [{ type: "ISBN_13", identifier: "9780099590088" }],
    imageLinks: { thumbnail: "http://books.google.com/x.jpg" },
  };
  const r = parseGoogleBooks(vi);
  assert.equal(r.title, "Sapiens");
  assert.equal(r.author, "Yuval Noah Harari");
  assert.equal(r.pages, 443);
  assert.equal(r.tag, "歴史");
  assert.ok(r.coverUrl.startsWith("https:"));
  assert.equal(r.isbn, "9780099590088");
});

test("parseGoogleBooks: null安全とISBN10フォールバック", () => {
  assert.equal(parseGoogleBooks(null), null);
  const r = parseGoogleBooks({
    title: "T",
    industryIdentifiers: [{ type: "ISBN_10", identifier: "4062748231" }],
  });
  assert.equal(r.isbn, "9784062748230");
  assert.equal(r.pages, null);
});

/* ---- 著者での絞り込み(読めない著者名を打たずに選ぶための仕組み) ---- */
import { authorsIn, filterByAuthor, knownAuthors } from "../src/lib/biblio.js";

test("authorsIn: 検索結果の著者を件数の多い順に集める", () => {
  const r = [
    { title: "三体", author: "劉慈欣" },
    { title: "三体II", author: "劉慈欣" },
    { title: "三体の科学", author: "別の人" },
    { title: "著者なし", author: "" },
  ];
  assert.deepEqual(authorsIn(r), [
    { author: "劉慈欣", count: 2 },
    { author: "別の人", count: 1 },
  ]);
  assert.deepEqual(authorsIn([]), []);
  assert.deepEqual(authorsIn(null), []);
});

test("filterByAuthor: 選んだ著者の結果だけに絞る", () => {
  const r = [
    { title: "三体", author: "劉慈欣" },
    { title: "三体の科学", author: "別の人" },
  ];
  assert.equal(filterByAuthor(r, "劉慈欣").length, 1);
  assert.equal(filterByAuthor(r, "").length, 2, "未指定なら全件");
  // 部分一致・大文字小文字を無視する
  assert.equal(filterByAuthor([{ author: "Yuval Noah Harari" }], "harari").length, 1);
});

test("knownAuthors: 蔵書にいる著者を候補にする(打たずに選べる)", () => {
  const books = [
    { title: "深夜特急1", author: "沢木耕太郎" },
    { title: "深夜特急2", author: "沢木耕太郎" },
    { title: "ローマ人の物語", author: "塩野七生" },
    { title: "著者なし", author: "" },
  ];
  assert.deepEqual(knownAuthors(books), [
    { author: "沢木耕太郎", count: 2 },
    { author: "塩野七生", count: 1 },
  ]);
  // 入力語で絞れる(書名からも引ける)
  assert.deepEqual(knownAuthors(books, "深夜特急"), [{ author: "沢木耕太郎", count: 2 }]);
  assert.deepEqual(knownAuthors(books, "存在しない"), []);
});

test("parseGoogleBooks: 出版社と出版年を取り出す(候補の見分けに使う)", () => {
  const r = parseGoogleBooks({
    title: "三体", authors: ["劉慈欣"],
    publisher: "早川書房", publishedDate: "2019-07-04",
  });
  assert.equal(r.publisher, "早川書房");
  assert.equal(r.published, "2019");
});
