import { useState, useMemo } from "react";
import { C, MINCHO, GOTHIC, tagColor, EmptyState } from "./common.jsx";
import { TagMapView } from "./tagmap.jsx";
import { ym, isoLocal, todayLocal } from "../lib/dates.js";
import { mainTag } from "../lib/tags.js";
import { buildKnowledgeMap, secondaryTags, isFinished } from "../lib/study.js";

/* ---- 知識の地図(読了本の主題別分布) ---- */
function KnowledgeMap({ books, onSelect }) {
  const [period, setPeriod] = useState("all"); // all | year
  const from = useMemo(() => {
    if (period !== "year") return null;
    const d = new Date(todayLocal() + "T00:00:00");
    d.setFullYear(d.getFullYear() - 1);
    return isoLocal(d);
  }, [period]);

  const map = buildKnowledgeMap(books, from);
  const list = books.filter((b) => isFinished(b) && b.end && (!from || b.end >= from));
  const secondary = secondaryTags(list);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MINCHO, fontSize: 18, color: C.indigo, letterSpacing: 2 }}>知識の地図</span>
        <span style={{ fontSize: 11, color: C.sub }}>{list.length}冊</span>
        <div style={{ marginLeft: "auto", display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}` }}>
          {[["all", "全期間"], ["year", "直近1年"]].map(([k, l]) => (
            <button key={k} onClick={() => setPeriod(k)}
              style={{ padding: "4px 12px", fontSize: 11, border: "none", cursor: "pointer",
                background: period === k ? C.indigo : C.card, color: period === k ? "#fff" : C.sub }}>{l}</button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11, color: C.sub, marginTop: 4, lineHeight: 1.7 }}>
        読み終えた本の主題別の分布。何について詳しくなってきたかの記録です。
      </p>
      {list.length === 0 ? (
        <div style={{ padding: "48px 16px", textAlign: "center", fontFamily: MINCHO, fontSize: 14, color: C.sub, letterSpacing: 1 }}>
          {period === "year" ? "直近1年の読了はまだありません。" : "読了した本がここに集まります。"}
        </div>
      ) : (
        <TagMapView map={map} total={list.length} secondary={secondary} onSelect={onSelect} />
      )}
    </div>
  );
}

export function Shelf({ books, onSelect }) {
  const [view, setView] = useState("time"); // time | subject
  const [shown, setShown] = useState(6);
  const finished = books.filter((b) => b.status === "finished");
  const byMonth = useMemo(() => {
    const m = {};
    finished.forEach((b) => { (m[ym(b.end)] = m[ym(b.end)] || []).push(b); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.end.localeCompare(b.end)));
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0]));
  }, [books]);

  if (!finished.length) {
    return (
      <EmptyState
        title="読み終えた本が、ここに並びます"
        lines={"ひと月がひとつの棚。背表紙の色はタグ、高さはページ数です。\n「主題で見る」に切り替えると、\n何について詳しくなってきたかの地図になります。"}
        hint={"右下の「記録」ボタンから本を追加できます。"}
      />
    );
  }

  const switcher = (
    <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}`, marginTop: 12 }}>
      {[["time", "時系列で見る"], ["subject", "主題で見る"]].map(([k, l]) => (
        <button key={k} onClick={() => setView(k)}
          style={{ flex: 1, padding: "8px 0", fontFamily: MINCHO, fontSize: 13, letterSpacing: 1, border: "none", cursor: "pointer",
            background: view === k ? C.indigo : C.card, color: view === k ? "#fff" : C.sub }}>{l}</button>
      ))}
    </div>
  );

  if (view === "subject") {
    return (
      <div style={{ padding: "0 16px 32px" }}>
        {switcher}
        <KnowledgeMap books={books} onSelect={onSelect} />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 32px" }}>
      {switcher}
      <p style={{ color: C.sub, fontSize: 12, padding: "12px 0 4px" }}>
        ひと月がひとつの棚。色はタグ、高さはページ数。
      </p>
      {byMonth.slice(0, shown).map(([month, arr]) => (
        <div key={month} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: MINCHO, fontSize: 17, color: C.indigo, letterSpacing: 1 }}>
              {month.slice(0, 4)}年{parseInt(month.slice(5))}月
            </span>
            <span style={{ fontSize: 11, color: C.sub }}>{arr.length}冊</span>
          </div>
          <div style={{ overflowX: "auto", marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 3, width: "max-content", borderBottom: `6px solid ${C.shelf}`, minHeight: 96 }}>
              {arr.map((b) => {
                const h = Math.min(112, Math.max(64, 40 + (b.pages || 250) / 5));
                return (
                  <button key={b.id} onClick={() => onSelect(b)}
                    style={{
                      width: 16, height: h, background: tagColor(mainTag(b)),
                      writingMode: "vertical-rl", fontFamily: MINCHO,
                      color: "#F5F3EC", fontSize: 8.5, padding: "5px 0",
                      overflow: "hidden", whiteSpace: "nowrap",
                      boxShadow: "inset -2px 0 3px rgba(0,0,0,.28)", border: "none",
                      borderRadius: "2px 2px 0 0", flexShrink: 0, cursor: "pointer",
                      backgroundImage:
                        "repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px)," +
                        "linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,0) 14px)",
                    }}>
                    {b.reread && <span style={{ color: "#F0D48A" }}>再</span>}
                    {b.title.length > 9 ? b.title.slice(0, 9) : b.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
      {shown < byMonth.length && (
        <button onClick={() => setShown(shown + 6)}
          style={{ width: "100%", marginTop: 20, padding: "10px 0", borderRadius: 6, background: C.card, border: `1px solid ${C.line}`, color: C.indigo, fontSize: 13, cursor: "pointer" }}>
          さらに前の棚を見る({byMonth.length - shown}か月)
        </button>
      )}
    </div>
  );
}
