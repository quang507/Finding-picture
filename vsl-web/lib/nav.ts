// Dựng URL các trang ở 1 chỗ — khỏi gõ tay query string rải rác.

export function practiceUrl(word: string, lessonId?: string) {
  const params = new URLSearchParams({ word });
  if (lessonId) params.set("lesson", lessonId);
  return `/practice?${params}`;
}

export function lessonUrl(id: string) {
  return `/lesson?id=${encodeURIComponent(id)}`;
}
