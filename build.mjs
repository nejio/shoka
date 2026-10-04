import * as esbuild from "esbuild";

import { existsSync } from "fs";
if (!existsSync("src/config.js")) {
  console.error("\n[エラー] src/config.js がありません。");
  console.error("作業フォルダの src/config.js を消してしまった場合は、Claudeに再発行を依頼してください。\n");
  process.exit(1);
}



const watch = process.argv.includes("--watch");

const options = {
  entryPoints: ["src/app.jsx"],
  bundle: true,
  outfile: "bundle.js",
  format: "iife",
  charset: "utf8",  // 日本語を \uXXXX に潰さない(出力が読め、検索も効く)
  jsx: "automatic",
  minify: !watch,
  sourcemap: watch ? "inline" : false,
  define: { "process.env.NODE_ENV": watch ? '"development"' : '"production"' },
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("watching src/ ... (Ctrl+C で終了)");
} else {
  await esbuild.build(options);
  console.log("bundle.js を出力しました。index.html の ?v= を更新してからデプロイしてください。");
}
