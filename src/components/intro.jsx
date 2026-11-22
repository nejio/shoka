import { useState } from "react";
import { C, MINCHO, GOTHIC, tagColor, hexA } from "./common.jsx";

/* ---- 各ページの図 ----
 * 実画面と同じ部品(色・マスの大きさ・金枠・下タブ・右下のボタン)で描いた縮小図。
 * 色は実際のタグ色(tagColor)を使うので、テーマや色の固定に自動で追従する。
 */

// 実画面のカードと同じ枠
const frame = {
  width: "100%", maxWidth: 300, background: C.card, border: `1px solid ${C.line}`,
  borderRadius: 6, padding: 12, textAlign: "left", position: "relative", overflow: "hidden",
};

/* 暦: 週が1行・月曜始まり。濃い=読了、薄い=読んだ日、金枠=今日 */
function CalendarMotif() {
  const DOW = ["月", "火", "水", "木", "金", "土", "日"];
  // F=読了(濃)  r=読んだ日(薄)  .=なし  x=未来
  const ROWS = [
    { label: `${new Date().getMonth() + 1}月`, cells: [["r", "歴史"], [".", ""], ["F", "小説"], ["r", "小説"], [".", ""], ["r", "技術・工学"], ["x", ""]], today: 5 },
    { label: "", cells: [["F", "歴史"], ["r", "歴史"], [".", ""], ["r", "小説"], ["F", "小説"], [".", ""], ["r", "政治・社会"]] },
    { label: "", cells: [[".", ""], ["r", "技術・工学"], ["F", "技術・工学"], [".", ""], ["r", "歴史"], ["F", "歴史"], [".", ""]] },
    { label: "", cells: [["r", "小説"], [".", ""], [".", ""], ["F", "政治・社会"], ["r", "政治・社会"], [".", ""], ["r", "小説"]] },
  ];
  const CELL = 18;
  return (
    <div style={frame}>
      <div style={{ display: "flex", gap: 3, paddingLeft: 34, marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ width: CELL, textAlign: "center", fontSize: 9.5, color: i >= 5 ? C.gold : C.sub, fontFamily: GOTHIC }}>{d}</div>
        ))}
      </div>
      {ROWS.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 3 }}>
          <div style={{ width: 28, fontSize: 10, color: C.sub, fontFamily: MINCHO, textAlign: "right", paddingRight: 3, flexShrink: 0 }}>{row.label}</div>
          {row.cells.map(([kind, tag], ci) => {
            let bg = C.empty;
            if (kind === "F") bg = tagColor(tag);
            else if (kind === "r") bg = hexA(tagColor(tag), 0.38);
            else if (kind === "x") bg = "transparent";
            return (
              <div key={ci} style={{
                width: CELL, height: CELL, borderRadius: 3, flexShrink: 0, background: bg,
                border: kind === "x" ? `1px dashed ${C.line}` : "none",
                outline: row.today === ci ? `2px solid ${C.gold}` : "none", outlineOffset: 1,
              }} />
            );
          })}
        </div>
      ))}
      <div style={{ fontSize: 9.5, color: C.sub, marginTop: 6 }}>濃いマス=読了した日 / 薄いマス=読んだ日 / 金枠=今日</div>
    </div>
  );
}

/* 書斎: 主題ごとの群れ。点線の枠は「まだ持っていない気になる本」 */
function MapMotif() {
  const groups = [
    { tag: "小説", n: 3, books: [0, 1, 2] },
    { tag: "歴史", n: 2, books: [0, 1] },
    { tag: "技術・工学", n: 2, books: [0], wanted: true },
  ];
  return (
    <div style={frame}>
      {groups.map((g, gi) => (
        <div key={g.tag} style={{ marginTop: gi ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 5, borderBottom: `1px solid ${C.line}` }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: tagColor(g.tag), flexShrink: 0 }} />
            <span style={{ fontFamily: MINCHO, fontSize: 14, color: C.ink, letterSpacing: 1 }}>{g.tag}</span>
            <span style={{ fontSize: 11, color: C.sub }}>{g.n}冊</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {g.books.map((i) => (
              <div key={i} style={{
                width: 26, height: 38, borderRadius: 2, background: tagColor(g.tag), opacity: 0.88,
                borderLeft: `4px solid ${hexA("#000000", 0.18)}`,
              }} />
            ))}
            {g.wanted && (
              <div style={{ width: 26, height: 38, borderRadius: 2, border: `1.5px dashed ${C.sub}` }} />
            )}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 9.5, color: C.sub, marginTop: 10 }}>点線の枠=まだ持っていない、気になる本</div>
    </div>
  );
}

