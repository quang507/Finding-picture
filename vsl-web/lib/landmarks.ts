// Chuẩn hoá landmark — PHẢI khớp y hệt training/landmark_utils.py
import {
  FEATURES_PER_HAND,
  FEATURES_PER_FRAME,
  WRIST,
  MIDDLE_MCP,
  SEQ_LEN,
  NUM_LANDMARKS,
} from "./constants";

export interface Pt {
  x: number;
  y: number;
  z: number;
}

export interface HandResult {
  label: "Left" | "Right";
  points: Pt[]; // 21 điểm
}

// (21 điểm) -> Float32Array(63) đã chuẩn hoá
function normalizeHand(points: Pt[]): Float32Array {
  const out = new Float32Array(FEATURES_PER_HAND);
  const wrist = points[WRIST];

  // dịch về gốc + tính thước đo tỉ lệ (cổ tay -> khớp ngón giữa)
  const mid = points[MIDDLE_MCP];
  const dx = mid.x - wrist.x;
  const dy = mid.y - wrist.y;
  const dz = mid.z - wrist.z;
  let scale = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (scale < 1e-6) scale = 1.0;

  for (let i = 0; i < NUM_LANDMARKS; i++) {
    const p = points[i];
    out[i * 3 + 0] = (p.x - wrist.x) / scale;
    out[i * 3 + 1] = (p.y - wrist.y) / scale;
    out[i * 3 + 2] = (p.z - wrist.z) / scale;
  }
  return out;
}

// 1 frame -> Float32Array(126) = [Left(63), Right(63)]
export function buildFrameFeatures(hands: HandResult[]): Float32Array {
  const frame = new Float32Array(FEATURES_PER_FRAME); // mặc định toàn 0
  const slot: Record<string, number> = { Left: 0, Right: 1 };
  for (const h of hands) {
    const idx = slot[h.label];
    if (idx === undefined) continue;
    const feat = normalizeHand(h.points);
    frame.set(feat, idx * FEATURES_PER_HAND);
  }
  return frame;
}

// (T frame) -> đúng SEQ_LEN frame bằng lấy mẫu tuyến tính
export function resampleSequence(frames: Float32Array[]): Float32Array {
  const T = frames.length;
  const out = new Float32Array(SEQ_LEN * FEATURES_PER_FRAME);
  if (T === 0) return out;
  for (let i = 0; i < SEQ_LEN; i++) {
    const srcIdx = T === 1 ? 0 : Math.round((i * (T - 1)) / (SEQ_LEN - 1));
    out.set(frames[srcIdx], i * FEATURES_PER_FRAME);
  }
  return out;
}
