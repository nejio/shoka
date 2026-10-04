import { useState, useEffect } from "react";
import { C, MINCHO, GOTHIC, tagColor, Stars, TagChip } from "./common.jsx";
import { TagSelector } from "./tagselector.jsx";
import { HoldingEditor } from "./holding.jsx";
import { isWanted } from "../lib/holding.js";
import { IconChevron } from "./icons.jsx";
import { DatePick } from "./datepick.jsx";
import { formatProgress, isPercent } from "../lib/progress.js";
import { getTags, mainTag } from "../lib/tags.js";
import { fmtD } from "../lib/dates.js";

export function Detail({ book, books, onClose, onSelect, onDelete, onChangeTag, onStartReading, onFetchCover, onSetAside, onRevive, onSaveNote, onSaveStackedAt, onSaveHolding, onAcquire, onSaveDates, onSaveRating, onSaveProgressUnit, onSaveSessionMemo }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editingTag, setEditingTag] = useState(false);
  const [coverMsg, setCoverMsg] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [editingDate, setEditingDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const [tagDraft, setTagDraft] = useState([]);
  const [editingDates, setEditingDates] = useState(false);
  const [startDraft, setStartDraft] = useState("");
  const [endDraft, setEndDraft] = useState("");
  const [editingRating, setEditingRating] = useState(false);
  const [memoIdx, setMemoIdx] = useState(null);
  const [memoDraft, setMemoDraft] = useState("");
  useEffect(() => { setConfirmDel(false); setEditingTag(false); setCoverMsg(""); setEditingNote(false); setEditingDate(false); setEditingDates(false); setEditingRating(false); setMemoIdx(null); setTagDraft(book ? getTags(book) : []); }, [book && book.id]);
  if (!book) return null;

  const sameTitle = books
    .filter((b) => b.title === book.title && b.status === "finished")
    .sort((a, b) => a.end.localeCompare(b.end));
  const related = books
    .filter((b) => b.title !== book.title && b.status === "finished" && getTags(b).some((t) => getTags(book).includes(t)))
    .sort((a, b) => b.end.localeCompare(a.end)).slice(0, 4);

  const del = async () => {
    if (!confirmDel) return setConfirmDel(true);
    setBusy(true);
    try { await onDelete(book.id); onClose(); } catch {}
    setBusy(false);
  };

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(35,39,44,.45)" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 448, maxHeight: "85vh", overflowY: "auto", borderRadius: "12px 12px 0 0", padding: 20, background: C.paper, fontFamily: GOTHIC }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ width: 6, alignSelf: "stretch", background: tagColor(mainTag(book)), borderRadius: 3 }} />
          {book.coverUrl && (
            <img src={book.coverUrl} alt="" style={{ width: 56, height: 80, objectFit: "cover", borderRadius: 4, border: `1px solid ${C.line}`, flexShrink: 0 }} />
          )}
          <div>
            <div style={{ fontFamily: MINCHO, fontSize: 19, color: C.ink, lineHeight: 1.4 }}>{book.title}</div>
            {book.author && <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{book.author}</div>}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
              {book.status === "reading" && (
                <>
                  <span style={{ fontSize: 11, color: C.indigo, border: `1px solid ${C.indigo}`, borderRadius: 10, padding: "1px 9px" }}>読書中</span>
                  <button onClick={() => { setStartDraft(book.start || ""); setEndDraft(""); setEditingDates(!editingDates); }}
                    title="タップして読み始めた日を変更"
                    style={{ fontSize: 11, color: C.sub, background: "none", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "2px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {fmtD(book.start)} 読始
                    <IconChevron size={11} dir={editingDates ? "up" : "down"} />
                  </button>
                </>
              )}
              {book.status === "stacked" && !isWanted(book) && (
                <span style={{ fontSize: 11, color: C.sub, border: `1px solid ${C.sub}`, borderRadius: 10, padding: "1px 9px" }}>積読</span>
              )}
              {isWanted(book) && (
                <span style={{ fontSize: 11, color: C.sub, border: `1.5px dashed ${C.sub}`, borderRadius: 10, padding: "1px 9px" }}>気になる本</span>
              )}
              {book.status === "setaside" && (
                <span style={{ fontSize: 11, color: C.sub, border: `1px dashed ${C.sub}`, borderRadius: 10, padding: "1px 9px" }}>見送り</span>
              )}
              {book.status !== "finished" && (book.status === "stacked" || book.status === "setaside") && (
                <button onClick={() => { setDateDraft(book.stackedAt || ""); setEditingDate(!editingDate); }}
                  title="タップして積んだ日を変更"
                  style={{ fontSize: 11, color: C.sub, background: "none", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "2px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {book.stackedAt ? `${fmtD(book.stackedAt)} に積んだ` : "積んだ日を記録"}
                  <IconChevron size={11} dir={editingDate ? "up" : "down"} />
                </button>
              )}
              {book.status === "finished" && (
                <><button onClick={() => setEditingRating(!editingRating)}
                    title="タップして評価を変更"
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                    {book.rating
                      ? <Stars n={book.rating} size={14} />
                      : <span style={{ fontSize: 11, color: C.sub, border: `1px dashed ${C.line}`, borderRadius: 10, padding: "2px 8px" }}>評価する</span>}
                  </button>
                  <button onClick={() => {
                      setStartDraft(book.start || book.end); setEndDraft(book.end || "");
                      setEditingDates(!editingDates);
                    }}
                    title="タップして日付を変更"
                    style={{ fontSize: 12, color: C.sub, background: "none", border: `1px dashed ${C.line}`, borderRadius: 10, padding: "2px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    {book.start !== book.end ? `${fmtD(book.start)} 〜 ` : ""}{fmtD(book.end)} 読了
                    <IconChevron size={11} dir={editingDates ? "up" : "down"} />
                  </button>
                </>
              )}
              {getTags(book).map((t, i) => (
                <button key={t} onClick={() => setEditingTag(!editingTag)}
                  title="タップしてタグを変更"
                  style={{ fontSize: 11, color: "#fff", background: tagColor(t), borderRadius: 10, padding: "2px 8px", border: "none", cursor: "pointer", opacity: i === 0 ? 1 : 0.82, display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {t}{i === getTags(book).length - 1 && <IconChevron size={11} dir={editingTag ? "up" : "down"} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {editingRating && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>評価(同じ星をもう一度押すと未評価に戻ります)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n}
                  onClick={async () => {
                    setBusy(true);
                    try { await onSaveRating(book.id, n === book.rating ? null : n); setEditingRating(false); } catch {}
                    setBusy(false);
                  }}
                  disabled={busy}
                  style={{ fontSize: 30, background: "none", border: "none", padding: "0 3px", color: n <= (book.rating || 0) ? C.gold : C.line, cursor: "pointer" }}>★</button>
              ))}
            </div>
          </div>
        )}

        {editingDates && (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 12 }}>
            <DatePick value={startDraft} onChange={setStartDraft} label="読み始めた日" />
            {book.status === "finished" && (
              <DatePick value={endDraft} onChange={setEndDraft} label="読み終えた日" />
            )}
            {book.status === "finished" && endDraft && startDraft > endDraft && (
              <div style={{ fontSize: 11, color: "#A33" }}>読み始めた日が読み終えた日より後になっています</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                  setBusy(true);
                  try {
                    await onSaveDates(book.id, {
                      start: startDraft,
                      end: book.status === "finished" ? endDraft : null,
                    });
                    setEditingDates(false);
                  } catch {}
                  setBusy(false);
                }}
                disabled={busy || (book.status === "finished" && (!endDraft || startDraft > endDraft))}
                style={{ padding: "8px 20px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12.5, border: "none", cursor: "pointer" }}>保存</button>
              <button onClick={() => setEditingDates(false)}
                style={{ padding: "8px 14px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
            </div>
          </div>
        )}

        {editingDate && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: C.sub }}>積んだ日</span>
            <input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)}
              style={{ background: C.field, border: `1px solid ${C.line}`, borderRadius: 4, padding: "7px 9px", fontSize: 13, color: C.ink, fontFamily: GOTHIC }} />
            <button onClick={async () => { setBusy(true); try { await onSaveStackedAt(book.id, dateDraft); setEditingDate(false); } catch {} setBusy(false); }}
              disabled={busy}
              style={{ padding: "7px 16px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12.5, border: "none", cursor: "pointer" }}>保存</button>
            <button onClick={() => setEditingDate(false)}
              style={{ padding: "7px 12px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
          </div>
        )}

        {editingTag && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: C.card, border: `1px solid ${C.line}` }}>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>タグを変更(最大5つ・先頭が主タグ)</div>
            <TagSelector books={books} value={tagDraft} onChange={setTagDraft} compact />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={async () => { setBusy(true); try { await onChangeTag(book.id, tagDraft); setEditingTag(false); } catch {} setBusy(false); }}
                disabled={busy}
                style={{ padding: "7px 18px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12.5, border: "none", cursor: "pointer" }}>保存</button>
              <button onClick={() => setEditingTag(false)}
                style={{ padding: "7px 12px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
            </div>
          </div>
        )}

        {isWanted(book) && (
          <button onClick={async () => { setBusy(true); try { await onAcquire(book.id); } catch {} setBusy(false); }}
            disabled={busy}
            style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 6, background: C.indigo, color: "#F5F3EC", fontFamily: MINCHO, fontSize: 14, letterSpacing: 2, border: "none", cursor: "pointer" }}>
            この本を入手した
          </button>
        )}

        {book.status === "stacked" && !isWanted(book) && (
          <>
            <button onClick={async () => { setBusy(true); try { await onStartReading(book.id); } catch {} setBusy(false); }}
              disabled={busy}
              style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 6, background: C.gold, color: "#fff", fontFamily: MINCHO, fontSize: 14, letterSpacing: 2, border: "none", cursor: "pointer" }}>
              この本を読み始める(今日から)
            </button>
            <button onClick={async () => { setBusy(true); try { await onSetAside(book.id); onClose(); } catch {} setBusy(false); }}
              disabled={busy}
              style={{ width: "100%", marginTop: 8, padding: "9px 0", borderRadius: 6, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>
              いまは見送る(蔵書には残ります)
            </button>
          </>
        )}

        {book.status === "setaside" && (
          <button onClick={async () => { setBusy(true); try { await onRevive(book.id); } catch {} setBusy(false); }}
            disabled={busy}
            style={{ width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 6, background: C.indigo, color: "#F5F3EC", fontFamily: MINCHO, fontSize: 14, letterSpacing: 2, border: "none", cursor: "pointer" }}>
            関心の地図に戻す
          </button>
        )}

        <HoldingEditor book={book} onSave={onSaveHolding} onSaveProgressUnit={onSaveProgressUnit} />

        {!book.coverUrl && (
          <div style={{ marginTop: 10 }}>
            <button onClick={async () => {
                setBusy(true); setCoverMsg("書影を探しています…");
                try { await onFetchCover(book); setCoverMsg(""); }
                catch (e) { setCoverMsg(e.message); }
                setBusy(false);
              }}
              disabled={busy}
              style={{ padding: "8px 16px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>
              書影を取得
            </button>
            {coverMsg && <span style={{ fontSize: 11, color: coverMsg.includes("…") ? C.sub : "#A33", marginLeft: 8 }}>{coverMsg}</span>}
          </div>
        )}

        {book.note && book.status === "finished" && (
          <p style={{ marginTop: 12, padding: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, fontSize: 13.5, lineHeight: 1.8, color: C.ink, fontFamily: MINCHO }}>
            {book.note}
          </p>
        )}

        {(book.status === "stacked" || book.status === "setaside") && (
          <div style={{ marginTop: 12 }}>
            {editingNote ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea autoFocus value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="なぜ気になったか(あとで思い出すための手がかり)"
                  style={{ width: "100%", minHeight: 70, background: C.field, border: `1px solid ${C.line}`, borderRadius: 6, padding: 10, fontSize: 13, color: C.ink, fontFamily: GOTHIC, lineHeight: 1.7 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={async () => { setBusy(true); try { await onSaveNote(book.id, noteDraft); setEditingNote(false); } catch {} setBusy(false); }}
                    disabled={busy}
                    style={{ padding: "7px 18px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12.5, border: "none", cursor: "pointer" }}>保存</button>
                  <button onClick={() => setEditingNote(false)}
                    style={{ padding: "7px 14px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setNoteDraft(book.note || ""); setEditingNote(true); }}
                style={{ width: "100%", textAlign: "left", padding: 12, borderRadius: 6, background: C.card, border: `1px ${book.note ? "solid" : "dashed"} ${C.line}`, cursor: "pointer" }}>
                {book.note
                  ? <span style={{ fontSize: 13.5, lineHeight: 1.8, color: C.ink, fontFamily: MINCHO }}>{book.note}</span>
                  : <span style={{ fontSize: 12, color: C.sub }}>＋ なぜ気になったかを書き留める</span>}
              </button>
            )}
          </div>
        )}

        {book.note && book.status === "reading" && (
          <p style={{ marginTop: 12, padding: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, fontSize: 13.5, lineHeight: 1.8, color: C.ink, fontFamily: MINCHO }}>
            {book.note}
          </p>
        )}

        {(book.sessions || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.indigo, fontFamily: MINCHO, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>読書の足あと</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {book.sessions.map((s, i) => {
                const prev = i > 0 ? book.sessions[i - 1].toPage : 0;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 12, color: C.ink }}>
                      <span style={{ color: C.sub, fontSize: 11, width: 80 }}>{fmtD(s.date)}</span>
                      <span style={{ fontFamily: MINCHO }}>{formatProgress(book, s.toPage)} まで</span>
                      <span style={{ color: C.gold, fontSize: 11 }}>
                        +{s.toPage - prev}{isPercent(book) ? "％" : "p"}
                      </span>
                    </div>
                    {memoIdx === i ? (
                      <div style={{ marginLeft: 92, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                        <textarea autoFocus value={memoDraft} onChange={(e) => setMemoDraft(e.target.value)}
                          placeholder="この時に思ったこと"
                          style={{ width: "100%", minHeight: 60, background: C.field, border: `1px solid ${C.line}`, borderRadius: 6, padding: 8, fontSize: 12.5, color: C.ink, fontFamily: GOTHIC, lineHeight: 1.8 }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={async () => {
                              setBusy(true);
                              try { await onSaveSessionMemo(book, i, memoDraft); setMemoIdx(null); } catch {}
                              setBusy(false);
                            }} disabled={busy}
                            style={{ padding: "6px 14px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12, border: "none", cursor: "pointer" }}>保存</button>
                          <button onClick={() => setMemoIdx(null)}
                            style={{ padding: "6px 10px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 11.5, cursor: "pointer" }}>やめる</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setMemoIdx(i); setMemoDraft(s.memo || ""); }}
                        style={{
                          marginLeft: 92, marginTop: 2, textAlign: "left", background: "none",
                          border: "none", padding: 0, cursor: "pointer", display: "block",
                          fontSize: 12.5, lineHeight: 1.8, fontFamily: MINCHO,
                          color: s.memo ? C.ink : C.sub, opacity: s.memo ? 1 : 0.75,
                        }}>
                        {s.memo || "＋ メモを書く"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sameTitle.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.gold, fontFamily: MINCHO, borderBottom: `1px solid ${C.gold}`, paddingBottom: 4 }}>再読の記録 — 感想の変化</div>
            {sameTitle.map((r, i) => (
              <div key={r.id} style={{ marginTop: 8, paddingLeft: 12, borderLeft: `2px solid ${r.id === book.id ? C.gold : C.line}` }}>
                <div style={{ fontSize: 11, color: C.sub }}>{i + 1}回目・{fmtD(r.end)}・<Stars n={r.rating} size={11} /></div>
                {r.note && <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.7 }}>{r.note}</div>}
              </div>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, color: C.indigo, fontFamily: MINCHO, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 }}>同じタグの本</div>
            {related.map((r) => (
              <button key={r.id} onClick={() => onSelect(r)}
                style={{ display: "block", width: "100%", textAlign: "left", marginTop: 8, padding: 8, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, cursor: "pointer" }}>
                <span style={{ fontFamily: MINCHO, fontSize: 13, color: C.ink }}>{r.title}</span>
                <span style={{ fontSize: 11, color: C.sub, marginLeft: 8 }}>{fmtD(r.end)}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={del} disabled={busy}
            style={{ padding: "10px 16px", borderRadius: 4, background: confirmDel ? "#8A3030" : "none", border: `1px solid ${confirmDel ? "#8A3030" : C.line}`, color: confirmDel ? "#fff" : C.sub, fontSize: 12, cursor: "pointer" }}>
            {confirmDel ? "本当に削除" : "削除"}
          </button>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px 0", borderRadius: 4, background: C.indigo, color: "#fff", fontSize: 14, border: "none", cursor: "pointer" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
