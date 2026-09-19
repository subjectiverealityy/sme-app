"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { SUGGESTED_QUESTIONS } from "@/lib/constants";
import { useStore } from "@/lib/store";

interface Msg {
  role: "user" | "ai";
  text: string;
}

export default function AskPage() {
  const { transactions } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transactions: transactions.slice(0, 200) }),
      });
      const j = await res.json();
      setMessages((m) => [...m, { role: "ai", text: j.answer ?? "Sorry, I could not answer that." }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[75vh] flex-col py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">Ask Ledgerly ✨</h1>
      <p className="text-[13px] text-gray-500">Ask questions about your business.</p>

      {messages.length === 0 && (
        <Card className="mt-3">
          <p className="font-bold">Try asking:</p>
          <div className="mt-2 flex flex-col gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-xl bg-[#F8FAF9] px-3 py-2.5 text-left text-[14px] hover:bg-[#DDF5EA]">
                “{q}”
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="nice-scroll mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pb-2">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${m.role === "user" ? "self-end bg-[#167C5A] text-white" : "self-start bg-white shadow-sm"}`}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1 self-start rounded-2xl bg-white px-4 py-3 shadow-sm">
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-[#167C5A]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="sticky bottom-20 mt-2 flex gap-2 md:bottom-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. How much did I make this month?"
          className="min-h-[48px] flex-1 rounded-xl border border-gray-200 bg-white px-4 text-[15px]"
        />
        <Button className="!w-auto px-5" disabled={loading}>Send</Button>
      </form>
    </div>
  );
}
