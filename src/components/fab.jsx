import { useState } from "react";
import { C, MINCHO, GOTHIC, tagColor, inpS } from "./common.jsx";
import { isPercent, lastProgress, progressPct, progressLabel, progressHint } from "../lib/progress.js";
import { todayLocal } from "../lib/dates.js";
import { mainTag } from "../lib/tags.js";

/* ---- シート内の読書中1行(その場で到達ページを保存) ---- */
function SheetRow({ book, onProgress, onDone }) {
  const [toPage, setToPage] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const lp = lastProgress(book);
  const pct = progressPct(book);
  const pctMode = isPercent(book);

  const save = async () => {
    setBusy(true); setErr("");
    try {
      await onProgress(book, { date: todayLocal(), toPage, memo });
      onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 6, padding: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 4, alignSelf: "stretch", background: tagColor(mainTag(book)), borderRadius: 2, minHeight: 30 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MINCHO, fontSize: 13.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{book.title}</div>
          <div style={{ fontSize: 10, color: C.sub }}>
            {progressLabel(book) || "進捗未記録"}{pct !== null ? `(${pct}%)` : ""}
          </div>
        </div>
        <input type="number" inputMode="numeric" max={pctMode ? 100 : undefined} placeholder={progressHint(book)}
          value={toPage} onChange={(e) => setToPage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && toPage && save()}
          style={{ ...inpS, width: 86, padding: "8px", fontSize: 14 }} />
        <button onClick={save} disabled={busy || !toPage}
          style={{ padding: "9px 14px", borderRadius: 4, background: toPage ? C.gold : C.line, color: "#fff", fontSize: 13, border: "none", cursor: "pointer", flexShrink: 0 }}>
          {busy ? "…" : "保存"}
        </button>
      </div>
      {toPage && (
        <input value={memo} onChange={(e) => setMemo(e.target.value)}
          placeholder="ひとことメモ(任意)"
          style={{ ...inpS, fontSize: 12.5, padding: "7px 9px", marginTop: 6 }} />
      )}
      {err && <div style={{ fontSize: 10.5, color: "#A33", marginTop: 4 }}>{err}</div>}
    </div>
  );
}

/* ---- FAB本体+シート ---- */
export function RecordFab({ books, onProgress, onAddBook }) {
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const reading = books.filter((b) => b.status === "reading").sort((a, b) => b.start.localeCompare(a.start));

  const done = () => {
    setFlash("記録しました");
    setTimeout(() => { setFlash(""); setOpen(false); }, 700);
  };

  return (
    <>
      {/* FAB(下タブの上に浮かせる) */}
      {/* 読書中の本がなければシートに見せるものが無いので、追加フォームへ直行する */}
      <button onClick={() => (reading.length === 0 ? onAddBook() : setOpen(true))} aria-label="記録する"
        style={{
          position: "fixed", right: 16, bottom: "calc(72px + env(safe-area-inset-bottom))", zIndex: 40,
          width: 56, height: 56, borderRadius: 28, border: "none", cursor: "pointer",
          background: C.gold, color: "#fff", fontFamily: MINCHO, fontSize: 13.5, letterSpacing: 1,
          boxShadow: "0 4px 14px rgba(0,0,0,.28)",
        }}>
        記録
      </button>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 560, maxHeight: "72vh", background: C.paper,
              borderRadius: "14px 14px 0 0", fontFamily: GOTHIC,
              display: "flex", flexDirection: "column",
            }}>
            {/* 見出し(固定) */}
            <div style={{ padding: "16px 16px 8px", flexShrink: 0 }}>
              <div style={{ fontFamily: MINCHO, fontSize: 15, color: C.indigo, letterSpacing: 2 }}>
                今日の記録
              </div>
              {flash && <div style={{ fontSize: 12, color: C.gold, marginTop: 4 }}>{flash}</div>}
            </div>

            {/* 読書中の一覧(ここだけスクロールする) */}
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 8px", display: "flex", flexDirection: "column", gap: 8 }}>
              {reading.length === 0 && (
                <div style={{ fontSize: 12.5, color: C.sub, padding: "4px 0" }}>読書中の本はありません。</div>
              )}
              {reading.map((b) => (
                <SheetRow key={b.id} book={b} onProgress={onProgress} onDone={done} />
              ))}
            </div>

            {/* 本を追加(下端に固定。読書中が何冊あっても同じ位置) */}
            <div style={{
              flexShrink: 0, padding: "10px 16px calc(16px + env(safe-area-inset-bottom))",
              borderTop: `1px solid ${C.line}`, background: C.paper,
            }}>
              <button onClick={() => { setOpen(false); onAddBook(); }}
                style={{ width: "100%", padding: "12px 0", borderRadius: 6, background: C.indigo, color: "#F5F3EC", fontFamily: MINCHO, fontSize: 14, letterSpacing: 2, border: "none", cursor: "pointer" }}>
                ＋ 本を追加
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
