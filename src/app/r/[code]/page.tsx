"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { naira, parseReplyLocal } from "@/lib/collections";
import type { DebtReply } from "@/lib/constants";

const QUICK = [
  { label: "I'll pay by Friday", phrase: "I will pay by Friday" },
  { label: "I'll pay part this week", phrase: "I will pay a part this week" },
  { label: "I already paid", phrase: "I already paid" },
  { label: "This isn't my debt", phrase: "This is not my debt" },
];

const LS_REPLIES = "ledgerly_replies";
const LS_BIZ = "ledgerly_business";

export default function ReplyLinkPage() {
  const params = useParams<{ code: string }>();
  const search = useSearchParams();
  const code = decodeURIComponent(params?.code ?? "");
  const businessName = search?.get("name") ?? "";
  const debtorName = search?.get("debtor") ?? "";
  const amount = useMemo(() => {
    const raw = search?.get("amount");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [search]);

  const [picked, setPicked] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [partAmount, setPartAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    let body = custom.trim() || picked || "";
    const amt = Math.round(Number(partAmount) || 0);
    if (amt > 0 && body && !body.includes("₦")) body = `${body} ${naira(amt)}`;
    return body;
  };

  const submit = async () => {
    const text = buildText();
    if (!text || !code) return;
    setBusy(true);
    try {
      const res = await fetch("/api/owed/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, text }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        parsed?: ReturnType<typeof parseReplyLocal>;
        demo?: boolean;
        persisted?: boolean;
      };
      if (data?.ok && data.demo && data.parsed) mirrorReplyLocal(code, text, data.parsed);
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const copyForBusiness = async () => {
    const text = buildText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  if (!code) {
    return <Centered>This reply link is not valid.</Centered>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAF9] px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-4 text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#DDF5EA] text-xl font-extrabold text-[#0F5132]">
            L
          </span>
          <h1 className="mt-2 text-[18px] font-extrabold text-[#0F5132]">Ledgerly — debt reply</h1>
        </div>

        {done ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <CheckCircle2 size={40} className="mx-auto text-[#167C5A]" />
            <h2 className="mt-3 text-[18px] font-extrabold text-[#0F5132]">Thanks — reply received</h2>
            <p className="mt-1 text-[14px] text-gray-600">
              {businessName ? `${businessName} ` : "The business "}
              has been told:“{buildText()}” It goes straight into your repayment record.
            </p>
            <div className="mt-4 rounded-xl bg-[#F8FAF9] px-3 py-2 text-left text-[13px] text-gray-600">
              <p className="font-bold text-[#0F5132]">What you said</p>
              <p className="mt-0.5">{buildText()}</p>
            </div>
            <Button className="mt-4 w-full" onClick={copyForBusiness}>
              {copied ? "Copied ✓" : "Copy my reply"}
            </Button>
            <p className="mt-3 text-[12px] text-gray-400">
              Need more time? Just tap this link again to update your answer.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-[16px] font-extrabold text-[#0F5132]">
              {debtorName ? `${debtorName}, ` : ""}hello!
            </h2>
            <p className="mt-1 text-[14px] text-gray-600">
              {businessName ? `${businessName} ` : "We "}are chasing up an outstanding balance
              {amount != null && (
                <>
                  {" "}of <b className="text-[#0F5132]">{naira(amount)}</b>
                </>
              )}
              . When can you sort it?
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              {QUICK.map((q) => (
                <button
                  key={q.phrase}
                  onClick={() => {
                    setPicked(q.phrase);
                    setCustom("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-left text-[14px] font-semibold transition-colors ${
                    picked === q.phrase && !custom
                      ? "border-[#167C5A] bg-[#DDF5EA] text-[#0F5132]"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            {(picked === "I will pay a part this week" || /part/i.test(picked ?? "")) && (
              <div className="mt-3">
                <label className="text-[13px] font-bold text-gray-600">Amount you can pay now (₦)</label>
                <input
                  value={partAmount}
                  onChange={(e) => setPartAmount(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 5000"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-[#167C5A]"
                />
              </div>
            )}

            <label className="mt-4 block text-[13px] font-bold text-gray-600">Or say it your own way</label>
            <textarea
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setPicked(null);
              }}
              rows={2}
              placeholder="e.g. “Sorry, I go pay you by month end.”"
              className="mt-1 min-h-[66px] w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] focus:border-[#167C5A]"
            />

            <Button
              className="mt-4 w-full"
              onClick={submit}
              disabled={busy || !buildText()}
            >
              {busy ? "Sending…" : "Send my answer"}
            </Button>
            <p className="mt-3 text-center text-[12px] text-gray-400">
              You can ignore this message — it just needs a quick yes or when.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[12px] text-gray-400">
          Sent from <Link href="/" className="font-semibold text-[#167C5A]">Ledgerly</Link>
        </p>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center text-gray-500">{children}</div>
    </div>
  );
}

/** Demo mode bridge: when the reply page runs in the merchant's OWN browser,
 *  mirror the parsed reply into the same localStorage the store reads, so the
 *  reply inbox updates instantly. The code IS the transaction id. */
function mirrorReplyLocal(
  code: string,
  text: string,
  parsed: ReturnType<typeof parseReplyLocal>
) {
  try {
    const bizRaw = localStorage.getItem(LS_BIZ);
    const bizId = bizRaw ? (JSON.parse(bizRaw) as { id: string }).id : "biz_demo";
    const existing = JSON.parse(localStorage.getItem(LS_REPLIES) ?? "[]") as DebtReply[];
    if (existing.some((r) => r.transaction_id === code && r.status === "draft")) return;
    const reply: DebtReply = {
      id: `rep_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      business_id: bizId,
      transaction_id: code,
      raw_text: parsed.quote,
      intent: parsed.intent,
      promised_date: parsed.promised_date,
      amount_mentioned: parsed.amount_mentioned,
      confidence: parsed.confidence,
      quote: parsed.quote,
      status: "draft",
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(LS_REPLIES, JSON.stringify([reply, ...existing]));
  } catch {
    /* non-browser or storage unavailable */
  }
}