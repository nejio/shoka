import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getTags, mainTag, hasTag, tagsInUse, tagOptions, normalizeTags,
  tagColor, STARTER_TAGS, MAX_TAGS, UNTAGGED,
  TAXONOMY, FORMAT_TAXONOMY, RENAMED, findRenamable, subsOf, parentOf,
} from "../src/lib/tags.js";
import { buildStudyMap, relatedStacked } from "../src/lib/study.js";

const mk = (over = {}) => ({ id: "x", title: "本", status: "stacked", ...over });

test("getTags: 新形式・旧形式・タグなしを吸収", () => {
  assert.deepEqual(getTags(mk({ tags: ["歴史", "政治・社会"] })), ["歴史", "政治・社会"]);
  assert.deepEqual(getTags(mk({ tag: "小説" })), ["小説"]);          // 旧データ
  assert.deepEqual(getTags(mk({ tags: [], tag: "歴史" })), ["歴史"]); // 空配列は旧へフォールバック
  assert.deepEqual(getTags(mk({})), [UNTAGGED]);
});

test("mainTag / hasTag", () => {
  const b = mk({ tags: ["経済・経営", "テクノロジー"] });
  assert.equal(mainTag(b), "経済・経営");
  assert.ok(hasTag(b, "テクノロジー"));
  assert.ok(!hasTag(b, "歴史"));
  assert.equal(mainTag(mk({ tag: "旧タグ" })), "旧タグ");
});

test("normalizeTags: trim・重複除去・上限5・空は未分類", () => {
  assert.deepEqual(normalizeTags([" 歴史 ", "歴史", "SF・ファンタジー"]), ["歴史", "SF・ファンタジー"]);
  assert.equal(normalizeTags(["a", "b", "c", "d", "e", "f"]).length, MAX_TAGS);
  assert.deepEqual(normalizeTags([]), [UNTAGGED]);
  assert.deepEqual(normalizeTags(["  "]), [UNTAGGED]);
  assert.deepEqual(normalizeTags("歴史"), ["歴史"]);  // 単数も受ける
  assert.equal(normalizeTags(["あ".repeat(30)])[0].length, 20); // 字数制限
});

test("tagColor: 同じ名前なら常に同じ色・別名なら別色になりやすい", () => {
  assert.equal(tagColor("歴史"), tagColor("歴史"));
  const colors = new Set(STARTER_TAGS.map(tagColor));
  assert.equal(colors.size, STARTER_TAGS.length, "大分類は1つも色が重ならない");
});

test("tagColor: 自作タグ・細分は従来どおり名前から決まる(既存の色が変わらない)", () => {
  assert.equal(tagColor("自作タグ"), "#4A6B4F");           // 従来のハッシュ結果
  assert.equal(tagColor("SF・ファンタジー"), "#7A3E2E");   // 従来のハッシュ結果
  assert.equal(tagColor("constructor").startsWith("#"), true); // 組み込みの名前でも壊れない
});

test("tagsInUse: 使用数の多い順、複数タグも数える", () => {
  const books = [
    mk({ id: "a", tags: ["歴史", "政治・社会"] }),
    mk({ id: "b", tags: ["歴史"] }),
    mk({ id: "c", tag: "歴史" }),        // 旧形式も数える
    mk({ id: "d", tags: ["テクノロジー"] }),
  ];
  assert.deepEqual(tagsInUse(books).slice(0, 2), [{ tag: "歴史", count: 3 }, { tag: "テクノロジー", count: 1 }]);
});

test("tagOptions: 使用中が先、初期セットの未使用分が後", () => {
  const opts = tagOptions([mk({ tags: ["自作タグ"] })]);
  assert.equal(opts[0], "自作タグ");
  assert.ok(opts.includes("歴史"));
  assert.equal(new Set(opts).size, opts.length, "重複しない");
});

test("関心の地図: 本は主タグの群れに1回だけ現れる(重複しない)", () => {
  const books = [
    mk({ id: "a", tags: ["経済・経営", "テクノロジー"] }),
    mk({ id: "b", tags: ["経済・経営"] }),
    mk({ id: "c", tag: "テクノロジー" }),
  ];
  const map = buildStudyMap(books);
  const eco = map.find((g) => g.tag === "経済・経営");
  const tech = map.find((g) => g.tag === "テクノロジー");
  assert.equal(eco.total, 2);   // a と b
  assert.equal(tech.total, 1);  // c のみ(a は主タグが経済・経営なので重複しない)
  const ids = map.flatMap((g) => [...g.subs.flatMap((s) => s.books), ...g.rest]).map((b) => b.id);
  assert.equal(ids.length, new Set(ids).size, "同じ本が2回現れている");
  assert.equal(ids.length, books.length, "全ての本がちょうど1回現れる");
});

