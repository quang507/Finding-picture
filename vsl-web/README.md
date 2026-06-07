# VSL Web — Học Ngôn Ngữ Ký Hiệu Việt Nam

Web app học ngôn ngữ ký hiệu VSL: bật camera → ký hiệu → AI chấm đúng/sai.
**Chạy 100% trong trình duyệt** (MediaPipe WASM + TensorFlow.js), không cần
server → deploy Vercel miễn phí.

## Công nghệ

- **Next.js 14** (App Router)
- **@mediapipe/tasks-vision** — nhận diện 21 điểm khớp tay, real-time
- **@tensorflow/tfjs** — chạy model phân loại trong browser

## Chạy local

```bash
cd vsl-web
npm install
npm run dev
# mở http://localhost:3000
```

> Trước khi có model, app vẫn chạy: xem danh sách từ + bật camera.
> Để AI chấm điểm, chạy pipeline trong `../training` (xem `../training/README.md`)
> rồi reload — model nằm ở `public/models/vsl/`.

## Deploy lên Vercel

1. Push repo lên GitHub.
2. Vào [vercel.com](https://vercel.com) → New Project → import repo.
3. **Root Directory**: chọn `vsl-web` (vì app nằm trong thư mục con).
4. Framework tự nhận **Next.js** → Deploy.

Không cần biến môi trường, không cần server. Domain miễn phí dạng
`ten-app.vercel.app`.

> Lưu ý: camera (`getUserMedia`) chỉ chạy trên **HTTPS** — Vercel mặc định
> HTTPS nên OK. Khi test local, `localhost` cũng được coi là an toàn.

## Luồng hoạt động

```
Webcam → MediaPipe HandLandmarker (WASM) → 21 điểm/tay mỗi frame
       → chuẩn hoá (lib/landmarks.ts) → buffer 30 frame
       → TF.js model (lib/classifier.ts) → nhãn + độ tin cậy
       → so với từ đang luyện → "Đúng rồi!" / "Chưa đúng"
```

## Cấu trúc

```
app/
  page.tsx            danh sách từ
  practice/page.tsx   chế độ luyện (camera + chấm điểm)
lib/
  constants.ts        hằng số (PHẢI khớp training/config.py)
  landmarks.ts        chuẩn hoá landmark (PHẢI khớp landmark_utils.py)
  handLandmarker.ts   khởi tạo MediaPipe
  classifier.ts       load model TF.js + dự đoán
public/
  labels.json         danh sách nhãn (do bước 4 ghi đè)
  models/vsl/         model TF.js (do bước 4 tạo)
```
