"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSignPractice } from "@/lib/useSignPractice";
import { CONFIDENCE_THRESHOLD } from "@/lib/constants";
import { recordAttempt } from "@/lib/progress";
import type { Prediction } from "@/lib/classifier";

function PracticeInner() {
  const params = useSearchParams();
  const target = params.get("word") ?? "";

  const {
    videoRef,
    canvasRef,
    phase,
    count,
    handsVisible,
    modelReady,
    cameraError,
    start,
  } = useSignPractice();

  const [pred, setPred] = useState<Prediction | null>(null);
  const [done, setDone] = useState(false);
  const [hasSample, setHasSample] = useState(true);

  const onStart = async () => {
    setPred(null);
    setDone(false);
    const result = await start();
    setPred(result);
    if (result) {
      const ok =
        result.label === target && result.confidence >= CONFIDENCE_THRESHOLD;
      recordAttempt(target, ok);
      setDone(true);
    }
  };

  const correct =
    pred && pred.label === target && pred.confidence >= CONFIDENCE_THRESHOLD;
  const sampleUrl = `/samples/${encodeURIComponent(target)}.mp4`;

  return (
    <main className="container">
      <Link href="/" className="back">
        ← Danh sách từ
      </Link>

      <div className="practice-grid">
        {/* ----- CỘT TRÁI: CAMERA ----- */}
        <div>
          <div className="cam-stage">
            <span className={`chip ${handsVisible > 0 ? "chip--on" : "chip--off"}`}>
              {handsVisible > 0 ? `🖐️ Thấy ${handsVisible} tay` : "✋ Đưa tay vào khung"}
            </span>
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            {phase === "countdown" && (
              <div className="overlay">
                <span className="overlay-count">{count}</span>
              </div>
            )}
            {phase === "recording" && <span className="overlay-rec">● REC</span>}
          </div>

          {pred && (
            <div className={`result ${correct ? "result--ok" : "result--no"}`}>
              {correct ? (
                <div className="result-big">✅ Đúng rồi!</div>
              ) : (
                <>
                  <div className="result-big">❌ Chưa đúng</div>
                  <div className="result-sub">
                    AI đoán: <b>{pred.label}</b>
                  </div>
                </>
              )}
              <div className="confbar">
                <div
                  className="confbar-fill"
                  style={{ width: `${Math.round(pred.confidence * 100)}%` }}
                />
              </div>
              <div className="result-sub">
                Độ tin cậy: {(pred.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}

          {phase === "result" && !pred && modelReady && (
            <div className="result result--no">
              <div className="result-big">🤔 Không thấy tay</div>
              <div className="result-sub">
                Đưa tay vào khung hình rồi thử lại nhé.
              </div>
            </div>
          )}
        </div>

        {/* ----- CỘT PHẢI: HƯỚNG DẪN & ĐIỀU KHIỂN ----- */}
        <div>
          <div className="panel-target">
            <div className="label-kicker">Ký hiệu cần thực hiện</div>
            <div className="label-word">{target || "—"}</div>
          </div>

          {cameraError && (
            <div className="banner" style={{ background: "var(--red)" }}>
              ⚠️ {cameraError}
            </div>
          )}

          {!modelReady && !cameraError && (
            <div className="banner">
              ⚙️ Chế độ xem trước: chưa có model AI nên chưa chấm điểm được.
              Khung xương tay vẫn hoạt động! Chạy pipeline <code>training/</code>{" "}
              để bật chấm điểm.
            </div>
          )}

          <button
            className="btn btn--green btn--lg btn--block"
            onClick={onStart}
            disabled={
              phase === "loading" ||
              phase === "countdown" ||
              phase === "recording" ||
              !!cameraError
            }
          >
            {phase === "loading"
              ? "⏳ Đang tải camera…"
              : phase === "countdown"
                ? `⏱️ ${count}`
                : phase === "recording"
                  ? "● Đang quay…"
                  : done
                    ? "🔁 Thử lại"
                    : "🎬 Bắt đầu"}
          </button>

          {hasSample && (
            <video
              className="sample-video"
              src={sampleUrl}
              controls
              loop
              muted
              onError={() => setHasSample(false)}
            />
          )}

          <ul className="tips">
            <li>💡 Đứng cách camera ~1m, đủ sáng.</li>
            <li>🖐️ Giữ tay trong khung, làm ký hiệu rõ ràng.</li>
            <li>⏱️ Sau khi bấm Bắt đầu, đếm 3-2-1 rồi ký trong ~2.5s.</li>
            <li>🟦 Tay trái xanh dương · 🟩 tay phải xanh lá.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<main className="container">Đang tải…</main>}>
      <PracticeInner />
    </Suspense>
  );
}
