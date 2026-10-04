import { TAGS } from "./validate.js";

/* ============ ISBN ============ */
export function normalizeIsbn(raw) {
  const s = String(raw || "").replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) return isbn10to13(s);
  if (/^97[89]\d{10}$/.test(s)) return s;
  return null;
}
function isbn10to13(isbn10) {
  const core = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += (+core[i]) * (i % 2 ? 3 : 1);
  return core + ((10 - (sum % 10)) % 10);
}
/** バーコードで読んだ値が書籍(978/979)か。書籍JAN下段(192〜)を弾く */
export function isBookBarcode(code) {
  const s = String(code || "").replace(/[-\s]/g, "");
  return /^97[89]\d{10}$/.test(s);
}

/* ============ タグ推定 ============ */
// openBD Cコード → 大分類(TAXONOMY)への対応
// 2桁目=ジャンル、下2桁=内容分類
const CCODE_MAP = {
  "0": "実用・生活", "1": "実用・生活", "2": "実用・生活",
  "3": "実用・生活", "4": "実用・生活", "5": "実用・生活",
  "6": "技術・工学", "7": "エッセイ・紀行", "8": "エッセイ・紀行", "9": "小説",
};
const CCODE_CONTENT = {
  "93": "小説", "97": "小説", "92": "小説",
  "91": "エッセイ・紀行", "95": "エッセイ・紀行", "26": "エッセイ・紀行",
  "20": "歴史", "21": "歴史", "22": "歴史", "23": "歴史",
  "30": "政治・社会", "31": "政治・社会", "32": "政治・社会", "36": "政治・社会",
  "33": "経済・経営", "34": "経済・経営",
  "10": "哲学・思想", "11": "哲学・思想", "12": "哲学・思想", "14": "哲学・思想", "16": "哲学・思想",
  "40": "科学・数学", "41": "科学・数学", "42": "科学・数学", "44": "科学・数学",
  "45": "科学・数学", "47": "科学・数学", "49": "科学・数学",
  "50": "技術・工学", "52": "技術・工学", "54": "技術・工学",
  "55": "技術・工学", "58": "技術・工学",
  "70": "芸術・文化", "71": "芸術・文化", "72": "芸術・文化", "73": "芸術・文化",
  "74": "芸術・文化", "75": "芸術・文化", "76": "芸術・文化", "77": "芸術・文化", "79": "芸術・文化",
  "79": "芸術・文化",
};
const KEYWORD_MAP = [
  [/漫画|コミック|comic|manga/i, "漫画"],
  [/絵本|児童書|picture book/i, "児童書・絵本"],
  [/SF|サイエンス.?フィクション|science fiction|ファンタジー|fantasy|ミステリ|推理|探偵|mystery|小説|fiction|novel|文学|物語/i, "小説"],
  [/歴史|history|世界史|日本史|戦史/i, "歴史"],
  [/投資|株式|investment|stock|資産運用|マネー|money|金融|経済|economic|経営|business|ビジネス|会計|マーケティング/i, "経済・経営"],
  [/政治|politic|社会|society|国際|法律|law|地政学|民俗/i, "政治・社会"],
  [/プログラ|programming|computer|コンピュータ|工学|engineering|software|AI|機械学習|技術|半導体/i, "技術・工学"],
  [/物理|化学|生物|数学|science|科学|統計|心理|脳|医学/i, "科学・数学"],
  [/哲学|philosoph|思想|宗教|倫理|言語学/i, "哲学・思想"],
  [/音楽|映画|美術|デザイン|写真|芸能|スポーツ|読書論|書評/i, "芸術・文化"],
  [/自己啓発|習慣|健康|料理|実用|子育て|語学|趣味/i, "実用・生活"],
  [/エッセイ|essay|随筆|紀行|旅|ノンフィクション|評伝|自伝/i, "エッセイ・紀行"],
];

/** Cコード(4桁)からタグ推定。取れなければnull */
export function tagFromCcode(ccode) {
  const s = String(ccode || "").replace(/[^0-9]/g, "");
  if (s.length !== 4) return null;
  const content = s.slice(2);
  if (CCODE_CONTENT[content]) return CCODE_CONTENT[content];
  const genre = s[1];
  return CCODE_MAP[genre] || null;
}

