"use client";

import { useEffect, useState } from "react";
import { LABELS_URL } from "@/lib/constants";

// Cache theo phiên: labels.json chỉ tải 1 lần, chuyển trang không tải lại.
let cached: Promise<string[]> | null = null;

function fetchLabels(): Promise<string[]> {
  cached ??= fetch(LABELS_URL)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => {
      cached = null; // lỗi mạng thì cho phép thử lại ở lần mount sau
      return [];
    });
  return cached;
}

export function useLabels() {
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchLabels().then((data) => {
      if (mounted) {
        setLabels(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { labels, loading };
}
