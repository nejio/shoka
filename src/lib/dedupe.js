// アクティブな本(積読・読書中)の重複判定(純粋関数)

const normTitle = (s) => (s || "").trim();
const normIsbn = (s) => String(s || "").replace(/[-\s]/g, "") || null;

/**
 * 積読・読書中・見送りの中から、同一とみなせる本を探す。
 * (読了は対象外=再読を許容)
 * 判定: 双方にISBNがあればISBN一致、なければ書名の完全一致(前後空白無視)。
 * @returns 見つかった本 or null
 */
export function findActiveDuplicate(books, input) {
  const title = normTitle(input.title);
  const isbn = normIsbn(input.isbn);
  if (!title && !isbn) return null;
  return (
    books.find((b) => {
      if (b.status !== "stacked" && b.status !== "reading" && b.status !== "setaside") return false;
      const bIsbn = normIsbn(b.isbn);
      if (isbn && bIsbn) return isbn === bIsbn;
      return normTitle(b.title) === title && title !== "";
    }) || null
  );
}
