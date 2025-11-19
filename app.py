# Tìm Hình Quang.py
import streamlit as st
import torch, clip, faiss, pickle, hashlib, os
from PIL import Image
import numpy as np
from pathlib import Path
import cv2
from scipy.ndimage import gaussian_filter
from ultralytics import YOLO

# ===================== CẤU HÌNH =====================
IMAGES_DIR = Path("images")
EMBEDDINGS_FILE = "embeddings.pkl"
FAISS_INDEX_FILE = "faiss.index"
HASH_FILE = "images_hash.txt"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "ViT-B/32"
TOP_K = 20
TARGET_SIZE = (800, 1200)
VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

st.set_page_config(page_title="Tìm Hình Quang", layout="wide")
st.markdown("<h1 style='text-align:center;color:#1E90FF;'>Tìm Hình Quang</h1>", unsafe_allow_html=True)
st.markdown("<p style='text-align:center;font-size:18px;'>Tìm theo nội dung • phong cách • thành phần (cây tùng, ông tiên...)</p>", unsafe_allow_html=True)

# ===================== HASH =====================
def get_folder_hash():
    hasher = hashlib.md5()
    for p in sorted(IMAGES_DIR.rglob("*")):
        if p.is_file() and p.suffix.lower() in VALID_EXTS:
            hasher.update(str(p).encode())
            hasher.update(str(p.stat().st_mtime).encode())
    return hasher.hexdigest()

# ===================== LOAD HOẶC INCREMENTAL UPDATE =====================
def load_or_compute():
    all_paths = [p for p in IMAGES_DIR.rglob("*") if p.is_file() and p.suffix.lower() in VALID_EXTS]
    if not all_paths:
        st.warning("Chưa có ảnh trong `images/` và các thư mục con! Vui lòng thêm ảnh.")
        return {}, [], None

    st.info(f"Phát hiện **{len(all_paths)} ảnh** trong toàn bộ thư mục.")

    embeddings = {}
    image_paths = []
    index = None

    if os.path.exists(EMBEDDINGS_FILE) and os.path.exists(FAISS_INDEX_FILE):
        try:
            with open(EMBEDDINGS_FILE, "rb") as f:
                embeddings, image_paths = pickle.load(f)
            index = faiss.read_index(FAISS_INDEX_FILE)
            st.success(f"Load thành công **{len(image_paths)} embedding** từ cache.")
        except Exception as e:
            st.warning(f"Cache lỗi ({e}) → Tính lại từ đầu.")

    old_set = {str(p) for p in image_paths}
    new_paths = [p for p in all_paths if str(p) not in old_set]

    if new_paths:
        st.info(f"Phát hiện **{len(new_paths)} ảnh mới** → Chỉ tính những ảnh này.")
        embeddings, image_paths, index = incremental_update(embeddings, image_paths, index, new_paths)
    else:
        if image_paths:
            st.success("Không có ảnh mới → Dùng cache hoàn toàn!")

    if not image_paths:
        embeddings, image_paths, index = compute_embeddings(all_paths)

    # Lưu cache mới nhất
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump((embeddings, image_paths), f)
    if index is not None:
        faiss.write_index(index, FAISS_INDEX_FILE)
    with open(HASH_FILE, "w") as f:
        f.write(get_folder_hash())

    return embeddings, image_paths, index

# ===================== INCREMENTAL UPDATE (CHỈ ẢNH MỚI) =====================
def incremental_update(old_emb, old_paths, old_index, new_paths):
    new_vecs = []
    prog = st.progress(0)
    for i, p in enumerate(new_paths):
        prog.progress((i + 1) / len(new_paths))
        try:
            img = Image.open(p).convert("RGB")
            cropped = detect_and_crop_painting(img)
            inp = preprocess(cropped).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                emb = model.encode_image(inp).cpu().detach().numpy().flatten()
            old_emb[str(p)] = emb
            new_vecs.append(emb)
            old_paths.append(p)
        except Exception as e:
            st.warning(f"Lỗi ảnh mới {p.name}: {e}")
    if new_vecs:
        v = np.array(new_vecs).astype('float32')
        faiss.normalize_L2(v)
        if old_index is None:
            old_index = faiss.IndexFlatIP(512)
        old_index.add(v)
    prog.empty()
    return old_emb, old_paths, old_index

# ===================== TÍNH TOÀN BỘ (LẦN ĐẦU) =====================
@st.cache_data(show_spinner=False)
def compute_embeddings(paths):
    emb_dict = {}
    vecs = []
    list_paths = []
    prog = st.progress(0)
    for i, p in enumerate(paths):
        prog.progress((i + 1) / len(paths))
        try:
            img = Image.open(p).convert("RGB")
            cropped = detect_and_crop_painting(img)
            inp = preprocess(cropped).unsqueeze(0).to(DEVICE)
            with torch.no_grad():
                emb = model.encode_image(inp).cpu().detach().numpy().flatten()
            emb_dict[str(p)] = emb
            vecs.append(emb)
            list_paths.append(p)
        except Exception as e:
            st.warning(f"Lỗi {p.name}: {e}")
    prog.empty()
    v = np.array(vecs).astype('float32')
    faiss.normalize_L2(v)
    idx = faiss.IndexFlatIP(512)
    idx.add(v)
    st.success(f"Hoàn tất xử lý **{len(list_paths)} ảnh**!")
    return emb_dict, list_paths, idx

