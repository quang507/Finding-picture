"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { findLesson } from "@/lib/lessons";
import { useLabels } from "@/lib/useLabels";
import { useProgress } from "@/lib/useProgress";
import { practiceUrl } from "@/lib/nav";
import { isLearned, countLearned } from "@/lib/progress";

function LessonInner() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const { labels, loading } = useLabels();
  const [progress] = useProgress();

  const lesson = useMemo(() => findLesson(labels, id), [labels, id]);

  if (loading) {
    return <main className="container">Đang tải…</main>;
  }

  if (!lesson) {
    return (
      <main className="container">
        <Link href="/" className="back">← Trang chủ</Link>
        <div className="card">Không tìm thấy bài học này.</div>
      </main>
    );
  }

  const done = countLearned(progress, lesson.words);
  const pct = Math.round((done / lesson.words.length) * 100);
  const firstTodo =
    lesson.words.find((w) => !isLearned(progress, w)) ?? lesson.words[0];

  return (
    <main className="container">
      <Link href="/" className="back">← Tất cả bài học</Link>

      <div className={`panel-target lesson-head lesson-card--${lesson.color}`}>
        <div className="lesson-emoji" style={{ fontSize: 44 }}>
          {lesson.emoji}
        </div>
        <div className="label-word" style={{ fontSize: 30 }}>
          {lesson.title}
        </div>
        <div className="lesson-meta">{done}/{lesson.words.length} từ đã thuộc</div>
        <div className="lesson-bar" style={{ maxWidth: 320, margin: "12px auto 0" }}>
          <div className="lesson-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="row" style={{ marginBottom: 18 }}>
        <Link
          href={practiceUrl(firstTodo, lesson.id)}
          className="btn btn--green btn--lg"
        >
          {done === 0 ? "▶️ Bắt đầu học bài" : done === lesson.words.length ? "🔁 Ôn lại bài" : "⏭️ Học tiếp"}
        </Link>
        <span className="spacer" />
      </div>

      <div className="word-grid">
        {lesson.words.map((w, i) => {
          const learned = isLearned(progress, w);
          return (
            <Link
              key={w}
              href={practiceUrl(w, lesson.id)}
              className={`word-card ${learned ? "word-card--done" : ""}`}
            >
              {learned && <span className="badge">✓</span>}
              <span className="word-num">{i + 1}</span>
              {w}
            </Link>
          );
        })}
      </div>
    </main>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<main className="container">Đang tải…</main>}>
      <LessonInner />
    </Suspense>
  );
}
