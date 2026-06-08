import { NextRequest } from "next/server";

const DIFY_API_KEY = process.env.DIFY_API_KEY || "";
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || "http://localhost";

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  const body: Record<string, unknown> = {
    inputs: {},
    query: message,
    response_mode: "streaming",
    user: "web-user",
  };
  if (conversationId) body.conversation_id = conversationId;

  const res = await fetch(`${DIFY_BASE_URL}/v1/chat-messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DIFY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Dify API error" }), {
      status: res.status,
    });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
