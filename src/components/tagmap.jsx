import { useState } from "react";
import { C, MINCHO, GOTHIC, tagColor } from "./common.jsx";
import { mainTag, parentOf } from "../lib/tags.js";
import { progressPct } from "../lib/progress.js";
import { dueLabel, isDueSoon, isWanted } from "../lib/holding.js";
import { IconChevron } from "./icons.jsx";

/* ---- 1冊のタイル。読書中は金の縁と進捗バーで区別する ---- */
export function BookTile({ book, onSelect, muted }) {
  const reading = book.status === "reading";
  const wanted = isWanted(book);
  const pct = reading ? progressPct(book) : null;

  return (
    <button onClick={() => onSelect(book)}
      style={{
        width: 62, background: "none", border: "none", padding: 0,
        cursor: "pointer", opacity: muted ? 0.55 : 1, textAlign: "left",
      }}>
      <div style={{
        position: "relative", width: 62, height: 88, borderRadius: 3,
        overflow: "hidden",
        boxShadow: reading ? `0 0 0 2px ${C.gold}` : "none",
        border: wanted ? `1.5px dashed ${C.sub}` : "none",
        opacity: wanted ? 0.9 : 1,
      }}>
        {book.coverUrl ? (
          <img src={book.coverUrl} alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", border: `1px solid ${C.line}` }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", background: tagColor(mainTag(book)),
            display: "flex", alignItems: "center", justifyContent: "center", padding: 5,
            boxShadow: "inset -3px 0 5px rgba(0,0,0,.22)",
          }}>
            <span style={{
              fontFamily: MINCHO, fontSize: 9.5, color: "#F5F3EC", writingMode: "vertical-rl",
              maxHeight: 78, overflow: "hidden", whiteSpace: "nowrap",
            }}>{book.title}</span>
          </div>
        )}
        {pct !== null && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "rgba(0,0,0,.35)" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: C.gold }} />
          </div>
        )}
        {reading && pct === null && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: C.gold, opacity: 0.7 }} />
        )}
      </div>
      <div style={{
        fontSize: 9.5, color: C.sub, marginTop: 3, lineHeight: 1.3,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{book.title}</div>
      {dueLabel(book) && (
        <div style={{ fontSize: 9, color: isDueSoon(book) ? C.gold : C.sub, marginTop: 1 }}>
          {dueLabel(book)}
        </div>
      )}
    </button>
  );
}

/* ---- 分布バー(本は1冊1回で数えるので合計は100%) ---- */
function DistributionBar({ map, total, secondary }) {
  if (!total) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}`, background: C.empty }}>
        {map.map((g) => (
          <div key={g.tag} title={`${g.tag} ${g.total}冊`}
            style={{ width: `${(g.total / total) * 100}%`, background: tagColor(g.tag) }} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        {map.map((g) => (
          <span key={g.tag} style={{ fontSize: 10, color: C.sub, fontFamily: GOTHIC }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: tagColor(g.tag), borderRadius: 2, marginRight: 3 }} />
            {g.tag} {g.total}
          </span>
        ))}
      </div>
      {secondary && secondary.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: C.sub, lineHeight: 1.8 }}>
          ほかに重ねているタグ: {secondary.map((t) => `${t.tag}(${t.count})`).join(" ・ ")}
        </div>
      )}
    </div>
  );
}

/* ---- 大分類ひとつ分の群れ(折りたためる) ---- */
function MajorGroup({ group, onSelect }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginTop: 18 }}>
      <button onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8, paddingBottom: 6,
          borderBottom: `1px solid ${C.line}`, background: "none", border: "none",
          borderBottomStyle: "solid", cursor: "pointer", textAlign: "left",
        }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: tagColor(group.tag), flexShrink: 0 }} />
        <span style={{ fontFamily: MINCHO, fontSize: 15, color: C.ink, letterSpacing: 1 }}>{group.tag}</span>
        {parentOf(group.tag) && (
          <span style={{ fontSize: 9.5, color: C.sub, border: `1px solid ${C.line}`, borderRadius: 8, padding: "0 6px" }}>
            {parentOf(group.tag)}の細分
          </span>
        )}
        <span style={{ fontSize: 11, color: C.sub }}>{group.total}冊</span>
        <span style={{ marginLeft: "auto", color: C.sub, display: "flex", alignItems: "center" }}><IconChevron size={14} dir={open ? "down" : "right"} /></span>
      </button>

      {open && (
        <>
          {group.subs.map((sub) => (
            <div key={sub.tag} style={{ marginTop: 10, paddingLeft: 10, borderLeft: `2px solid ${tagColor(sub.tag)}` }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: MINCHO, fontSize: 12.5, color: C.ink }}>{sub.tag}</span>
                <span style={{ fontSize: 10, color: C.sub }}>{sub.books.length}冊</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {sub.books.map((b) => <BookTile key={b.id} book={b} onSelect={onSelect} />)}
              </div>
            </div>
          ))}
          {group.rest.length > 0 && (
            <div style={{ marginTop: 10, paddingLeft: group.subs.length ? 10 : 0, borderLeft: group.subs.length ? `2px dashed ${C.line}` : "none" }}>
              {group.subs.length > 0 && (
                <div style={{ fontSize: 10, color: C.sub, marginBottom: 6 }}>細分なし {group.rest.length}冊</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {group.rest.map((b) => <BookTile key={b.id} book={b} onSelect={onSelect} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---- 地図まるごと(分布バー + 階層表示) ---- */
export function TagMapView({ map, total, secondary, onSelect, distMap, distTotal }) {
  return (
    <>
      <DistributionBar map={distMap || map} total={distTotal ?? total} secondary={secondary} />
      {map.map((g) => <MajorGroup key={g.tag} group={g} onSelect={onSelect} />)}
    </>
  );
}
