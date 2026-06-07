"""
Bước 1: Tải dataset ViSignLanguage-Video từ Hugging Face.

Chạy:  python 1_download_dataset.py

Dataset (~1.14GB) sẽ được tải về thư mục data/videos/.
Cấu trúc kỳ vọng: data/videos/<ten_nhan>/<video>.mp4
Nếu repo dùng cấu trúc khác, chỉnh lại hàm resolve_structure() bên dưới.
"""
import os
from huggingface_hub import snapshot_download
from config import DATASET_REPO, DATASET_DIR


def main():
    os.makedirs(DATASET_DIR, exist_ok=True)
    print(f"Đang tải {DATASET_REPO} về {DATASET_DIR} ...")
    path = snapshot_download(
        repo_id=DATASET_REPO,
        repo_type="dataset",
        local_dir=DATASET_DIR,
        local_dir_use_symlinks=False,
    )
    print(f"Xong. Dataset nằm ở: {path}")
    print("Kiểm tra cấu trúc thư mục: mỗi nhãn là 1 thư mục con chứa các .mp4")


if __name__ == "__main__":
    main()
