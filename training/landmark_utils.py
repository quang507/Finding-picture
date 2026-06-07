"""
Hàm chuẩn hoá landmark dùng chung cho train (Python) và inference (browser).

Logic chuẩn hoá PHẢI giống hệt bản TypeScript trong vsl-web/lib/landmarks.ts:
  1) Dịch toàn bộ điểm sao cho cổ tay (WRIST) về gốc (0,0,0).
  2) Chia tỉ lệ theo khoảng cách cổ tay -> khớp ngón giữa (MIDDLE_MCP),
     để bất biến với khoảng cách tay tới camera.
  3) Ghép 2 tay theo thứ tự cố định: [Left, Right]. Tay thiếu -> toàn 0.
"""
import numpy as np
from config import (
    NUM_HANDS, NUM_LANDMARKS, COORDS,
    FEATURES_PER_HAND, FEATURES_PER_FRAME,
    WRIST, MIDDLE_MCP,
)


def normalize_hand(points: np.ndarray) -> np.ndarray:
    """points: (21, 3) toạ độ thô -> (63,) đã chuẩn hoá & duỗi phẳng."""
    pts = points.astype(np.float32).copy()
    wrist = pts[WRIST].copy()
    pts -= wrist  # dịch về gốc

    # thước đo tỉ lệ = khoảng cách cổ tay -> khớp ngón giữa
    scale = np.linalg.norm(pts[MIDDLE_MCP])
    if scale < 1e-6:
        scale = 1.0
    pts /= scale
    return pts.reshape(-1)  # (63,)


def build_frame_features(hands: list) -> np.ndarray:
    """
    hands: danh sách dict {"label": "Left"/"Right", "points": (21,3)}
    Trả về vector (FEATURES_PER_FRAME,) = [Left(63), Right(63)].
    """
    frame = np.zeros(FEATURES_PER_FRAME, dtype=np.float32)
    slot = {"Left": 0, "Right": 1}
    for h in hands:
        idx = slot.get(h["label"])
        if idx is None:
            continue
        start = idx * FEATURES_PER_HAND
        frame[start:start + FEATURES_PER_HAND] = normalize_hand(h["points"])
    return frame


def resample_sequence(frames: np.ndarray, seq_len: int) -> np.ndarray:
    """
    Chuẩn hoá số frame về đúng seq_len bằng lấy mẫu tuyến tính.
    frames: (T, FEATURES_PER_FRAME) -> (seq_len, FEATURES_PER_FRAME)
    """
    T = frames.shape[0]
    if T == 0:
        return np.zeros((seq_len, FEATURES_PER_FRAME), dtype=np.float32)
    if T == seq_len:
        return frames
    idx = np.linspace(0, T - 1, seq_len).round().astype(int)
    return frames[idx]
