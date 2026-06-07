# Training Pipeline — VSL Sign Recognition (offline)

Pipeline Python chạy **một lần** trên máy của mày để tạo ra model TF.js
cho web app. Web app (`../vsl-web`) chạy hoàn toàn trong browser, không
cần server.

## Yêu cầu

- Python 3.10 hoặc 3.11 (khuyên dùng — TensorFlow/MediaPipe hợp nhất ở đây)
- ~3GB trống cho dataset + landmark

```bash
cd training
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Chạy lần lượt 4 bước

```bash
python 1_download_dataset.py     # tải ViSignLanguage-Video (~1.14GB)
python 2_extract_landmarks.py    # video -> landmark (.npy)
python 3_train_model.py          # train LSTM, in val accuracy
python 4_export_tfjs.py          # xuất model + nhãn cho frontend
```

Sau bước 4:
- `../vsl-web/public/models/vsl/` chứa `model.json` + `*.bin`
- `../vsl-web/public/labels.json` chứa danh sách nhãn

Mở web app:
```bash
cd ../vsl-web && npm install && npm run dev
```

## Lưu ý quan trọng

- **Cấu trúc dataset**: script giả định `data/videos/<nhãn>/<video>.mp4`.
  Nếu repo HF dùng cấu trúc khác (vd có file metadata/csv), sửa hàm
  `list_videos()` trong `2_extract_landmarks.py`.
- **Logic chuẩn hoá landmark** trong `landmark_utils.py` PHẢI khớp y hệt
  `../vsl-web/lib/landmarks.ts`. Nếu sửa một bên, sửa cả bên kia.
- **Hằng số** (`SEQ_LEN`, số tay, số điểm) nằm ở `config.py` (Python) và
  `../vsl-web/lib/constants.ts` (TS) — giữ đồng bộ.
- Model dùng `Masking` để bỏ qua frame toàn 0 (frame không thấy tay).
