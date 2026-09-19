"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Edit3, MessageSquareText, Phone, Plus } from "lucide-react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { ParsedReply, ReminderLanguage } from "@/lib/collections";
import {
  ageLabel,
  appendReplyLink,
  buildDebtReport,
  buildReminderMessage,
  clampStage,
  naira,
  promiseFollowUp,
  replyLink,
  waLink,
} from "@/lib/collections";
import { ComposeMessage, ConfirmButtons, LanguageToggle, Sheet } from "@/components/owed/ReminderCompose";

const INTENT_LABEL: Record<ParsedReply["intent"], string> = {
  promise_to_pay: "Promised to pay",
  part_payment: "Will pay in parts",
  paid_claim: "Says already paid",
  dispute: "Disputed the debt",
  none: "No clear intent",
};

function dateShort(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function OwedDetailPage() {
  const params = useParams<{ key: string }>();
  const key = decodeURIComponent(params?.key ?? "");
  const {
    business,
    transactions,
    debtPayments,
    debtReminders,
    debtReplies,
    updateTransaction,
    addPayment,
    logReminder,
    saveReply,
    setReplyStatus,
  } = useStore();

  const report = useMemo(
    () => buildDebtReport(transactions, debtPayments, debtReminders, debtReplies),
    [transactions, debtPayments, debtReminders, debtReplies]
  );
  const row = report.find((r) => r.key === key);

  const [langs, setLangs] = useState<Record<string, ReminderLanguage>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null); // txn id
  const [busy, setBusy] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [editPhone, setEditPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [replyText, setReplyText] = useState("");
  const [parsing, setParsing] = useState(false);

  if (!row) {
    return (
      <div className="py-10 text-center">
        <p className="font-bold">This person doesn&apos;t owe you anything right now.</p>
        <Link href="/owed" className="mt-2 inline-block font-bold text-[#167C5A]">← Back to Who owes me</Link>
      </div>
    );
  }

  const inputsFor = (txnId: string) => {
    const debt = row.debts.find((d) => d.transaction.id === txnId)!;
    const language = langs[txnId] ?? "english";
    return {
      businessName: business?.name ?? "our business",
      customerName: row.name,
      amount: debt.balance,
      dateLabel: dateShort(debt.transaction.transaction_date) || "last month",
      stage: debt.reminders.nextStage,
      language,
      paymentDetails: business?.payment_details ?? "",
      daysOverdue: debt.daysOld,
    };
  };

  const openConfirm = (txnId: string) => {
    setMessages((m) => ({
      ...m,
      [txnId]: m[txnId] ?? buildReminderMessage(inputsFor(txnId)),
    }));
    setConfirming(txnId);
  };

  const confirmSend = async () => {
    if (!confirming) return;
    const debt = row.debts.find((d) => d.transaction.id === confirming);
    if (!debt) return;
    setBusy(true);
    try {
      const message = messages[confirming] ?? buildReminderMessage(inputsFor(confirming));
      const language = langs[confirming] ?? "english";
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = replyLink(origin, debt.transaction.id, {
        business: business?.name,
        debtor: row.name,
        amount: debt.balance,
      });
      const finalMessage = appendReplyLink(message, link);
      await logReminder({
        transaction_id: debt.transaction.id,
        debtor_name: row.name,
        debtor_phone: row.phone.ok ? row.phone.e164 : "",
        stage: clampStage(debt.reminders.nextStage),
        language,
        message: finalMessage,
        status: "sent",
      });
      if (row.phone.ok) window.open(waLink(row.phone.e164, finalMessage), "_blank");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  };

  const recordPayment = async () => {
    if (!payFor) return;
    const amount = Math.round(Number(payAmount) || 0);
    if (amount <= 0) return;
    await addPayment({
      transaction_id: payFor,
      amount,
      method: payMethod,
      notes: "Recorded from Who owes me",
    });
    setPayFor(null);
    setPayAmount("");
  };

  const markPaid = async (txnId: string) => {
    await updateTransaction(txnId, { payment_status: "paid" });
  };

  const setPhone = async () => {
    const phone = phoneDraft.trim();
    for (const d of row.debts) {
      await updateTransaction(d.transaction.id, { customer_phone: phone });
    }
    setEditPhone(false);
  };

  const understand = async () => {
    const text = replyText.trim();
    if (!text) return;
    setParsing(true);
    try {
      let parsed: ParsedReply | null = null;
      try {
        const res = await fetch("/api/ai/parse-reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, business_name: business?.name }),
        });
        const data = (await res.json()) as { parsed?: ParsedReply; error?: string };
        if (!data.error && data.parsed) parsed = data.parsed;
      } catch {
        parsed = null;
      }
      if (!parsed) {
        const { parseReplyLocal } = await import("@/lib/collections");
        parsed = parseReplyLocal(text);
      }
      await saveReply({
        transaction_id: row.debts[0].transaction.id,
        raw_text: parsed.quote,
        intent: parsed.intent,
        promised_date: parsed.promised_date,
        amount_mentioned: parsed.amount_mentioned,
        confidence: parsed.confidence,
        quote: parsed.quote,
        status: "draft",
      });
      setReplyText("");
      if (parsed.amount_mentioned != null) {
        setPayFor(row.debts[0].transaction.id);
        setPayAmount(String(parsed.amount_mentioned));
        setPayMethod("Bank Transfer");
      }
    } finally {
      setParsing(false);
    }
  };

  const confirmDraft = async (id: string) => {
    await setReplyStatus(id, "confirmed");
  };

  return (
    <div className="py-4 animate-fade-up">
      <Link href="/owed" className="text-[14px] font-bold text-[#167C5A]">← Who owes me</Link>

      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDF5EA] text-2xl font-extrabold text-[#0F5132]">
          {row.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-extrabold text-[#0F5132]">{row.name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
            <span>
              {naira(row.totalOwed)} owed · oldest {ageLabel(row.oldestDays).toLowerCase()}
            </span>
            <Badge tone={row.chip.tone}>{row.chip.label}</Badge>
          </div>
        </div>
      </div>

      <Card className="mt-3 flex items-center gap-2 !py-3">
        <Phone size={16} className="shrink-0 text-[#167C5A]" />
        {row.phone.ok ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">+{row.phone.e164}</span>
            <Button variant="ghost" className="!min-h-[36px] !w-auto !px-2" onClick={() => { setPhoneDraft(row.phoneInput ?? ""); setEditPhone(true); }}>
              <Edit3 size={15} />
            </Button>
          </>
        ) : editPhone ? (
          <>
            <Input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="0801 234 5678"
              inputMode="tel"
              className="!min-h-[40px] flex-1"
              hint=""
            />
            {editPhone && phoneDraft === "" && <Button variant="primary" className="!min-h-[40px] !w-auto !px-3" onClick={setPhone}>Save</Button>}
          </>
        ) : (
          <>
            <span className="flex-1 text-[13px] text-gray-500">No phone number — WhatsApp reminders need one.</span>
            <Button variant="outline" className="!min-h-[24px] !py-1.5 !px-3 !text-[12px]" onClick={() => setEditPhone(true)}>
              Add phone
            </Button>
          </>
        )}
      </Card>

      {row.debts.map((debt) => {
        const txn = debt.transaction;
        const done = debt.balance <= 0;
        const followUp = promiseFollowUp(txn.id, debtReplies);
        return (
          <Card key={txn.id} className="mt-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[16px] font-bold">{txn.description}</p>
                <p className="text-[13px] text-gray-500">
                  {dateShort(txn.transaction_date) || txn.transaction_date} · {debt.daysOld === 0 ? "today" : `${debt.daysOld}d`}
                  {" · "}
                  {naira(debt.balance)} of {naira(txn.amount)}
                </p>
              </div>
              {done ? (
                <Badge tone="green">Paid ✓</Badge>
              ) : (
                <Badge tone={debt.reminders.total > 0 ? "amber" : "neutral"}>
                  {debt.reminders.total} reminder{debt.reminders.total === 1 ? "" : "s"}
                </Badge>
              )}
            </div>

            {debt.reminders.lastSentAt && (
              <p className="mt-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[12px] text-gray-500">
                Last reminded {dateShort(debt.reminders.lastSentAt)} · stage {debt.reminders.nextStage}/3 ·{" "}
                {debt.reminders.canSend ? "can remind again" : "cooling off (max 3 / 14 days)"}
              </p>
            )}

            {!done && followUp.due && (
              <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[13px] font-bold text-[#B91C1C]">
                  Promise was for {dateShort(followUp.promisedDate)} — they&apos;re{" "}
                  {followUp.daysLate === 0 ? "due today" : `${followUp.daysLate} day${followUp.daysLate === 1 ? "" : "s"} late`}.
                </p>
                <Button
                  variant="outline"
                  disabled={!row.phone.ok || !debt.reminders.canSend}
                  className="mt-2 w-full !min-h-[36px] !text-[13px]"
                  onClick={() => {
                    const stage = Math.max(debt.reminders.nextStage, 2);
                    setMessages((m) => ({
                      ...m,
                      [txn.id]: m[txn.id] ?? buildReminderMessage({ ...inputsFor(txn.id), stage }),
                    }));
                    setConfirming(txn.id);
                  }}
                >
                  Send follow-up
                </Button>
                {debt.reminders.canSend === false && (
                  <p className="mt-1 text-[12px] text-gray-500">Cooling off — max 3 reminders per 14 days.</p>
                )}
              </div>
            )}

            {debt.conversation.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {debt.conversation.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-xl px-3 py-2 text-[13px] ${
                      r.status === "draft" ? "border border-amber-300 bg-amber-50" : "bg-[#F8FAF9]"
                    }`}
                  >
                    <span className="font-bold text-[#0F5132]">{INTENT_LABEL[r.intent]}</span>
                    {r.promised_date && <span> · by {dateShort(r.promised_date)}</span>}
                    {r.amount_mentioned != null && <span> · {naira(r.amount_mentioned)}</span>}
                    <span className={`ml-1 text-[11px] font-bold ${r.status === "draft" ? "text-amber-600" : "text-gray-400"}`}>
                      {r.status === "draft" ? "PENDING" : r.status === "confirmed" ? "CONFIRMED" : ""}
                    </span>
                    <p className="mt-0.5 text-gray-600">“{r.quote}”</p>
                    {r.status === "draft" && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button variant="outline" className="!min-h-[36px] !text-[13px]" onClick={() => setReplyStatus(r.id, "dismissed")}>
                          Dismiss
                        </Button>
                        <Button className="!min-h-[36px] !text-[13px]" onClick={() => confirmDraft(r.id)}>
                          Confirm
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 rounded-xl bg-[#F8FAF9] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <MessageSquareText size={15} className="text-[#167C5A]" />
                <span className="flex-1 text-[13px] font-bold text-[#0F5132]">Reminder message</span>
                <LanguageToggle language={langs[txn.id] ?? "english"} onChange={(l) => setLangs((m) => ({ ...m, [txn.id]: l }))} />
              </div>
              <p className="mt-1.5 line-clamp-2 overflow-hidden text-[13px] text-gray-600">
                {buildReminderMessage(inputsFor(txn.id)).split("\n\n")[0]}
              </p>
            </div>

            {!done && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  disabled={!row.phone.ok}
                  onClick={() => setPayFor(txn.id)}
                >
                  <Plus size={16} /> Part pay
                </Button>
                <Button disabled={!row.phone.ok || !debt.reminders.canSend} onClick={() => openConfirm(txn.id)}>
                  <MessageSquareText size={16} /> Remind
                </Button>
                {!row.phone.ok && (
                  <div className="col-span-2 text-[12px] text-gray-400">
                    Add a phone number above to send WhatsApp reminders.
                  </div>
                )}
                <Button variant="ghost" className="col-span-2 !text-[13px]" onClick={() => markPaid(txn.id)}>
                  <Check size={15} /> Mark this debt as fully paid
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      <Card className="mt-4">
        <h2 className="font-extrabold text-[#0F5132]">Reply inbox</h2>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Copy a reply they sent you on WhatsApp — Ledgerly figures out what it means. It stays a draft until you confirm.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="e.g. “Ah Madam, sorry. I go pay you on Friday abeg.”"
            rows={3}
            className="min-h-[72px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-[15px] focus:border-[#167C5A]"
          />
          <Button variant="secondary" onClick={understand} disabled={parsing || !replyText.trim()}>
            {parsing ? "Reading…" : "Understand this reply"}
          </Button>
        </div>
      </Card>

      <Sheet
        open={!!confirming}
        title={`Remind ${row.name}`}
        onClose={() => setConfirming(null)}
        footer={
          <ConfirmButtons
            onCancel={() => setConfirming(null)}
            onConfirm={confirmSend}
            confirmLabel={busy ? "Opening WhatsApp…" : "Open WhatsApp"}
          />
        }
      >
        {confirming && (
          <ComposeMessage
            inputs={inputsFor(confirming)}
            value={messages[confirming] ?? buildReminderMessage(inputsFor(confirming))}
            onValueChange={(v) => setMessages((m) => ({ ...m, [confirming]: v }))}
            language={langs[confirming] ?? "english"}
            onLanguageChange={(l) => setLangs((m) => ({ ...m, [confirming]: l }))}
            showReset
          />
        )}
      </Sheet>

      <Sheet
        open={!!payFor}
        title="Record part payment"
        onClose={() => setPayFor(null)}
        footer={
          <ConfirmButtons onCancel={() => setPayFor(null)} onConfirm={recordPayment} confirmLabel="Record payment" />
        }
      >
        {payFor && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-gray-500">
              Balance on this debt: <b className="text-[#0F5132]">{naira(inputsFor(payFor).amount)}</b>
            </p>
            <Input
              label="Amount received (₦)"
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <Input label="How they paid" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} />
          </div>
        )}
      </Sheet>
    </div>
  );
}