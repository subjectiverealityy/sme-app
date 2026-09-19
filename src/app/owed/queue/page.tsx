"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MoveLeft, MoveRight, PartyPopper } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { useStore } from "@/lib/store";
import type { DebtorRow, ReminderLanguage } from "@/lib/collections";
import {
  appendReplyLink,
  buildDebtReport,
  buildPromiseFollowUpMessage,
  buildReminderMessage,
  clampStage,
  longDate,
  naira,
  ageLabel,
  replyLink,
  rowBrokenPromise,
  waLink,
} from "@/lib/collections";
import { ComposeMessage, ConfirmButtons, LanguageToggle, Sheet, StagePill } from "@/components/owed/ReminderCompose";

type Action = "skip" | "remind";

/** The debt a reminder targets: a broken promise first (so the follow-up
 *  references the right amount + date), otherwise the oldest debt. */
const repDebt = (row: DebtorRow) =>
  rowBrokenPromise(row)?.debt ?? [...row.debts].sort((a, b) => a.daysOld - b.daysOld)[0];

const stageFor = (row: DebtorRow) => {
  const debt = repDebt(row);
  if (!debt) return 1;
  return rowBrokenPromise(row) ? Math.max(debt.reminders.nextStage, 2) : debt.reminders.nextStage;
};

