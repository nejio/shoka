import { useState } from "react";
import { C, MINCHO, GOTHIC } from "./common.jsx";

/* ---- 各ページの意匠(小さなSVG。実画面の模式図) ---- */
function CalendarMotif() {
  const colors = ["#4A6B4F", "#7A3E2E", "#31465F", "#B58B2A", "#3E6B6B"];
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      const filled = [0, 1, 3, 4, 5, 7, 9, 10, 12, 13, 14, 16, 18, 19, 21, 22, 23, 25, 27, 28, 30, 31, 32].includes(i);
      cells.push(
        <rect key={i} x={c * 14} y={r * 14} width={11} height={11} rx={2.5}
          fill={filled ? colors[i % colors.length] : C.empty}
          opacity={filled ? (i % 3 === 0 ? 1 : 0.55) : 1} />
      );
    }
  }
  return <svg viewBox="0 0 125 55" width="200" height="88">{cells}</svg>;
}

function ShelfMotif() {
  const books = [
    [30, "#4A6B4F"], [42, "#31465F"], [36, "#7A3E2E"], [50, "#B58B2A"],
    [38, "#3E6B6B"], [46, "#5B4A6B"], [33, "#8A6B3E"], [44, "#4A6B4F"],
  ];
  let x = 4;
  return (
    <svg viewBox="0 0 120 60" width="200" height="100">
      {books.map(([h, fill], i) => {
        const el = <rect key={i} x={x} y={52 - h} width={11} height={h} rx={1.5} fill={fill} />;
        x += 14;
        return el;
      })}
      <rect x={0} y={52} width={120} height={4} rx={1} fill={C.shelf} />
    </svg>
  );
}

function MapMotif() {
  const groups = [
    { color: "#4A6B4F", n: 4 },
    { color: "#31465F", n: 3 },
    { color: "#B58B2A", n: 2 },
  ];
  let y = 4;
  const out = [];
  groups.forEach((g, gi) => {
    out.push(<rect key={`l${gi}`} x={0} y={y + 4} width={7} height={7} rx={1.5} fill={g.color} />);
    for (let i = 0; i < g.n; i++) {
      out.push(
        <rect key={`b${gi}-${i}`} x={13 + i * 20} y={y} width={15} height={22} rx={2}
          fill={g.color} opacity={0.85} />
      );
    }
    if (gi === 2) {
      out.push(
        <rect key="wanted" x={13 + g.n * 20} y={y} width={15} height={22} rx={2}
          fill="none" stroke={C.sub} strokeWidth={1.2} strokeDasharray="3 2" />
      );
    }
    y += 30;
  });
  return <svg viewBox="0 0 110 92" width="190" height="106">{out}</svg>;
}

const PAGES = [
  {
    motif: <CalendarMotif />,
    title: "読んだ日が、色で残る",
    body: "読了を記録すると、一日ぶんのマスがジャンルの色で埋まります。\n続けるほど、モザイクがあなたの一年になります。",
  },
  {
    motif: <MapMotif />,
    title: "読まない本にも、意味がある",
    body: "買っただけの本は「書斎」に積まれ、関心の地図をつくります。\n読まなくても構いません。積まれた本の群れそのものが、\nいまのあなたの関心のかたちです。",
  },
  {
    motif: <ShelfMotif />,
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
        <div style={{ opacity: 0.95 }}>{page.motif}</div>
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
