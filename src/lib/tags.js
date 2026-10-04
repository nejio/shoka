// タグ(複数タグ対応・旧データ互換)の中核ロジック(純粋関数)

/**
 * タグ分類(NDC=日本十進分類法を読書記録向けに改変した二層構造)
 * 大分類10 … 内容(主題)の一軸
 * 細分     … 各大分類の下位ジャンル。大分類に重ねて使う
 * 形式例外 … 軸は違うが、ページ数・読書ペース統計への影響が大きいため許容
 */
export const TAXONOMY = [
  { tag: "小説", subs: ["SF・ファンタジー", "ミステリ・サスペンス", "ホラー", "歴史・時代小説", "恋愛", "人間ドラマ", "青春・成長", "仕事・職業", "冒険・アクション", "ユーモア", "ライトノベル"] },
  { tag: "エッセイ・紀行", subs: ["随筆・コラム", "紀行・旅", "ノンフィクション・ルポ", "評伝・自伝", "日記・書簡"] },
  { tag: "歴史", subs: ["日本史", "アジア・東洋史", "欧米・西洋史", "世界史・通史", "近現代史", "考古・古代文明", "戦史・軍事史"] },
  { tag: "政治・社会", subs: ["政治・行政", "国際関係・地政学", "法律", "社会問題・福祉", "教育", "メディア・報道", "ジェンダー", "民俗学・文化人類学"] },
  { tag: "経済・経営", subs: ["経済学", "金融・投資", "経営・組織", "マーケティング", "起業・スタートアップ", "企業史・産業論", "会計", "働き方・キャリア"] },
  { tag: "科学・数学", subs: ["数学・統計", "物理・宇宙", "化学", "生物・進化", "医学・生命科学", "地球・環境", "心理・脳科学", "科学史・科学論"] },
  { tag: "技術・工学", subs: ["プログラミング", "ソフトウェア設計", "AI・機械学習", "Web・インフラ", "セキュリティ", "半導体・電子工学", "機械・材料工学", "建築・土木", "エネルギー", "ものづくり・製造"] },
  { tag: "哲学・思想", subs: ["西洋哲学", "東洋思想", "宗教", "倫理", "論理・批判的思考"] },
  { tag: "芸術・文化", subs: ["音楽", "映画・映像", "美術・デザイン・写真", "演劇・芸能", "サブカルチャー", "書物・読書論・文学論", "言語・ことば"] },
  { tag: "実用・生活", subs: ["自己啓発", "習慣・時間術", "料理・食", "健康・運動", "スポーツ・観戦", "住まい・整理収納", "美容・ファッション", "子育て", "ペット・園芸", "趣味・ゲーム", "語学"] },
];

/**
 * 形式の例外(内容軸ではないが、1冊あたりの所要時間が桁違いで
 * 読書ペースの統計を歪めるため、大分類として独立させている)
 * 漫画は小説と同じ内容の軸で、児童書・絵本は
 * その枠自体が対象読者で定義されているので、内側は年齢と目的で分ける。
 */
export const FORMAT_TAXONOMY = [
  { tag: "漫画", subs: ["SF・ファンタジー", "ミステリ・サスペンス", "歴史・時代", "青春・スポーツ", "恋愛", "ギャグ・4コマ", "エッセイ・実録", "学習・教養"] },
  { tag: "児童書・絵本", subs: ["絵本", "児童文学・読み物", "図鑑・百科", "学習・知育", "YA(中高生向け)"] },
];
export const FORMAT_TAGS = FORMAT_TAXONOMY.map((c) => c.tag);

/** 大分類 + 形式例外。選択画面の第一階層 */
export const STARTER_TAGS = [...TAXONOMY.map((c) => c.tag), ...FORMAT_TAGS];

/** すべての大分類(内容10 + 形式2) */
const ALL_CATEGORIES = [...TAXONOMY, ...FORMAT_TAXONOMY];

/** 大分類 → 細分 の索引 */
const SUB_INDEX = Object.fromEntries(ALL_CATEGORIES.map((c) => [c.tag, c.subs]));

/** 指定した大分類の細分を返す(なければ空配列) */
export function subsOf(tag) {
  return SUB_INDEX[tag] || [];
}

