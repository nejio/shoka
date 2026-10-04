import { useState } from "react";
import { C, MINCHO, GOTHIC, inpS } from "./common.jsx";
import {
  HOLDING_TYPES, EBOOK_SERVICES, holdingLabel, holdingType,
  dueLabel, isDueSoon,
} from "../lib/holding.js";
import { IconChevron } from "./icons.jsx";
import { progressUnit, PROGRESS_UNITS } from "../lib/progress.js";

/** 詳細画面の保有状況セクション(未設定なら控えめなリンクのみ) */
export function HoldingEditor({ book, onSave, onSaveProgressUnit }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const h = book.holding || null;
  const [type, setType] = useState(holdingType(book));
  const [service, setService] = useState(h?.service || "");
  const [dueDate, setDueDate] = useState(h?.dueDate || "");
  const [returned, setReturned] = useState(!!h?.returned);

  const start = () => {
    setType(holdingType(book));
    setService(h?.service || "");
    setDueDate(h?.dueDate || "");
    setReturned(!!h?.returned);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    try {
      await onSave(book.id, { type, service, dueDate, returned });
      setOpen(false);
    } catch {}
    setBusy(false);
  };

  const due = dueLabel(book);
  const soon = isDueSoon(book);

  if (!open) {
    return (
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button onClick={start}
          style={{
            fontSize: 11, color: h ? C.ink : C.sub, background: "none",
            border: `1px ${h ? "solid" : "dashed"} ${C.line}`, borderRadius: 10,
            padding: "3px 9px", cursor: "pointer", fontFamily: GOTHIC,
            display: "inline-flex", alignItems: "center", gap: 3,
          }}>
          {h ? holdingLabel(book) : "保有状況を記録"}
          <IconChevron size={11} />
        </button>
        {due && (
          <span style={{ fontSize: 11, color: soon ? C.gold : C.sub }}>{due}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: C.card, border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>この本はいまどこに?</div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {HOLDING_TYPES.map(([k, label]) => (
          <button key={k} onClick={() => setType(k)}
            style={{
              fontSize: 11.5, borderRadius: 12, padding: "4px 11px", fontFamily: GOTHIC,
              border: type === k ? "none" : `1px solid ${C.line}`,
              background: type === k ? C.indigo : C.field,
              color: type === k ? "#fff" : C.sub, cursor: "pointer",
            }}>{label}</button>
        ))}
      </div>

      {type === "ebook" && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>サービス</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {EBOOK_SERVICES.map((s) => (
              <button key={s} onClick={() => setService(s === service ? "" : s)}
                style={{
                  fontSize: 10.5, borderRadius: 12, padding: "3px 9px", fontFamily: GOTHIC,
                  border: service === s ? "none" : `1px solid ${C.line}`,
                  background: service === s ? C.gold : C.field,
                  color: service === s ? "#fff" : C.sub, cursor: "pointer",
                }}>{s}</button>
            ))}
          </div>
          <input value={service} onChange={(e) => setService(e.target.value)}
            placeholder="その他のサービス名"
            style={{ ...inpS, fontSize: 12.5, padding: "6px 9px", marginTop: 6 }} />
        </div>
      )}

      {type === "library" && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ink }}>
            <input type="checkbox" checked={returned} onChange={(e) => setReturned(e.target.checked)} />
            返却済み
          </label>
          {!returned && (
            <label style={{ fontSize: 10.5, color: C.sub }}>
              返却期限
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                style={{ ...inpS, fontSize: 12.5, padding: "6px 9px", marginTop: 2 }} />
            </label>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={save} disabled={busy}
          style={{ padding: "7px 18px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12.5, border: "none", cursor: "pointer" }}>
          保存
        </button>
        <button onClick={() => setOpen(false)}
          style={{ padding: "7px 12px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>
          やめる
        </button>
      </div>
      {(book.status === "reading" || book.status === "stacked") && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
          <div style={{ fontSize: 10.5, color: C.sub, marginBottom: 5 }}>進捗の記録単位</div>
          <div style={{ display: "flex", gap: 6 }}>
            {PROGRESS_UNITS.map(([k, l]) => (
              <button key={k}
                onClick={async () => { setBusy(true); try { await onSaveProgressUnit(book.id, k); } catch {} setBusy(false); }}
                disabled={busy}
                style={{
                  fontSize: 11.5, borderRadius: 12, padding: "4px 14px", fontFamily: GOTHIC,
                  border: progressUnit(book) === k ? "none" : `1px solid ${C.line}`,
                  background: progressUnit(book) === k ? C.indigo : C.field,
                  color: progressUnit(book) === k ? "#fff" : C.sub, cursor: "pointer",
                }}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 5, lineHeight: 1.7 }}>
            電子書籍は％、紙の本はページで記録するのが既定です。記録済みの足あとは消えません。
          </div>
        </div>
      )}

      {type === "released" && (
        <div style={{ fontSize: 10, color: C.sub, marginTop: 8, lineHeight: 1.7 }}>
          手放した本も、読んだ記録は本棚と知識の地図に残ります。
        </div>
      )}
    </div>
  );
}
