"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, ScanLine, Sparkles, TrendingUp, TrendingDown, Wallet, Eye, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, EmptyState, Skeleton, Button } from "@/components/ui";
import { AddFab } from "@/components/AddFab";
import { useSidebar } from "@/components/Nav";
import { filterByPreset, summarize, dailySeries } from "@/lib/finance";
import { formatDate, formatNaira, greetingForHour } from "@/lib/utils";

function PageHeader({ name, businessName }: { name: string; businessName?: string }) {
  const { open, setOpen } = useSidebar();
  const initial = (name || "B").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="hidden rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:text-[#0F5132] md:block"
        >
          <Menu size={20} />
        </button>
      )}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#167C5A] text-lg font-extrabold text-white">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[20px] font-extrabold leading-tight md:text-[24px]">
          {greetingForHour()}, {name} 👋
        </h1>
        {businessName && (
          <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-[#DDF5EA] px-2.5 py-0.5 text-[12px] font-bold text-[#0F5132]">
            {businessName}
          </span>
        )}
      </div>
      <Link
        href="/transactions/new?type=income"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#167C5A] px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-[#0F5132]"
      >
        <Plus size={17} /> <span className="hidden sm:inline">Add</span>
      </Link>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: "/transactions/new?type=income", icon: "💰", label: "Record sale", sub: "Money in", bg: "bg-[#DDF5EA]" },
  { href: "/transactions/new?type=expense", icon: "🧾", label: "Add expense", sub: "Money out", bg: "bg-red-50" },
  { href: "/scan", icon: "📷", label: "Scan record", sub: "Digitize paper", bg: "bg-amber-50" },
  { href: "/ask", icon: "✨", label: "Ask AI", sub: "Insights", bg: "bg-violet-50" },
];

