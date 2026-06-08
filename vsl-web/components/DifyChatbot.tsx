"use client";

import { useEffect } from "react";

const DIFY_TOKEN = process.env.NEXT_PUBLIC_DIFY_TOKEN || "";
const DIFY_BASE_URL = process.env.NEXT_PUBLIC_DIFY_BASE_URL || "http://localhost";

export default function DifyChatbot() {
  useEffect(() => {
    if (!DIFY_TOKEN) return;

    (window as any).difyChatbotConfig = {
      token: DIFY_TOKEN,
      baseUrl: DIFY_BASE_URL,
    };

    const existing = document.getElementById("dify-chatbot-script");
    if (existing) return;

    const script = document.createElement("script");
    script.src = `${DIFY_BASE_URL}/embed.min.js`;
    script.id = "dify-chatbot-script";
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      const s = document.getElementById("dify-chatbot-script");
      if (s) s.remove();
    };
  }, []);

  if (!DIFY_TOKEN) return null;
  return null;
}
