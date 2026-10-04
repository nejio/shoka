import { normalizeIsbn, parseOpenBD, parseGoogleBooks } from "./biblio.js";

const TIMEOUT = 8000;

import { GOOGLE_BOOKS_KEY } from "../config.js";

const withKey = (url) => (GOOGLE_BOOKS_KEY ? `${url}&key=${GOOGLE_BOOKS_KEY}` : url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, { retry429 = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (r.status === 429 && attempt < retry429) {
        clearTimeout(timer);
        await sleep(1200 * (attempt + 1));
        continue;
      }
      if (r.status === 429) throw new Error("検索の混雑制限に達しました。少し待ってからもう一度お試しください");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * ISBNから書誌を取得。openBD優先、なければGoogle Booksで補完。
 * @returns 正規化済みオブジェクト or null(見つからない)
 */
export async function lookupByIsbn(rawIsbn) {
  const isbn = normalizeIsbn(rawIsbn);
  if (!isbn) throw new Error("ISBNの形式が不正です");

  // 1) openBD
  try {
    const arr = await fetchJson(`https://api.openbd.jp/v1/get?isbn=${isbn}`);
    const parsed = parseOpenBD(arr && arr[0]);
    if (parsed && parsed.title) return parsed;
  } catch (e) {
    // ネットワーク不通なら次へ
  }

  // 2) Google Books
  try {
    const data = await fetchJson(withKey(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=JP`));
    const vi = data?.items?.[0]?.volumeInfo;
    const parsed = parseGoogleBooks(vi, isbn);
    if (parsed && parsed.title) return parsed;
  } catch (e) {}

  return null;
}

/**
 * タイトル/著者フリーワードで候補を検索(Google Books)。
 * @returns 正規化済みオブジェクトの配列(最大maxまで)
 */
export async function searchByTitle(queryText, max = 8, author = "") {
  const q = queryText.trim();
  const a = String(author || "").trim();
  if (!q && !a) return [];
  // 書名と著者を別々の条件として渡すと、単純な連結より精度が上がる
  const terms = [];
  if (q) terms.push(`intitle:${q}`);
  if (a) terms.push(`inauthor:${a}`);
  const data = await fetchJson(
    withKey(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(terms.join("+"))}&country=JP&maxResults=${max}&langRestrict=ja`)
  );
  const items = data?.items || [];
  return items
    .map((it) => parseGoogleBooks(it.volumeInfo))
    .filter((b) => b && b.title);
}
