// Lưu tiến độ học vào localStorage (chạy trong browser, không cần server)
const KEY = "vsl-progress-v1";

export interface WordStat {
  attempts: number;
  correct: number;
}

export interface Progress {
  words: Record<string, WordStat>;
  streak: number; // số lần đúng liên tiếp gần nhất
  bestStreak: number;
  score: number; // tổng điểm (mỗi lần đúng +10)
}

export function emptyProgress(): Progress {
  return { words: {}, streak: 0, bestStreak: 0, score: 0 };
}

export function loadProgress(): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return { ...emptyProgress(), ...JSON.parse(raw) };
  } catch {
    return emptyProgress();
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* bỏ qua nếu localStorage bị chặn */
  }
}

// Ghi lại 1 lần luyện -> trả về tiến độ mới
export function recordAttempt(word: string, ok: boolean): Progress {
  const p = loadProgress();
  const stat = p.words[word] ?? { attempts: 0, correct: 0 };
  stat.attempts += 1;
  if (ok) {
    stat.correct += 1;
    p.streak += 1;
    p.score += 10;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
  } else {
    p.streak = 0;
  }
  p.words[word] = stat;
  save(p);
  return p;
}

// Một từ coi là "đã thuộc" nếu từng ký đúng ít nhất 1 lần
export function isLearned(p: Progress, word: string): boolean {
  return (p.words[word]?.correct ?? 0) > 0;
}

export function countLearned(p: Progress, words: string[]): number {
  return words.filter((w) => isLearned(p, w)).length;
}

export function resetProgress() {
  save(emptyProgress());
}
