// Chia danh sách từ (labels.json) thành các bài học theo chủ đề.
// Tên từ phải KHỚP đúng với labels.json (dạng NFC).
// Từ nào không nằm trong chủ đề nào sẽ tự gom vào bài "Tổng hợp".

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
  words: string[];
}

type Topic = Omit<Lesson, "words"> & { words: string[] };

const TOPICS: Topic[] = [
  {
    id: "y-te",
    title: "Y tế & sức khỏe",
    emoji: "🩺",
    color: "pink",
    words: [
      "Bệnh nhân", "Bệnh viện", "Bộ y tế", "Cách ly", "Khu cách ly",
      "Khẩu trang", "Lây bệnh", "Sốt", "Virus", "Phục hồi", "Cứu",
      "Nôn ói", "Ho", "Xuất viện", "Khai báo",
    ],
  },
  {
    id: "chao-hoi",
    title: "Chào hỏi & lịch sự",
    emoji: "👋",
    color: "yellow",
    words: [
      "Chào", "Cảm ơn", "Xin lỗi", "Xin phép", "Mời vào",
      "Đồng ý", "Vâng lời", "Chấp nhận",
    ],
  },
  {
    id: "cam-xuc",
    title: "Cảm xúc",
    emoji: "❤️",
    color: "purple",
    words: [
      "An ủi", "Băn khoăn", "Lo lắng", "Ghét", "Thương", "Thích",
      "Hâm mộ", "Xúc động", "Nhớ", "Cám dỗ", "Khóc", "Ăn mừng",
    ],
  },
  {
    id: "con-nguoi",
    title: "Con người & quan hệ",
    emoji: "👨‍👩‍👧",
    color: "blue",
    words: [
      "Tôi", "Chúng ta", "Họ", "Bạn thân", "Học sinh", "Kết hôn",
      "Hy sinh", "Nói xấu", "San sẻ", "Ủng hộ", "Giúp",
    ],
  },
  {
    id: "co-the",
    title: "Cơ thể",
    emoji: "🧍",
    color: "orange",
    words: ["Bàn tay", "Ngón tay", "Đầu", "Cơ thể"],
  },
  {
    id: "an-uong",
    title: "Ăn uống & con vật",
    emoji: "🍚",
    color: "green",
    words: ["Ăn", "Uống", "Thức ăn", "Rau", "Chén", "Cá", "Con gấu", "Nhện"],
  },
  {
    id: "thoi-gian",
    title: "Thời gian",
    emoji: "🕐",
    color: "blue",
    words: ["Ban ngày", "Ban đêm", "Hôm nay", "Chiều", "Trưa", "Tối"],
  },
  {
    id: "di-chuyen",
    title: "Di chuyển & nơi chốn",
    emoji: "🚗",
    color: "yellow",
    words: [
      "Đi", "Chạy", "Xe máy", "Xe đạp", "Ô tô", "Rẽ phải", "Rẽ trái",
      "Phía sau", "Xa", "Đâu", "Nhà", "Trường học", "Thăm", "Chậm lại",
    ],
  },
  {
    id: "hoat-dong",
    title: "Hoạt động & động từ",
    emoji: "✍️",
    color: "pink",
    words: [
      "Biết", "Cần", "Cho", "Mua", "Nghe", "Nói", "Nghỉ ngơi", "Tập luyện",
      "Thức dậy", "Dạy dỗ", "Phỏng vấn", "Biếu tặng", "Sử dụng", "Áp dụng",
      "Có thể", "Dễ", "Nặng", "Nhầm", "Thất lạc", "Phạt", "Bế mạc", "Đẹp",
    ],
  },
];

// Dựng danh sách bài học từ labels thực tế (chỉ giữ từ có trong labels).
export function buildLessons(labels: string[]): Lesson[] {
  const set = new Set(labels);
  const used = new Set<string>();
  const lessons: Lesson[] = [];

  for (const t of TOPICS) {
    const words: string[] = [];
    for (const w of t.words) {
      if (set.has(w)) {
        words.push(w);
        used.add(w);
      }
    }
    if (words.length) lessons.push({ ...t, words });
  }

  const leftover = labels.filter((w) => !used.has(w));
  if (leftover.length) {
    lessons.push({
      id: "tong-hop",
      title: "Tổng hợp",
      emoji: "🗂️",
      color: "purple",
      words: leftover,
    });
  }
  return lessons;
}

export function findLesson(labels: string[], id: string): Lesson | undefined {
  return buildLessons(labels).find((l) => l.id === id);
}
