"""
Bước 5 (tùy chọn): Tạo video MẪU cho web từ dataset gốc trên Hugging Face.

Mỗi từ trong labels.json sẽ lấy 1 video ngắn, nén nhỏ lại, đặt tên đúng
chuẩn mà web đang chờ:  vsl-web/public/samples/<Tên từ>.mp4
(web mở bằng /samples/<encodeURIComponent(từ)>.mp4 -> file để tên gốc có dấu)

Chạy:
    pip install -r requirements.txt        # đã có huggingface_hub
    pip install imageio-ffmpeg             # để có ffmpeg nén video
    python 5_make_samples.py

Cần mạng vào được huggingface.co. Dataset: xem DATASET_REPO trong config.py
"""
import json
import os
import subprocess
import unicodedata
from collections import defaultdict

from huggingface_hub import HfApi, hf_hub_download
from config import DATASET_REPO

SAMPLES_DIR = "../vsl-web/public/samples"
LABELS_JSON = "../vsl-web/public/labels.json"
VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv", ".webm")

# Nén: rộng tối đa 360px, ~3 giây đầu, bỏ tiếng, h264 -> mỗi clip vài trăm KB
MAX_WIDTH = 360
MAX_SECONDS = 3


def nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"  # dùng ffmpeg hệ thống nếu có


def main():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    labels = [nfc(w) for w in json.load(open(LABELS_JSON, encoding="utf-8"))]
    want = set(labels)

    print(f"Liệt kê file trong {DATASET_REPO} ...")
    files = HfApi().list_repo_files(DATASET_REPO, repo_type="dataset")

    # Gom video theo thư mục cấp 1 (= tên nhãn), chọn 1 clip/nhãn
    by_label = defaultdict(list)
    for f in files:
        parts = f.split("/")
        if len(parts) >= 2 and f.lower().endswith(VIDEO_EXTS):
            by_label[nfc(parts[-2])].append(f)

    ff = ffmpeg_exe()
    made, missing = 0, []
    for label in labels:
        clips = by_label.get(label)
        if not clips:
            missing.append(label)
            continue
        src_rel = sorted(clips, key=len)[0]  # clip có tên ngắn nhất
        out = os.path.join(SAMPLES_DIR, f"{label}.mp4")
        if os.path.exists(out):
            made += 1
            continue
        print(f"  {label}  <-  {src_rel}")
        src = hf_hub_download(DATASET_REPO, src_rel, repo_type="dataset")
        cmd = [
            ff, "-y", "-i", src,
            "-t", str(MAX_SECONDS),
            "-vf", f"scale='min({MAX_WIDTH},iw)':-2",
            "-an", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
            "-movflags", "+faststart", out,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            made += 1
        except Exception as e:
            print(f"    LỖI nén: {e}")
            missing.append(label)

    print(f"\nXong: {made}/{len(labels)} video mẫu -> {SAMPLES_DIR}")
    if missing:
        print(f"Thiếu {len(missing)} từ (không có trong dataset): {missing}")


if __name__ == "__main__":
    main()
