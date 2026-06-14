"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSignPractice } from "@/lib/useSignPractice";
import { CONFIDENCE_THRESHOLD } from "@/lib/constants";
import { recordAttempt, loadProgress, countLearned } from "@/lib/progress";
import { findLesson } from "@/lib/lessons";
import { useLabels } from "@/lib/useLabels";
import { practiceUrl, lessonUrl } from "@/lib/nav";
import { feedbackCorrect, feedbackWrong } from "@/lib/feedback";
import { BADGES, earnedBadgeIds } from "@/lib/badges";
import type { Prediction } from "@/lib/classifier";

function PracticeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const target = params.get("word") ?? "";
  const lessonId = params.get("lesson") ?? "";

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
  const [step, setStep] = useState<"demo" | "practice">("demo");
  const [newBadge, setNewBadge] = useState<string | null>(null);

  // Tự ẩn toast huy hiệu sau 5s
  useEffect(() => {
    if (!newBadge) return;
    const t = setTimeout(() => setNewBadge(null), 5000);
    return () => clearTimeout(t);
  }, [newBadge]);

  // Ngữ cảnh bài học: tìm từ kế tiếp để học liền mạch
  const { labels } = useLabels();
  const lesson = useMemo(
    () => (lessonId ? findLesson(labels, lessonId) : undefined),
    [labels, lessonId]
  );
  const idx = lesson ? lesson.words.indexOf(target) : -1;
  const nextWord =
    lesson && idx >= 0 && idx + 1 < lesson.words.length
      ? lesson.words[idx + 1]
      : null;

  const onStart = async () => {
    setPred(null);
    setDone(false);
    const result = await start();
    setPred(result);
    if (result) {
      const ok =
        result.label === target && result.confidence >= CONFIDENCE_THRESHOLD;
      const before = loadProgress();
      const badgesBefore = earnedBadgeIds(before, countLearned(before, labels));
      const after = recordAttempt(target, ok);
      if (ok) feedbackCorrect(after.soundOn);
      else feedbackWrong(after.soundOn);
      // Mở khóa huy hiệu mới?
      const badgesAfter = earnedBadgeIds(after, countLearned(after, labels));
      const fresh = [...badgesAfter].find((id) => !badgesBefore.has(id));
      if (fresh) setNewBadge(fresh);
      setDone(true);
    }
  };

  // Cùng route nên Next không remount component -> phải tự reset state
  const goTo = (word: string) => {
    setPred(null);
    setDone(false);
    setStep("demo");
    setHasSample(true);
    setNewBadge(null);
    router.push(practiceUrl(word, lessonId || undefined));
  };

  const correct =
    pred && pred.label === target && pred.confidence >= CONFIDENCE_THRESHOLD;
  const sampleUrl = `/samples/${encodeURIComponent(target)}.mp4`;

  const badge = BADGES.find((b) => b.id === newBadge);

  return (
    <main className="container">
      {badge && (
        <div className="badge-toast" onClick={() => setNewBadge(null)}>
          <span className="badge-toast-emoji">{badge.emoji}</span>
          <div>
            <div className="badge-toast-title">Huy hiệu mới!</div>
            <div className="badge-toast-sub">
              {badge.emoji} {badge.title} — {badge.desc}
            </div>
          </div>
        </div>
      )}

      <Link href={lesson ? lessonUrl(lesson.id) : "/"} className="back">
        ← {lesson ? lesson.title : "Danh sách từ"}
      </Link>

      {/* Stepper */}
      <div className="stepper">
        <span className={`step ${step === "demo" ? "step--on" : "step--ok"}`}>
          1 · Xem mẫu
        </span>
        <span className="step-line" />
        <span className={`step ${step === "practice" ? "step--on" : ""}`}>
          2 · Tập & chấm điểm
        </span>
      </div>

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
            {step === "demo" && (
              <div className="cam-veil">
                <span>👀 Xem mẫu bên phải trước nhé</span>
              </div>
            )}
          </div>

          {pred && (
            <div className={`result ${correct ? "result--ok" : "result--no"}`}>
              {correct ? (
                <>
                  <div className="result-big">✅ Đúng rồi! +10 điểm 🎉</div>
                  <div className="confetti">🎉✨🎊</div>
                </>
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
            <div className="label-kicker">
              {lesson
                ? `${lesson.emoji} ${lesson.title} · ${idx >= 0 ? idx + 1 : ""}/${lesson.words.length}`
                : "Ký hiệu cần thực hiện"}
            </div>
            <div className="label-word">{target || "—"}</div>
          </div>

          {cameraError && (
            <div className="banner" style={{ background: "var(--red)" }}>
              ⚠️ {cameraError}
            </div>
          )}

          {!modelReady && !cameraError && (
            <div className="banner">
              ⚙️ Chưa có model AI nên chưa chấm điểm được. Khung xương tay vẫn
              hoạt động!
            </div>
          )}

          {/* BƯỚC 1: XEM MẪU */}
          {step === "demo" ? (
            <>
              {hasSample ? (
                <video
                  className="sample-video"
                  src={sampleUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  onError={() => setHasSample(false)}
                />
              ) : (
                <div className="demo-placeholder">
                  <div style={{ fontSize: 40 }}>🎥</div>
                  <div>Chưa có video mẫu cho từ này.</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Xem hướng dẫn bên dưới rồi tự ký thử nhé.
                  </div>
                </div>
              )}

              <ul className="tips">
                <li>💡 Đứng cách camera ~1m, đủ sáng.</li>
                <li>🖐️ Giữ tay trong khung, làm ký hiệu rõ ràng.</li>
                <li>⏱️ Bấm “Tập thôi”, đếm 3-2-1 rồi ký trong ~2.5s.</li>
                <li>🟦 Tay trái xanh dương · 🟩 tay phải xanh lá.</li>
              </ul>

              <button
                className="btn btn--blue btn--lg btn--block"
                onClick={() => setStep("practice")}
                style={{ marginTop: 14 }}
              >
                🎬 Tập thôi →
              </button>
            </>
          ) : (
            /* BƯỚC 2: TẬP & CHẤM ĐIỂM */
            <>
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
                        : "🎬 Bắt đầu ký"}
              </button>

              <button
                className="btn btn--block"
                onClick={() => setStep("demo")}
                style={{ marginTop: 10 }}
              >
                👀 Xem lại mẫu
              </button>

              {/* Điều hướng bài học khi đã ký đúng */}
              {correct && lesson && (
                <div className="next-box">
                  {nextWord ? (
                    <button
                      className="btn btn--yellow btn--lg btn--block"
                      onClick={() => goTo(nextWord)}
                    >
                      ⏭️ Từ tiếp theo: {nextWord}
                    </button>
                  ) : (
                    <Link
                      href={lessonUrl(lesson.id)}
                      className="btn btn--yellow btn--lg btn--block"
                    >
                      🏁 Xong bài “{lesson.title}”!
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
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
