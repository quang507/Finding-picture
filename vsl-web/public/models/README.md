# Thư mục model TF.js

Sau khi chạy `training/4_export_tfjs.py`, thư mục này sẽ có:

```
models/vsl/model.json
models/vsl/group1-shard1of1.bin
```

Đây là model nhận diện ký hiệu chạy trong browser. File `labels.json`
ở thư mục `public/` cũng được cập nhật theo dataset.

Trước khi có model, app vẫn chạy được (browse danh sách từ + bật camera),
nhưng nút "Bắt đầu" sẽ báo model chưa sẵn sàng.
