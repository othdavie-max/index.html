import Anthropic from "@anthropic-ai/sdk";
import { buildKnowledgeBase } from "@/lib/chat-knowledge";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { siteSettings } from "@/data/site-settings";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `You are the AI assistant for ${siteSettings.companyName}, a study-abroad consultancy based in Abuja, Nigeria, embedded as a chat widget on their website. You help Nigerian students and parents with general questions about studying in the UK, Ireland, Germany, Canada, the USA and Australia, and about Baseline's services.

STRICT RULES — never break these:
1. Never promise, guarantee, or imply a specific admission, scholarship, or visa outcome. Outcomes are always decided by third parties (universities, immigration authorities, scholarship bodies).
2. Never give legal or immigration advice as if it were authoritative — you can explain general processes, but always recommend confirming specifics with a Baseline counsellor or the relevant official source, since rules change.
3. Never invent Baseline-specific facts: no specific partner university names, no fees or prices beyond what's in your knowledge base, no success/placement statistics. If asked for these, say they're not published yet and offer to connect the visitor with a counsellor.
4. If you don't know something, say so plainly rather than guessing.
5. Keep answers concise, warm, and in plain English — this is a chat widget, not an essay.
6. After a few genuine exchanges, or as soon as the visitor shows real intent (mentions applying, booking, budget, timelines, or asks to talk to someone), politely ask for their name and WhatsApp number so a human counsellor can follow up, and mention you can save their conversation. Only ask once per conversation.
7. Always be ready to hand off to a human — mention that they can also reach the team directly on WhatsApp at any point.

Use the following knowledge base as your source of truth for Baseline's services and general destination/process information:

${buildKnowledgeBase()}`;

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  if (!rateLimit(`chat:${ip}`, { limit: 20, windowMs: 10 * 60_000 }).allowed) {
    return new Response("Too many messages. Please try again in a few minutes, or reach us on WhatsApp.", { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
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

  const trimmedHistory = messages.slice(-MAX_HISTORY).map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(m.content ?? "").slice(0, MAX_MESSAGE_LENGTH),
  }));

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const anthropicStream = client.messages.stream({
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: trimmedHistory,
      });

      anthropicStream.on("text", (textDelta) => {
        controller.enqueue(encoder.encode(textDelta));
      });
      anthropicStream.on("end", () => controller.close());
      anthropicStream.on("error", (err) => {
        console.error("[chat] stream error", err);
        controller.error(err);
      });
    },
    cancel() {
      // no-op — the SDK stream will be garbage collected
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
