import { useState } from "react";
import { C, MINCHO, GOTHIC, tagColor, inpS } from "./common.jsx";
import { MAX_TAGS, STARTER_TAGS, subsOf, parentOf, tagsInUse } from "../lib/tags.js";

function Chip({ label, selected, disabled, onClick, small }) {
  return (
    <button onClick={onClick} disabled={disabled && !selected}
      style={{
        fontSize: small ? 10.5 : 11.5, fontFamily: GOTHIC, borderRadius: 12,
        padding: small ? "3px 9px" : "4px 11px",
        border: selected ? "none" : `1px solid ${C.line}`,
        background: selected ? tagColor(label) : C.card,
        color: selected ? "#fff" : (disabled ? C.line : C.sub),
        cursor: disabled && !selected ? "default" : "pointer",
      }}>{label}</button>
  );
}

/**
 * 段階的タグ選択。
 * 第一階層(大分類+形式)を並べ、選んだ大分類の細分だけを下に展開する。
 * 選んだ順に並び、先頭が主タグ(色に使われる)。
 */
export function TagSelector({ books, value, onChange, compact }) {
  const [draft, setDraft] = useState("");
  const selected = value || [];
  const full = selected.length >= MAX_TAGS;

  // 過去に自作したタグ(初期セットにも細分にもないもの)
  const customTags = tagsInUse(books || [])
    .map((t) => t.tag)
    .filter((t) => !STARTER_TAGS.includes(t) && !parentOf(t))
    .slice(0, 12);

  const toggle = (t) => {
    if (selected.includes(t)) onChange(selected.filter((x) => x !== t));
    else if (!full) onChange([...selected, t]);
  };

  // 細分を選ぶときは親の大分類も自動で付ける(地図の整合性のため)
  const toggleSub = (sub, parent) => {
    if (selected.includes(sub)) { onChange(selected.filter((x) => x !== sub)); return; }
    if (full) return;
    const next = selected.includes(parent) ? [...selected, sub] : [...selected, parent, sub];
    onChange(next.slice(0, MAX_TAGS));
  };

  const addDraft = () => {
    const t = draft.trim().slice(0, 20);
    if (!t || selected.includes(t) || full) { setDraft(""); return; }
    onChange([...selected, t]);
    setDraft("");
  };

  // 展開する細分: 選択中の大分類のもの
  const expanded = selected.filter((t) => subsOf(t).length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {selected.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {selected.map((t, i) => (
            <button key={t} onClick={() => toggle(t)} title="タップで外す"
              style={{
                fontSize: 11.5, fontFamily: GOTHIC, borderRadius: 12, padding: "3px 10px",
                border: "none", background: tagColor(t), color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              {i === 0 && <span style={{ fontSize: 9, opacity: 0.85, fontFamily: MINCHO }}>主</span>}
              {t}<span style={{ opacity: 0.7 }}>×</span>
            </button>
          ))}
          {selected.length > 1 && <span style={{ fontSize: 9.5, color: C.sub }}>先頭が主タグ</span>}
        </div>
      )}

      <div>
        <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>分野</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {STARTER_TAGS.map((t) => (
            <Chip key={t} label={t} selected={selected.includes(t)} disabled={full} onClick={() => toggle(t)} />
          ))}
        </div>
      </div>

      {expanded.map((major) => (
        <div key={major} style={{ paddingLeft: 8, borderLeft: `2px solid ${tagColor(major)}` }}>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{major}の細分(任意)</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", maxHeight: compact ? 84 : "none", overflowY: compact ? "auto" : "visible" }}>
            {subsOf(major).map((sub) => (
              <Chip key={sub} label={sub} small selected={selected.includes(sub)} disabled={full}
                onClick={() => toggleSub(sub, major)} />
            ))}
          </div>
        </div>
      ))}

      {customTags.filter((t) => !selected.includes(t)).length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>自作のタグ</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {customTags.filter((t) => !selected.includes(t)).map((t) => (
              <Chip key={t} label={t} small selected={false} disabled={full} onClick={() => toggle(t)} />
            ))}
          </div>
        </div>
      )}

      {!full ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDraft(); } }}
            placeholder="新しいタグを作る"
            style={{ ...inpS, fontSize: 12.5, padding: "6px 9px" }} />
          <button onClick={addDraft} disabled={!draft.trim()}
            style={{ padding: "6px 14px", borderRadius: 4, background: draft.trim() ? C.indigo : C.line, color: "#fff", fontSize: 12, border: "none", cursor: "pointer", flexShrink: 0 }}>
            追加
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 10, color: C.sub }}>タグは{MAX_TAGS}つまでです</div>
      )}
    </div>
  );
}
