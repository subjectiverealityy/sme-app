"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, EmptyState, Input, Skeleton } from "@/components/ui";
import { AddFab } from "@/components/AddFab";
import { getCustomers, getPeopleStats, followUpLabel, initials, normalizeName, nudgeText, waLink } from "@/lib/customers";
import { formatDate, formatNaira } from "@/lib/utils";

type Tab = "paid" | "credit" | "interested";

export default function PeoplePage() {
  const { transactions, loading } = useStore();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("paid");

  const customers = useMemo(() => getCustomers(transactions), [transactions]);
  const stats = useMemo(() => getPeopleStats(customers), [customers]);

  const filtered = customers.filter((c) => {
    if (tab === "paid" && (c.totalPaid <= 0 || c.outstanding > 0 || c.interestedAmount > 0)) return false;
    if (tab === "credit" && c.outstanding <= 0) return false;
    if (tab === "interested" && c.interestedAmount <= 0) return false;
    if (q && !c.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  function statusFor(customer: (typeof customers)[number]) {
    if (customer.outstanding > 0) return "Credit";
    if (customer.interestedAmount > 0) return "Interested";
    return "Paid";
  }

  function reminderLink(customer: (typeof customers)[number]) {
    if (!customer.phone) return null;
    const message = customer.outstanding > 0
      ? nudgeText(customer.name, customer.outstanding, "my business")
      : `Hello ${customer.name.split(" ")[0]} 👋, just checking in about ${customer.txns[0]?.description ?? "your request"}. Let me know if you would still like to go ahead. Thank you!`;
    return waLink(customer.phone, message);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <Skeleton className="h-8 w-1/2" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "paid", label: "Paid", count: stats.paidCount },
    { id: "credit", label: "Credit", count: stats.creditCount },
    { id: "interested", label: "Interested", count: stats.interestedCount },
  ];

  return (
    <div className="py-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#272047]">People</h1>
        {stats.totalOutstanding > 0 && (
          <span className="rounded-full bg-[#fce0d3] px-3 py-1.5 text-[13px] font-bold text-[#b6533a]">
            Owed {formatNaira(stats.totalOutstanding)}
          </span>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-gray-500">
        Keep every customer, balance, and next step visible.
      </p>

      <div className="mt-3">
        <Input placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-2 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl px-3 py-2.5 text-[14px] font-bold transition ${
              tab === t.id ? "bg-[#29224e] text-white shadow" : "bg-white text-gray-500"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={
              customers.length === 0
                ? "No customers yet."
                : tab === "paid" ? "No paid debtors yet." : tab === "credit" ? "Nobody is on credit." : "No interested customers yet."
            }
            body={
              customers.length === 0
                ? "Add a debtor and they will appear here."
                : "Try a different category or search."
            }
            action={
              customers.length === 0 ? (
                <Link
                  href="/transactions/new"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#29224e] px-5 font-semibold text-white"
                >
                  Add debtor
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
        <Card className="mt-3 !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-gray-100 bg-[#faf7f2] text-[12px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-bold">Debtor</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Amount</th>
                  <th className="px-4 py-3 font-bold">Last activity</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const reminder = reminderLink(c);
                  const status = statusFor(c);
                  return (
                    <tr key={c.key} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d9f5ed] text-[11px] font-extrabold text-[#272047]">{initials(c.name)}</span>
                          <span className="min-w-0"><span className="block truncate font-bold">{c.name}</span><span className="block text-[12px] text-gray-500">{c.phone ?? "No phone saved"}</span></span>
                        </span>
                      </td>
                      <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-bold ${status === "Credit" ? "bg-[#fce0d3] text-[#b6533a]" : status === "Interested" ? "bg-[#d9f5ed] text-[#0b938e]" : "bg-gray-100 text-gray-600"}`}>{status}</span></td>
                      <td className="px-4 py-3 font-extrabold text-[#272047]">{status === "Credit" ? formatNaira(c.outstanding) : status === "Interested" ? formatNaira(c.interestedAmount) : "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.outstanding > 0 ? followUpLabel(c) : formatDate(c.lastDate)}</td>
                      <td className="px-4 py-3"><span className="flex justify-end gap-1.5">
                        <Link href={`/people/${encodeURIComponent(normalizeName(c.name))}`} title="View details" aria-label={`View ${c.name}`} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-gray-500 hover:bg-[#d9f5ed] hover:text-[#272047]"><Eye size={17} /><span className="hidden xl:inline text-[12px] font-bold">View</span></Link>
                        {reminder ? <a href={reminder} target="_blank" rel="noopener noreferrer" title="Send WhatsApp reminder" aria-label={`Remind ${c.name} on WhatsApp`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#d9f5ed] p-2 text-[#0b938e] hover:bg-[#bfeee2]"><MessageCircle size={17} /><span className="hidden xl:inline text-[12px] font-bold">Remind</span></a> : <span title="Add a phone number to remind" className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-gray-100 p-2 text-gray-300"><MessageCircle size={17} /><span className="hidden xl:inline text-[12px] font-bold">Remind</span></span>}
                      </span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-2 text-[12px] text-gray-500">Choose View for the full record, or Remind to open a prefilled WhatsApp message.</p>
        </>
      )}
      <AddFab />
    </div>
  );
}
