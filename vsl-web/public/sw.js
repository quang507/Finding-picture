// Service worker tối giản: chỉ để PWA cài được (Android cần có fetch handler).
// KHÔNG cache gì cả -> tránh lỗi phục vụ nội dung cũ (labels.json / model).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // để trình duyệt tự xử lý request như bình thường (network)
});
