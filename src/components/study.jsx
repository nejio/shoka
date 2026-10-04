import { useState } from "react";
import { C, MINCHO, GOTHIC, tagColor, EmptyState } from "./common.jsx";
import { TagMapView, BookTile } from "./tagmap.jsx";
import { buildStudyMap, buildOwnedMap, buildTagMap, secondaryTags, isSetAside, inStudy } from "../lib/study.js";
import { mainTag, tagsInUse, parentOf, findRenamable } from "../lib/tags.js";
import { fmtD } from "../lib/dates.js";
import { IconChevron } from "./icons.jsx";
import { isWanted } from "../lib/holding.js";

/* ---- タグの整理 ---- */
function TagManager({ books, onRenameTag, onDeleteTag }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);
  const list = tagsInUse(books);
  const renamable = findRenamable(books);

  if (!list.length) return null;

  const save = async () => {
    const to = draft.trim();
    if (!to || to === editing) { setEditing(null); return; }
    setBusy(true);
    try {
      const n = await onRenameTag(editing, to);
      const merged = list.some((x) => x.tag === to);
      setMsg(merged ? `「${editing}」を「${to}」に統合しました(${n}冊)` : `「${editing}」を「${to}」に変更しました(${n}冊)`);
      setEditing(null);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const del = async (tag) => {
    setBusy(true);
    try {
      const n = await onDeleteTag(tag);
      setMsg(`「${tag}」を${n}冊から外しました`);
      setConfirmDel(null);
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  return (
    <div style={{ marginTop: 28 }}>
      <button onClick={() => setOpen(!open)}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none",
          borderTop: `1px dashed ${C.line}`, padding: "12px 0 6px", cursor: "pointer",
          display: "flex", alignItems: "baseline", gap: 8,
        }}>
        <span style={{ fontFamily: MINCHO, fontSize: 14, color: C.sub, letterSpacing: 1 }}>
          タグを整理
        </span>
        <span style={{ fontSize: 11, color: C.sub }}>{list.length}種</span>
        <span style={{ marginLeft: "auto", color: C.sub, display: "flex", alignItems: "center" }}>
          <IconChevron size={14} dir={open ? "down" : "right"} />
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 6 }}>
          <p style={{ fontSize: 10.5, color: C.sub, lineHeight: 1.7, marginBottom: 8 }}>
            名前を変えると全書籍に反映されます。既存のタグ名に変えると統合になります。
          </p>

          {renamable.length > 0 && (
            <div style={{ marginBottom: 10, padding: 10, borderRadius: 6, background: C.card, border: `1px solid ${C.gold}` }}>
              <div style={{ fontSize: 11.5, color: C.ink, lineHeight: 1.8 }}>
                分類の改訂により、名前が変わったタグがあります。
              </div>
              <div style={{ fontSize: 10.5, color: C.sub, margin: "6px 0", lineHeight: 1.9 }}>
                {renamable.map((r) => `${r.from} → ${r.to}`).join(" ・ ")}
              </div>
              <button onClick={async () => {
                  setBusy(true);
                  try {
                    let n = 0;
                    for (const r of renamable) n += await onRenameTag(r.from, r.to);
                    setMsg(`${renamable.length}件のタグを新しい名前に統合しました(${n}冊)`);
                  } catch (e) { setMsg(e.message); }
                  setBusy(false);
                }}
                disabled={busy}
                style={{ padding: "7px 16px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12, border: "none", cursor: "pointer" }}>
                まとめて統合する
              </button>
            </div>
          )}
          {msg && <div style={{ fontSize: 11, color: C.gold, marginBottom: 8 }}>{msg}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map(({ tag, count }) => (
              <div key={tag} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, background: C.card, border: `1px solid ${C.line}` }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: tagColor(tag), flexShrink: 0 }} />
                {editing === tag ? (
                  <>
                    <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && save()}
                      style={{ flex: 1, minWidth: 0, background: C.field, border: `1px solid ${C.line}`, borderRadius: 4, padding: "5px 8px", fontSize: 13, color: C.ink, fontFamily: GOTHIC }} />
                    <button onClick={save} disabled={busy}
                      style={{ padding: "5px 12px", borderRadius: 4, background: C.gold, color: "#fff", fontSize: 12, border: "none", cursor: "pointer" }}>保存</button>
                    <button onClick={() => setEditing(null)}
                      style={{ padding: "5px 8px", borderRadius: 4, background: "none", border: "none", color: C.sub, fontSize: 11, cursor: "pointer" }}>やめる</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontFamily: MINCHO, fontSize: 13.5, color: C.ink }}>{tag}</span>
                    <span style={{ fontSize: 11, color: C.sub }}>{count}冊</span>
                    <button onClick={() => { setEditing(tag); setDraft(tag); setMsg(""); }}
                      style={{ padding: "4px 10px", borderRadius: 4, background: "none", border: `1px solid ${C.line}`, color: C.sub, fontSize: 11, cursor: "pointer" }}>変更</button>
                    <button onClick={() => confirmDel === tag ? del(tag) : setConfirmDel(tag)} disabled={busy}
                      style={{ padding: "4px 10px", borderRadius: 4, background: confirmDel === tag ? "#8A3030" : "none", border: `1px solid ${confirmDel === tag ? "#8A3030" : C.line}`, color: confirmDel === tag ? "#fff" : C.sub, fontSize: 11, cursor: "pointer" }}>
                      {confirmDel === tag ? "本当に外す" : "削除"}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- 分布バー(統計。本は1冊1回で数える) ---- */
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
      {secondary.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: C.sub, lineHeight: 1.8 }}>
          ほかに重ねているタグ:{" "}
          {secondary.map((t) => `${t.tag}(${t.count})`).join(" ・ ")}
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

export function StudyView({ books, onSelect, onRenameTag, onDeleteTag }) {
  const [showAside, setShowAside] = useState(false);
  const [showWanted, setShowWanted] = useState(true);

  const all = books.filter(inStudy);
  const owned = all.filter((b) => !isWanted(b));
  const wantedCount = all.length - owned.length;
  const readingCount = books.filter((b) => b.status === "reading").length;

  const shown = showWanted ? all : owned;
  const map = buildTagMap(shown);
  const ownedMap = buildOwnedMap(books);
  const secondary = secondaryTags(owned);
  const aside = books.filter(isSetAside);

  if (!all.length && !aside.length) {
    return (
      <EmptyState
        title="積んだ本が、関心の地図になります"
        lines={"読まなくても構いません。\n積まれた本の群れそのものが、いまのあなたの関心のかたちです。\n読み始めた本も、ここに残り続けます。"}
        hint={"右下の「記録」ボタンから本を追加できます。\n「まだ持っていない」本も書き留められます。"}
      />
    );
  }

  return (
    <div style={{ padding: "12px 16px 32px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: MINCHO, fontSize: 18, color: C.indigo, letterSpacing: 2 }}>関心の地図</span>
        <span style={{ fontSize: 11, color: C.sub }}>
          手元に {owned.length}冊{wantedCount > 0 && ` ・ 気になる ${wantedCount}冊`}
        </span>
      </div>
      <p style={{ fontSize: 11, color: C.sub, marginTop: 4, lineHeight: 1.7 }}>
        読まなくてもいい。これから読む本といま読んでいる本が、向かっている関心のかたちです。
        {readingCount > 0 && (
          <><br /><span style={{ color: C.gold }}>金の縁</span>が付いているのが、いま読んでいる{readingCount}冊。</>
        )}
        {wantedCount > 0 && (
          <><br /><span style={{ borderBottom: `1.5px dashed ${C.sub}` }}>破線の枠</span>は、まだ持っていない気になる本。</>
        )}
      </p>

      {wantedCount > 0 && (
        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11, color: C.sub, cursor: "pointer" }}>
          <input type="checkbox" checked={showWanted} onChange={(e) => setShowWanted(e.target.checked)} />
          気になる本も地図に表示する
        </label>
      )}

      <TagMapView map={map} total={shown.length} secondary={secondary} onSelect={onSelect}
        distMap={ownedMap} distTotal={owned.length} />

      <TagManager books={books} onRenameTag={onRenameTag} onDeleteTag={onDeleteTag} />

      {aside.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button onClick={() => setShowAside(!showAside)}
            style={{
              width: "100%", textAlign: "left", background: "none", border: "none",
              borderTop: `1px dashed ${C.line}`, padding: "12px 0 6px", cursor: "pointer",
              display: "flex", alignItems: "baseline", gap: 8,
            }}>
            <span style={{ fontFamily: MINCHO, fontSize: 14, color: C.sub, letterSpacing: 1 }}>
              見送った本
            </span>
            <span style={{ fontSize: 11, color: C.sub }}>{aside.length}冊</span>
            <span style={{ marginLeft: "auto", color: C.sub, display: "flex", alignItems: "center" }}>
              <IconChevron size={14} dir={showAside ? "down" : "right"} />
            </span>
          </button>
          {showAside && (
            <>
              <p style={{ fontSize: 10.5, color: C.sub, lineHeight: 1.7, marginBottom: 8 }}>
                いまの関心からは外れた本。手放したわけではないので、いつでも山に戻せます。
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {aside.map((b) => <BookTile key={b.id} book={b} onSelect={onSelect} muted />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- 今日の一冊(暦・統計タブ下部に静かに置く) ---- */
export function BookOfTheDay({ book, onSelect }) {
  if (!book) return null;
  return (
    <button onClick={() => onSelect(book)}
      style={{
        width: "100%", textAlign: "left", background: C.card, border: `1px solid ${C.line}`,
        borderRadius: 6, padding: 12, cursor: "pointer", display: "flex", gap: 12, alignItems: "center",
        fontFamily: GOTHIC,
      }}>
      {book.coverUrl ? (
        <img src={book.coverUrl} alt="" style={{ width: 40, height: 58, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} />
      ) : (
        <div style={{ width: 40, height: 58, borderRadius: 3, background: tagColor(mainTag(book)), flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, color: C.sub }}>書斎にこんな本があります</div>
        <div style={{ fontFamily: MINCHO, fontSize: 14.5, color: C.ink, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {book.title}
        </div>
        <div style={{ fontSize: 10.5, color: C.sub, marginTop: 2 }}>
          {book.stackedAt ? `${fmtD(book.stackedAt)} に積んだ` : mainTag(book)}
        </div>
      </div>
    </button>
  );
}
