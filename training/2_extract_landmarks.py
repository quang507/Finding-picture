"""
Bước 2: Trích landmark tay từ mọi video bằng MediaPipe.

Chạy:  python 2_extract_landmarks.py

Mỗi video -> 1 file .npy shape (SEQ_LEN, FEATURES_PER_FRAME).
Kết quả gộp lại lưu ở data/landmarks/X.npy, y.npy, labels.json
"""
import os
import json
import glob
import numpy as np
import cv2
import mediapipe as mp
from tqdm import tqdm

from config import (
    DATASET_DIR, LANDMARKS_DIR, SEQ_LEN,
    NUM_HANDS, NUM_LANDMARKS,
)
from landmark_utils import build_frame_features, resample_sequence

mp_hands = mp.solutions.hands

VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv", ".webm")


def list_videos(root: str):
    """Trả về [(đường_dẫn_video, nhãn)] — nhãn = tên thư mục cha."""
    items = []
    for path in glob.glob(os.path.join(root, "**", "*"), recursive=True):
        if path.lower().endswith(VIDEO_EXTS):
            label = os.path.basename(os.path.dirname(path))
            items.append((path, label))
    return items


def extract_from_video(path: str, hands) -> np.ndarray:
    """Trả về (T, FEATURES_PER_FRAME) — mỗi frame có tay được trích."""
    cap = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = hands.process(rgb)
        hand_list = []
        if res.multi_hand_landmarks and res.multi_handedness:
            for lm, handed in zip(res.multi_hand_landmarks, res.multi_handedness):
                label = handed.classification[0].label  # "Left"/"Right"
                pts = np.array([[p.x, p.y, p.z] for p in lm.landmark],
                               dtype=np.float32)
                hand_list.append({"label": label, "points": pts})
        # bỏ qua frame không thấy tay nào
        if hand_list:
            frames.append(build_frame_features(hand_list))
    cap.release()
    if not frames:
        return np.empty((0,))
    return np.array(frames, dtype=np.float32)


def main():
    os.makedirs(LANDMARKS_DIR, exist_ok=True)
    videos = list_videos(DATASET_DIR)
    if not videos:
        raise SystemExit(f"Không tìm thấy video nào trong {DATASET_DIR}. "
                         f"Chạy bước 1 trước, kiểm tra cấu trúc thư mục.")

    labels_sorted = sorted({lbl for _, lbl in videos})
    label_to_idx = {lbl: i for i, lbl in enumerate(labels_sorted)}
    print(f"{len(videos)} video, {len(labels_sorted)} nhãn.")

    X, y = [], []
    with mp_hands.Hands(static_image_mode=False,
                        max_num_hands=NUM_HANDS,
                        min_detection_confidence=0.5,
                        min_tracking_confidence=0.5) as hands:
        for path, label in tqdm(videos, desc="Trích landmark"):
            seq = extract_from_video(path, hands)
            if seq.shape[0] == 0:
                continue  # video không phát hiện được tay
            seq = resample_sequence(seq, SEQ_LEN)
            X.append(seq)
            y.append(label_to_idx[label])

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    np.save(os.path.join(LANDMARKS_DIR, "X.npy"), X)
    np.save(os.path.join(LANDMARKS_DIR, "y.npy"), y)
    with open(os.path.join(LANDMARKS_DIR, "labels.json"), "w",
              encoding="utf-8") as f:
        json.dump(labels_sorted, f, ensure_ascii=False, indent=2)

    print(f"Xong. X={X.shape}, y={y.shape}")
    print(f"Lưu tại {LANDMARKS_DIR}/")


if __name__ == "__main__":
    main()
