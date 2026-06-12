"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildLessons } from "@/lib/lessons";
import { useLabels } from "@/lib/useLabels";
import { useProgress } from "@/lib/useProgress";
import { practiceUrl, lessonUrl } from "@/lib/nav";
import {
  loadProgress,
  isLearned,
  countLearned,
  resetProgress,
} from "@/lib/progress";

export default function Home() {
  const { labels, loading } = useLabels();
  const [progress, setProgress] = useProgress();
  const [query, setQuery] = useState("");

  const lessons = useMemo(() => buildLessons(labels), [labels]);

  const learnedCount = useMemo(
    () => countLearned(progress, labels),
    [labels, progress]
  );

  const searching = query.trim().length > 0;
  const filtered = useMemo(
    () =>
      labels.filter((w) =>
        w.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [labels, query]
  );

  return (
    <main className="container">
      <div className="topbar">
        <span className="brand">
          <span className="brand-emoji">🤟</span> VSL Learn
        </span>
        <Link href="/quiz" className="btn btn--pink">
          🔀 Quiz ngẫu nhiên
        </Link>
      </div>

      <div className="stats">
        <div className="stat stat--yellow">
          <div className="stat-num">{progress.score}</div>
          <div className="stat-label">Điểm</div>
        </div>
        <div className="stat stat--green">
          <div className="stat-num">
            {learnedCount}/{labels.length || "?"}
          </div>
          <div className="stat-label">Từ đã thuộc</div>
        </div>
        <div className="stat stat--blue">
          <div className="stat-num">🔥 {progress.bestStreak}</div>
          <div className="stat-label">Streak tốt nhất</div>
        </div>
      </div>

      <h1 className="h-title">Học ngôn ngữ ký hiệu VSL</h1>
      <p className="h-sub">
        Chọn một bài → xem mẫu → bật camera → ký hiệu → AI chấm đúng/sai ngay
        trong trình duyệt.
      </p>

      <input
        className="search"
        placeholder="🔎 Tìm từ… (vd: cứu, bệnh viện)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && <p className="center muted">Đang tải danh sách từ…</p>}

      {!loading && labels.length === 0 && (
        <div className="card">
          Chưa có dữ liệu từ. Chạy pipeline trong <code>training/</code> để tạo{" "}
          <code>labels.json</code> và model.
        </div>
      )}

      {/* Khi tìm kiếm: hiện thẳng các từ khớp */}
      {searching ? (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            {filtered.length} kết quả cho “{query.trim()}”
          </p>
          <div className="word-grid">
            {filtered.map((w) => {
              const done = isLearned(progress, w);
              return (
                <Link
                  key={w}
                  href={practiceUrl(w)}
                  className={`word-card ${done ? "word-card--done" : ""}`}
                >
                  {done && <span className="badge">✓</span>}
                  {w}
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        /* Mặc định: danh sách bài học theo chủ đề */
        <div className="lesson-grid">
          {lessons.map((l) => {
            const done = countLearned(progress, l.words);
            const pct = Math.round((done / l.words.length) * 100);
            const complete = done === l.words.length;
            return (
              <Link
                key={l.id}
                href={lessonUrl(l.id)}
                className={`lesson-card lesson-card--${l.color}`}
              >
                {complete && <span className="badge">✓</span>}
                <div className="lesson-emoji">{l.emoji}</div>
                <div className="lesson-title">{l.title}</div>
                <div className="lesson-meta">
                  {done}/{l.words.length} từ đã thuộc
                </div>
                <div className="lesson-bar">
                  <div className="lesson-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {progress.score > 0 && (
        <div className="row" style={{ marginTop: 28 }}>
          <span className="muted">Muốn học lại từ đầu?</span>
          <button
            className="btn btn--yellow"
            onClick={() => {
              if (confirm("Xoá toàn bộ tiến độ học?")) {
                resetProgress();
                setProgress(loadProgress());
              }
            }}
          >
            ♻️ Reset tiến độ
          </button>
        </div>
      )}
    </main>
  );
}
