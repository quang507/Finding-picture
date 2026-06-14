import { dayStreak, levelInfo, type Progress } from "@/lib/progress";

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  earned: (p: Progress, learnedTotal: number) => boolean;
}

export const BADGES: Badge[] = [
  { id: "first", emoji: "🌱", title: "Bắt đầu", desc: "Thuộc từ đầu tiên",
    earned: (_, n) => n >= 1 },
  { id: "words10", emoji: "📚", title: "Chăm chỉ", desc: "Thuộc 10 từ",
    earned: (_, n) => n >= 10 },
  { id: "words25", emoji: "🎓", title: "Khá lắm", desc: "Thuộc 25 từ",
    earned: (_, n) => n >= 25 },
  { id: "words50", emoji: "🏆", title: "Cao thủ", desc: "Thuộc 50 từ",
    earned: (_, n) => n >= 50 },
  { id: "streak3", emoji: "🔥", title: "3 ngày", desc: "Học 3 ngày liên tiếp",
    earned: (p) => dayStreak(p) >= 3 },
  { id: "streak7", emoji: "⚡", title: "1 tuần", desc: "Học 7 ngày liên tiếp",
    earned: (p) => dayStreak(p) >= 7 },
  { id: "streak30", emoji: "💎", title: "1 tháng", desc: "Học 30 ngày liên tiếp",
    earned: (p) => dayStreak(p) >= 30 },
  { id: "combo10", emoji: "🎯", title: "Combo 10", desc: "Đúng 10 lần liên tiếp",
    earned: (p) => p.bestStreak >= 10 },
  { id: "level5", emoji: "⭐", title: "Cấp 5", desc: "Đạt cấp độ 5",
    earned: (p) => levelInfo(p.score).level >= 5 },
];

export function earnedBadgeIds(p: Progress, learnedTotal: number): Set<string> {
  return new Set(BADGES.filter((b) => b.earned(p, learnedTotal)).map((b) => b.id));
}
