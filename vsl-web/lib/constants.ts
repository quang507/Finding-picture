// Hằng số dùng chung — PHẢI khớp y hệt training/config.py
export const NUM_HANDS = 2;
export const NUM_LANDMARKS = 21;
export const COORDS = 3;
export const FEATURES_PER_HAND = NUM_LANDMARKS * COORDS; // 63
export const FEATURES_PER_FRAME = NUM_HANDS * FEATURES_PER_HAND; // 126

export const SEQ_LEN = 30;

export const WRIST = 0;
export const MIDDLE_MCP = 9;

// Ngưỡng tin cậy để coi là "đúng"
export const CONFIDENCE_THRESHOLD = 0.6;

// Đường dẫn model & nhãn (đặt trong public/)
export const MODEL_URL = "/models/vsl/model.json";
export const LABELS_URL = "/labels.json";
