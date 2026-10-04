import { useState, useMemo, useEffect, useRef } from "react";
import { C, MINCHO, GOTHIC, tagColor, inpS, Stars } from "./common.jsx";
import { searchBooks, excerpt } from "../lib/memo.js";
import { getTags, mainTag } from "../lib/tags.js";
import { fmtD } from "../lib/dates.js";
import { IconClose, IconSearch } from "./icons.jsx";

const STATUS_LABEL = {
  stacked: "積読",
  reading: "読書中",
  finished: "読了",
  setaside: "見送り",
};

/**
 * 蔵書全体の検索。
 * 「あの話どこで読んだっけ」を解くのが目的なので、
 * 書名・著者・タグ・メモを区別せずまとめて探す。
 */
export function Search({ books, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const results = useMemo(() => searchBooks(books, q), [books, q]);
  const typed = q.trim().length > 0;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60, background: C.paper,
      display: "flex", flexDirection: "column", fontFamily: GOTHIC,
      paddingTop: "env(safe-area-inset-top)",
    }}>
      {/* 検索欄 */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <span style={{ color: C.sub, display: "flex" }}><IconSearch size={18} /></span>
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="書名・著者・タグ・メモから探す"
          style={{ ...inpS, border: "none", background: "none", fontSize: 15, padding: "4px 0" }} />
        <button onClick={onClose} aria-label="閉じる"
          style={{ background: "none", border: "none", color: C.sub, cursor: "pointer", display: "flex", padding: 4 }}>
          <IconClose size={20} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px calc(24px + env(safe-area-inset-bottom))" }}>
        {!typed && (
          <div style={{ padding: "48px 12px", textAlign: "center", fontSize: 12, color: C.sub, lineHeight: 2 }}>
            書名の一部でも、うろ覚えの一節でも探せます。
            <br />
            蔵書 {books.length}冊が対象です。
          </div>
        )}

        {typed && results.length === 0 && (
          <div style={{ padding: "48px 12px", textAlign: "center", fontSize: 12.5, color: C.sub, lineHeight: 2 }}>
            見つかりませんでした。
            <br />
            <span style={{ fontSize: 11 }}>語を減らすと見つかることがあります。</span>
          </div>
        )}

        {typed && results.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>{results.length}冊</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map(({ book, memos }) => (
                <button key={book.id} onClick={() => { onSelect(book); onClose(); }}
                  style={{
                    width: "100%", textAlign: "left", background: C.card,
                    border: `1px solid ${C.line}`, borderRadius: 6, padding: "10px 12px",
                    cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                  {book.coverUrl
                    ? <img src={book.coverUrl} alt="" style={{ width: 32, height: 46, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
                    : <span style={{ width: 4, alignSelf: "stretch", background: tagColor(mainTag(book)), borderRadius: 2, minHeight: 40, flexShrink: 0 }} />}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: MINCHO, fontSize: 14, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {book.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }}>
                      {[book.author, STATUS_LABEL[book.status], getTags(book).join("・")]
                        .filter(Boolean).join(" ・ ")}
                      {book.status === "finished" && book.end ? ` ・ ${fmtD(book.end)}` : ""}
                    </div>
                    {book.rating ? <div style={{ marginTop: 2 }}><Stars n={book.rating} size={10} /></div> : null}

                    {/* 一致したメモの一節を見せる */}
                    {memos.slice(0, 2).map((m) => (
                      <p key={m.id} style={{
                        fontSize: 11.5, color: C.ink, lineHeight: 1.8, marginTop: 6,
                        paddingLeft: 8, borderLeft: `2px solid ${C.gold}`, fontFamily: MINCHO,
                      }}>
                        {excerpt(m.text, q)}
                        <span style={{ fontSize: 10, color: C.sub, marginLeft: 6 }}>
                          {m.progress || fmtD(m.date)}
                        </span>
                      </p>
                    ))}
                    {memos.length > 2 && (
                      <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>ほか{memos.length - 2}件のメモが一致</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
