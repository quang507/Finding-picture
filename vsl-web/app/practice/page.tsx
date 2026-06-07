"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getHandLandmarker, detectHands } from "@/lib/handLandmarker";
import {
  loadClassifier,
  predict,
  isReady,
  type Prediction,
} from "@/lib/classifier";
import { buildFrameFeatures, resampleSequence } from "@/lib/landmarks";
import { CONFIDENCE_THRESHOLD } from "@/lib/constants";

type Phase = "loading" | "ready" | "countdown" | "recording" | "result";

const RECORD_MS = 2500; // thời gian quay mỗi lần luyện

function PracticeInner() {
  const params = useSearchParams();
  const target = params.get("word") ?? "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const framesRef = useRef<Float32Array[]>([]);
  const recordingRef = useRef(false);
  const rafRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>("loading");
  const [count, setCount] = useState(3);
  const [pred, setPred] = useState<Prediction | null>(null);
  const [error, setError] = useState<string>("");

  // Khởi tạo camera + model
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const hl = await getHandLandmarker();
        await loadClassifier();
        if (cancelled) return;

        // vòng lặp detect liên tục; chỉ lưu frame khi đang recording
        const loop = () => {
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            const hands = detectHands(hl, video, performance.now());
            if (recordingRef.current && hands.length > 0) {
              framesRef.current.push(buildFrameFeatures(hands));
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        setPhase("ready");
      } catch (e: any) {
        setError(
          e?.message ??
            "Không truy cập được camera hoặc model. Kiểm tra quyền camera."
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const runRecognition = useCallback(async () => {
    recordingRef.current = false;
    const frames = framesRef.current;
    if (frames.length === 0) {
      setPred({ label: "(không thấy tay)", confidence: 0 });
      setPhase("result");
      return;
    }
    const seq = resampleSequence(frames);
    const result = await predict(seq);
    setPred(result);
    setPhase("result");
  }, []);

  const start = useCallback(() => {
    if (!isReady()) {
      setError("Model chưa sẵn sàng. Chạy pipeline training để tạo model.");
      return;
    }
    setPred(null);
    framesRef.current = [];
    setCount(3);
    setPhase("countdown");

    let c = 3;
    const tick = setInterval(() => {
      c -= 1;
      if (c > 0) {
        setCount(c);
      } else {
        clearInterval(tick);
        setPhase("recording");
        recordingRef.current = true;
        setTimeout(runRecognition, RECORD_MS);
      }
    }, 1000);
  }, [runRecognition]);

  const correct =
    pred &&
    pred.label === target &&
    pred.confidence >= CONFIDENCE_THRESHOLD;

  return (
    <main className="container">
      <p className="center">
        <Link href="/" className="muted">
          ← Danh sách từ
        </Link>
      </p>
      <h1 className="title">{target || "Luyện ký hiệu"}</h1>
      <p className="subtitle">
        Hãy thực hiện ký hiệu cho từ <b>{target}</b> trước camera.
      </p>

      <div className="video-wrap">
        <video ref={videoRef} playsInline muted />
        {phase === "countdown" && <div className="overlay">{count}</div>}
        {phase === "recording" && <div className="overlay">● REC</div>}
      </div>

      <div className="center" style={{ marginTop: 18 }}>
        {phase === "loading" && <p className="muted">Đang tải camera & AI…</p>}
        {error && <p style={{ color: "var(--red)" }}>{error}</p>}

        {(phase === "ready" || phase === "result") && !error && (
          <button className="btn" onClick={start}>
            {phase === "result" ? "Thử lại" : "Bắt đầu"}
          </button>
        )}
      </div>

      {phase === "result" && pred && (
        <div className={`result ${correct ? "ok" : "no"}`}>
          {correct ? (
            <>✅ Đúng rồi! ({(pred.confidence * 100).toFixed(0)}%)</>
          ) : (
            <>
              ❌ Chưa đúng — AI đoán: <b>{pred.label}</b> (
              {(pred.confidence * 100).toFixed(0)}%)
            </>
          )}
        </div>
      )}
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
