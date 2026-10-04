import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

/**
 * import している名前が、その先で実際に export されているかを検証する。
 * 未定義の import は実行時に画面が真っ白になるため、テストで潰す。
 */
test("import している名前が、すべて export されている", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [
    ...fs.readdirSync(path.join(root, "src/components")).map((f) => "src/components/" + f),
    ...fs.readdirSync(path.join(root, "src/lib")).map((f) => "src/lib/" + f),
    "src/app.jsx",
  ].filter((f) => f.endsWith(".js") || f.endsWith(".jsx"));

  const exportsOf = {};
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    const names = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s+class\s+(\w+)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s+const\s+(\w+)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s+\{([^}]+)\}/g))
      m[1].split(",").forEach((x) => names.add(x.trim().split(" as ").pop().trim()));
    exportsOf[path.resolve(root, f)] = names;
  }

  const problems = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    for (const m of src.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'](\.[^"']+)["']/g)) {
      const target = path.resolve(path.dirname(path.join(root, f)), m[2]);
      const names = exportsOf[target];
      if (!names) continue;
      m[1].split(",").map((x) => x.trim().split(" as ")[0].trim()).filter(Boolean)
        .forEach((name) => {
          if (!names.has(name)) problems.push(`${f}: 「${name}」が ${m[2]} に無い`);
        });
    }
  }
  assert.deepEqual(problems, [], "未定義のimportがある");
});
