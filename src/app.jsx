import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import { auth, signIn, signOut, onAuthStateChanged, resolveRedirect } from "./lib/firebase.js";
import {
  subscribeBooks, addFinishedBook, addReadingBook, addStackedBook,
  addSession, finishBook, deleteBook, startReading, updateCover,
  setAside, reviveToStack, updateNote, updateStackedAt,
  updateTags, renameTagEverywhere, deleteTagEverywhere, updateHolding, markAcquired, updateDates, updateRating, updateProgressUnit, updateSessionMemo,
} from "./lib/books.js";
import { lookupByIsbn, searchByTitle } from "./lib/biblioApi.js";
import { findActiveDuplicate } from "./lib/dedupe.js";
import { relatedStacked } from "./lib/study.js";
import { isWanted } from "./lib/holding.js";
import { getPrefs, setPrefs } from "./lib/prefs.js";
import { Intro } from "./components/intro.jsx";
import { Settings } from "./components/settings.jsx";
import { ErrorBoundary } from "./components/errorboundary.jsx";
import { MemoView } from "./components/memo.jsx";
import { Search } from "./components/search.jsx";
import { IconGear, IconSearch } from "./components/icons.jsx";
import { getTags } from "./lib/tags.js";
import { todayLocal } from "./lib/dates.js";
import { C, MINCHO, GOTHIC, THEMES, getTheme, applyTheme } from "./components/common.jsx";
import { StatsView } from "./components/stats.jsx";
import { StudyView } from "./components/study.jsx";
import { Shelf } from "./components/shelf.jsx";
import { RecordTab } from "./components/records.jsx";
import { Detail } from "./components/detail.jsx";
import { RecordFab } from "./components/fab.jsx";

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return on;
}


/**
 * 読込中の画面。
 * 一定時間で「時間がかかっています」と再読み込みの手段を出す。
 * 読込が終わらない事態が起きても、利用者が何もできない状態にはしないため。
 */
