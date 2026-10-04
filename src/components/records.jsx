import { useState, useMemo } from "react";
import { C, MINCHO, GOTHIC, tagColor, inpS, Stars, TagChip, EmptyState } from "./common.jsx";
import { TagSelector } from "./tagselector.jsx";
import { getTags, mainTag, tagOptions } from "../lib/tags.js";
import { lastPage } from "../lib/stats.js";
import { isPercent, lastProgress, progressPct, progressLabel, progressHint, reachedEnd, formatProgress } from "../lib/progress.js";
import { fmtD, todayLocal } from "../lib/dates.js";
import { dueLabel, isDueSoon, holdingLabel } from "../lib/holding.js";
import { lookupByIsbn, searchByTitle } from "../lib/biblioApi.js";
import { authorsIn, filterByAuthor, knownAuthors } from "../lib/biblio.js";
import { Scanner } from "./scanner.jsx";
import { IconBarcode } from "./icons.jsx";
import { DatePick } from "./datepick.jsx";
import { EBOOK_SERVICES } from "../lib/holding.js";

/* ---- 読書中カード ---- */
function ReadingCard({ book, onProgress, onFinish, onSelect }) {
  const TODAY = todayLocal();
  const [mode, setMode] = useState(null); // null | "progress" | "finish"
  const [toPage, setToPage] = useState("");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(TODAY);
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const lp = lastProgress(book);
  const pct = progressPct(book);
  const pctMode = isPercent(book);

  const saveProgress = async () => {
    setBusy(true); setErr("");
    try {
      const saved = await onProgress(book, { date, toPage, memo });
      setToPage(""); setMemo(""); setMode(null);
      if (reachedEnd(book, saved.toPage)) { setMode("finish"); setDate(TODAY); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const saveFinish = async () => {
    setBusy(true); setErr("");
    try {
      await onFinish(book, { end: date, rating, note });
      setMode(null); setNote("");
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 6, padding: 12 }}>
      <button onClick={() => onSelect(book)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 5, alignSelf: "stretch", background: tagColor(mainTag(book)), borderRadius: 2, minHeight: 36 }} />
          {book.coverUrl && <img src={book.coverUrl} alt="" style={{ width: 28, height: 40, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: MINCHO, fontSize: 14.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {book.title}{book.pending ? " ⏳" : ""}
            </div>
            <div style={{ fontSize: 10.5, color: C.sub }}>
              {fmtD(book.start)} 読始 ・ {progressLabel(book) || "進捗未記録"}
              {dueLabel(book) && (
                <span style={{ color: isDueSoon(book) ? C.gold : C.sub, marginLeft: 6 }}>・{dueLabel(book)}</span>
              )}
            </div>
          </div>
          {pct !== null && <span style={{ fontFamily: MINCHO, fontSize: 15, color: C.indigo }}>{pct}%</span>}
        </div>
      </button>
      {pct !== null && (
        <div style={{ marginTop: 8, height: 6, borderRadius: 3, overflow: "hidden", background: C.empty }}>
          <div style={{ width: `${pct}%`, height: "100%", background: tagColor(mainTag(book)) }} />
        </div>
      )}

      {mode === null && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => { setMode("progress"); setDate(TODAY); }}
            style={{ flex: 1, padding: "8px 0", borderRadius: 4, background: C.indigo, color: "#fff", fontSize: 13, border: "none", cursor: "pointer" }}>進捗を記録</button>
          <button onClick={() => { setMode("finish"); setDate(TODAY); }}
            style={{ padding: "8px 16px", borderRadius: 4, background: "none", border: `1px solid ${C.gold}`, color: C.gold, fontSize: 13, cursor: "pointer" }}>読了にする</button>
        </div>
      )}

      {mode === "progress" && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="number" inputMode="numeric" autoFocus
              max={pctMode ? 100 : undefined}
              style={{ ...inpS, width: 110 }}
              placeholder={progressHint(book)} value={toPage} onChange={(e) => setToPage(e.target.value)} />
            <span style={{ fontSize: 12, color: C.sub }}>{pctMode ? "％まで読んだ" : "ページまで読んだ"}</span>
            <input type="date" style={{ ...inpS, width: 150, fontSize: 12 }} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <input style={{ ...inpS, fontSize: 13 }} placeholder="ひとことメモ(任意)"
            value={memo} onChange={(e) => setMemo(e.target.value)} />
          {err && <div style={{ fontSize: 11, color: "#A33" }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveProgress} disabled={busy}
              style={{ flex: 1, padding: "8px 0", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 13, border: "none", cursor: "pointer" }}>{busy ? "保存中…" : "保存"}</button>
            <button onClick={() => { setMode(null); setErr(""); }}
              style={{ padding: "8px 12px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
          </div>
        </div>
      )}

      {mode === "finish" && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}
                style={{ fontSize: 26, background: "none", border: "none", padding: "0 2px", color: n <= rating ? C.gold : C.line, cursor: "pointer" }}>★</button>
            ))}
            <input type="date" style={{ ...inpS, width: 150, fontSize: 12, marginLeft: 8 }} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <textarea style={{ ...inpS, minHeight: 76, lineHeight: 1.8, resize: "vertical" }} placeholder="感想(任意)" value={note} onChange={(e) => setNote(e.target.value)} />
          {err && <div style={{ fontSize: 11, color: "#A33" }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveFinish} disabled={busy}
              style={{ flex: 1, padding: "8px 0", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 13, border: "none", cursor: "pointer" }}>{busy ? "保存中…" : "読了として保存"}</button>
            <button onClick={() => setMode(null)}
              style={{ padding: "8px 12px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>やめる</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- 登録フォーム ---- */

/* ---- 本の追加(最小フォーム) ----
 * 初めて使う人がまず見る画面なので、既定では「書名」と「状態」だけを出す。
 * 星・タグ・著者・ページ数・感想は登録後に詳細画面から足せるため、
 * ここで全部を並べる必要はない。必要な人だけ「もっと詳しく」を開く。
 */
function QuickAdd({ books, onAddFinished, onAddReading, onAddStacked, open, onClose }) {
  const TODAY = todayLocal();
  const [status, setStatus] = useState("reading");
  const [title, setTitle] = useState("");
  const [more, setMore] = useState(false);

  // 詳しい入力(開いた人だけ)
  const [rating, setRating] = useState(0);        // 0 = 未評価
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState("");
  const [author, setAuthor] = useState("");
  const [pages, setPages] = useState("");
  const [end, setEnd] = useState(TODAY);
  const [start, setStart] = useState(TODAY);
  const [stackedAt, setStackedAt] = useState(TODAY);
  const [wanted, setWanted] = useState(false);
  const [ebook, setEbook] = useState(false);
  const [service, setService] = useState("");
  const [isbn, setIsbn] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);

  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // 書誌取得
  const [scanning, setScanning] = useState(false);
  const [lookupText, setLookupText] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");
  const [candidates, setCandidates] = useState([]);   // 検索結果(全件)
  const [authorText, setAuthorText] = useState("");   // 著者での絞り込み(任意入力)
  const [pickedAuthor, setPickedAuthor] = useState(""); // 候補から選んだ著者

  const foundAuthors = authorsIn(candidates);
  const shownCandidates = filterByAuthor(candidates, pickedAuthor);
  const myAuthors = knownAuthors(books, lookupText);

  const reset = () => {
    setTitle(""); setNote(""); setAuthor(""); setPages(""); setErr("");
    setRating(0); setTags([]); setWanted(false);
    setIsbn(null); setCoverUrl(null); setLookupText(""); setLookupMsg(""); setCandidates([]); setAuthorText(""); setPickedAuthor("");
    setStatus("reading"); setMore(false); setEbook(false); setService("");
    setStart(TODAY); setEnd(TODAY); setStackedAt(TODAY);
    onClose();
  };

  const applyBiblio = (b) => {
    if (b.title) setTitle(b.title);
    if (b.author) setAuthor(b.author);
    if (b.pages) setPages(String(b.pages));
    if (b.tag) setTags((prev) => (prev.length ? prev : [b.tag]));
    setIsbn(b.isbn || null);
    setCoverUrl(b.coverUrl || null);
    setCandidates([]);
    setLookupMsg(`「${b.title}」を読み込みました`);
  };

  const onScanDetect = async (code) => {
    setScanning(false);
    setLookupBusy(true); setLookupMsg("書名を調べています…"); setErr("");
    try {
      const b = await lookupByIsbn(code);
      if (b) applyBiblio(b);
      else setLookupMsg("見つかりませんでした。書名を入力してください。");
    } catch (e) { setLookupMsg("取得に失敗しました: " + e.message); }
    setLookupBusy(false);
  };

  const runLookup = async () => {
    const q = lookupText.trim();
    if (!q && !authorText.trim()) return;
    setLookupBusy(true); setLookupMsg(""); setCandidates([]); setErr("");
    try {
      const digits = q.replace(/[-\s]/g, "");
      if (/^(97[89])?\d{9}[\dX]$/i.test(digits)) {
        const b = await lookupByIsbn(digits);
        if (b) applyBiblio(b);
        else setLookupMsg("見つかりませんでした。");
      } else {
        const list = await searchByTitle(q, 12, authorText);
        setPickedAuthor("");
        if (list.length) { setCandidates(list); setLookupMsg(`${list.length}件見つかりました`); }
        else setLookupMsg("見つかりませんでした。");
      }
    } catch (e) { setLookupMsg("検索に失敗しました: " + e.message); }
    setLookupBusy(false);
  };

  const save = async () => {
    setBusy(true); setErr("");
    try {
      const holding = ebook ? { type: "ebook", service } : null;
      const base = { title, author, tags, pages, isbn, coverUrl, holding };
      if (status === "finished") {
        await onAddFinished({ ...base, start: start <= end ? start : end, end, rating: rating || null, note });
      } else if (status === "reading") {
        await onAddReading({ ...base, start, progressUnit: ebook ? "percent" : "page" });
      } else {
        await onAddStacked({ ...base, stackedAt, note, holding: wanted ? { type: "wanted" } : holding });
      }
      reset();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (!open) return null;

  // 記録タブの見出し(読書中/読了)と用語を揃える
  const STATUS = [
    ["stacked", "積読"],
    ["reading", "読書中"],
    ["finished", "読了"],
  ];

  return (
    <div style={{ marginTop: 12, padding: 14, borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", gap: 12 }}>

      {/* 書名 */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        {coverUrl && (
          <img src={coverUrl} alt="" style={{ width: 40, height: 58, objectFit: "cover", borderRadius: 3, border: `1px solid ${C.line}`, flexShrink: 0 }} />
        )}
        <input style={{ ...inpS, fontSize: 16 }} placeholder="書名"
          value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {/* 書名を自動で入れる */}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => { setScanning(true); setLookupMsg(""); }}
          style={{
            padding: "8px 12px", borderRadius: 4, background: C.indigo, color: "#fff",
            fontSize: 12.5, border: "none", cursor: "pointer", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 5,
          }}>
          <IconBarcode size={15} />バーコード
        </button>
        <input style={{ ...inpS, fontSize: 13 }} placeholder="書名で検索"
          value={lookupText} onChange={(e) => setLookupText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runLookup()} />
        <button onClick={runLookup} disabled={lookupBusy || (!lookupText.trim() && !authorText.trim())}
          style={{ padding: "8px 14px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 13, border: "none", cursor: "pointer" }}>
          {lookupBusy ? "…" : "検索"}
        </button>
      </div>

      {/* 著者名(任意)。打てない著者は、検索後に出る候補から選べる */}
      <input style={{ ...inpS, fontSize: 13 }} placeholder="著者名(任意)"
        value={authorText} onChange={(e) => setAuthorText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && runLookup()} />

      {/* 蔵書にいる著者: 同じ著者の本をもう1冊登録するとき、打たずに済む */}
      {!candidates.length && lookupText.trim().length > 0 && myAuthors.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.sub }}>蔵書の著者:</span>
          {myAuthors.map((a) => (
            <button key={a.author} onClick={() => setAuthorText(a.author)}
              style={{ fontSize: 10.5, borderRadius: 12, padding: "3px 10px", fontFamily: GOTHIC,
                border: `1px solid ${C.line}`, background: C.field, color: C.sub, cursor: "pointer" }}>
              {a.author}
            </button>
          ))}
        </div>
      )}
      {ebook && (
        <div style={{ fontSize: 10.5, color: C.sub, lineHeight: 1.7 }}>
          電子書籍にはバーコードがありません。書名で検索してください。
        </div>
      )}
      {lookupMsg && <div style={{ fontSize: 11, color: lookupMsg.includes("失敗") || lookupMsg.includes("見つかりません") ? "#A33" : C.sub }}>{lookupMsg}</div>}
      {candidates.length > 0 && (
        <>
          {/* 著者で絞る。読めない著者名でもタップで選べる */}
          {foundAuthors.length > 1 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.sub }}>著者で絞る:</span>
              {foundAuthors.map((a) => (
                <button key={a.author}
                  onClick={() => setPickedAuthor(pickedAuthor === a.author ? "" : a.author)}
                  style={{
                    fontSize: 10.5, borderRadius: 12, padding: "3px 10px", fontFamily: GOTHIC,
                    border: pickedAuthor === a.author ? "none" : `1px solid ${C.line}`,
                    background: pickedAuthor === a.author ? C.indigo : C.field,
                    color: pickedAuthor === a.author ? "#fff" : C.sub, cursor: "pointer",
                  }}>
                  {a.author} {a.count}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 260, overflowY: "auto" }}>
            {shownCandidates.map((b, i) => (
              <button key={i} onClick={() => applyBiblio(b)}
                style={{ display: "flex", gap: 8, textAlign: "left", padding: 6, borderRadius: 4, background: C.field, border: `1px solid ${C.line}`, cursor: "pointer", alignItems: "center" }}>
                {b.coverUrl
                  ? <img src={b.coverUrl} alt="" style={{ width: 28, height: 40, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />
                  : <div style={{ width: 28, height: 40, background: tagColor(b.tag || "小説"), borderRadius: 2, flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: MINCHO, fontSize: 12.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.title}</div>
                  <div style={{ fontSize: 10.5, color: C.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.author || "著者不明"}
                    {(b.publisher || b.published) && (
                      <span style={{ opacity: 0.8 }}>
                        {" ・ "}{[b.publisher, b.published].filter(Boolean).join(" ")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 状態 */}
      <div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 5 }}>この本は</div>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}` }}>
          {STATUS.map(([k, l]) => (
            <button key={k} onClick={() => setStatus(k)}
              style={{ flex: 1, padding: "10px 0", background: status === k ? C.indigo : C.field, color: status === k ? "#fff" : C.sub, fontSize: 12.5, border: "none", cursor: "pointer" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* 読み終えた本だけ、読了日をここで聞く(既定は今日) */}
      {status === "finished" && (
        <DatePick value={end} onChange={setEnd} label="読了日" />
      )}

      {/* タグ(任意)。読んでいる本の偏りに気づくための軸なので、常に見せる */}
      <div>
        <div style={{ fontSize: 11, color: C.sub, marginBottom: 5 }}>
          タグ<span style={{ opacity: 0.75 }}>(任意・あとから変えられます)</span>
        </div>
        <TagSelector books={books} value={tags} onChange={setTags} compact />
      </div>

      {/* もっと詳しく */}
      {!more ? (
        <button onClick={() => setMore(true)}
          style={{ alignSelf: "flex-start", padding: "6px 0", background: "none", border: "none", color: C.indigo, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          もっと詳しく入力する
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 10, borderTop: `1px dashed ${C.line}` }}>
          {status === "finished" && (
            <div>
              <div style={{ fontSize: 11, color: C.sub, marginBottom: 2 }}>評価</div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n === rating ? 0 : n)}
                    style={{ fontSize: 28, background: "none", border: "none", padding: "0 2px", color: n <= rating ? C.gold : C.line, cursor: "pointer" }}>★</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 5 }}>読む形式</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[[false, "紙の本"], [true, "電子書籍"]].map(([v, l]) => (
                <button key={l} onClick={() => setEbook(v)}
                  style={{
                    fontSize: 12, borderRadius: 14, padding: "6px 16px", fontFamily: GOTHIC,
                    border: ebook === v ? "none" : `1px solid ${C.line}`,
                    background: ebook === v ? C.indigo : C.field,
                    color: ebook === v ? "#fff" : C.sub, cursor: "pointer",
                  }}>{l}</button>
              ))}
            </div>
            {ebook && (
              <>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {EBOOK_SERVICES.map((sv) => (
                    <button key={sv} onClick={() => setService(sv === service ? "" : sv)}
                      style={{
                        fontSize: 10.5, borderRadius: 12, padding: "3px 9px", fontFamily: GOTHIC,
                        border: service === sv ? "none" : `1px solid ${C.line}`,
                        background: service === sv ? C.gold : C.field,
                        color: service === sv ? "#fff" : C.sub, cursor: "pointer",
                      }}>{sv}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: C.sub, marginTop: 6, lineHeight: 1.8 }}>
                  電子書籍の進捗は％で記録します。
                  総ページ数を入れておくと、読んだページ数の統計にも反映されます。
                </div>
              </>
            )}
          </div>

          <input style={inpS} placeholder="著者" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <input style={inpS} type="number" placeholder="ページ数" value={pages} onChange={(e) => setPages(e.target.value)} />

          {status === "finished" && (
            <>
              <DatePick value={start} onChange={setStart} label="読始日" />
              <textarea style={{ ...inpS, minHeight: 76, lineHeight: 1.8, resize: "vertical" }} placeholder="感想" value={note} onChange={(e) => setNote(e.target.value)} />
            </>
          )}
          {status === "reading" && <DatePick value={start} onChange={setStart} label="読始日" />}
          {status === "stacked" && (
            <>
              <DatePick value={stackedAt} onChange={setStackedAt} label={wanted ? "書き留めた日" : "積んだ日"} />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ink, cursor: "pointer" }}>
                <input type="checkbox" checked={wanted} onChange={(e) => setWanted(e.target.checked)} />
                まだ持っていない(気になる本)
              </label>
              <input style={inpS} placeholder="なぜ気になったか" value={note} onChange={(e) => setNote(e.target.value)} />
            </>
          )}
        </div>
      )}

      {err && <div style={{ fontSize: 11.5, color: "#A33" }}>{err}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!title.trim() || busy}
          style={{ flex: 1, padding: "12px 0", borderRadius: 6, background: title.trim() ? C.gold : C.line, color: "#fff", fontSize: 15, border: "none", cursor: "pointer", fontFamily: MINCHO, letterSpacing: 2 }}>
          {busy ? "保存中…" : "保存"}
        </button>
        <button onClick={reset}
          style={{ padding: "12px 16px", borderRadius: 6, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 13, cursor: "pointer" }}>やめる</button>
      </div>

      {scanning && <Scanner onDetect={onScanDetect} onClose={() => setScanning(false)} />}
    </div>
  );
}

/* ---- 記録タブ本体 ---- */
export function RecordTab({ books, onSelect, onAddFinished, onAddReading, onAddStacked, onProgress, onFinish, addOpen, onCloseAdd }) {
  const [q, setQ] = useState("");
  const [tagF, setTagF] = useState(null);
  const [limit, setLimit] = useState(40);

  const reading = books.filter((b) => b.status === "reading").sort((a, b) => b.start.localeCompare(a.start));
  const finished = useMemo(() => {
    let rs = books.filter((b) => b.status === "finished").sort((a, b) => b.end.localeCompare(a.end));
    if (tagF) rs = rs.filter((r) => getTags(r).includes(tagF));
    if (q) rs = rs.filter((r) => r.title.includes(q) || (r.author || "").includes(q));
    return rs;
  }, [books, q, tagF]);

  const usedTags = useMemo(() => tagOptions(books).slice(0, 12), [books]);

  const secTitle = { fontFamily: MINCHO, fontSize: 15, color: C.indigo, letterSpacing: 2, borderBottom: `1px solid ${C.line}`, paddingBottom: 4 };

  const isEmpty = books.length === 0;

  return (
    <div style={{ padding: "0 16px 32px" }}>
      <QuickAdd books={books} onAddFinished={onAddFinished} onAddReading={onAddReading} onAddStacked={onAddStacked} open={addOpen} onClose={onCloseAdd} />

      {isEmpty && !addOpen && (
        <EmptyState
          title="最初の一冊から、歴史が始まります"
          lines={"読み終えた本も、いま読んでいる本も、\nまだ読んでいない本も、すべてここから記録できます。"}
          hint={"右下の「記録」ボタンから本を追加できます。"}
        />
      )}

      {reading.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={secTitle}>読書中 <span style={{ fontSize: 11, color: C.sub }}>{reading.length}冊</span></div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {reading.map((b) => (
              <ReadingCard key={b.id} book={b} onProgress={onProgress} onFinish={onFinish} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {books.some((b) => b.status === "finished") && (
        <div style={{ marginTop: 20 }}>
          <div style={secTitle}>読了 <span style={{ fontSize: 11, color: C.sub }}>{finished.length}冊</span></div>
          <div style={{ marginTop: 8 }}>
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(40); }}
              placeholder="書名・著者で検索" style={{ ...inpS, background: C.card, fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {usedTags.map((t) => <TagChip key={t} t={t} active={tagF === t} onClick={() => { setTagF(tagF === t ? null : t); setLimit(40); }} />)}
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {finished.slice(0, limit).map((r) => (
              <button key={r.id} onClick={() => onSelect(r)}
                style={{ width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, display: "flex", alignItems: "center", gap: 10, background: C.card, border: `1px solid ${C.line}`, cursor: "pointer" }}>
                <span style={{ width: 5, alignSelf: "stretch", background: tagColor(mainTag(r)), borderRadius: 2, minHeight: 34 }} />
                {r.coverUrl && <img src={r.coverUrl} alt="" style={{ width: 26, height: 38, objectFit: "cover", borderRadius: 2, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: MINCHO, fontSize: 14, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.reread && <span style={{ color: C.gold, fontSize: 10, border: `1px solid ${C.gold}`, borderRadius: 3, padding: "0 3px", marginRight: 5 }}>再</span>}
                    {r.title}{r.pending ? " ⏳" : ""}
                  </div>
                  <div style={{ fontSize: 10.5, color: C.sub }}>
                    {r.start !== r.end ? `${fmtD(r.start)} 〜 ` : ""}{fmtD(r.end)}{r.note ? "・感想あり" : ""}
                  </div>
                </div>
                <Stars n={r.rating} size={11} />
              </button>
            ))}
          </div>
          {finished.length > limit && (
            <button onClick={() => setLimit(limit + 60)}
              style={{ width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, color: C.indigo, fontSize: 13, cursor: "pointer" }}>
              さらに表示({finished.length - limit}冊)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