/* 記録の入口: 右下の金色の丸ボタンと下タブ(実画面の配置のまま) */
function RecordMotif() {
  const TABS = ["暦", "本棚", "書斎", "覚書", "読書"];
  return (
    <div style={{ ...frame, padding: 0, height: 150 }}>
      {/* 画面の中身を思わせる薄い行 */}
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {[70, 52, 62].map((w, i) => (
          <div key={i} style={{ height: 9, width: `${w}%`, borderRadius: 3, background: C.empty }} />
        ))}
      </div>
      {/* 右下の「記録」ボタン */}
      <div style={{
        position: "absolute", right: 12, bottom: 48, width: 46, height: 46, borderRadius: 23,
        background: C.gold, color: "#fff", fontFamily: MINCHO, fontSize: 12, letterSpacing: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 10px rgba(0,0,0,.28)",
      }}>記録</div>
      {/* 下タブ */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", borderTop: `1px solid ${C.line}`, background: C.card }}>
        {TABS.map((t, i) => (
          <div key={t} style={{
            flex: 1, textAlign: "center", padding: "9px 0 8px", fontFamily: MINCHO, fontSize: 11.5,
            color: i === 0 ? C.indigo : C.sub,
            borderTop: i === 0 ? `2px solid ${C.gold}` : "2px solid transparent", marginTop: -1,
          }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

const PAGES = [
  {
    motif: <CalendarMotif />,
    title: "読んだ日が、色で残る",
    body: "読んだ日のマスが、ジャンルの色で埋まります。\n続けるほど、モザイクがあなたの一年になります。",
  },
  {
    motif: <MapMotif />,
    title: "読まない本にも、意味がある",
    body: "買っただけの本は「書斎」に積まれ、関心の地図をつくります。\n読まなくても構いません。積まれた本の群れそのものが、\nいまのあなたの関心のかたちです。",
  },
  {
    motif: <RecordMotif />,
    title: "記録は、右下から",
    body: "画面右下の「記録」ボタンひとつで、\n読書の進捗も、新しい本の追加もできます。\nバーコードを読めば、書名も著者も自動で入ります。",
  },
];

export function Intro({ onDone }) {
  const [i, setI] = useState(0);
  const last = i === PAGES.length - 1;
  const page = PAGES[i];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 70, background: C.paper,
      display: "flex", flexDirection: "column", fontFamily: GOTHIC,
      padding: "calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))",
    }}>
      {/* 見出し */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexShrink: 0 }}>
        <span style={{ fontFamily: MINCHO, fontSize: 20, letterSpacing: 6, color: C.indigo }}>書架</span>
        <button onClick={onDone}
          style={{ background: "none", border: "none", fontSize: 12, color: C.sub, cursor: "pointer" }}>
          スキップ
        </button>
      </div>

      {/* 本文 */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", textAlign: "center", gap: 28,
      }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>{page.motif}</div>
        <div>
          <div style={{ fontFamily: MINCHO, fontSize: 21, color: C.ink, letterSpacing: 2, lineHeight: 1.6 }}>
            {page.title}
          </div>
          <p style={{
            fontSize: 12.5, color: C.sub, lineHeight: 2.1, marginTop: 14,
            whiteSpace: "pre-line",
          }}>{page.body}</p>
        </div>
      </div>

      {/* 送り */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 7 }}>
          {PAGES.map((_, k) => (
            <span key={k} style={{
              width: 7, height: 7, borderRadius: 4,
              background: k === i ? C.gold : C.line,
            }} />
          ))}
        </div>
        <button onClick={() => (last ? onDone() : setI(i + 1))}
          style={{
            width: "100%", maxWidth: 320, padding: "13px 0", borderRadius: 6,
            background: C.indigo, color: "#F5F3EC", border: "none", cursor: "pointer",
            fontFamily: MINCHO, fontSize: 15, letterSpacing: 3,
          }}>
          {last ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}
