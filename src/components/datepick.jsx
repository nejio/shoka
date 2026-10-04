import { useState } from "react";
import { C, GOTHIC, inpS } from "./common.jsx";
import { todayLocal, daysAgo, fmtD } from "../lib/dates.js";

/**
 * 日付の入力。
 * 「今日 / 昨日 / 一昨日」を押すだけで済むようにし、
 * それ以外の日を選びたいときだけカレンダーを開く。
 * 読了日は「今日」が大半なので、多くの場合ボタン1つで終わる。
 */
export function DatePick({ value, onChange, label }) {
  const today = todayLocal();
  const presets = [
    ["今日", today],
    ["昨日", daysAgo(1)],
    ["一昨日", daysAgo(2)],
  ];
  const isPreset = presets.some(([, d]) => d === value);
  const [open, setOpen] = useState(!isPreset);

  const chip = (active) => ({
    fontSize: 12, fontFamily: GOTHIC, borderRadius: 14, padding: "6px 14px",
    border: active ? "none" : `1px solid ${C.line}`,
    background: active ? C.indigo : C.card,
    color: active ? "#fff" : C.sub, cursor: "pointer",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <div style={{ fontSize: 11, color: C.sub }}>{label}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {presets.map(([name, d]) => (
          <button key={name} onClick={() => { onChange(d); setOpen(false); }}
            style={chip(value === d && !open)}>{name}</button>
        ))}
        <button onClick={() => setOpen(!open)} style={chip(open)}>
          {open ? "日付を選ぶ" : "その他"}
        </button>
        {!open && !isPreset && (
          <span style={{ fontSize: 11.5, color: C.ink }}>{fmtD(value)}</span>
        )}
      </div>
      {open && (
        <input type="date" value={value} max={today}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inpS, fontSize: 14 }} />
      )}
    </div>
  );
}
