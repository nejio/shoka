import { useState, useMemo } from "react";
import { C, MINCHO, GOTHIC, tagColor, EmptyState, inpS } from "./common.jsx";
import { allMemos, booksWithMemo } from "../lib/memo.js";
import { mainTag } from "../lib/tags.js";
import { fmtD, ym } from "../lib/dates.js";

const KIND = {
  progress: { label: "読みながら", color: (b) => tagColor(mainTag(b)) },
  review: { label: "読了の感想", color: () => null },
  why: { label: "積んだ理由", color: () => null },
};

/* ---- メモ1件 ---- */
function MemoItem({ memo, onSelect }) {
  const b = memo.book;
  const kind = KIND[memo.kind] || KIND.progress;
  return (
    <button onClick={() => onSelect(b)}
      style={{
        width: "100%", textAlign: "left", background: C.card,
        border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 12px",
        cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start",
      }}>
      <span style={{ width: 4, alignSelf: "stretch", background: tagColor(mainTag(b)), borderRadius: 2, minHeight: 40, flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontFamily: MINCHO, fontSize: 13, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>
            {b.title}
          </span>
          <span style={{ fontSize: 10, color: C.sub }}>
            {fmtD(memo.date)}
            {memo.progress ? ` ・ ${memo.progress}` : ""}
            {` ・ ${kind.label}`}
          </span>
        </div>
        <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.9, marginTop: 5, fontFamily: MINCHO, whiteSpace: "pre-wrap" }}>
          {memo.text}
        </p>
      </div>
    </button>
  );
}

export function MemoView({ books, onSelect }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(30);

  const memos = useMemo(() => allMemos(books), [books]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return memos;
    return memos.filter(
      (m) =>
        m.text.toLowerCase().includes(t) ||
        String(m.book.title).toLowerCase().includes(t)
    );
  }, [memos, q]);

  if (!memos.length) {
    return (
      <EmptyState
        title="読みながら書いた言葉が、ここに集まります"
        lines={"進捗を記録するときのひとことメモと、読み終えたときの感想が\n時系列で並びます。\n数年後に読み返すと、そのとき何を考えていたかが蘇ります。"}
        hint={"右下の「記録」から進捗を付けるときに、メモを添えられます。"}
      />
    );
  }

  // 月ごとの見出しを付けて並べる
  const shown = filtered.slice(0, limit);
  const rows = [];
  let lastMonth = null;
  shown.forEach((m) => {
    const mo = m.date ? ym(m.date) : "";
    if (mo !== lastMonth) {
      lastMonth = mo;
      rows.push({ header: mo });
    }
    rows.push({ memo: m });
  });

  return (
    <div style={{ padding: "12px 16px 32px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: MINCHO, fontSize: 18, color: C.indigo, letterSpacing: 2 }}>覚書</span>
        <span style={{ fontSize: 11, color: C.sub }}>
          {memos.length}件 ・ {booksWithMemo(books)}冊
        </span>
      </div>

      <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }}
        placeholder="メモを絞り込む"
        style={{ ...inpS, background: C.card, fontSize: 14, marginTop: 10 }} />

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 8px", textAlign: "center", fontSize: 12.5, color: C.sub, fontFamily: GOTHIC }}>
          該当するメモはありません。
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {rows.map((r, i) =>
            r.header !== undefined ? (
              <div key={`h${i}`} style={{
                fontFamily: MINCHO, fontSize: 12.5, color: C.sub, letterSpacing: 1,
                paddingTop: i === 0 ? 0 : 8, paddingBottom: 2,
                borderBottom: `1px solid ${C.line}`,
              }}>
                {r.header ? `${r.header.slice(0, 4)}年${parseInt(r.header.slice(5))}月` : "日付なし"}
              </div>
            ) : (
              <MemoItem key={r.memo.id} memo={r.memo} onSelect={onSelect} />
            )
          )}
        </div>
      )}

      {filtered.length > limit && (
        <button onClick={() => setLimit(limit + 50)}
          style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, color: C.indigo, fontSize: 13, cursor: "pointer" }}>
          さらに表示({filtered.length - limit}件)
        </button>
      )}
    </div>
  );
}
