"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function DifyChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, conversationId }),
      });

      if (!res.body) throw new Error("No response body");

      let assistantText = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.event === "message" && data.answer) {
              assistantText += data.answer;
              setMessages((m) => {
                const updated = [...m];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            }
            if (data.conversation_id && !conversationId) {
              setConversationId(data.conversation_id);
            }
          } catch {}
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Xin lỗi, có lỗi xảy ra. Thử lại nhé!" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat bubble button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#2563eb",
          color: "#fff",
          fontSize: 24,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Mở chatbot"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat window */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 90,
            right: 24,
            width: 360,
            height: 480,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9998,
            overflow: "hidden",
            fontFamily: "sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "#2563eb",
              color: "#fff",
              padding: "12px 16px",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            🏠 Nhã Đạt - Tư vấn BĐS
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: "#888", fontSize: 13, textAlign: "center", marginTop: 32 }}>
                Xin chào! Tôi có thể tư vấn bất động sản cho bạn.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user" ? "#2563eb" : "#f1f5f9",
                  color: m.role === "user" ? "#fff" : "#1e293b",
                  borderRadius: 12,
                  padding: "8px 12px",
                  maxWidth: "80%",
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: "flex-start", color: "#888", fontSize: 13 }}>
                Đang trả lời...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", borderTop: "1px solid #e2e8f0", padding: 8, gap: 6 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Nhập câu hỏi..."
              style={{
                flex: 1,
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Gửi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
