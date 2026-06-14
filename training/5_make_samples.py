"""
Bước 5 (tùy chọn): Tạo video MẪU cho web từ dataset gốc trên Hugging Face.

Dataset star092304/ViSignLanguage-Video đóng gói video trong dataset.zip.
Script này: tải dataset.zip -> mở zip -> mỗi nhãn lấy 1 clip -> nén nhỏ ->
lưu vsl-web/public/samples/<Tên từ>.mp4

MAP THEO THỨ TỰ (không theo chữ): lúc train, nhãn = sorted(tên thư mục),
labels.json giữ đúng thứ tự đó nhưng chữ đã sửa mã -> ghép theo chỉ số:
    labels[i] <-> sorted_folders[i]

Chạy:
    pip install huggingface_hub imageio-ffmpeg
    python 5_make_samples.py
"""
import json
import os
import shutil
import subprocess
import tempfile
import zipfile
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


def detect_depth(entries, n_labels):
    """Độ sâu thư mục cho số nhóm = số nhãn (tự dò cấu trúc lồng nhau)."""
    maxd = max(len(e.split("/")) for e in entries)
    best, best_groups = 1, -1
    for d in range(1, maxd):
        groups = {e.split("/")[-1 - d] for e in entries if len(e.split("/")) > d}
        if len(groups) == n_labels:
            return d, len(groups)
        if len(groups) > best_groups:
            best, best_groups = d, len(groups)
    return best, best_groups


def main():
    os.makedirs(SAMPLES_DIR, exist_ok=True)
    labels = json.load(open(LABELS_JSON, encoding="utf-8"))
    n = len(labels)

    files = HfApi().list_repo_files(DATASET_REPO, repo_type="dataset")
    zips = [f for f in files if f.lower().endswith(".zip")]
    target = next((z for z in zips if "dataset" in z.lower()), zips[0] if zips else None)
    if not target:
        raise SystemExit(f"Không thấy .zip nào. File: {files[:20]}")

    print(f"Tải {target} (có thể to, chờ chút) ...")
    zpath = hf_hub_download(DATASET_REPO, target, repo_type="dataset")

    zf = zipfile.ZipFile(zpath)
    entries = [e for e in zf.namelist() if e.lower().endswith(VIDEO_EXTS)]
    print(f"  {len(entries)} video trong zip, {n} nhãn")
    if not entries:
        raise SystemExit("Trong zip không có video. Vài entry:\n  "
                         + "\n  ".join(zf.namelist()[:25]))

    depth, ngroups = detect_depth(entries, n)
    print(f"  Độ sâu thư mục = {depth} (số nhóm = {ngroups})")

    by_folder = defaultdict(list)
    for e in entries:
        parts = e.split("/")
        if len(parts) > depth:
            by_folder[parts[-1 - depth]].append(e)

    folders = sorted(by_folder.keys())
    print(f"  5 thư mục đầu: {folders[:5]}")

    if len(folders) != n:
        print(f"\n⚠️  Số thư mục ({len(folders)}) KHÁC số nhãn ({n}).")
        print(f"   Danh sách thư mục: {folders}")
        raise SystemExit("Gửi danh sách thư mục này cho Claude để map tay.")

    print("  Kiểm tra map (mắt thường):")
    for i in range(min(6, n)):
        print(f"    [{i}] {folders[i]!r} -> {labels[i]!r}")

    ff = ffmpeg_exe()
    made, fail = 0, []
    tmpdir = tempfile.mkdtemp()
    for i, label in enumerate(labels):
        out = os.path.join(SAMPLES_DIR, f"{label}.mp4")
        if os.path.exists(out):
            made += 1
            continue
        entry = sorted(by_folder[folders[i]], key=len)[0]
        raw = os.path.join(tmpdir, "in" + os.path.splitext(entry)[1])
        try:
            with zf.open(entry) as src, open(raw, "wb") as dst:
                shutil.copyfileobj(src, dst)
            cmd = [
                ff, "-y", "-i", raw, "-t", str(MAX_SECONDS),
                "-vf", f"scale='min({MAX_WIDTH},iw)':-2",
                "-an", "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
                "-movflags", "+faststart", out,
            ]
            subprocess.run(cmd, check=True, capture_output=True)
            made += 1
            if (i + 1) % 10 == 0 or i == n - 1:
                print(f"    ✓ {i+1}/{n}")
        except Exception as e:
            print(f"    ✗ {label}: {str(e)[:120]}")
            fail.append(label)
        finally:
            if os.path.exists(raw):
                os.remove(raw)
    shutil.rmtree(tmpdir, ignore_errors=True)

    print(f"\nXong: {made}/{n} video -> {SAMPLES_DIR}")
    if fail:
        print(f"Lỗi {len(fail)} từ: {fail}")


if __name__ == "__main__":
    main()
