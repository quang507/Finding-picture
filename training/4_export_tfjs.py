"""
Bước 4: Xuất model Keras sang định dạng TensorFlow.js cho frontend.

Chạy:  python 4_export_tfjs.py

- Convert data/model_keras/vsl.keras  ->  ../vsl-web/public/models/vsl/
- Copy danh sách nhãn -> ../vsl-web/public/labels.json
Sau bước này, app Next.js đã có thể load model và chạy hoàn toàn trong browser.
"""
import os
import json
import shutil
import tensorflow as tf
import tensorflowjs as tfjs

from config import MODEL_DIR, TFJS_DIR, LANDMARKS_DIR, LABELS_JSON


def main():
    keras_path = os.path.join(MODEL_DIR, "vsl.keras")
    if not os.path.exists(keras_path):
        raise SystemExit(f"Chưa có {keras_path}. Chạy bước 3 trước.")

    model = tf.keras.models.load_model(keras_path)
    os.makedirs(TFJS_DIR, exist_ok=True)
    tfjs.converters.save_keras_model(model, TFJS_DIR)
    print(f"Đã xuất model TF.js -> {TFJS_DIR}/")

    # copy nhãn cho frontend
    src_labels = os.path.join(LANDMARKS_DIR, "labels.json")
    os.makedirs(os.path.dirname(LABELS_JSON), exist_ok=True)
    shutil.copy(src_labels, LABELS_JSON)
    with open(LABELS_JSON, encoding="utf-8") as f:
        labels = json.load(f)
    print(f"Đã copy {len(labels)} nhãn -> {LABELS_JSON}")
    print("Xong! Giờ frontend có thể chạy: cd ../vsl-web && npm run dev")


if __name__ == "__main__":
    main()
