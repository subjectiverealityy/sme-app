"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CircleDollarSign, MessageSquareText, Plus, Users } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";
import { useStore } from "@/lib/store";
import { buildDebtReport, totalOwedAll, naira, ageLabel } from "@/lib/collections";

export default function OwedPage() {
  const { business, transactions, debtPayments, debtReminders, debtReplies, loading } = useStore();

  const report = useMemo(
    () => buildDebtReport(transactions, debtPayments, debtReminders, debtReplies),
    [transactions, debtPayments, debtReminders, debtReplies]
  );
  const total = useMemo(() => totalOwedAll(report), [report]);
  const noPhone = report.filter((r) => !r.phone.ok);
  const ready = report.filter((r) => r.phone.ok);

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-up">
      <div className="flex items-center gap-2">
        <CircleDollarSign size={20} className="text-[#167C5A]" />
        <h1 className="text-[22px] font-extrabold text-[#0F5132]">Who owes me</h1>
      </div>
      <p className="mt-0.5 text-[13px] text-gray-500">
        Everyone who bought from {business?.name || "your business"} on credit.
      </p>

      <div className="mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F5132] to-[#167C5A] p-5 text-white">
        <p className="text-[13px] font-bold text-white/80">TOTAL OUTSTANDING</p>
        <p className="mt-1 text-[32px] font-extrabold leading-none">{naira(total)}</p>
        <p className="mt-2 text-[13px] text-white/80">
          from <b>{report.length}</b> {report.length === 1 ? "person" : "people"}
          {ready.length > 0 && <> · <b>{ready.length}</b> ready for WhatsApp</>}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {report.length > 0 && ready.length > 0 && (
            <Link
              href="/owed/queue"
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-[#0F5132] transition hover:scale-[1.01]"
            >
              <MessageSquareText size={18} /> Send reminders · swipe mode
            </Link>
          )}
          <Link
            href="/transactions/new?type=income"
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-white/20"
          >
            <Plus size={16} /> Record a sale on credit
          </Link>
        </div>
      </div>

      {noPhone.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          ⚠️ <b>{noPhone.length}</b> {noPhone.length === 1 ? "person has" : "people have"} no phone number — WhatsApp
          reminders need one. Add a number on their card.
        </div>
      )}

      {report.length === 0 ? (
        <div className="mt-4">
          <Card className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DDF5EA] text-xl">
              <Users size={22} className="text-[#167C5A]" />
            </div>
            <h3 className="font-extrabold text-[#0F5132]">No one owes you right now</h3>
            <p className="mt-1 max-w-[280px] text-[14px] text-gray-600">
              When you sell on credit, whoever hasn’t paid yet will show up here with a WhatsApp reminder ready to send.
            </p>
            <Link
              href="/transactions/new?type=income"
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] px-5 font-semibold text-white"
            >
              Record a credit sale
            </Link>
          </Card>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-gray-500">DEBTORS</h2>
            <span className="text-[13px] font-bold text-gray-400">{report.length}</span>
          </div>
          {report.map((row) => (
            <Link key={row.key} href={`/owed/${encodeURIComponent(row.key)}`}>
              <Card className="flex items-center gap-3 !py-3 transition hover:shadow-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DDF5EA] text-lg font-extrabold text-[#0F5132]">
                  {row.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{row.name}</span>
                    <Badge tone={row.chip.tone}>{row.chip.label}</Badge>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-gray-500">
                    {naira(row.totalOwed)} · oldest {ageLabel(row.oldestDays).toLowerCase()}
                    {row.overdueCount > 0 && ` · ${row.overdueCount} overdue`}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  {row.phone.ok ? (
                    <Badge tone="green">WhatsApp ready</Badge>
                  ) : (
                    <Badge tone="neutral">no phone</Badge>
                  )}
                  <span className="text-gray-300"><ArrowRight size={18} /></span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-2xl bg-[#DDF5EA] px-4 py-3 text-[13px] text-[#0F5132]">
        💡 <b>How it works:</b> pick a reminder message, we open WhatsApp with it pre-filled, and your conversation is
        tracked here — no chatting behind your back.
      </div>
    </div>
  );
}