function Loading({ error, onRetry, onSignOut }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const stuck = !!error || slow;
  const btn = {
    padding: "10px 24px", borderRadius: 6, fontSize: 13, cursor: "pointer",
    background: "none", border: `1px solid ${C.line}`, color: C.sub, fontFamily: GOTHIC,
  };

  return (
    <div style={{
      minHeight: "100dvh", background: C.paper, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center",
    }}>
      <div style={{ fontFamily: MINCHO, color: C.sub, letterSpacing: 4, fontSize: 18 }}>書架</div>

      {stuck && (
        <>
          <div style={{ fontSize: 12, color: C.sub, lineHeight: 2, fontFamily: GOTHIC, maxWidth: 300 }}>
            {error
              ? "記録を読み込めませんでした。"
              : "読み込みに時間がかかっています。"}
            <br />
            通信状況を確認して、読み込み直してください。
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={onRetry} style={{ ...btn, background: C.indigo, color: "#F5F3EC", border: "none" }}>
              読み込み直す
            </button>
            {onSignOut && <button onClick={onSignOut} style={btn}>サインアウト</button>}
          </div>
          {error && (
            <div style={{ fontSize: 10, color: C.sub, opacity: 0.8, maxWidth: 300, wordBreak: "break-all" }}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SignIn({ error }) {
  return (
    <div style={{ minHeight: "100dvh", background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, fontFamily: GOTHIC }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: MINCHO, fontSize: 42, letterSpacing: 12, color: C.indigo }}>書架</div>
        <div style={{ fontSize: 12, color: C.sub, marginTop: 8 }}>読書の毎日を、歴史にする</div>
      </div>
      <button onClick={() => signIn().catch(() => {})}
        style={{ background: C.indigo, color: "#F5F3EC", border: "none", borderRadius: 6, padding: "13px 32px", fontSize: 15, fontFamily: MINCHO, letterSpacing: 2, cursor: "pointer" }}>
        Googleでサインイン
      </button>
      {error && <div style={{ fontSize: 12, color: "#A33" }}>{error}</div>}
      <div style={{ fontSize: 10.5, color: C.sub, maxWidth: 280, textAlign: "center", lineHeight: 1.8 }}>
        記録はあなたのアカウントにのみ保存されます。オフラインでも記録でき、接続時に自動同期されます。
      </div>
    </div>
  );
}

function Shell({ user }) {
  const online = useOnline();
  const [books, setBooks] = useState(null);
  const [tab, setTab] = useState("stats");
  const [sel, setSel] = useState(null);
  const [err, setErr] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState(getTheme());
  const [addOpen, setAddOpen] = useState(false); // 本の追加フォームの開閉(親が所有)
  const [showIntro, setShowIntro] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  };

  useEffect(() => {
    const unsub = subscribeBooks(
      user.uid,
      (list) => { setLoadError(""); setBooks(list); },
      (e) => setLoadError(e.message || String(e))
    );
    return unsub;
  }, [user.uid]);

  // 初回だけ導入を表示。すでに蔵書がある人(既存ユーザー)には出さない
  useEffect(() => {
    if (books === null) return;
    let alive = true;
    (async () => {
      const prefs = await getPrefs(user.uid);
      if (!alive || prefs.onboarded) return;
      if (books.length > 0) setPrefs(user.uid, { onboarded: true }); // 既存ユーザーは既読扱い
      else setShowIntro(true);
    })();
    return () => { alive = false; };
  }, [books === null, user.uid]);

  const finishIntro = () => {
    setShowIntro(false);
    setPrefs(user.uid, { onboarded: true });
  };

  useEffect(() => {
    if (sel && books) {
      const fresh = books.find((b) => b.id === sel.id);
      if (fresh && fresh !== sel) setSel(fresh);
    }
  }, [books]);

  const cycleTheme = () => {
    const i = THEMES.findIndex(([k]) => k === theme);
    const next = THEMES[(i + 1) % THEMES.length][0];
    setTheme(next);
    applyTheme(next);
  };
  const themeLabel = (THEMES.find(([k]) => k === theme) || THEMES[0])[1];

  if (books === null) {
    return (
      <Loading
        error={loadError}
        onRetry={() => window.location.reload()}
        onSignOut={signOut}
      />
    );
  }

  const pendingCount = books.filter((b) => b.pending).length;
  // ラベルは5つ並べても窮屈にならない長さに揃える
  const tabs = [["stats", "暦"], ["shelf", "本棚"], ["study", "書斎"], ["memo", "覚書"], ["list", "記録"]];

  const wrap = (fn) => async (...args) => {
    setErr("");
    return fn(...args).catch((e) => { setErr(e.message); throw e; });
  };
  const handlers = {
    onAddFinished: wrap(async (input) => {
      const dup = findActiveDuplicate(books, input);
      if (dup) {
        // 積読/読書中の同じ本を新規作成せず読了化(足あとも引き継がれる)
        await finishBook(user.uid, dup, input, books);
        flash(`${dup.status === "reading" ? "読書中" : dup.status === "setaside" ? "見送っていた" : "積読"}の「${dup.title}」を読了にしました`);
        return;
      }
      await addFinishedBook(user.uid, input, books);
    }),
    onAddReading: wrap(async (input) => {
      const dup = findActiveDuplicate(books, input);
      if (dup) {
        if (dup.status === "stacked" || dup.status === "setaside") {
          if (isWanted(dup)) await markAcquired(user.uid, dup.id);
          await startReading(user.uid, dup.id, input.start || todayLocal());
          flash(`${dup.status === "setaside" ? "見送っていた" : "積読の"}「${dup.title}」を読書中に移しました`);
          return;
        }
        throw new Error(`「${dup.title}」はすでに読書中です`);
      }
      await addReadingBook(user.uid, input);
    }),
    onAddStacked: wrap(async (input) => {
      const dup = findActiveDuplicate(books, input);
      if (dup) {
        // 気になる本として登録済みの本を、手に入れて登録し直した場合
        if (isWanted(dup) && !(input.holding && input.holding.type === "wanted")) {
          await markAcquired(user.uid, dup.id);
          flash(`気になる本だった「${dup.title}」を入手済みにしました`);
          return;
        }
        if (dup.status === "setaside") {
          await reviveToStack(user.uid, dup.id);
          flash(`見送っていた「${dup.title}」を関心の地図に戻しました`);
          return;
        }
        throw new Error(dup.status === "reading"
          ? `「${dup.title}」はすでに読書中です`
          : `「${dup.title}」はすでに積読にあります`);
      }
      await addStackedBook(user.uid, input);
    }),
    onProgress: wrap((book, session) => addSession(user.uid, book, session)),
    onFinish: wrap(async (book, input) => {
      await finishBook(user.uid, book, input, books);
      const rel = relatedStacked(books, getTags(book), book.id);
      if (rel.length) {
        flash(`書斎に近い関心の本が${rel.length}冊あります(${rel[0].title}${rel.length > 1 ? " ほか" : ""})`);
      }
    }),
    onDelete: wrap((id) => deleteBook(user.uid, id)),
    onChangeTag: wrap((id, tags) => updateTags(user.uid, id, tags)),
    onRenameTag: wrap((from, to) => renameTagEverywhere(user.uid, books, from, to)),
    onDeleteTag: wrap((tag) => deleteTagEverywhere(user.uid, books, tag)),
    onStartReading: wrap((id) => startReading(user.uid, id, todayLocal())),
    onSetAside: wrap((id) => setAside(user.uid, id)),
    onRevive: wrap((id) => reviveToStack(user.uid, id)),
    onSaveNote: wrap((id, note) => updateNote(user.uid, id, note)),
    onSaveStackedAt: wrap((id, date) => updateStackedAt(user.uid, id, date)),
    onSaveHolding: wrap((id, holding) => updateHolding(user.uid, id, holding)),
    onAcquire: wrap((id) => markAcquired(user.uid, id)),
    onSaveDates: wrap((id, dates) => updateDates(user.uid, id, dates)),
    onSaveRating: wrap((id, rating) => updateRating(user.uid, id, rating)),
    onSaveProgressUnit: wrap((id, unit) => updateProgressUnit(user.uid, id, unit)),
    onSaveSessionMemo: wrap((book, i, memo) => updateSessionMemo(user.uid, book, i, memo)),
    onFetchCover: wrap(async (book) => {
      let b = null;
      if (book.isbn) b = await lookupByIsbn(book.isbn);
      if (!b || !b.coverUrl) {
        const list = await searchByTitle(book.title, 5);
        b = list.find((x) => x.coverUrl) || null;
      }
      if (!b || !b.coverUrl) throw new Error("書影が見つかりませんでした");
      await updateCover(user.uid, book.id, { coverUrl: b.coverUrl, isbn: book.isbn ? null : b.isbn });
    }),
  };

  const openAddForm = () => { setTab("list"); setAddOpen(true); };
  // タブを離れたら追加フォームは閉じる(戻ったときに勝手に開かないように)
  const changeTab = (k) => {
    setTab(k);
    if (k !== "list") setAddOpen(false);
  };

  return (
    <div style={{ minHeight: "100dvh", background: C.paper, fontFamily: GOTHIC, color: C.ink, paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
      <header style={{
        padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `1px solid ${C.line}`,
        boxShadow: `0 2px 0 -1px ${C.gold}22`, // 細い副罫(和書の二重罫の見立て)
      }}>
        <h1 style={{ fontFamily: MINCHO, fontSize: 24, letterSpacing: 6, color: C.indigo, margin: 0, fontWeight: "normal" }}>書架</h1>
        <button onClick={() => setShowSettings(true)} aria-label="設定" title="設定"
          style={{
            background: "none", border: "none", padding: 4, color: C.sub,
            cursor: "pointer", display: "flex", alignItems: "center",
          }}>
          <IconGear size={21} />
        </button>
      </header>

      {(!online || pendingCount > 0) && (
        <div style={{ padding: "6px 16px", fontSize: 11, color: online ? C.sub : "#fff", background: online ? C.card : C.gold, borderBottom: `1px solid ${C.line}` }}>
          {online
            ? `同期中… 未送信 ${pendingCount}件`
            : `オフライン — 記録は端末に保存され、接続時に自動同期されます${pendingCount ? `(待機 ${pendingCount}件)` : ""}`}
        </div>
      )}

      {err && (
        <div style={{ margin: "10px 16px 0", padding: "8px 12px", borderRadius: 6, background: "#FBEAEA", border: "1px solid #D8B4B4", fontSize: 12, color: "#8A3030" }}>
          {err}
        </div>
      )}
      {notice && (
        <div style={{ margin: "10px 16px 0", padding: "8px 12px", borderRadius: 6, background: C.card, border: `1px solid ${C.gold}`, fontSize: 12, color: C.gold }}>
          {notice}
        </div>
      )}

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <ErrorBoundary resetKey={tab}>
          {tab === "stats" && <StatsView books={books} onSelect={setSel} />}
          {tab === "shelf" && <Shelf books={books} onSelect={setSel} />}
          {tab === "study" && <StudyView books={books} onSelect={setSel} onRenameTag={handlers.onRenameTag} onDeleteTag={handlers.onDeleteTag} />}
          {tab === "memo" && <MemoView books={books} onSelect={setSel} />}
          {tab === "list" && <RecordTab books={books} onSelect={setSel} addOpen={addOpen} onCloseAdd={() => setAddOpen(false)} {...handlers} />}
        </ErrorBoundary>
      </div>

      <RecordFab books={books} onProgress={handlers.onProgress} onAddBook={openAddForm} />

      {/* 下タブ */}
      <nav style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 45,
        display: "flex", justifyContent: "space-around",
        background: C.card, borderTop: `1px solid ${C.line}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => changeTab(k)}
            style={{
              flex: 1, padding: "13px 0 11px", fontFamily: MINCHO, fontSize: 13.5, letterSpacing: 0.5,
              background: "none", border: "none", cursor: "pointer",
              color: tab === k ? C.indigo : C.sub,
              borderTop: tab === k ? `2px solid ${C.gold}` : "2px solid transparent",
            }}>{label}</button>
        ))}
      </nav>

      {showSettings && (
        <Settings user={user} books={books} theme={theme}
          onChangeTheme={(k) => { setTheme(k); applyTheme(k); }}
          onSignOut={signOut}
          onClose={() => setShowSettings(false)} />
      )}

      {showSearch && <Search books={books} onSelect={setSel} onClose={() => setShowSearch(false)} />}

      {showIntro && <Intro onDone={finishIntro} />}

      <Detail book={sel} books={books} onClose={() => setSel(null)} onSelect={setSel} onDelete={handlers.onDelete} onChangeTag={handlers.onChangeTag} onStartReading={handlers.onStartReading} onFetchCover={handlers.onFetchCover}
        onSetAside={handlers.onSetAside} onRevive={handlers.onRevive} onSaveNote={handlers.onSaveNote}
        onSaveStackedAt={handlers.onSaveStackedAt} onSaveHolding={handlers.onSaveHolding}
        onAcquire={handlers.onAcquire} onSaveDates={handlers.onSaveDates} onSaveRating={handlers.onSaveRating} onSaveProgressUnit={handlers.onSaveProgressUnit} onSaveSessionMemo={handlers.onSaveSessionMemo} />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const [authErr, setAuthErr] = useState("");

  useEffect(() => {
    applyTheme(getTheme());
    resolveRedirect().catch((e) => setAuthErr(e.message));
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (user === undefined) {
    return (
      <Loading
        error={authErr}
        onRetry={() => window.location.reload()}
        onSignOut={signOut}
      />
    );
  }
  if (!user) return <SignIn error={authErr} />;
  return <Shell user={user} />;
}

createRoot(document.getElementById("root")).render(<App />);
