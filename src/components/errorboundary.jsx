import { Component } from "react";
import { C, MINCHO, GOTHIC } from "./common.jsx";

/**
 * 描画中にエラーが起きた範囲だけを切り離す。
 * これがないと、ひとつの画面の不具合でアプリ全体が真っ白になり、
 * 利用者は何が起きたのか分からないまま操作できなくなる。
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("画面の描画に失敗しました", error, info);
  }

  componentDidUpdate(prevProps) {
    // 別の画面に切り替えたら復帰させる
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: "56px 28px", textAlign: "center", fontFamily: GOTHIC }}>
        <div style={{ fontFamily: MINCHO, fontSize: 16, color: C.indigo, letterSpacing: 2, lineHeight: 1.8 }}>
          この画面を表示できませんでした
        </div>
        <p style={{ fontSize: 12, color: C.sub, lineHeight: 2, marginTop: 12 }}>
          ほかのタブは通常どおり使えます。
          <br />
          読み込み直すと直ることがあります。
        </p>
        <button onClick={() => window.location.reload()}
          style={{
            marginTop: 18, padding: "10px 28px", borderRadius: 6,
            background: C.indigo, color: "#F5F3EC", border: "none",
            cursor: "pointer", fontFamily: MINCHO, fontSize: 14, letterSpacing: 2,
          }}>
          読み込み直す
        </button>
        <div style={{
          fontSize: 10, color: C.sub, opacity: 0.75, marginTop: 20,
          wordBreak: "break-all", maxWidth: 320, marginLeft: "auto", marginRight: "auto",
        }}>
          {String(this.state.error && this.state.error.message || this.state.error)}
        </div>
      </div>
    );
  }
}
