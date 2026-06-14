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
  dayStreak,
  todayCount,
  levelInfo,
  dueWords,
  setDailyGoal,
  setSoundOn,
} from "@/lib/progress";
import { BADGES, earnedBadgeIds } from "@/lib/badges";

const GOAL_OPTIONS = [3, 5, 10, 15];

export default function Home() {
  const { labels, loading } = useLabels();
  const [progress, setProgress] = useProgress();
  const [query, setQuery] = useState("");

  const lessons = useMemo(() => buildLessons(labels), [labels]);

  const learnedCount = useMemo(
    () => countLearned(progress, labels),
    [labels, progress]
  );

  const streak = dayStreak(progress);
  const today = todayCount(progress);
  const goalPct = Math.min(100, Math.round((today / progress.dailyGoal) * 100));
  const lvl = levelInfo(progress.score);
  const due = useMemo(() => dueWords(progress, labels), [progress, labels]);
  const earned = useMemo(
    () => earnedBadgeIds(progress, learnedCount),
    [progress, learnedCount]
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

      {/* Mục tiêu hôm nay */}
      <div className="daily-card">
        <div
          className="goal-ring"
          style={{ ["--pct" as string]: `${goalPct * 3.6}deg` }}
        >
          <div className="goal-ring-inner">
            <div className="goal-num">{today}</div>
            <div className="goal-of">/{progress.dailyGoal}</div>
          </div>
        </div>
        <div className="daily-text">
          <div className="daily-streak">🔥 {streak} ngày liên tiếp</div>
          <div className="muted">
            {today >= progress.dailyGoal
              ? "🎉 Đạt mục tiêu hôm nay rồi!"
              : `Còn ${progress.dailyGoal - today} từ nữa là đạt mục tiêu hôm nay`}
          </div>
          <div className="goal-pick">
            <span className="muted">Mục tiêu/ngày:</span>
            {GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                className={`goal-chip ${g === progress.dailyGoal ? "goal-chip--on" : ""}`}
                onClick={() => setProgress(setDailyGoal(g))}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="stats">
        <div className="stat stat--yellow">
          <div className="stat-num">Lv.{lvl.level}</div>
          <div className="stat-label">{progress.score} XP</div>
          <div className="lesson-bar" style={{ marginTop: 8 }}>
            <div className="lesson-bar-fill" style={{ width: `${lvl.pct}%` }} />
          </div>
        </div>
        <div className="stat stat--green">
          <div className="stat-num">
            {learnedCount}/{labels.length || "?"}
          </div>
          <div className="stat-label">Từ đã thuộc</div>
        </div>
        <div className="stat stat--blue">
          <div className="stat-num">🔥 {progress.bestStreak}</div>
          <div className="stat-label">Combo tốt nhất</div>
        </div>
      </div>

      {due.length > 0 && (
        <Link href="/quiz?mode=review" className="review-cta">
          🔁 Ôn tập {due.length} từ tới hạn — giúp nhớ lâu hơn!
        </Link>
      )}

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

      {/* Huy hiệu */}
      {!searching && (
        <section style={{ marginTop: 32 }}>
          <h2 className="section-title">🏅 Huy hiệu ({earned.size}/{BADGES.length})</h2>
          <div className="badge-grid">
            {BADGES.map((b) => {
              const got = earned.has(b.id);
              return (
                <div
                  key={b.id}
                  className={`badge-item ${got ? "" : "badge-item--locked"}`}
                  title={b.desc}
                >
                  <span className="badge-item-emoji">{got ? b.emoji : "🔒"}</span>
                  <span className="badge-item-title">{b.title}</span>
                  <span className="badge-item-desc">{b.desc}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="row" style={{ marginTop: 28 }}>
        <button
          className="btn btn--blue"
          onClick={() => setProgress(setSoundOn(!progress.soundOn))}
        >
          {progress.soundOn ? "🔊 Tiếng: Bật" : "🔇 Tiếng: Tắt"}
        </button>
        <span className="spacer" />
        {progress.score > 0 && (
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
        )}
      </div>
    </main>
  );
}
