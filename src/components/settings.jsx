import { useState } from "react";
import { C, MINCHO, GOTHIC, THEMES } from "./common.jsx";
import { exportAccountData, downloadJson, deleteAccount, importBooks } from "../lib/account.js";
import { parseImport } from "../lib/importData.js";
import { todayLocal } from "../lib/dates.js";
import { BUILD, BUILD_LABEL } from "../version.js";

const CONFIRM_WORD = "削除";

function Section({ title, children, note }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontFamily: MINCHO, fontSize: 14, color: C.indigo, letterSpacing: 2, paddingBottom: 6, borderBottom: `1px solid ${C.line}` }}>
        {title}
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
      {note && <div style={{ fontSize: 10.5, color: C.sub, marginTop: 8, lineHeight: 1.8 }}>{note}</div>}
    </div>
  );
}

export function Settings({ user, books, theme, onChangeTheme, onSignOut, onClose }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [danger, setDanger] = useState(false);
  const [word, setWord] = useState("");
  const [progress, setProgress] = useState(null);

  const finished = books.filter((b) => b.status === "finished").length;

  const doExport = async () => {
    setBusy(true); setMsg("書き出しています…");
    try {
      const data = await exportAccountData(user.uid);
      downloadJson(data, `shoka-${todayLocal()}.json`);
      setMsg(`${data.bookCount}冊を書き出しました`);
    } catch (e) {
      setMsg("書き出しに失敗しました: " + e.message);
    }
    setBusy(false);
  };

  // ---- 取り込み: ファイル選択 → 内容の確認 → 実行 ----
  const [plan, setPlan] = useState(null); // parseImport の結果(確認待ち)
  const [importMsg, setImportMsg] = useState("");

  const pickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = ""; // 同じファイルをもう一度選べるように
    setPlan(null); setImportMsg("");
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setImportMsg("ファイルが大きすぎます(20MBまで)"); return; }
    try {
      const r = parseImport(await f.text(), new Set(books.map((b) => b.id)));
      if (!r.ok) setImportMsg(r.error);
      else if (!r.items.length) setImportMsg(`取り込める本がありませんでした(すでにある本 ${r.existing}冊、読めない本 ${r.rejected.length}冊)`);
      else setPlan(r);
    } catch (err) {
      setImportMsg("ファイルを読み込めませんでした: " + err.message);
    }
  };

  const doImport = async () => {
    if (!plan) return;
    setBusy(true); setImportMsg("取り込んでいます…");
    try {
      const n = await importBooks(user.uid, plan.items, (d) => setImportMsg(`取り込んでいます… ${d}/${plan.items.length}冊`));
      setImportMsg(`${n}冊を取り込みました`);
      setPlan(null);
    } catch (err) {
      setImportMsg("取り込みに失敗しました: " + err.message);
    }
    setBusy(false);
  };

  const doDelete = async () => {
    if (word.trim() !== CONFIRM_WORD) return;
    setBusy(true); setMsg(""); setProgress(0);
    try {
      await deleteAccount(user.uid, (n) => setProgress(n));
      // 削除に成功すると認証状態が消え、自動的にサインイン画面へ戻る
    } catch (e) {
      setMsg("削除に失敗しました: " + e.message);
      setProgress(null);
      setBusy(false);
    }
  };

  const btn = {
    padding: "10px 18px", borderRadius: 6, fontSize: 13,
    border: `1px solid ${C.line}`, background: C.card, color: C.ink, cursor: "pointer",
    fontFamily: GOTHIC,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 65, background: C.paper,
      overflowY: "auto", fontFamily: GOTHIC, color: C.ink,
    }}>
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "calc(14px + env(safe-area-inset-top)) 16px 10px",
        borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.paper,
      }}>
        <span style={{ fontFamily: MINCHO, fontSize: 18, letterSpacing: 3, color: C.indigo }}>設定</span>
        <button onClick={onClose} disabled={busy}
          style={{ background: "none", border: "none", fontSize: 13, color: C.sub, cursor: "pointer" }}>
          閉じる
        </button>
      </header>

      <div style={{ padding: "0 16px calc(40px + env(safe-area-inset-bottom))", maxWidth: 560, margin: "0 auto" }}>
        <Section title="アカウント">
          <div style={{ fontSize: 13, color: C.ink }}>{user.email || "(メールアドレスなし)"}</div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>
            蔵書 {books.length}冊 ・ 読了 {finished}冊
          </div>
          <button onClick={onSignOut} disabled={busy} style={{ ...btn, marginTop: 12 }}>
            サインアウト
          </button>
        </Section>

        <Section title="外観">
          <div style={{ display: "flex", gap: 8 }}>
            {THEMES.map(([k, label]) => (
              <button key={k} onClick={() => onChangeTheme(k)}
                style={{
                  ...btn,
                  background: theme === k ? C.indigo : C.card,
                  color: theme === k ? "#fff" : C.sub,
                  border: theme === k ? "none" : `1px solid ${C.line}`,
                }}>{label}</button>
            ))}
          </div>
        </Section>

        <Section
          title="データの書き出し"
          note="蔵書・読書の足あと・タグ・感想をすべて含むJSONファイルを保存します。あなたの読書の記録は、あなたのものです。">
          <button onClick={doExport} disabled={busy} style={btn}>
            すべての記録を書き出す
          </button>
        </Section>

        <Section
          title="データの取り込み"
          note="上の書き出しで保存したファイルから、本を追加します。すでにある本は飛ばし、上書きはしません。同じファイルを2回選んでも増えません。">
          <label style={{ ...btn, display: "inline-block", opacity: busy ? 0.5 : 1 }}>
            ファイルを選ぶ
            <input type="file" accept="application/json,.json" onChange={pickFile} disabled={busy}
              style={{ display: "none" }} />
          </label>
          {plan && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 6, border: `1px solid ${C.line}`, background: C.card }}>
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.9 }}>
                <strong>{plan.items.length}冊</strong>を追加します。
                {plan.existing > 0 && <><br />すでにある本 {plan.existing}冊は飛ばします。</>}
                {plan.rejected.length > 0 && <><br />読み取れない本 {plan.rejected.length}冊は取り込みません。</>}
              </div>
              {plan.rejected.length > 0 && (
                <ul style={{ fontSize: 11, color: C.sub, marginTop: 6, paddingLeft: 18, lineHeight: 1.7 }}>
                  {plan.rejected.slice(0, 5).map((x, i) => <li key={i}>{x.title}: {x.reason}</li>)}
                  {plan.rejected.length > 5 && <li>ほか {plan.rejected.length - 5}冊</li>}
                </ul>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={doImport} disabled={busy}
                  style={{ ...btn, background: C.indigo, color: "#fff", border: "none" }}>取り込む</button>
                <button onClick={() => { setPlan(null); setImportMsg(""); }} disabled={busy} style={btn}>やめる</button>
              </div>
            </div>
          )}
          {importMsg && <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>{importMsg}</div>}
        </Section>

        <Section title="アカウントの削除">
          {!danger ? (
            <button onClick={() => setDanger(true)} disabled={busy}
              style={{ ...btn, color: "#8A3030", border: "1px solid #8A3030", background: "none" }}>
              アカウントを削除する
            </button>
          ) : (
            <div style={{ padding: 12, borderRadius: 6, border: "1px solid #8A3030", background: C.card }}>
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.9 }}>
                アカウントと、次のデータがすべて消えます。<br />
                <strong>蔵書 {books.length}冊 ・ 読書暦 ・ すべての感想と足あと</strong><br />
                <span style={{ color: "#8A3030" }}>この操作は取り消せません。</span>
              </div>
              <div style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>
                削除する前に、上の「すべての記録を書き出す」で保存しておくことをおすすめします。
              </div>
              <div style={{ fontSize: 11.5, color: C.ink, marginTop: 12 }}>
                確認のため「{CONFIRM_WORD}」と入力してください
              </div>
              <input value={word} onChange={(e) => setWord(e.target.value)} disabled={busy}
                style={{
                  width: "100%", marginTop: 6, padding: "9px 10px", fontSize: 15,
                  background: C.field, border: `1px solid ${C.line}`, borderRadius: 4,
                  color: C.ink, fontFamily: GOTHIC,
                }} />
              {progress !== null && (
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 8 }}>
                  削除しています… {progress}冊
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={doDelete} disabled={busy || word.trim() !== CONFIRM_WORD}
                  style={{
                    ...btn,
                    background: word.trim() === CONFIRM_WORD && !busy ? "#8A3030" : C.line,
                    color: "#fff", border: "none",
                  }}>
                  {busy ? "削除中…" : "完全に削除する"}
                </button>
                <button onClick={() => { setDanger(false); setWord(""); }} disabled={busy} style={btn}>
                  やめる
                </button>
              </div>
            </div>
          )}
        </Section>

        {msg && (
          <div style={{
            marginTop: 16, padding: "10px 12px", borderRadius: 6,
            background: C.card, border: `1px solid ${msg.includes("失敗") ? "#D8B4B4" : C.line}`,
            fontSize: 12, color: msg.includes("失敗") ? "#8A3030" : C.sub,
          }}>{msg}</div>
        )}

        <div style={{ fontSize: 10, color: C.sub, marginTop: 28, textAlign: "center", lineHeight: 1.9 }}>
          書架 — 読書の毎日を、歴史にする
          <br />
          <span title={BUILD} style={{ letterSpacing: 1 }}>{BUILD_LABEL}</span>
        </div>
      </div>
    </div>
  );
}
