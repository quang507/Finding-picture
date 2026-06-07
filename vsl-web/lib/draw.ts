// Vẽ khung xương bàn tay lên canvas (overlay realtime)
import type { HandResult } from "./landmarks";

// Các cặp điểm nối thành xương bàn tay (chuẩn MediaPipe Hands)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // ngón cái
  [0, 5], [5, 6], [6, 7], [7, 8], // ngón trỏ
  [5, 9], [9, 10], [10, 11], [11, 12], // ngón giữa
  [9, 13], [13, 14], [14, 15], [15, 16], // ngón áp út
  [13, 17], [17, 18], [18, 19], [19, 20], // ngón út
  [0, 17], // mép lòng bàn tay
];

const COLORS: Record<string, string> = {
  Left: "#1e90ff",
  Right: "#22c55e",
};

export function drawHands(
  ctx: CanvasRenderingContext2D,
  hands: HandResult[],
  w: number,
  h: number
) {
  ctx.clearRect(0, 0, w, h);
  for (const hand of hands) {
    const color = COLORS[hand.label] ?? "#ffffff";
    const pts = hand.points;

    // xương
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x * w, pts[a].y * h);
      ctx.lineTo(pts[b].x * w, pts[b].y * h);
      ctx.stroke();
    }

    // khớp
    ctx.fillStyle = "#ffffff";
    for (const p of pts) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