export default function DashboardPage() {
  const { user, business, transactions, loading, deleteTransaction } = useStore();
  const router = useRouter();
  const [range, setRange] = useState<"week" | "month" | "year">("month");
  const [delId, setDelId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => filterByPreset(transactions, range), [transactions, range]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const series = useMemo(() => dailySeries(filtered, range === "week" ? 7 : range === "month" ? 14 : 12), [filtered, range]);
  const recent = useMemo(() => [...transactions].sort((a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date)).slice(0, 5), [transactions]);

  const maxVal = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const firstName = (user?.name || "there").split(" ")[0];
  const isProfit = summary.profit >= 0;

  async function confirmDelete() {
    if (!delId) return;
    setDeleting(true);
    try {
      await deleteTransaction(delId);
      setDelId(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
        <Skeleton className="h-44" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="py-6">
        <PageHeader name={firstName} />
        <div className="mt-4">
          <EmptyState title="Set up your business" body="Create your business profile to start." action={<Link href="/onboarding" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] font-semibold text-white">Set up business</Link>} />
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-4 animate-fade-up">
        <PageHeader name={firstName} businessName={business.name} />
        {/* Hero empty state */}
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F5132] to-[#167C5A] p-6 text-center text-white md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-3xl">📒</div>
          <h2 className="mt-3 text-[20px] font-extrabold md:text-[24px]">Your business story starts here.</h2>
          <p className="mx-auto mt-1 max-w-[300px] text-[14px] text-white/80">
            Record your first sale or expense and watch your profit appear.
          </p>
          <Link
            href="/first-transaction"
            className="mx-auto mt-4 block w-full max-w-[300px] rounded-2xl bg-white py-3.5 font-extrabold text-[#0F5132] transition hover:scale-[1.02]"
          >
            Add your first transaction
          </Link>
        </div>

        {/* Quick actions */}
        <h2 className="mt-5 text-[15px] font-extrabold text-gray-500">START WITH ONE TAP</h2>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.label} href={a.href}>
              <Card className="flex items-center gap-3 !p-3.5 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${a.bg}`}>{a.icon}</span>
                <span>
                  <span className="block text-[14px] font-bold leading-tight">{a.label}</span>
                  <span className="block text-[12px] text-gray-500">{a.sub}</span>
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-3 rounded-2xl bg-[#DDF5EA] px-4 py-3 text-[13px] text-[#0F5132]">
          💡 <b>Tip:</b> most owners start by recording today&apos;s sales — it takes about 30 seconds.
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-up">
      <PageHeader name={firstName} businessName={business.name} />

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="border border-[#167C5A]/15 bg-[#DDF5EA] !p-3 md:!p-4">
          <p className="flex items-center gap-1 text-[12px] font-bold text-[#0F5132]"><TrendingUp size={13} /> Money In</p>
          <p className="mt-1 text-[17px] font-extrabold text-[#0F5132] md:text-[22px]">{formatNaira(summary.moneyIn)}</p>
          <p className="text-[11px] text-[#0F5132]/60">{summary.countIn} sale{summary.countIn === 1 ? "" : "s"}</p>
        </Card>
        <Card className="!p-3 md:!p-4">
          <p className="flex items-center gap-1 text-[12px] font-bold text-gray-500"><TrendingDown size={13} /> Money Out</p>
          <p className="mt-1 text-[17px] font-extrabold md:text-[22px]">{formatNaira(summary.moneyOut)}</p>
          <p className="text-[11px] text-gray-400">{summary.countOut} expense{summary.countOut === 1 ? "" : "s"}</p>
        </Card>
        <Card className={`!p-3 md:!p-4 ${isProfit ? "bg-[#0F5132] text-white" : "bg-red-600 text-white"}`}>
          <p className="flex items-center gap-1 text-[12px] font-bold opacity-80"><Wallet size={13} /> {isProfit ? "Profit" : "Loss"}</p>
          <p className="mt-1 text-[17px] font-extrabold md:text-[22px]">{formatNaira(Math.abs(summary.profit))}</p>
          <p className="text-[11px] opacity-70">{isProfit ? "🎉 you're growing" : "spending passed income"}</p>
        </Card>
      </div>

      {summary.owedToYou > 0 && (
        <Link href="/transactions">
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] transition hover:shadow-sm">
            💛 <b>Money you&apos;re owed:</b> {formatNaira(summary.owedToYou)} <span className="font-bold text-[#167C5A]">→ follow up</span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { href: "/transactions/new?type=income", icon: <Plus size={18} />, label: "Income" },
          { href: "/transactions/new?type=expense", icon: <TrendingDown size={18} />, label: "Expense" },
          { href: "/scan", icon: <ScanLine size={18} />, label: "Scan" },
          { href: "/ask", icon: <Sparkles size={18} />, label: "Ask AI" },
        ].map((a) => (
          <Link key={a.label} href={a.href} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 text-[#0F5132] shadow-sm transition hover:bg-[#DDF5EA]">
            {a.icon}
            <span className="text-[12px] font-bold">{a.label}</span>
          </Link>
        ))}
      </div>

      <Card className="mt-3 md:mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold">Money in vs out</h2>
          <div className="flex gap-1 rounded-full bg-gray-100 p-1 text-[12px] font-bold">
            {(["week", "month", "year"] as const).map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 ${range === r ? "bg-white shadow" : "text-gray-500"}`}>
                {r === "week" ? "Week" : r === "month" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <div className="flex h-40 items-end gap-1.5 md:h-52">
            {series.map((s, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-end justify-center gap-0.5">
                  <div className="w-2.5 rounded-t bg-[#167C5A] md:w-4" style={{ height: `${Math.max(3, (s.income / maxVal) * 160)}px` }} title={`In ${s.income}`} />
                  <div className="w-2.5 rounded-t bg-red-300 md:w-4" style={{ height: `${Math.max(3, (s.expense / maxVal) * 160)}px` }} title={`Out ${s.expense}`} />
                </div>
                {(series.length <= 8 || i % 2 === 0) && <span className="text-[9px] text-gray-400 md:text-[11px]">{s.label.slice(0, 3)}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-4 text-[12px] text-gray-500">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#167C5A]" />Money in</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-300" />Money out</span>
          </div>
        </div>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="font-extrabold">Recent transactions</h2>
        <Link href="/transactions" className="text-[13px] font-bold text-[#167C5A]">View all →</Link>
      </div>
      <Card className="mt-2 !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F8FAF9] text-[12px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3 font-bold">Transaction</th>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
                <th className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.type === "income" ? "bg-[#DDF5EA]" : "bg-red-50"}`}>
                        {t.type === "income" ? "💰" : "🧾"}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{t.description}</span>
                        <span className="block text-[12px] text-gray-500">{t.category} · {t.payment_status}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(t.transaction_date)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-extrabold ${t.type === "income" ? "text-[#167C5A]" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "−"}{formatNaira(t.amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="flex justify-end gap-1">
                      <Link
                        href={`/transactions/${t.id}`}
                        title="View"
                        aria-label={`View ${t.description}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-[#DDF5EA] hover:text-[#0F5132]"
                      >
                        <Eye size={17} />
                      </Link>
                      <Link
                        href={`/transactions/${t.id}?edit=1`}
                        title="Edit"
                        aria-label={`Edit ${t.description}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-[#DDF5EA] hover:text-[#0F5132]"
                      >
                        <Pencil size={17} />
                      </Link>
                      <button
                        title="Delete"
                        aria-label={`Delete ${t.description}`}
                        onClick={() => setDelId(t.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {delId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <h3 className="font-extrabold">Delete this record?</h3>
            <p className="mt-1 text-[14px] text-gray-600">This cannot be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setDelId(null)}>Keep</Button>
              <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <AddFab />
    </div>
  );
}
