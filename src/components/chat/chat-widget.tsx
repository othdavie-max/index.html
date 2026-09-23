"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, ShieldCheck, X } from "lucide-react";
import { openWhatsApp } from "@/lib/whatsapp";
import { trackEvent } from "@/lib/analytics";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_INPUT_LENGTH = 1000;
const LEAD_PROMPT_AFTER_USER_MESSAGES = 3;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm the Baseline assistant. Ask me anything about studying abroad or our services. I'll do my best to help, and can connect you with a real counsellor any time." },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showLeadPrompt, setShowLeadPrompt] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadDismissed, setLeadDismissed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function sendMessage(text: string) {
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    trackEvent("ai_chat_message_sent");

    if (!leadCaptured && !leadDismissed && nextMessages.filter((m) => m.role === "user").length >= LEAD_PROMPT_AFTER_USER_MESSAGES) {
      setShowLeadPrompt(true);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const errorText = await res.text().catch(() => "Something went wrong. Please try again or reach us on WhatsApp.");
        setMessages((prev) => [...prev, { role: "assistant", content: errorText }]);
        setStreaming(false);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again or reach us on WhatsApp." }]);
    } finally {
      setStreaming(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    void sendMessage(text);
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className="fixed bottom-40 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink-900 text-white shadow-lg shadow-ink-900/30 sm:bottom-24 sm:right-6"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-x-4 bottom-[14.5rem] z-40 flex h-[70vh] max-h-[560px] flex-col overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-2xl sm:inset-x-auto sm:bottom-[10.5rem] sm:right-6 sm:w-[380px]"
          >
            <div className="flex items-center justify-between bg-ink-900 px-4 py-3.5">
              <div>
                <p className="font-display text-sm text-white">Baseline Assistant</p>
                <p className="text-[11px] text-white/50">Usually replies instantly</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-gold-500 text-ink-900" : "bg-offwhite text-ink-900"
                    }`}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              ))}

              {showLeadPrompt && !leadCaptured && (
                <LeadPrompt
                  onDismiss={() => {
                    setShowLeadPrompt(false);
                    setLeadDismissed(true);
                  }}
                  onSuccess={() => {
                    setShowLeadPrompt(false);
                    setLeadCaptured(true);
                  }}
                  transcript={messages}
                />
              )}
            </div>

            <div className="border-t border-ink-900/8 px-4 py-2">
              <button
                type="button"
                onClick={() => openWhatsApp("Hi Baseline, I've been chatting with your AI assistant and would like to speak with a human counsellor.", "ai-chat-widget")}
                className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-ink-900/10 py-2 text-xs font-medium text-ink-900 hover:bg-offwhite"
              >
                Talk to a human on WhatsApp
              </button>
              <form onSubmit={onSubmit} className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                  placeholder="Ask a question…"
                  disabled={streaming}
                  className="flex-1 rounded-full border border-ink-900/12 px-4 py-2.5 text-sm outline-none focus:border-gold-500 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={streaming || !input.trim()}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500 text-ink-900 hover:bg-gold-600 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted">
                General guidance only, not a guarantee of any outcome. See our{" "}
                <a href="/privacy-policy" className="underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function LeadPrompt({
  onDismiss,
  onSuccess,
  transcript,
}: {
  onDismiss: () => void;
  onSuccess: () => void;
  transcript: ChatMessage[];
}) {
  const [values, setValues] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, source: "ai-chat", payload: { transcript } }),
      });
      if (!res.ok) throw new Error();
      trackEvent("ai_chat_lead_captured");
      onSuccess();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
        <ShieldCheck size={13} className="text-gold-500" /> Want a counsellor to follow up?
      </p>
      <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-2">
        <input
          required
          placeholder="Name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-xs outline-none focus:border-gold-500"
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          className="rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-xs outline-none focus:border-gold-500"
        />
        <input
          required
          type="tel"
          placeholder="WhatsApp number"
          value={values.phone}
          onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
          className="rounded-lg border border-ink-900/12 bg-white px-3 py-2 text-xs outline-none focus:border-gold-500"
        />
        {status === "error" && <p className="text-[11px] text-danger-500">Something went wrong. Please try again.</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={status === "loading"} className="flex-1 rounded-full bg-gold-500 py-1.5 text-xs font-medium text-ink-900 hover:bg-gold-600 disabled:opacity-60">
            {status === "loading" ? "Sending…" : "Share my details"}
          </button>
          <button type="button" onClick={onDismiss} className="rounded-full border border-ink-900/10 px-3 py-1.5 text-xs text-muted hover:bg-white">
            Not now
          </button>
        </div>
      </form>
    </div>
  );
}