/** 細分から親の大分類を引く(なければnull) */
export function parentOf(sub) {
  const hit = ALL_CATEGORIES.find((c) => c.subs.includes(sub));
  return hit ? hit.tag : null;
}

/** 大分類か */
export const isMajor = (tag) => STARTER_TAGS.includes(tag);

export const MAX_TAGS = 5;
export const UNTAGGED = "未分類";

/* ---- 落ち着いた色相の16色。タグ名から決定的に割り当てる ---- */
const PALETTE = [
  "#4A6B4F", "#7A3E2E", "#B58B2A", "#31465F",
  "#8A6B3E", "#3E6B6B", "#5B4A6B", "#A0522D",
  "#6B7A3E", "#8A3E5B", "#3E5B8A", "#7A6B8A",
  "#5B6B4A", "#8A5B3E", "#4A6B7A", "#6B4A4A",
];

function hashStr(s) {
  let h = 0;
  for (const ch of String(s)) h = (h * 131 + ch.charCodeAt(0)) % 1000003;
  return h;
}

/** タグ名から色を決定(同じ名前なら常に同じ色。タグを増やしても既存の色は変わらない) */
export function tagColor(tag) {
  if (!tag) return PALETTE[0];
  return PALETTE[hashStr(tag) % PALETTE.length];
}

export function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---- 読み取り(旧データ互換) ---- */

/** 本のタグ配列を返す。旧形式(tag: string)も自動で読み替える */
export function getTags(book) {
  if (!book) return [];
  if (Array.isArray(book.tags) && book.tags.length) return book.tags;
  if (book.tag) return [book.tag];
  return [UNTAGGED];
}

/** 主タグ(先頭)。暦・背表紙などの色に使う */
export function mainTag(book) {
  return getTags(book)[0] || UNTAGGED;
}

/** 本が指定タグを持つか */
export function hasTag(book, tag) {
  return getTags(book).includes(tag);
}

/** 蔵書で実際に使われているタグを、使用数の多い順に返す */
export function tagsInUse(books) {
  const tally = {};
  books.forEach((b) => getTags(b).forEach((t) => { tally[t] = (tally[t] || 0) + 1; }));
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/** 選択肢として並べるタグ: 使用中のもの優先 + 初期セットの未使用分 */
export function tagOptions(books) {
  const used = tagsInUse(books).map((t) => t.tag);
  const rest = STARTER_TAGS.filter((t) => !used.includes(t));
  return [...used, ...rest];
}

/* ---- 正規化 ---- */

/** 入力タグ配列を正規化: trim・空除去・重複除去・字数制限・上限5 */
export function normalizeTags(input) {
  const arr = Array.isArray(input) ? input : [input];
  const out = [];
  for (const raw of arr) {
    const t = String(raw || "").trim().slice(0, 20);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out.length ? out : [UNTAGGED];
}


/**
 * 旧タグ名 → 新タグ名の対応。
 * 分類を改訂した際に名称が変わったもの、および初期の暫定タグ。
 * 既存データは書き換えず、書斎の「タグを整理」で統合を促すために使う。
 */
export const RENAMED = {
  // v30 の改訂で名称が変わったもの
  "テクノロジー": "技術・工学",
  "東洋史・中国史": "アジア・東洋史",
  "西洋史": "欧米・西洋史",
  "世界史": "世界史・通史",
  "古代・考古": "考古・古代文明",
  "社会問題": "社会問題・福祉",
  "Web・インターネット": "Web・インフラ",
  "半導体・ハードウェア": "半導体・電子工学",
  "ものづくり": "ものづくり・製造",
  "スポーツ": "スポーツ・観戦",
  "言語学": "言語・ことば",
  // 初期の暫定タグ
  "文学・小説": "小説",
  "SF": "SF・ファンタジー",
  "ミステリ": "ミステリ・サスペンス",
  "経済": "経済・経営",
  "技術": "技術・工学",
  "投資": "金融・投資",
  "エッセイ": "エッセイ・紀行",
  "実用・自己啓発": "実用・生活",
};

/** 蔵書のうち、新しい名前に統合できる旧タグを探す */
export function findRenamable(books) {
  const used = tagsInUse(books).map((t) => t.tag);
  return used
    .filter((t) => RENAMED[t])
    .map((from) => ({ from, to: RENAMED[from] }));
}
