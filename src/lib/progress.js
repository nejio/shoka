// 進捗の単位(ページ / パーセント)を扱う。
// 電子書籍にはページ番号がなく、多くの端末が%で位置を示すため、
// 本ごとに単位を持たせる。

export const PROGRESS_UNITS = [
  ["page", "ページ"],
  ["percent", "％"],
];

/**
 * その本の進捗の単位。
 * 明示されていなければ、電子書籍は%、それ以外はページを既定とする。
 */
export function progressUnit(book) {
  if (book?.progressUnit === "percent" || book?.progressUnit === "page") return book.progressUnit;
  return book?.holding?.type === "ebook" ? "percent" : "page";
}

export const isPercent = (book) => progressUnit(book) === "percent";

/** 単位の上限。%は100、ページは総ページ数(不明ならnull=上限なし) */
export function progressMax(book) {
  return isPercent(book) ? 100 : (book?.pages || null);
}

/** 最後に記録した到達点(%またはページ)。未記録は0 */
export function lastProgress(book) {
  const s = book?.sessions;
  return s && s.length ? s[s.length - 1].toPage : 0;
}

/** 進捗の割合(0-100)。算出できなければnull */
export function progressPct(book) {
  const last = lastProgress(book);
  if (!last) return null;
  if (isPercent(book)) return Math.min(100, last);
  if (!book?.pages) return null;
  return Math.min(100, Math.round((last / book.pages) * 100));
}

/** 「p.120」「42％」のような短い表示 */
export function formatProgress(book, value) {
  return isPercent(book) ? `${value}％` : `p.${value}`;
}

/** 到達点の表示(未記録なら null) */
export function progressLabel(book) {
  const last = lastProgress(book);
  if (!last) return null;
  const max = progressMax(book);
  return `${formatProgress(book, last)}まで` + (max ? ` / ${formatProgress(book, max)}` : "");
}

/** 読み終えたとみなせる到達点か */
export function reachedEnd(book, value) {
  const max = progressMax(book);
  return !!max && value >= max;
}

/**
 * 進捗の増分を「実際のページ数」に換算する(統計用)。
 * %のまま集計するとページ数の統計が壊れるので、
 * 総ページ数が分かっている場合だけ換算し、不明なら0(=読書日にのみ数える)。
 */
export function deltaToPages(book, delta) {
  if (delta <= 0) return 0;
  if (!isPercent(book)) return delta;
  if (!book?.pages) return 0;
  return Math.round((delta / 100) * book.pages);
}

/** 入力欄の説明文 */
export function progressHint(book) {
  const last = lastProgress(book);
  return isPercent(book)
    ? `${last + 1}％〜`
    : `p.${last + 1}〜`;
}
