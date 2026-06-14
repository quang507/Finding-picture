// Lưu tiến độ học vào localStorage (chạy trong browser, không cần server)
const KEY = "vsl-progress-v1";

export interface WordStat {
  attempts: number;
  correct: number;
  // Ôn tập lặp lại kiểu Leitner (tùy chọn — dữ liệu cũ không có cũng chạy)
  box?: number; // hộp 0..5, càng cao nhớ càng chắc
  due?: number; // mốc thời gian (ms) nên ôn lại
  last?: number; // lần ôn gần nhất (ms)
}

export interface Progress {
  words: Record<string, WordStat>;
  streak: number; // số lần đúng liên tiếp gần nhất
  bestStreak: number;
  score: number; // tổng điểm / XP (mỗi lần đúng +10)
  days: Record<string, number>; // "YYYY-MM-DD" -> số lần đúng trong ngày
  dailyGoal: number; // mục tiêu số từ đúng mỗi ngày
  soundOn: boolean; // bật âm thanh + rung
}

export function emptyProgress(): Progress {
  return {
    words: {},
    streak: 0,
    bestStreak: 0,
    score: 0,
    days: {},
    dailyGoal: 5,
    soundOn: true,
  };
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

// ---- Ngày (theo giờ máy người dùng) ----
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

// ---- Khoảng cách ôn lại theo hộp Leitner (giờ) ----
const BOX_HOURS = [0, 8, 24, 72, 168, 336]; // 0=ngay, rồi 8h,1d,3d,7d,14d
const HOUR = 3600_000;

// Ghi lại 1 lần luyện -> trả về tiến độ mới
export function recordAttempt(word: string, ok: boolean): Progress {
  const p = loadProgress();
  const now = Date.now();
  const stat = p.words[word] ?? { attempts: 0, correct: 0, box: 0 };
  stat.attempts += 1;

  if (ok) {
    stat.correct += 1;
    stat.box = Math.min((stat.box ?? 0) + 1, BOX_HOURS.length - 1);
    p.streak += 1;
    p.score += 10;
    p.bestStreak = Math.max(p.bestStreak, p.streak);
    const today = dayKey();
    p.days[today] = (p.days[today] ?? 0) + 1;
  } else {
    stat.box = 0; // sai -> về hộp đầu, ôn lại sớm
    p.streak = 0;
  }
  stat.last = now;
  stat.due = now + BOX_HOURS[stat.box ?? 0] * HOUR;
  p.words[word] = stat;
  save(p);
  return p;
}

// ---- Từ đã thuộc ----
export function isLearned(p: Progress, word: string): boolean {
  return (p.words[word]?.correct ?? 0) > 0;
}

export function countLearned(p: Progress, words: string[]): number {
  return words.filter((w) => isLearned(p, w)).length;
}

// ---- Streak theo ngày ----
// Hôm nay đã đạt mục tiêu chưa
export function goalMetToday(p: Progress): boolean {
  return (p.days[dayKey()] ?? 0) >= p.dailyGoal;
}

export function todayCount(p: Progress): number {
  return p.days[dayKey()] ?? 0;
}

// Số ngày liên tiếp đạt mục tiêu (tính lùi từ hôm nay; nếu hôm nay chưa
// đạt thì tính lùi từ hôm qua để streak chưa bị mất trong ngày).
export function dayStreak(p: Progress): number {
  const goal = p.dailyGoal;
  let cursor = dayKey();
  if ((p.days[cursor] ?? 0) < goal) cursor = addDays(cursor, -1);
  let n = 0;
  while ((p.days[cursor] ?? 0) >= goal) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ---- XP / cấp độ (mỗi cấp 100 XP) ----
export function levelInfo(score: number) {
  const SIZE = 100;
  const level = Math.floor(score / SIZE) + 1;
  const into = score % SIZE;
  return { level, into, size: SIZE, pct: Math.round((into / SIZE) * 100) };
}

// ---- Ôn tập lặp lại: từ đã học mà tới hạn ôn ----
export function dueWords(p: Progress, labels: string[], now = Date.now()): string[] {
  const set = new Set(labels);
  return Object.entries(p.words)
    .filter(([w, s]) => set.has(w) && s.correct > 0 && (s.due ?? 0) <= now)
    .sort((a, b) => (a[1].due ?? 0) - (b[1].due ?? 0))
    .map(([w]) => w);
}

// ---- Cài đặt ----
export function setDailyGoal(goal: number): Progress {
  const p = loadProgress();
  p.dailyGoal = goal;
  save(p);
  return p;
}

export function setSoundOn(on: boolean): Progress {
  const p = loadProgress();
  p.soundOn = on;
  save(p);
  return p;
}

export function resetProgress() {
  save(emptyProgress());
}
