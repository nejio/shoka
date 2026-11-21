// 読書の足あと(sessions)の修正と削除(純粋関数)
//
// 足あとは「到達点が前回より先であること」を条件に追加される(validate.js の validateSession)。
// そのため、打ち間違いで大きすぎる値を入れると、以後の記録がすべて弾かれてしまう。
// 間違いを直せるよう、到達点の修正と削除を用意する。

import { progressMax, progressUnit, formatProgress } from "./progress.js";

/**
 * index 番目の足あとの到達点を直した配列を返す。
 * 前後の足あとの間に収まる値だけを受け付ける(到達点は常に増えていく)。
 * @returns { ok: true, value: sessions } | { ok: false, error }
 */
export function editSessionProgress(book, index, input) {
  const sessions = book?.sessions || [];
  const cur = sessions[index];
  if (!cur) return { ok: false, error: "その記録が見つかりません" };

  const pct = progressUnit(book) === "percent";
  const toPage = Math.round(Number(input));
  if (!Number.isFinite(toPage) || toPage <= 0) {
    return { ok: false, error: pct ? "どこまで読んだか(％)を入力してください" : "到達ページを入力してください" };
  }

  const prev = index > 0 ? sessions[index - 1].toPage : 0;
  if (toPage <= prev) {
    return { ok: false, error: `前回(${formatProgress(book, prev)})より先を入力してください` };
  }
  const next = index < sessions.length - 1 ? sessions[index + 1].toPage : null;
  if (next !== null && toPage >= next) {
    return { ok: false, error: `次の記録(${formatProgress(book, next)})より手前を入力してください` };
  }
  const max = progressMax(book);
  if (max && toPage > max) {
    return { ok: false, error: pct ? "100％を超えています" : `総ページ数(${max}p)を超えています` };
  }

  const out = [...sessions];
  out[index] = { ...cur, toPage };
  return { ok: true, value: out };
}

/**
 * index 番目の足あとを取り除いた配列を返す(メモも一緒に消える)。
 * @returns { ok: true, value: sessions } | { ok: false, error }
 */
export function removeSession(book, index) {
  const sessions = book?.sessions || [];
  if (!sessions[index]) return { ok: false, error: "その記録が見つかりません" };
  return { ok: true, value: sessions.filter((_, i) => i !== index) };
}
