import { buildKnowledgeBase } from "@/lib/chat-knowledge";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { siteSettings } from "@/data/site-settings";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the AI assistant for ${siteSettings.companyName}, a study-abroad consultancy based in Abuja, Nigeria, embedded as a chat widget on their website. You help Nigerian students and parents with general questions about studying in the UK, Ireland, Germany, Canada, the USA and Australia, and about Baseline's services.

STRICT RULES: never break these:
1. Never promise, guarantee, or imply a specific admission, scholarship, or visa outcome. Outcomes are always decided by third parties (universities, immigration authorities, scholarship bodies).
2. Never give legal or immigration advice as if it were authoritative. You can explain general processes, but always recommend confirming specifics with a Baseline counsellor or the relevant official source, since rules change.
3. Never invent Baseline-specific facts: no specific partner university names, no fees or prices beyond what's in your knowledge base, no success/placement statistics. If asked for these, say they're not published yet and offer to connect the visitor with a counsellor.
4. If you don't know something, say so plainly rather than guessing.
5. Keep answers concise, warm, and in plain English. This is a chat widget, not an essay.
6. After a few genuine exchanges, or as soon as the visitor shows real intent (mentions applying, booking, budget, timelines, or asks to talk to someone), politely ask for their name and WhatsApp number so a human counsellor can follow up, and mention you can save their conversation. Only ask once per conversation.
7. Always be ready to hand off to a human. Mention that they can also reach the team directly on WhatsApp at any point.

Use the following knowledge base as your source of truth for Baseline's services and general destination/process information:

${buildKnowledgeBase()}`;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`chat:${ip}`, { limit: 20, windowMs: 10 * 60_000 }).allowed) {
    return new Response("Too many messages. Please try again in a few minutes, or reach us on WhatsApp.", { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      "The AI assistant isn't configured yet. Please reach us directly on WhatsApp or book a free consultation.",
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const messages = body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Invalid request", { status: 400 });
  }

  // Gemini requires the conversation to start on a "user" turn — the widget's
  // locally-seeded greeting is an assistant message with no prior user turn,
  // so drop any leading assistant messages before truncating/mapping.
  const recent = messages.slice(-MAX_HISTORY) as { role: string; content: string }[];
  const firstUserIndex = recent.findIndex((m) => m.role === "user");
  const trimmedHistory = (firstUserIndex === -1 ? [] : recent.slice(firstUserIndex)).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content ?? "").slice(0, MAX_MESSAGE_LENGTH) }],
  }));

  if (trimmedHistory.length === 0) {
    return new Response("Invalid request", { status: 400 });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: trimmedHistory,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      },
    );
  } catch (err) {
    console.error("[chat] upstream request failed", err);
    return new Response("Something went wrong. Please try again or reach us on WhatsApp.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const errorBody = await upstream.text().catch(() => "");
    console.error("[chat] upstream error", upstream.status, errorBody);
    return new Response("Something went wrong. Please try again or reach us on WhatsApp.", { status: 502 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const parts = parsed?.candidates?.[0]?.content?.parts;
              const delta = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? "").join("") : "";
              if (delta.length > 0) {
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // Skip malformed SSE chunks rather than failing the whole stream.
            }
          }
        }
        controller.close();
      } catch (err) {
        console.error("[chat] stream error", err);
        controller.error(err);
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
