import { useMemo, useState } from "react";
import { C, MINCHO, GOTHIC, tagColor, EmptyState } from "./common.jsx";
import { mainTag, tagsInUse } from "../lib/tags.js";
import { buildPagesByDay, calcReadingStreak, chooseStatsFocus, readingDaysIn } from "../lib/stats.js";
import { ReadingCalendar } from "./calendar.jsx";
import { BookOfTheDay } from "./study.jsx";
import { pickBookOfTheDay } from "../lib/study.js";
import { ym, isoLocal, todayLocal, daysAgo } from "../lib/dates.js";

function getStatsPref() {
  try { return localStorage.getItem("shoka:stats") || "auto"; } catch { return "auto"; }
}

export function StatsView({ books, onSelect }) {
  const TODAY = todayLocal();
  const [pref, setPref] = useState(getStatsPref());
  const setPrefPersist = (v) => {
    setPref(v);
    try { localStorage.setItem("shoka:stats", v); } catch {}
  };
  const [more, setMore] = useState(() => {
    try { return localStorage.getItem("shoka:statsMore") === "1"; } catch { return false; }
  });
  const setMorePersist = (v) => {
    setMore(v);
    try { localStorage.setItem("shoka:statsMore", v ? "1" : "0"); } catch {}
  };
  const focus = pref === "auto" ? chooseStatsFocus(books, TODAY) : pref;

  const bookOfDay = useMemo(() => pickBookOfTheDay(books, TODAY), [books, TODAY]);
  const pagesByDay = useMemo(() => buildPagesByDay(books), [books]);
  const streak = useMemo(() => calcReadingStreak(books, TODAY), [books, TODAY]);

  const finished = books.filter((b) => b.status === "finished");
  const months = useMemo(() => {
    const arr = [];
    const d = new Date(TODAY + "T00:00:00");
    d.setDate(1); d.setMonth(d.getMonth() - 11);
    for (let i = 0; i < 12; i++) { arr.push(ym(isoLocal(d))); d.setMonth(d.getMonth() + 1); }
    return arr;
  }, [TODAY]);
  const counts = months.map((k) => finished.filter((r) => ym(r.end) === k).length);
  const maxC = Math.max(...counts, 1);

  const last28 = useMemo(() => {
    const arr = [];
    for (let i = 27; i >= 0; i--) arr.push(daysAgo(i));
    return arr;
  }, [TODAY]);
  const pageBars = last28.map((d) => pagesByDay[d] || 0);
  const maxP = Math.max(...pageBars, 1);
  const hasPages = pageBars.some((p) => p > 0);

  const thisYear = finished.filter((r) => r.end.startsWith(TODAY.slice(0, 4))).length;
  const thisMonth = finished.filter((r) => ym(r.end) === ym(TODAY)).length;

  const qData = useMemo(() => {
    const out = [];
    const d = new Date(TODAY + "T00:00:00");
    let qy = d.getFullYear(), qi = Math.floor(d.getMonth() / 3);
    for (let k = 0; k < 6; k++) {
      const a = `${qy}-${String(qi * 3 + 1).padStart(2, "0")}`;
      const b = `${qy}-${String(qi * 3 + 3).padStart(2, "0")}`;
      const rs = finished.filter((r) => ym(r.end) >= a && ym(r.end) <= b);
      const tally = {};
      rs.forEach((r) => { const t = mainTag(r); tally[t] = (tally[t] || 0) + 1; });
      out.unshift({ label: `${String(qy).slice(2)} Q${qi + 1}`, tally, total: rs.length });
      qi--; if (qi < 0) { qi = 3; qy--; }
    }
    return out;
  }, [books, TODAY]);

  const box = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 6 };

  // 表示の主役を切り替え
  const monthStart = ym(TODAY) + "-01";
  const readDaysThisMonth = readingDaysIn(books, monthStart, TODAY);
  const pagesThisMonth = Object.entries(pagesByDay)
    .filter(([d]) => d >= monthStart && d <= TODAY)
    .reduce((s, [, p]) => s + p, 0);

  // ラベルの改行位置は "\n" で明示する。
  // 画面幅任せの折り返しだと「今月の読書 / 日」のように語の途中で切れるため。
  const cards = focus === "books"
    ? [
        ["連続読書", streak + "日"],
        ["今月", thisMonth + "冊"],
        ["今年", thisYear + "冊"],
        ["累計", finished.length + "冊"],
      ]
    : [
        ["連続読書", streak + "日"],
        ["今月の\n読書日", readDaysThisMonth + "日"],
        ["今月の\n頁数", pagesThisMonth.toLocaleString() + "p"],
        ["累計", finished.length + "冊"],
      ];

  const pagesChart = hasPages && (
    <div key="pages" style={{ ...box, padding: 12 }}>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>日別ページ数(直近4週)</div>
      <svg viewBox="0 0 300 70" style={{ width: "100%" }}>
        {pageBars.map((p, i) => (
          <rect key={i} x={i * 10.6 + 2} y={58 - (p / maxP) * 52} width={7.5} height={(p / maxP) * 52 + 1}
            fill={last28[i] === TODAY ? C.gold : C.indigo} rx={1.5} opacity={p ? 1 : 0.15} />
        ))}
        <text x={2} y={68} fontSize={8} fill={C.sub}>4週前</text>
        <text x={280} y={68} fontSize={8} fill={C.sub} textAnchor="end">今日</text>
      </svg>
      <div style={{ fontSize: 10.5, color: C.sub }}>最大 {maxP}p/日</div>
    </div>
  );

  const monthlyChart = (
    <div key="monthly" style={{ ...box, padding: 12 }}>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>月別読了数(直近12か月)</div>
      <svg viewBox="0 0 300 92" style={{ width: "100%" }}>
        {counts.map((c, i) => (
          <g key={i}>
            <rect x={i * 25 + 4} y={70 - (c / maxC) * 58} width={16} height={(c / maxC) * 58 + 1}
              fill={months[i] === ym(TODAY) ? C.gold : C.indigo} rx={2} />
            <text x={i * 25 + 12} y={66 - (c / maxC) * 58} textAnchor="middle" fontSize={8.5} fill={C.sub}>{c || ""}</text>
            <text x={i * 25 + 12} y={84} textAnchor="middle" fontSize={8} fill={C.sub}>{parseInt(months[i].slice(5))}</text>
          </g>
        ))}
      </svg>
    </div>
  );

  if (books.length === 0) {
    return (
      <EmptyState
        title="読んだ日が、色で残ります"
        lines={"一日ごとのマスが、読んだ本のジャンルの色で埋まっていきます。\n続けるほど、モザイクがあなたの一年になります。"}
        hint={"右下の「記録」ボタンから本を追加できます。"}
      />
    );
  }

  return (
    <div style={{ padding: "0 16px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", border: `1px solid ${C.line}` }}>
          {[["auto", "自動"], ["books", "冊"], ["pages", "頁"]].map(([k, l]) => (
            <button key={k} onClick={() => setPrefPersist(k)}
              style={{ padding: "4px 12px", fontSize: 11, border: "none", cursor: "pointer",
                background: pref === k ? C.indigo : C.card, color: pref === k ? "#fff" : C.sub }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {cards.map(([l, v]) => (
          <div key={l} style={{
            ...box, padding: "8px 4px", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{
              fontSize: 10.5, color: C.sub, lineHeight: 1.35, whiteSpace: "pre-line",
              minHeight: "2.7em", display: "flex", alignItems: "center", justifyContent: "center",
            }}>{l}</div>
            <div style={{ fontFamily: MINCHO, fontSize: 18, color: l === "連続読書" ? C.gold : C.indigo }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...box, padding: 12 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>読書暦</div>
        <ReadingCalendar books={books} onSelect={onSelect} />
      </div>

      {bookOfDay && <BookOfTheDay book={bookOfDay} onSelect={onSelect} />}

      {/* グラフ類は初期状態では畳む。まず暦・数字・今日の一冊だけが目に入るように */}
      <button onClick={() => setMorePersist(!more)} aria-expanded={more}
        style={{
          ...box, padding: "10px 12px", display: "flex", justifyContent: "space-between",
          alignItems: "center", cursor: "pointer", fontFamily: GOTHIC, fontSize: 12.5, color: C.indigo,
        }}>
        <span>くわしい集計(グラフ・関心の変遷)</span>
        <span style={{ color: C.sub, fontSize: 11 }}>{more ? "閉じる" : "開く"}</span>
      </button>

      {more && (focus === "books" ? [monthlyChart, pagesChart] : [pagesChart, monthlyChart])}

      {more && <div style={{ ...box, padding: 12 }}>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>関心の変遷(四半期ごとの主タグ構成)</div>
        {qData.map((h) => (
          <div key={h.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: C.ink, fontFamily: MINCHO }}>{h.label}</span>
              <span style={{ fontSize: 10, color: C.sub }}>{h.total}冊</span>
            </div>
            <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", marginTop: 2, border: `1px solid ${C.line}`, background: C.empty }}>
              {Object.keys(h.tally).sort().map((t) => (
                <div key={t} style={{ width: `${(h.tally[t] / h.total) * 100}%`, background: tagColor(t) }} title={t} />
              ))}
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
}
