# Finding-picture

Repo gồm 2 dự án:

## 1. Tìm Hình Quang (`app.py`)
App Streamlit tìm ảnh theo nội dung/phong cách/thành phần bằng CLIP + FAISS + YOLO.

```bash
streamlit run app.py
```

## 2. Học Ngôn Ngữ Ký Hiệu VSL
Web app học ngôn ngữ ký hiệu Việt Nam: bật camera → ký hiệu → AI chấm đúng/sai,
chạy 100% trong trình duyệt (MediaPipe + TensorFlow.js), deploy được lên Vercel.

- **`vsl-web/`** — Next.js frontend (deploy Vercel). Xem `vsl-web/README.md`.
- **`training/`** — pipeline Python offline: tải dataset ViSignLanguage-Video,
  trích landmark, train model, xuất TF.js. Xem `training/README.md`.

### Bắt đầu nhanh
```bash
# Tạo model (offline, 1 lần)
cd training && pip install -r requirements.txt
python 1_download_dataset.py && python 2_extract_landmarks.py
python 3_train_model.py && python 4_export_tfjs.py

# Chạy web app
cd ../vsl-web && npm install && npm run dev
```
