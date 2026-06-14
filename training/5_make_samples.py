"""
Bước 5 (tùy chọn): Tạo video MẪU cho web từ dataset gốc trên Hugging Face.

Mỗi từ trong labels.json lấy 1 video ngắn, nén nhỏ, đặt tên đúng chuẩn web:
    vsl-web/public/samples/<Tên từ>.mp4

QUAN TRỌNG — vì sao map theo THỨ TỰ chứ không theo chữ:
  Lúc train (2_extract_landmarks.py) nhãn = danh sách tên-thư-mục đã sorted().
  labels.json giữ ĐÚNG thứ tự đó. Sau này chữ trong labels.json đã được sửa
  mã (NFC / repair mojibake) nên KHÔNG còn khớp y hệt tên thư mục gốc trên HF.
  => Ta sort tên thư mục dataset giống hệt lúc train rồi ghép theo chỉ số:
     labels[i]  <->  sorted_folders[i]

Chạy:
    pip install huggingface_hub imageio-ffmpeg
    python 5_make_samples.py
"""
import json
import os
import subprocess
from collections import defaultdict

from huggingface_hub import HfApi, hf_hub_download
from config import DATASET_REPO

SAMPLES_DIR = "../vsl-web/public/samples"
LABELS_JSON = "../vsl-web/public/labels.json"
VIDEO_EXTS = (".mp4", ".mov", ".avi", ".mkv", ".webm")

MAX_WIDTH = 360
MAX_SECONDS = 3


def ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def detect_label_depth(videos, n_labels):
    """Tìm độ sâu thư mục mà số nhóm = số nhãn (tự dò cấu trúc lồng nhau)."""
    max_depth = max(len(v.split("/")) for v in videos)
    for d in range(1, max_depth):
        groups = {v.split("/")[-1 - d] for v in videos if len(v.split("/")) > d}
        if len(groups) == n_labels:
            return d, len(groups)
    # không khớp tuyệt đối -> trả độ sâu có nhiều nhóm nhất để chẩn đoán
    best = max(
        range(1, max_depth),
        key=lambda d: len({v.split("/")[-1 - d] for v in videos
                           if len(v.split("/")) > d}),
    )
    groups = {v.split("/")[-1 - best] for v in videos if len(v.split("/")) > best}
    return best, len(groups)


def main():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    labels = json.load(open(LABELS_JSON, encoding="utf-8"))
    n = len(labels)

    print(f"Liệt kê file trong {DATASET_REPO} ...")
    files = HfApi().list_repo_files(DATASET_REPO, repo_type="dataset")
    videos = [f for f in files if f.lower().endswith(VIDEO_EXTS)]
    print(f"  {len(videos)} video, {n} nhãn trong labels.json")

    if not videos:
        raise SystemExit("Dataset không có video? In thử vài file:\n  "
                         + "\n  ".join(files[:20]))

    depth, n_groups = detect_label_depth(videos, n)
    print(f"  Dùng độ sâu thư mục = {depth} (số nhóm = {n_groups})")

    by_folder = defaultdict(list)
    for v in videos:
        parts = v.split("/")
        if len(parts) > depth:
            by_folder[parts[-1 - depth]].append(v)

    folders = sorted(by_folder.keys())  # SẮP XẾP giống lúc train
    print(f"  5 thư mục đầu (đã sort): {folders[:5]}")

    if len(folders) != n:
        print("\n⚠️  Số thư mục KHÁC số nhãn — không map theo thứ tự an toàn được.")
        print(f"   Thư mục ({len(folders)}): {folders}")
        raise SystemExit("Gửi danh sách thư mục trên cho Claude để map thủ công.")

    print("  Ví dụ map thứ tự (kiểm tra mắt thường):")
    for i in range(min(5, n)):
        print(f"    [{i}] folder={folders[i]!r}  ->  label={labels[i]!r}")

    ff = ffmpeg_exe()
    made, fail = 0, []
    for i, label in enumerate(labels):
        clips = by_folder[folders[i]]
        src_rel = sorted(clips, key=len)[0]
        out = os.path.join(SAMPLES_DIR, f"{label}.mp4")
        if os.path.exists(out):
            made += 1
            continue
        try:
            src = hf_hub_download(DATASET_REPO, src_rel, repo_type="dataset")
            cmd = [
                ff, "-y", "-i", src, "-t", str(MAX_SECONDS),
                "-vf", f"scale='min({MAX_WIDTH},iw)':-2",
                "-an", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
                "-movflags", "+faststart", out,
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            made += 1
            print(f"    ✓ [{i+1}/{n}] {label}")
        except Exception as e:
            print(f"    ✗ {label}: {str(e)[:120]}")
            fail.append(label)

    print(f"\nXong: {made}/{n} video -> {SAMPLES_DIR}")
    if fail:
        print(f"Lỗi {len(fail)} từ: {fail}")


if __name__ == "__main__":
    main()