export default function OwedQueuePage() {
  const { business, transactions, debtPayments, debtReminders, debtReplies, logReminder } = useStore();
  const report = useMemo(
    () => buildDebtReport(transactions, debtPayments, debtReminders, debtReplies),
    [transactions, debtPayments, debtReminders, debtReplies]
  );
  const queue = useMemo(
    () =>
      report
        .filter((r) => r.phone.ok)
        .sort((a, b) => {
          const ba = rowBrokenPromise(a);
          const bb = rowBrokenPromise(b);
          return Number(!!bb) - Number(!!ba) || b.totalOwed - a.totalOwed;
        }),
    [report]
  );
  const [index, setIndex] = useState(0);
  const [off, setOff] = useState<Record<string, Action>>({});
  const [language, setLanguage] = useState<ReminderLanguage>("english");
  const [confirming, setConfirming] = useState<DebtorRow | null>(null);
  const [message, setMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  const doneCount = Object.keys(off).length;
  const current = queue[index];

  const reminderInputs = useCallback(
    (row: DebtorRow) => {
      const debt = repDebt(row);
      return {
        businessName: business?.name ?? "our business",
        customerName: row.name,
        amount: debt?.balance ?? row.totalOwed,
        dateLabel: debt?.transaction.transaction_date
          ? new Date(debt.transaction.transaction_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
          : "last month",
        stage: stageFor(row),
        language,
        paymentDetails: business?.payment_details ?? "",
        daysOverdue: row.oldestDays,
      };
    },
    [business, language]
  );

  const openRemind = () => {
    if (!current) return;
    const broken = repDebt(current) ? rowBrokenPromise(current) : null;
    const inputs = reminderInputs(current);
    setMessage(
      broken && broken.fu.promisedDate
        ? buildPromiseFollowUpMessage({
            ...inputs,
            promisedDate: broken.fu.promisedDate,
            daysLate: broken.fu.daysLate,
          })
        : buildReminderMessage(inputs)
    );
    setConfirming(current);
  };

  const act = (row: DebtorRow, action: Action) => {
    setOff((m) => ({ ...m, [row.key]: action }));
    setLanguage("english");
    setDragX(0);
    if (index < queue.length - 1) setIndex((i) => i + 1);
  };

  const confirmSend = async () => {
    if (!confirming) return;
    if (!confirming.phone.ok) {
      setConfirming(null);
      return;
    }
    setBusy(true);
    try {
      const debt = repDebt(confirming);
      const stage = clampStage(reminderInputs(confirming).stage);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = replyLink(origin, debt.transaction.id, {
        business: business?.name,
        debtor: confirming.name,
        amount: debt.balance,
      });
      const finalMessage = appendReplyLink(message, link);
      await logReminder({
        transaction_id: debt.transaction.id,
        debtor_name: confirming.name,
        debtor_phone: confirming.phone.e164,
        stage,
        language,
        message: finalMessage,
        status: "sent",
      });
      const linkHref = waLink(confirming.phone.e164, finalMessage);
      act(confirming, "remind");
      setConfirming(null);
      if (typeof window !== "undefined") window.open(linkHref, "_blank");
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (!current) return;
    const inputs = reminderInputs(current);
    void logReminder({
      transaction_id: repDebt(current).transaction.id,
      debtor_name: current.name,
      debtor_phone: current.phone.ok ? current.phone.e164 : "",
      stage: clampStage(inputs.stage),
      language,
      message: buildReminderMessage(inputs),
      status: "skipped",
    });
    act(current, "skip");
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!current) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setDragX(e.clientX - dragStart.current.x);
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    dragStart.current = null;
    const threshold = 90;
    if (dragX > threshold) openRemind();
    else if (dragX < -threshold && current) skip();
    setDragX(0);
  };

  if (queue.length === 0 || doneCount >= queue.length) {
    const total = queue.length;
    const sent = queue.filter((r) => off[r.key] === "remind").length;
    const skipped = queue.filter((r) => off[r.key] === "skip").length;
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        {total === 0 ? (
          <>
            <PartyPopper size={40} className="text-ink" />
            <h1 className="mt-3 text-[22px] font-extrabold text-ink">Nothing to chase</h1>
            <p className="mt-1 max-w-[280px] text-[14px] text-gray-600">
              Nobody with a phone number owes you right now. Add a phone number on a debtor&apos;s card to swipe through
              reminders.
            </p>
            <Link href="/owed" className="mt-4 font-bold text-ink">← Back to Who owes me</Link>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-light text-3xl">✅</div>
            <h1 className="mt-3 text-[22px] font-extrabold text-ink">All caught up!</h1>
            <p className="mt-1 text-[14px] text-gray-600">
              {sent} reminder{sent === 1 ? "" : "s"} sent · {skipped} skipped
            </p>
            <Link href="/owed" className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary px-6 font-semibold text-white">
              Back to Who owes me
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] flex-col py-4">
      <div className="flex items-center justify-between">
        <Link href="/owed" className="text-[14px] font-bold text-ink">← Who owes me</Link>
        <span className="text-[13px] font-bold text-gray-500">
          {Math.min(index + 1, queue.length)} of {queue.length}
        </span>
      </div>

      <p className="mt-2 text-[15px] font-extrabold text-ink">Reminders in swipe mode</p>
      <p className="text-[13px] text-gray-500">Drag the card — right to remind, left to skip.</p>

      <div className="relative mx-auto mt-4 h-[420px] w-full max-w-sm">
        {queue.slice(index, index + 2).map((row, i) => {
          const isTop = i === 0;
          const decided = i === 0 && theDecided(off, row.key);
          return (
            <div
              key={row.key}
              onPointerDown={isTop ? onPointerDown : undefined}
              onPointerMove={isTop ? onPointerMove : undefined}
              onPointerUp={isTop ? onPointerUp : undefined}
              onPointerLeave={isTop ? onPointerUp : undefined}
              className="absolute inset-0 origin-center touch-none select-none"
              style={{
                transform: `rotate(${isTop ? dragX / 22 : 0}deg) translateX(${isTop ? dragX : 0}px)`,
                transition: dragging ? "none" : "transform 250ms ease",
                zIndex: isTop ? 2 : 1,
                scale: isTop ? 1 : 0.97 - i * 0.03,
              }}
            >
              <div
                className={`flex h-full flex-col overflow-hidden rounded-3xl bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] ${
                  decided === "remind" ? "ring-4 ring-primary" : decided === "skip" ? "ring-4 ring-gray-300" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <Badge tone={row.phone.ok ? "green" : "neutral"}>
                    {row.phone.ok ? "WhatsApp ready" : "no phone"}
                  </Badge>
                  {(() => {
                    const broken = rowBrokenPromise(row);
                    if (broken?.fu.promisedDate) {
                      return <Badge tone="red">Promise broke {longDate(broken.fu.promisedDate)}</Badge>;
                    }
                    return (
                      <Badge tone={row.overdueCount > 0 ? "red" : "neutral"}>
                        {row.overdueCount > 0 ? `${row.overdueCount} overdue` : "not overdue"}
                      </Badge>
                    );
                  })()}
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-light text-2xl font-extrabold text-ink">
                    {row.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[19px] font-extrabold">{row.name}</h2>
                    {row.phone.ok && <p className="text-[13px] text-gray-500">+{row.phone.e164}</p>}
                  </div>
                </div>

                <div className="mt-3 flex items-end justify-between rounded-2xl bg-background px-4 py-3">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">Owes you</p>
                    <p className="text-[24px] font-extrabold text-ink">{naira(row.totalOwed)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">Oldest debt</p>
                    <p className="text-[14px] font-bold text-gray-600">{ageLabel(row.oldestDays)}</p>
                  </div>
                </div>

                {row.phone.ok && (
                  <div className="mt-3 flex-1 overflow-hidden">
                    {isTop && (
                      <>
                        <div className="flex items-center gap-2">
                          <StagePill stage={stageFor(row)} />
                          <LanguageToggle language={language} onChange={setLanguage} />
                        </div>
                        <p className="mt-2 line-clamp-3 overflow-hidden text-[13px] text-gray-500">
                          {buildReminderMessage(reminderInputs(row)).split("\n\n")[0]}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={skip} className="!min-h-[52px]">
                    <MoveLeft size={18} /> Skip
                  </Button>
                  <Button onClick={openRemind} className="!min-h-[52px]">
                    <MoveRight size={18} /> Remind
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[12px] text-gray-400">
        Swipe <b>right</b> → open WhatsApp reminder · swipe <b>left</b> → skip them this round
      </p>

      <Sheet
        open={!!confirming}
        title={`Remind ${confirming?.name ?? ""}`}
        onClose={() => setConfirming(null)}
        footer={
          <ConfirmButtons
            onCancel={() => setConfirming(null)}
            onConfirm={confirmSend}
            confirmLabel={busy ? "Opening WhatsApp…" : "Open WhatsApp"}
          />
        }
      >
        {confirming?.phone.ok && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl bg-background px-3 py-2 text-[13px] text-gray-600">
              ✓ WhatsApp number <b>+{confirming.phone.e164}</b>
            </div>
            <ComposeMessage
              inputs={reminderInputs(confirming)}
              value={message}
              onValueChange={setMessage}
              language={language}
              onLanguageChange={setLanguage}
              showReset
            />
          </div>
        )}
      </Sheet>
    </div>
  );
}

function theDecided(off: Record<string, Action>, key: string): Action | null {
  return off[key] ?? null;
}