import { useEffect, useRef, useState } from "react";
import { C, MINCHO } from "./common.jsx";
import { isBookBarcode } from "../lib/biblio.js";

/**
 * カメラでEAN-13を読み取り、書籍ISBN(978/979)のみをonDetectで返す。
 * BarcodeDetectorが使えればそれを、なければZXingを動的import。
 */
export function Scanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopRef = useRef(false);
  const [status, setStatus] = useState("カメラを起動しています…");
  const [hint, setHint] = useState("");

  useEffect(() => {
    stopRef.current = false;
    let zxingControls = null;

    async function start() {
      // カメラ起動
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (e) {
        setStatus("カメラを使用できません");
        setHint(e.name === "NotAllowedError"
          ? "カメラの許可が必要です。ブラウザの設定から許可してください。"
          : "カメラにアクセスできませんでした。");
        return;
      }
      if (stopRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("本の裏のバーコードを枠に合わせてください");

      const handle = (raw) => {
        if (stopRef.current) return;
        if (isBookBarcode(raw)) {
          stopRef.current = true;
          onDetect(raw.replace(/[-\s]/g, ""));
        } else {
          // 書籍JAN下段(192〜)などは無視して読み取り継続
          setHint("書籍のバーコード(978/979)を探しています…");
        }
      };

      // 経路A: ネイティブ BarcodeDetector
      if ("BarcodeDetector" in window) {
        try {
          const formats = await window.BarcodeDetector.getSupportedFormats();
          if (formats.includes("ean_13")) {
            const detector = new window.BarcodeDetector({ formats: ["ean_13"] });
            const loop = async () => {
              if (stopRef.current) return;
              try {
                const codes = await detector.detect(video);
                if (codes.length) handle(codes[0].rawValue);
              } catch {}
              if (!stopRef.current) requestAnimationFrame(loop);
            };
            loop();
            return;
          }
        } catch {}
      }

      // 経路B: ZXingフォールバック(動的import)
      try {
        setStatus("読み取りエンジンを読み込んでいます…");
        const { BrowserMultiFormatReader } = await import(
          "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm"
        );
        if (stopRef.current) return;
        const reader = new BrowserMultiFormatReader();
        setStatus("本の裏のバーコードを枠に合わせてください");
        zxingControls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) handle(result.getText());
        });
      } catch (e) {
        setStatus("この端末では読み取りできません");
        setHint("手入力またはタイトル検索をご利用ください。");
      }
    }

    start();

    return () => {
      stopRef.current = true;
      if (zxingControls && zxingControls.stop) { try { zxingControls.stop(); } catch {} }
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <video ref={videoRef} playsInline muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        {/* 読み取り枠 */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: "78%", maxWidth: 320, height: 130, border: `2px solid ${C.gold}`, borderRadius: 8, boxShadow: "0 0 0 100vmax rgba(0,0,0,.45)" }} />
        </div>
      </div>
      <div style={{ padding: "16px 20px 28px", background: "#000", color: "#F5F3EC", textAlign: "center" }}>
        <div style={{ fontFamily: MINCHO, fontSize: 15, letterSpacing: 1 }}>{status}</div>
        {hint && <div style={{ fontSize: 12, color: "#C9B98A", marginTop: 6 }}>{hint}</div>}
        <button onClick={onClose}
          style={{ marginTop: 14, padding: "10px 32px", borderRadius: 6, background: "none", border: `1px solid ${C.gold}`, color: C.gold, fontSize: 14, cursor: "pointer" }}>
          閉じる
        </button>
      </div>
    </div>
  );
}
