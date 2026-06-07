"""
Hằng số dùng chung cho toàn bộ pipeline.

QUAN TRỌNG: Các giá trị này PHẢI khớp y hệt với phía frontend
(vsl-web/lib/constants.ts) thì model train ra mới chạy đúng trong browser.
"""

# ----- Trích landmark -----
# Mỗi bàn tay: 21 điểm, mỗi điểm 3 toạ độ (x, y, z)
NUM_HANDS = 2          # số tay tối đa MediaPipe nhận
NUM_LANDMARKS = 21     # số điểm mỗi tay
COORDS = 3             # x, y, z
FEATURES_PER_HAND = NUM_LANDMARKS * COORDS          # 63
FEATURES_PER_FRAME = NUM_HANDS * FEATURES_PER_HAND  # 126

# ----- Chuỗi thời gian -----
# Mỗi video / lần luyện được chuẩn hoá về đúng SEQ_LEN frame.
SEQ_LEN = 30

# ----- Điểm tham chiếu để chuẩn hoá -----
WRIST = 0              # cổ tay (gốc toạ độ)
MIDDLE_MCP = 9         # khớp ngón giữa (dùng làm thước đo tỉ lệ)

# ----- Đường dẫn -----
DATASET_REPO = "star092304/ViSignLanguage-Video"  # đổi nếu repo khác
DATASET_DIR = "data/videos"        # nơi giải nén dataset
LANDMARKS_DIR = "data/landmarks"   # nơi lưu .npy đã trích
MODEL_DIR = "data/model_keras"     # model Keras (.keras)
TFJS_DIR = "../vsl-web/public/models/vsl"  # model TF.js cho frontend
LABELS_JSON = "../vsl-web/public/labels.json"  # danh sách nhãn cho frontend
