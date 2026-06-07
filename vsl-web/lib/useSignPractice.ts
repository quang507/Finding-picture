"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHandLandmarker, detectHands } from "./handLandmarker";
import {
  loadClassifier,
  predict,
  isReady,
  type Prediction,
} from "./classifier";
import { buildFrameFeatures, resampleSequence } from "./landmarks";
import { drawHands } from "./draw";

export type Phase = "loading" | "ready" | "countdown" | "recording" | "result";

const RECORD_MS = 2500; // thời gian quay mỗi lần ký hiệu

export function useSignPractice() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const framesRef = useRef<Float32Array[]>([]);
  const recordingRef = useRef(false);
  const rafRef = useRef(0);
  const handsCountRef = useRef(-1);

  const [phase, setPhase] = useState<Phase>("loading");
  const [count, setCount] = useState(3);
  const [handsVisible, setHandsVisible] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

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
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        const hl = await getHandLandmarker();
        // Model có thể chưa tồn tại (chưa train) -> KHÔNG được chặn UI
        try {
          await loadClassifier();
        } catch {
          /* chưa có model: vẫn chạy camera + khung xương */
        }
        if (cancelled) return;
        setModelReady(isReady());

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d") ?? null;

        const loop = () => {
          const v = videoRef.current;
          if (v && v.readyState >= 2) {
            if (canvas && canvas.width !== v.videoWidth && v.videoWidth) {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
            }
            const hands = detectHands(hl, v, performance.now());
            if (ctx && canvas) drawHands(ctx, hands, canvas.width, canvas.height);
            if (hands.length !== handsCountRef.current) {
              handsCountRef.current = hands.length;
              setHandsVisible(hands.length);
            }
            if (recordingRef.current && hands.length > 0) {
              framesRef.current.push(buildFrameFeatures(hands));
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        setPhase("ready");
      } catch (e: any) {
        setCameraError(
          e?.message ?? "Không truy cập được camera. Kiểm tra quyền camera."
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Đếm ngược -> quay -> dự đoán. Trả về Prediction, hoặc null nếu chưa có model / không thấy tay.
  const start = useCallback((): Promise<Prediction | null> => {
    return new Promise((resolve) => {
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
          setTimeout(async () => {
            recordingRef.current = false;
            const frames = framesRef.current;
            setPhase("result");
            if (!isReady() || frames.length === 0) {
              resolve(null);
              return;
            }
            const seq = resampleSequence(frames);
            resolve(await predict(seq));
          }, RECORD_MS);
        }
      }, 1000);
    });
  }, []);

  return {
    videoRef,
    canvasRef,
    phase,
    setPhase,
    count,
    handsVisible,
    modelReady,
    cameraError,
    start,
  };
}