# ===================== TẢI MODEL =====================
@st.cache_resource
def load_clip_model():
    model, preprocess = clip.load(MODEL_NAME, device=DEVICE)
    return model, preprocess

@st.cache_resource
def load_yolo_model():
    return YOLO("yolov8s.pt")

model, preprocess = load_clip_model()
yolo_model = load_yolo_model()

# ===================== CẮT KHUNG =====================
def detect_and_crop_painting(img, size=TARGET_SIZE):
    try:
        cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        hsv = cv2.cvtColor(cv, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, (15,50,100), (35,255,255)) + cv2.inRange(hsv, (0,30,50), (20,255,200))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT,(5,5)), iterations=2)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours: raise Exception()
        c = max(contours, key=cv2.contourArea)
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02*peri, True)
        if len(approx) != 4: raise Exception()
        pts = approx.reshape(4,2).astype("float32")
        rect = np.zeros((4,2), dtype="float32")
        s = pts.sum(1); diff = np.diff(pts, axis=1)
        rect[0] = pts[np.argmin(s)]; rect[2] = pts[np.argmax(s)]
        rect[1] = pts[np.argmin(diff)]; rect[3] = pts[np.argmax(diff)]
        dst = np.array([[0,0],[size[0]-1,0],[size[0]-1,size[1]-1],[0,size[1]-1]], dtype="float32")
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(cv, M, size)
        return Image.fromarray(cv2.cvtColor(warped, cv2.COLOR_BGR2RGB))
    except:
        return img.resize(size, Image.Resampling.LANCZOS)

# ===================== PHONG CÁCH =====================
def extract_style_features(img, sigma=8):
    try:
        b = gaussian_filter(np.array(img).astype(float), (sigma, sigma, 0))
        return Image.fromarray(np.uint8(b)).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    except:
        return img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)

# ===================== PHÁT HIỆN THÀNH PHẦN =====================
def detect_objects_in_image(img):
    try:
        r = yolo_model(img, verbose=False)[0]
        tags = []
        for c in r.boxes.cls:
            name = r.names[int(c)]
            vi = {"pine tree":"cây tùng","tree":"cây","bird":"chim","person":"người","boat":"thuyền","mountain":"núi","waterfall":"thác nước"}.get(name.lower())
            if vi and vi not in tags:
                tags.append(vi)
        return tags[:5]
    except:
        return []

# ===================== KHỞI ĐỘNG =====================
embeddings, image_paths, faiss_index = load_or_compute()

# ===================== TÌM KIẾM =====================
def search_text(q):
    if not faiss_index or len(image_paths) == 0: return []
    with torch.no_grad():
        t = clip.tokenize([q]).to(DEVICE)
        e = model.encode_text(t).cpu().detach().numpy().astype('float32')
        faiss.normalize_L2(e)
        s, i = faiss_index.search(e, TOP_K)
        return [(float(s[0][j]), image_paths[i[0][j]]) for j in range(min(TOP_K, len(s[0])))]

def search_image(up_img, style=False):
    if not faiss_index or len(image_paths) == 0: return []
    inner = detect_and_crop_painting(up_img)
    if style:
        inner = extract_style_features(inner)
    with torch.no_grad():
        e = model.encode_image(preprocess(inner).unsqueeze(0).to(DEVICE)).cpu().detach().numpy().astype('float32')
        faiss.normalize_L2(e)
        s, i = faiss_index.search(e, TOP_K + 5)
        res = []
        seen = set()
        for j in range(TOP_K + 5):
            if j >= len(image_paths): break
            p = image_paths[i[0][j]]
            if p not in seen:
                res.append((float(s[0][j]), p))
                seen.add(p)
            if len(res) >= TOP_K: break
        return res

# ===================== GIAO DIỆN =====================
st.markdown("---")
c1, c2 = st.columns([3, 1])
with c1:
    txt = st.text_input("", placeholder="Nhập từ khóa (cây tùng, ông tiên...)", key="txt")
with c2:
    up = st.file_uploader("Upload ảnh mẫu", ["jpg", "jpeg", "png", "webp"], key="up")
    style_mode = st.checkbox("Tìm theo phong cách", key="style")

results = None

if txt:
    with st.spinner("Đang tìm theo từ khóa..."):
        results = search_text(txt)
    st.success(f"Tìm theo từ khóa: **{txt}**")

if up:
    img = Image.open(up).convert("RGB")
    st.image(img, "Ảnh gốc", width=250)
    st.checkbox("Xem ảnh đã cắt khung", key="show_crop")
    tags = detect_objects_in_image(img)
    if tags:
        st.success("Phát hiện: " + " • ".join(tags))
        if st.button("Tìm theo thành phần"):
            results = search_text(" ".join(tags))
            st.success(f"Tìm theo: {', '.join(tags)}")
    if not results:
        with st.spinner("Đang tìm theo ảnh..."):
            results = search_image(img, style_mode)

if results and len(results) > 0:
    st.markdown(f"### Kết quả ({len(results)} ảnh)")
    cols = st.columns(5)
    for i, (sc, p) in enumerate(results):
        with cols[i % 5]:
            st.image(str(p), use_container_width=True)
            st.caption(p.name)
            col = "red" if sc > 0.999 else "green"
            st.markdown(f"<small style='color:{col}'>Similarity: {sc:.3f}</small>", unsafe_allow_html=True)
elif results is not None:
    st.info("Không tìm thấy kết quả phù hợp.")