test("想起: 複数タグのいずれかが一致すれば拾う", () => {
  const books = [
    mk({ id: "a", tags: ["歴史"] }),
    mk({ id: "b", tags: ["テクノロジー"] }),
    mk({ id: "c", tags: ["文学・小説"] }),
  ];
  const rel = relatedStacked(books, ["歴史", "テクノロジー"], null);
  assert.deepEqual(rel.map((b) => b.id), ["a", "b"]);
});

/* ---- 二層タクソノミー ---- */
import { FORMAT_TAGS, isMajor } from "../src/lib/tags.js";

test("タクソノミー: 大分類10+形式2、形式にも細分がある", () => {
  assert.equal(TAXONOMY.length, 10);
  assert.equal(FORMAT_TAXONOMY.length, 2);
  const subCount = TAXONOMY.reduce((s, c) => s + c.subs.length, 0)
    + FORMAT_TAXONOMY.reduce((s, c) => s + c.subs.length, 0);
  assert.ok(subCount >= 85 && subCount <= 100, `細分 ${subCount} 個`);
  assert.ok(subsOf("漫画").length > 0, "漫画に細分がない");
  assert.ok(subsOf("児童書・絵本").length > 0, "児童書・絵本に細分がない");
});

test("タクソノミー: 大分類の名前は一意(細分は分野をまたぐ同名を許す)", () => {
  const majors = STARTER_TAGS;
  assert.equal(new Set(majors).size, majors.length, "大分類が重複している");
  // 細分は分野内で一意であればよい(小説と漫画の「恋愛」など、親が違えば同名可)
  TAXONOMY.concat(FORMAT_TAXONOMY).forEach((c) => {
    assert.equal(new Set(c.subs).size, c.subs.length, `${c.tag} の細分が重複`);
  });
});

test("subsOf / parentOf の対応が双方向で一致する", () => {
  assert.ok(subsOf("小説").includes("SF・ファンタジー"));
  assert.equal(parentOf("SF・ファンタジー"), "小説");
  assert.equal(parentOf("金融・投資"), "経済・経営");
  assert.equal(parentOf("存在しないタグ"), null);
  TAXONOMY.concat(FORMAT_TAXONOMY).forEach((c) => c.subs.forEach((sub) => {
    assert.ok(subsOf(parentOf(sub)).includes(sub), `${sub} の親子関係が一致しない`);
  }));
});

test("isMajor: 大分類と形式例外のみ真", () => {
  assert.ok(isMajor("小説"));
  assert.ok(isMajor("漫画"));
  assert.ok(!isMajor("SF・ファンタジー"));
  assert.ok(!isMajor("自作タグ"));
});

test("軸の統一: 廃止した地域軸・価値軸のタグが残っていない", () => {
  const all = [...STARTER_TAGS, ...TAXONOMY.flatMap((c) => c.subs)];
  ["海外文学", "純文学", "新書", "文学・小説"].forEach((t) => {
    assert.ok(!all.includes(t), `${t} が残っている`);
  });
});


test("改訂で変わったタグの対応先が、すべて実在する", () => {
  const all = [
    ...STARTER_TAGS,
    ...TAXONOMY.flatMap((c) => c.subs),
    ...FORMAT_TAXONOMY.flatMap((c) => c.subs),
  ];
  Object.entries(RENAMED).forEach(([from, to]) => {
    assert.ok(all.includes(to), `${from} の統合先「${to}」が存在しない`);
    assert.ok(!all.includes(from), `旧名「${from}」が現行分類に残っている`);
  });
});

test("findRenamable: 蔵書にある旧タグだけを拾う", () => {
  const books = [
    { tags: ["テクノロジー", "半導体・ハードウェア"] },
    { tags: ["小説"] },          // 現行タグなので対象外
    { tag: "投資" },             // 旧形式かつ旧タグ
  ];
  const r = findRenamable(books).map((x) => `${x.from}→${x.to}`).sort();
  assert.deepEqual(r, ["テクノロジー→技術・工学", "半導体・ハードウェア→半導体・電子工学", "投資→金融・投資"].sort());
  assert.deepEqual(findRenamable([{ tags: ["歴史"] }]), []);
});
