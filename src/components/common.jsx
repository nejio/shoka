import { tagColor, hexA } from "../lib/tags.js";
export { tagColor, hexA };

export const C = {
  paper: "var(--c-paper)", ink: "var(--c-ink)", sub: "var(--c-sub)",
  indigo: "var(--c-indigo)", gold: "var(--c-gold)", line: "var(--c-line)",
  shelf: "var(--c-shelf)", card: "var(--c-card)", empty: "var(--c-empty)",
  field: "var(--c-field)",
};

/* ===== テーマ ===== */
export const THEMES = [
  ["light", "白", "#31465F"],
  ["dark", "黒", "#17191C"],
];
export function getTheme() {
  try {
    const v = localStorage.getItem("shoka:theme");
    // 廃止したテーマが保存されていても白に戻す
    return THEMES.some(([k]) => k === v) ? v : "light";
  } catch {
    return "light";
  }
}
export function applyTheme(key) {
  const t = THEMES.find(([k]) => k === key) || THEMES[0];
  document.documentElement.dataset.theme = t[0];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t[2];
  try { localStorage.setItem("shoka:theme", t[0]); } catch {}
}
export const MINCHO = '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif';
export const GOTHIC = '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif';


export const inpS = {
  background: C.field, border: `1px solid ${C.line}`, borderRadius: 4,
  padding: "9px 10px", fontSize: 15, color: C.ink, width: "100%", fontFamily: GOTHIC,
};

export function Stars({ n, size = 13 }) {
  if (!n) return null;
  return (
    <span style={{ color: C.gold, fontSize: size, letterSpacing: 1 }}>
      {"★".repeat(n)}
      <span style={{ color: C.line }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}

export function TagChip({ t, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        fontSize: 11, fontFamily: GOTHIC, borderRadius: 12, padding: "3px 11px",
        border: `1px solid ${active ? tagColor(t) : C.line}`,
        background: active ? tagColor(t) : C.card, color: active ? "#fff" : C.sub,
        cursor: "pointer",
      }}>{t}</button>
  );
}

/** 空状態。その画面に何が現れるのかと、なぜそれがあるのかを伝える */
export function EmptyState({ title, lines, hint }) {
  return (
    <div style={{ padding: "56px 28px 32px", textAlign: "center" }}>
      <div style={{ fontFamily: MINCHO, fontSize: 17, color: C.indigo, letterSpacing: 2, lineHeight: 1.8 }}>
        {title}
      </div>
      <p style={{ fontSize: 12, color: C.sub, lineHeight: 2.1, marginTop: 14, whiteSpace: "pre-line" }}>
        {lines}
      </p>
      {hint && (
        <div style={{
          fontSize: 11, color: C.gold, marginTop: 20, paddingTop: 14,
          borderTop: `1px solid ${C.line}`, lineHeight: 1.9,
        }}>{hint}</div>
      )}
    </div>
  );
}
