// 日付ユーティリティ(純粋関数)
// 注意: toISOString() はUTC変換で日本時間では1日ずれるため、必ずこちらを使うこと。

export const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const todayLocal = () => isoLocal(new Date());

export const ym = (s) => s.slice(0, 7);

export const fmtD = (s) => (s ? s.replace(/-/g, "/") : "—");

export const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

export const daysAgo = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return isoLocal(d);
};