/** カテゴリ文字列群やCコードからタグを推定。最終的に必ず既定タグ or null */
export function inferTag({ ccode, categories = [], title = "" } = {}) {
  const byC = tagFromCcode(ccode);
  if (byC && TAGS.includes(byC)) return byC;
  const hay = [...categories, title].join(" ");
  for (const [re, tag] of KEYWORD_MAP) if (re.test(hay)) return tag;
  return null;
}

/* ============ レスポンス正規化 ============ */
/** openBDの1件をアプリ共通形へ */
export function parseOpenBD(item) {
  if (!item) return null;
  const summary = item.summary || {};
  const onix = item.onix || {};
  // ページ数(Extent)
  let pages = null;
  const extents = onix?.DescriptiveDetail?.Extent || [];
  for (const e of extents) {
    if (e?.ExtentType === "11" || e?.ExtentType === "00") {
      const v = parseInt(e.ExtentValue, 10);
      if (Number.isFinite(v) && v > 0) { pages = v; break; }
    }
  }
  // Cコード
  let ccode = null;
  const subjects = onix?.DescriptiveDetail?.Subject || [];
  for (const s of subjects) {
    if (s?.SubjectSchemeIdentifier === "78" && s?.SubjectCode) { ccode = s.SubjectCode; break; }
  }
  return {
    isbn: normalizeIsbn(summary.isbn),
    title: (summary.title || "").trim(),
    author: (summary.author || "").replace(/／.*$/, "").trim(),
    pages,
    coverUrl: summary.cover || null,
    publisher: (summary.publisher || "").trim() || null,
    published: (summary.pubdate || "").slice(0, 4) || null,
    tag: inferTag({ ccode, title: summary.title }),
    source: "openBD",
  };
}

/** Google Books の volumeInfo をアプリ共通形へ */
export function parseGoogleBooks(volumeInfo, requestedIsbn = null) {
  if (!volumeInfo) return null;
  const ids = volumeInfo.industryIdentifiers || [];
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier;
  return {
    isbn: normalizeIsbn(isbn13 || isbn10 || requestedIsbn),
    title: (volumeInfo.title || "").trim(),
    author: (volumeInfo.authors || []).join(", ").trim(),
    pages: Number.isFinite(volumeInfo.pageCount) && volumeInfo.pageCount > 0 ? volumeInfo.pageCount : null,
    coverUrl: volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, "https:") || null,
    publisher: (volumeInfo.publisher || "").trim() || null,
    published: (volumeInfo.publishedDate || "").slice(0, 4) || null,
    tag: inferTag({ categories: volumeInfo.categories, title: volumeInfo.title }),
    source: "GoogleBooks",
  };
}


/* ============ 検索結果の絞り込み ============ */

/**
 * 検索結果に含まれる著者を、件数の多い順に集める。
 * 読めない著者名(「劉慈欣」など)を打たずに選べるようにするための候補。
 * 打たせる代わりに見せて選ばせる、という考え方。
 */
export function authorsIn(results, limit = 6) {
  const tally = {};
  (results || []).forEach((b) => {
    const a = (b.author || "").trim();
    if (a) tally[a] = (tally[a] || 0) + 1;
  });
  return Object.entries(tally)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([author, count]) => ({ author, count }));
}

/** 指定した著者の結果だけに絞る(部分一致・大文字小文字を無視) */
export function filterByAuthor(results, author) {
  const q = (author || "").trim().toLowerCase();
  if (!q) return results || [];
  return (results || []).filter((b) => (b.author || "").toLowerCase().includes(q));
}

/**
 * 蔵書に登録済みの著者のうち、入力語に一致するものを返す。
 * 同じ著者の本をもう1冊登録する場面で、打たずに済ませるため。
 */
export function knownAuthors(books, queryText = "", limit = 6) {
  const q = String(queryText || "").trim().toLowerCase();
  const tally = {};
  (books || []).forEach((b) => {
    const a = (b.author || "").trim();
    if (!a) return;
    if (q && !a.toLowerCase().includes(q) && !(b.title || "").toLowerCase().includes(q)) return;
    tally[a] = (tally[a] || 0) + 1;
  });
  return Object.entries(tally)
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .slice(0, limit)
    .map(([author, count]) => ({ author, count }));
}
