/**
 * アイコンはすべて手描きのSVG。
 * - 線幅を1.3前後に揃え、明朝体の細い線と調和させる
 * - stroke に currentColor を使うので、テーマ色にそのまま追従する
 * - 画像ファイルも外部ライブラリも使わないため、容量はゼロ
 */

const base = (size) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: "false",
});

/**
 * 歯車(設定)
 * 歯の形は8歯・歯先半径9.4・歯底6.9で数値計算した外形。
 * 中心から線を放射させるだけでは太陽に見えてしまうため、歯の輪郭を描いている。
 */
export function IconGear({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M10.53 2.72 L13.47 2.72 L13.84 5.35 L15.4 5.99 L17.53 4.4 L19.6 6.47 L18.01 8.6 L18.65 10.16 L21.28 10.53 L21.28 13.47 L18.65 13.84 L18.01 15.4 L19.6 17.53 L17.53 19.6 L15.4 18.01 L13.84 18.65 L13.47 21.28 L10.53 21.28 L10.16 18.65 L8.6 18.01 L6.47 19.6 L4.4 17.53 L5.99 15.4 L5.35 13.84 L2.72 13.47 L2.72 10.53 L5.35 10.16 L5.99 8.6 L4.4 6.47 L6.47 4.4 L8.6 5.99 L10.16 5.35 Z" />
      <circle cx="12" cy="12" r="3.4" />
    </svg>
  );
}

/** バーコード */
export function IconBarcode({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M3 6.5V5.2A1.2 1.2 0 0 1 4.2 4h1.6M18.2 4h1.6A1.2 1.2 0 0 1 21 5.2v1.3M21 17.5v1.3a1.2 1.2 0 0 1-1.2 1.2h-1.6M5.8 20H4.2A1.2 1.2 0 0 1 3 18.8v-1.3" />
      <path d="M7 8.4v7.2M10 8.4v7.2M13 8.4v7.2M16.4 8.4v7.2" />
    </svg>
  );
}

/** 山形(開閉) dir: "down" | "up" | "right" */
export function IconChevron({ size = 14, dir = "down" }) {
  const d = {
    down: "M6 9.5l6 5.5 6-5.5",
    up: "M6 14.5l6-5.5 6 5.5",
    right: "M9.5 6l5.5 6-5.5 6",
  }[dir];
  return <svg {...base(size)}><path d={d} /></svg>;
}

/** 加算 */
export function IconPlus({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

/** 筆(記録) */
export function IconBrush({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M15.6 4.4l4 4-8.6 8.6a3 3 0 0 1-1.5.8l-4.2.9.9-4.2a3 3 0 0 1 .8-1.5z" />
      <path d="M14.2 5.8l4 4" />
    </svg>
  );
}

/** 本 */
export function IconBook({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M5 4.2h9.6a2.2 2.2 0 0 1 2.2 2.2v13.4H7.2A2.2 2.2 0 0 1 5 17.6z" />
      <path d="M5 17.6a2.2 2.2 0 0 1 2.2-2.2h9.6" />
    </svg>
  );
}

/** 書き出し(下向き矢印) */
export function IconDownload({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <path d="M12 4v11M7.6 10.6L12 15l4.4-4.4" />
      <path d="M4.8 19.4h14.4" />
    </svg>
  );
}

/** 閉じる */
export function IconClose({ size = 20 }) {
  return (
    <svg {...base(size)}>
      <path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" />
    </svg>
  );
}

/** 検索 */
export function IconSearch({ size = 18 }) {
  return (
    <svg {...base(size)}>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="M15.4 15.4L20 20" />
    </svg>
  );
}
