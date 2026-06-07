"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LABELS_URL, CONFIDENCE_THRESHOLD } from "@/lib/constants";
import { useSignPractice } from "@/lib/useSignPractice";
import { recordAttempt } from "@/lib/progress";
import type { Prediction } from "@/lib/classifier";

const QUIZ_LEN = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const [deck, setDeck] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [graded, setGraded] = useState(false);

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

  useEffect(() => {
    fetch(LABELS_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((labels: string[]) =>
        setDeck(shuffle(labels).slice(0, QUIZ_LEN))
      )
      .catch(() => setDeck([]));
  }, []);

  const target = deck[idx] ?? "";
  const finished = deck.length > 0 && idx >= deck.length;
  const score = results.filter(Boolean).length;

  const onStart = async () => {
    setPred(null);
    setGraded(false);
    const result = await start();
    setPred(result);
    const ok = !!(
      result &&
      result.label === target &&
      result.confidence >= CONFIDENCE_THRESHOLD
    );
    if (result) recordAttempt(target, ok);
    setResults((r) => [...r, ok]);
    setGraded(true);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setPred(null);
    setGraded(false);
  };

  const restart = () => {
    setDeck((d) => shuffle(d));
    setIdx(0);
    setResults([]);
    setPred(null);
    setGraded(false);
  };

  const correct =
    pred && pred.label === target && pred.confidence >= CONFIDENCE_THRESHOLD;

  return (
    <main className="container">
      <Link href="/" className="back">
        ← Trang chủ
      </Link>

      {finished ? (
        <div className="card center">
          <h1 className="h-title">🏁 Hoàn thành!</h1>
          <div className="stat-num" style={{ fontSize: 64 }}>
            {score}/{deck.length}
          </div>
          <p className="h-sub">
            {score === deck.length
              ? "Tuyệt đối! 🎉"
              : score >= deck.length / 2
                ? "Khá lắm, luyện thêm chút nữa!"
                : "Cố lên, làm lại nào!"}
          </p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn btn--green" onClick={restart}>
              🔁 Chơi lại
            </button>
            <Link href="/" className="btn btn--blue">
              🏠 Trang chủ
            </Link>
          </div>
        </div>
      ) : (
        <div className="practice-grid">
          {/* CAMERA */}
          <div>
            <div className="cam-stage">
              <span
                className={`chip ${handsVisible > 0 ? "chip--on" : "chip--off"}`}
              >
                {handsVisible > 0
                  ? `🖐️ Thấy ${handsVisible} tay`
                  : "✋ Đưa tay vào khung"}
              </span>
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
              {phase === "countdown" && (
                <div className="overlay">
                  <span className="overlay-count">{count}</span>
                </div>
              )}
              {phase === "recording" && (
                <span className="overlay-rec">● REC</span>
              )}
            </div>

            {pred && (
              <div
                className={`result ${correct ? "result--ok" : "result--no"}`}
              >
                <div className="result-big">
                  {correct ? "✅ Đúng!" : "❌ Sai"}
                </div>
                {!correct && (
                  <div className="result-sub">
                    AI đoán: <b>{pred.label}</b>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ĐIỀU KHIỂN */}
          <div>
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="muted">
                Câu {idx + 1}/{deck.length}
              </span>
              <span className="spacer" />
              <span className="muted">✅ {score} đúng</span>
            </div>

            <div className="qdots" style={{ marginBottom: 16 }}>
              {deck.map((_, i) => (
                <span
                  key={i}
                  className={`qdot ${
                    i === idx && !graded
                      ? "qdot--now"
                      : results[i] === true
                        ? "qdot--ok"
                        : results[i] === false
                          ? "qdot--no"
                          : ""
                  }`}
                />
              ))}
            </div>

            <div className="panel-target">
              <div className="label-kicker">Hãy ký hiệu từ</div>
              <div className="label-word">{target || "…"}</div>
            </div>

            {cameraError && (
              <div className="banner" style={{ background: "var(--red)" }}>
                ⚠️ {cameraError}
              </div>
            )}
            {!modelReady && !cameraError && (
              <div className="banner">
                ⚙️ Chưa có model AI — quiz sẽ tính sai cho tới khi train model.
              </div>
            )}

            {!graded ? (
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
                {phase === "countdown"
                  ? `⏱️ ${count}`
                  : phase === "recording"
                    ? "● Đang quay…"
                    : "🎬 Ký hiệu"}
              </button>
            ) : (
              <button className="btn btn--pink btn--lg btn--block" onClick={next}>
                {idx + 1 >= deck.length ? "🏁 Xem kết quả" : "➡️ Câu tiếp theo"}
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
