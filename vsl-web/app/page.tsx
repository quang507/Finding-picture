"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LABELS_URL } from "@/lib/constants";

export default function Home() {
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(LABELS_URL)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: string[]) => setLabels(data))
      .catch(() => setLabels([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container">
      <h1 className="title">Học Ngôn Ngữ Ký Hiệu VSL</h1>
      <p className="subtitle">
        Chọn một từ, bật camera và luyện ký hiệu. AI sẽ chấm đúng/sai ngay
        trong trình duyệt.
      </p>

      {loading && <p className="center muted">Đang tải danh sách từ…</p>}

      {!loading && labels.length === 0 && (
        <p className="center muted">
          Chưa có model. Chạy pipeline trong <code>training/</code> để tạo
          <code> labels.json</code> và model TF.js.
        </p>
      )}

      <div className="grid">
        {labels.map((w) => (
          <Link
            key={w}
            href={`/practice?word=${encodeURIComponent(w)}`}
            className="word-card"
          >
            {w}
          </Link>
        ))}
      </div>
    </main>
  );
}
