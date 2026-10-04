import { useState, useMemo } from "react";
import { C, MINCHO, GOTHIC, tagColor, hexA } from "./common.jsx";
import { mainTag, tagsInUse } from "../lib/tags.js";
import { buildDayMap } from "../lib/stats.js";
import { isoLocal, todayLocal, fmtD } from "../lib/dates.js";

const DOW = ["月", "火", "水", "木", "金", "土", "日"];

/**
 * 縦型読書暦。週=1行、最新週が最上段(今日が常に見える)。
 * 濃いマス=読了日 / 薄いマス=読んだ日。過去は「さらに」で下に伸びる。
 */
export function ReadingCalendar({ books, onSelect }) {
  const TODAY = todayLocal();
  const [weeks, setWeeks] = useState(12);
  const [pickDay, setPickDay] = useState(null); // 複数冊ある日の選択
  const dayMap = useMemo(() => buildDayMap(books), [books]);

  // 今週の月曜を求め、そこから過去へ週を並べる
  const rows = useMemo(() => {
    const monday = new Date(TODAY + "T00:00:00");
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const out = [];
    for (let w = 0; w < weeks; w++) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(d.getDate() - w * 7 + i);
        days.push(isoLocal(d));
      }
      out.push(days);
    }
    return out;
  }, [TODAY, weeks]);

  /**
   * 行に付ける月ラベル。
   * 行の末尾(日曜)が属する月を見て、上の行から月が変わったところにだけ印を出す。
   * 「月初を含む週」に付ける方式だと、最上段の月表示と重なって同じ月が二度出ることがある。
   */
  const monthLabels = (() => {
    let prev = null;
    return rows.map((days) => {
      const last = days[days.length - 1];
      const y = last.slice(0, 4);
      const m = parseInt(last.slice(5, 7));
      const label = m === 1 ? `${y}年1月` : `${m}月`;
      if (label === prev) return "";
      prev = label;
      return label;
    });
  })();

  const CELL = 18;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* 曜日ヘッダー */}
      <div style={{ display: "flex", gap: 3, paddingLeft: 58 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ width: CELL, textAlign: "center", fontSize: 9.5, color: i >= 5 ? C.gold : C.sub, fontFamily: GOTHIC }}>{d}</div>
        ))}
      </div>

      {rows.map((days, ri) => (
        <div key={days[0]} style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <div style={{ width: 52, fontSize: 10, color: C.sub, fontFamily: MINCHO, textAlign: "right", paddingRight: 6, flexShrink: 0 }}>
            {monthLabels[ri]}
          </div>
          {days.map((ds) => {
            const future = ds > TODAY;
            const e = !future && dayMap[ds];
            const fin = (e && e.finished) || [];
            const reads = (e && e.reads) || [];
            // その日に関わった本(読了を先に、重複は除く)
            const dayBooks = [...fin, ...reads.filter((b) => !fin.includes(b))];

            let bg = future ? "transparent" : C.empty;
            if (fin.length) bg = tagColor(mainTag(fin[0]));
            else if (reads.length) bg = hexA(tagColor(mainTag(reads[reads.length - 1])), 0.38);

            return (
              <button key={ds}
                onClick={() => {
                  if (!dayBooks.length) return;
                  // 1冊ならその本を直接開く。複数ならその日の一覧を出す
                  if (dayBooks.length === 1) onSelect(dayBooks[0]);
                  else setPickDay({ date: ds, books: dayBooks, finished: fin });
                }}
                title={ds}
                style={{
                  width: CELL, height: CELL, borderRadius: 3, padding: 0,
                  border: future ? `1px dashed ${C.line}` : "none",
                  background: bg, cursor: dayBooks.length ? "pointer" : "default",
                  outline: ds === TODAY ? `2px solid ${C.gold}` : "none",
                  outlineOffset: 1, flexShrink: 0,
                  // 複数冊の日は右下に印を出す
                  boxShadow: dayBooks.length > 1 ? `inset -3px -3px 0 -1px ${C.paper}` : "none",
                }} />
            );
          })}
        </div>
      ))}

      <button onClick={() => setWeeks(weeks + 12)}
        style={{ marginTop: 4, padding: "8px 0", borderRadius: 6, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 12, cursor: "pointer" }}>
        さらに過去を見る(+12週)
      </button>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 2 }}>
        {tagsInUse(books).slice(0, 10).map(({ tag }) => (
          <span key={tag} style={{ fontSize: 10, color: C.sub, fontFamily: GOTHIC }}>
            <span style={{ display: "inline-block", width: 8, height: 8, background: tagColor(tag), borderRadius: 2, marginRight: 3 }} />{tag}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: C.sub }}>
        濃いマス=読了した日 / 薄いマス=読んだ日 / 金枠=今日 / 右下の欠け=複数冊
      </div>

      {/* 1日に複数冊あるときは、どれを開くか選ばせる */}
      {pickDay && (
        <div onClick={() => setPickDay(null)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(35,39,44,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(ev) => ev.stopPropagation()}
            style={{ width: "100%", maxWidth: 448, maxHeight: "70vh", overflowY: "auto", borderRadius: "12px 12px 0 0", padding: 20, background: C.paper, fontFamily: GOTHIC }}>
            <div style={{ fontFamily: MINCHO, fontSize: 16, color: C.indigo, letterSpacing: 1 }}>
              {fmtD(pickDay.date)}
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
              {pickDay.finished.length > 0 && `${pickDay.finished.length}冊 読了`}
              {pickDay.finished.length > 0 && pickDay.books.length > pickDay.finished.length && " ・ "}
              {pickDay.books.length > pickDay.finished.length &&
                `${pickDay.books.length - pickDay.finished.length}冊 読書`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
              {pickDay.books.map((b) => (
                <button key={b.id}
                  onClick={() => { setPickDay(null); onSelect(b); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 6,
                    background: C.card, border: `1px solid ${C.line}`, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                  <span style={{ width: 5, alignSelf: "stretch", background: tagColor(mainTag(b)), borderRadius: 2, minHeight: 32 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontFamily: MINCHO, fontSize: 14, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.sub }}>
                      {pickDay.finished.includes(b) ? "読了" : "読んだ日"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setPickDay(null)}
              style={{ width: "100%", marginTop: 16, padding: "10px 0", borderRadius: 6, background: C.indigo, color: "#fff", fontSize: 14, border: "none", cursor: "pointer" }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
