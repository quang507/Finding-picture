"use client";

import { useEffect, useState } from "react";
import { emptyProgress, loadProgress, type Progress } from "@/lib/progress";

// Khởi tạo rỗng rồi mới đọc localStorage sau khi mount (tránh lệch hydration).
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  useEffect(() => {
    setProgress(loadProgress());
  }, []);
  return [progress, setProgress] as const;
}
