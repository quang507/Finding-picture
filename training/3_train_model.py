"""
Bước 3: Train model phân loại chuỗi landmark (LSTM nhẹ).

Chạy:  python 3_train_model.py

Input:  data/landmarks/X.npy (N, SEQ_LEN, FEATURES_PER_FRAME), y.npy
Output: data/model_keras/vsl.keras  (+ in ra độ chính xác)
Model rất nhẹ (~vài trăm KB → vài MB) để chạy mượt trong browser.
"""
import os
import json
import numpy as np
import tensorflow as tf
from sklearn.model_selection import train_test_split

from config import LANDMARKS_DIR, MODEL_DIR, SEQ_LEN, FEATURES_PER_FRAME


def build_model(num_classes: int) -> tf.keras.Model:
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(SEQ_LEN, FEATURES_PER_FRAME)),
        tf.keras.layers.Masking(mask_value=0.0),
        tf.keras.layers.LSTM(128, return_sequences=True),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.LSTM(64),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(64, activation="relu"),
        tf.keras.layers.Dense(num_classes, activation="softmax"),
    ])
    model.compile(optimizer="adam",
                  loss="sparse_categorical_crossentropy",
                  metrics=["accuracy"])
    return model


def main():
    X = np.load(os.path.join(LANDMARKS_DIR, "X.npy"))
    y = np.load(os.path.join(LANDMARKS_DIR, "y.npy"))
    with open(os.path.join(LANDMARKS_DIR, "labels.json"), encoding="utf-8") as f:
        labels = json.load(f)
    num_classes = len(labels)
    print(f"X={X.shape}, {num_classes} nhãn")

    X_tr, X_val, y_tr, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y)

    model = build_model(num_classes)
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            patience=12, restore_best_weights=True, monitor="val_accuracy"),
        tf.keras.callbacks.ReduceLROnPlateau(
            patience=5, factor=0.5, monitor="val_loss"),
    ]
    model.fit(X_tr, y_tr, validation_data=(X_val, y_val),
              epochs=120, batch_size=32, callbacks=callbacks)

    loss, acc = model.evaluate(X_val, y_val, verbose=0)
    print(f"Val accuracy: {acc:.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    out = os.path.join(MODEL_DIR, "vsl.keras")
    model.save(out)
    print(f"Lưu model: {out}")


if __name__ == "__main__":
    main()
