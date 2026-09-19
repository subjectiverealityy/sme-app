"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Trash2, X, MessageCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { SUGGESTED_QUESTIONS } from "@/lib/constants";
import { useStore } from "@/lib/store";
import { useAiChats, type ChatMsg } from "@/lib/aiChats";
import { formatDate, formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PendingDraft {
  sessionId: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  payment_status: "paid" | "pending" | "credit";
  customer_or_vendor?: string;
}

export default function AskPage() {
  const { user, business, transactions, addTransaction } = useStore();
  const ownerKey = business?.id ?? user?.id ?? "guest";
  const { sessions, loaded, newSession, updateSession, deleteSession } = useAiChats(ownerKey, business?.id ?? null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const messages: ChatMsg[] = active?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, activeId]);

  // Auto-select most recent chat once loaded
  useEffect(() => {
    if (loaded && !activeId && sessions.length > 0) setActiveId(sessions[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function startNew() {
    const s = newSession();
    setActiveId(s.id);
    setDrawer(false);
  }

  function pick(id: string) {
    setActiveId(id);
    setDrawer(false);
  }

  function remove(id: string) {
    deleteSession(id);
    if (activeId === id) setActiveId(null);
  }

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setPending(null);
    // ensure a session exists
    let sid = activeId;
    let base: ChatMsg[] = messages;
    if (!sid) {
      const s = newSession();
      sid = s.id;
      setActiveId(sid);
      base = [];
    }
    const withUser = [...base, { role: "user", text: question } as ChatMsg];
    const title = base.length === 0 ? question.slice(0, 42) : active?.title || "Chat";
    updateSession(sid, { messages: withUser, title });
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transactions: transactions.slice(0, 200) }),
      });
      const j = await res.json();
      updateSession(sid, {
        messages: [...withUser, { role: "ai", text: j.answer ?? "Sorry, I could not answer that." }],
        title,
      });
      if (j.action?.kind === "record-transaction" && j.action.draft) {
        const d = j.action.draft;
        setPending({
          sessionId: sid,
          type: d.type === "expense" ? "expense" : "income",
          description: String(d.description || "Sale").slice(0, 80),
          amount: Math.round(Number(d.amount) || 0),
          category: String(d.category || (d.type === "expense" ? "Other" : "Sales")),
          payment_status: ["paid", "pending", "credit"].includes(d.payment_status) ? d.payment_status : "paid",
          customer_or_vendor: d.customer_or_vendor ? String(d.customer_or_vendor) : undefined,
        });
      }
    } catch {
      updateSession(sid, { messages: [...withUser, { role: "ai", text: "Network error. Please try again." }], title });
    } finally {
      setLoading(false);
    }
  }

  async function savePending() {
    if (!pending || saving) return;
    if (!pending.description.trim() || !(pending.amount > 0)) return;
    setSaving(true);
    try {
      const txn = await addTransaction({
        type: pending.type,
        description: pending.description.trim(),
        amount: Math.round(pending.amount),
        category: pending.category,
        transaction_date: new Date().toISOString(),
        payment_status: pending.payment_status,
        customer_or_vendor: pending.customer_or_vendor || undefined,
        source: "manual",
      });
      const sid = pending.sessionId;
      const cur = sessions.find((s) => s.id === sid);
      const msgs = [...(cur?.messages ?? []), { role: "ai", text: `Saved ✓ ${formatNaira(txn.amount)} ${txn.type} (${txn.description}). See it on your dashboard.` } as ChatMsg];
      updateSession(sid, { messages: msgs, title: cur?.title || "Chat" });
      setPending(null);
    } finally {
      setSaving(false);
    }
  }

  const historyPanel = (
    <div className="flex h-full flex-col">
      <button
        onClick={startNew}
        className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#167C5A] px-4 font-bold text-white transition hover:bg-[#0F5132]"
      >
        <Plus size={18} /> New chat
      </button>
      <p className="mt-4 px-1 text-[12px] font-bold uppercase tracking-wide text-gray-400">History</p>
      <div className="nice-scroll mt-1 flex flex-1 flex-col gap-1.5 overflow-y-auto pb-2">
        {!loaded && <p className="px-2 py-3 text-[13px] text-gray-400">Loading chats…</p>}
        {loaded && sessions.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-[13px] text-gray-500">
            No saved chats yet.<br />Start a new one above 👆
          </p>
        )}
        {sessions.map((s) => (
          <div
            key={s.id}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition",
              s.id === activeId
                ? "border-[#167C5A]/40 bg-[#DDF5EA] shadow-sm"
                : "border-gray-100 bg-white hover:border-[#167C5A]/30 hover:bg-gray-50"
            )}
            onClick={() => pick(s.id)}
          >
            <MessageCircle size={16} className="shrink-0 text-[#167C5A]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{s.title}</span>
              <span className="block text-[11px] text-gray-500">
                {s.messages.length} message{s.messages.length === 1 ? "" : "s"} · {formatDate(s.updatedAt)}
              </span>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); remove(s.id); }}
              title="Delete chat"
              aria-label={`Delete ${s.title}`}
              className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600 md:opacity-0 md:group-hover:opacity-100"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[75vh] flex-col py-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open chat history"
          className="rounded-xl border border-gray-200 bg-white p-2.5 md:hidden"
        >
          <Menu size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-extrabold text-[#0F5132]">Ask Ledgerly ✨</h1>
          <p className="truncate text-[13px] text-gray-500">
            {active ? active.title : "Ask questions about your business."}
          </p>
        </div>
        <button
          onClick={startNew}
          aria-label="New chat"
          title="New chat"
          className="rounded-xl bg-[#167C5A] p-2.5 text-white md:hidden"
        >
          <Plus size={19} />
        </button>
      </div>

      <div className="mt-3 min-h-[60vh] flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm md:grid md:grid-cols-[270px_minmax(0,1fr)]">
        {/* Desktop history pane — tinted with a hard right border */}
        <aside className="hidden border-r-2 border-[#167C5A]/15 bg-[#F8FAF9] p-4 md:block">
          <p className="mb-3 flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-wide text-[#0F5132]">
            <MessageCircle size={14} /> Your chats
          </p>
          {historyPanel}
        </aside>

        {/* Chat pane */}
        <div className="flex min-h-[60vh] min-w-0 flex-1 flex-col p-4 md:p-5">
          <div className="border-b border-gray-100 pb-3">
            <p className="truncate text-[15px] font-extrabold text-[#0F5132]">
              {active ? active.title : "New conversation"}
            </p>
            <p className="text-[12px] text-gray-500">Answers come from your real records</p>
          </div>
          {messages.length === 0 && !loading && (
            <Card>
              <p className="font-bold">Try asking:</p>
              <div className="mt-2 flex flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((qq) => (
                  <button key={qq} onClick={() => send(qq)} className="rounded-xl bg-[#F8FAF9] px-3 py-2.5 text-left text-[14px] hover:bg-[#DDF5EA]">
                    “{qq}”
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
            {pending && pending.sessionId === active?.id && (
              <div className="self-start w-full max-w-[95%] rounded-2xl border border-[#167C5A]/30 bg-[#DDF5EA]/40 p-3.5 animate-fade-up">
                <p className="text-[13px] font-bold uppercase tracking-wide text-[#0F5132]">Save this transaction?</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="col-span-2 block">
                    <span className="text-[12px] font-semibold text-gray-500">What</span>
                    <input
                      value={pending.description}
                      onChange={(e) => setPending({ ...pending, description: e.target.value })}
                      className="mt-0.5 min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3 text-[14px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-gray-500">Amount (₦)</span>
                    <input
                      value={String(pending.amount)}
                      inputMode="numeric"
                      onChange={(e) => setPending({ ...pending, amount: Number(e.target.value.replace(/,/g, "")) || 0 })}
                      className="mt-0.5 min-h-[44px] w-full rounded-xl border border-gray-200 bg-white px-3 text-[14px]"
                    />
                  </label>
                  <div className="text-[14px]">
                    <span className="text-[12px] font-semibold text-gray-500">Details</span>
                    <p className="mt-0.5 font-bold">
                      {pending.type === "income" ? "💰 Money in" : "🧾 Money out"} · {pending.payment_status}
                      {pending.customer_or_vendor ? ` · ${pending.customer_or_vendor}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPending(null)}
                    className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 text-[14px] font-bold text-gray-600"
                  >
                    Discard
                  </button>
                  <button
                    onClick={savePending}
                    disabled={saving}
                    className="min-h-[44px] rounded-xl bg-[#167C5A] px-4 text-[14px] font-bold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save ✓"}
                  </button>
                </div>
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
      </div>

      {/* Mobile history drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} />
          <div className="absolute bottom-0 left-0 top-0 w-[300px] bg-[#F8FAF9] p-4 shadow-2xl animate-fade-up">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-extrabold text-[#0F5132]">Chats</p>
              <button onClick={() => setDrawer(false)} aria-label="Close history" className="rounded-lg p-2 hover:bg-gray-200">
                <X size={18} />
              </button>
            </div>
            {historyPanel}
          </div>
        </div>
      )}
    </div>
  );
}
