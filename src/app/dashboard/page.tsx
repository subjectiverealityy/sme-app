"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu, Plus, ScanLine, Sparkles, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card, EmptyState, Skeleton } from "@/components/ui";
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
  const { user, business, transactions, loading } = useStore();
  const [range, setRange] = useState<"week" | "month" | "year">("month");

  const filtered = useMemo(() => filterByPreset(transactions, range), [transactions, range]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const series = useMemo(() => dailySeries(filtered, range === "week" ? 7 : range === "month" ? 14 : 12), [filtered, range]);
  const recent = useMemo(() => [...transactions].sort((a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date)).slice(0, 5), [transactions]);

  const maxVal = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const firstName = (user?.name || "there").split(" ")[0];

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
        <Card className={`!p-3 md:!p-4 ${summary.profit >= 0 ? "bg-[#0F5132] text-white" : "bg-red-600 text-white"}`}>
          <p className="flex items-center gap-1 text-[12px] font-bold opacity-80"><Wallet size={13} /> Profit</p>
          <p className="mt-1 text-[17px] font-extrabold md:text-[22px]">{formatNaira(summary.profit)}</p>
          <p className="text-[11px] opacity-70">{summary.profit >= 0 ? "🎉 you're growing" : "watch spending"}</p>
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
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex h-40 items-end gap-1.5 md:h-48">
              {series.map((s, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center gap-0.5">
                    <div className="w-2.5 rounded-t bg-[#167C5A] md:w-3.5" style={{ height: `${Math.max(3, (s.income / maxVal) * 140)}px` }} title={`In ${s.income}`} />
                    <div className="w-2.5 rounded-t bg-red-300 md:w-3.5" style={{ height: `${Math.max(3, (s.expense / maxVal) * 140)}px` }} title={`Out ${s.expense}`} />
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
          {/* Side rail — fills wide screens */}
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <div className="rounded-2xl bg-[#F8FAF9] p-3.5">
              <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">This {range}</p>
              <p className="mt-1 text-[14px]">Money in <b className="text-[#167C5A]">{formatNaira(summary.moneyIn)}</b></p>
              <p className="text-[14px]">Money out <b>{formatNaira(summary.moneyOut)}</b></p>
              <p className="text-[14px]">Owed to you <b className="text-amber-600">{formatNaira(summary.owedToYou)}</b></p>
            </div>
            <Link href="/reports" className="rounded-2xl bg-[#DDF5EA] p-3.5 text-[14px] font-bold text-[#0F5132] transition hover:shadow-sm">
              📊 View full reports →
            </Link>
            <Link href="/export" className="rounded-2xl border border-gray-200 p-3.5 text-[14px] font-bold transition hover:shadow-sm">
              📤 Export CSV / PDF →
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">Recent transactions</h2>
            <Link href="/transactions" className="text-[13px] font-bold text-[#167C5A]">View all →</Link>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {recent.map((t) => (
              <Link key={t.id} href={`/transactions/${t.id}`}>
                <Card className="flex items-center gap-3 !p-3 transition hover:shadow-md">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${t.type === "income" ? "bg-[#DDF5EA]" : "bg-red-50"}`}>
                    {t.type === "income" ? "💰" : "🧾"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{t.description}</span>
                    <span className="text-[12px] text-gray-500">{formatDate(t.transaction_date)}</span>
                  </span>
                  <span className={`font-extrabold ${t.type === "income" ? "text-[#167C5A]" : ""}`}>
                    {t.type === "income" ? "+" : "−"}{formatNaira(t.amount)}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-extrabold">What next?</h2>
          <div className="mt-2 flex flex-col gap-2">
            <Link href="/scan">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-xl">📷</span>
                <span>
                  <span className="block text-[14px] font-bold">Digitize paper records</span>
                  <span className="block text-[12px] text-gray-500">Snap a receipt, Ledgerly reads it</span>
                </span>
              </Card>
            </Link>
            <Link href="/ask">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-xl">✨</span>
                <span>
                  <span className="block text-[14px] font-bold">Ask about your business</span>
                  <span className="block text-[12px] text-gray-500">“Where did I spend most?”</span>
                </span>
              </Card>
            </Link>
            <Link href="/reports">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF5EA] text-xl">📊</span>
                <span>
                  <span className="block text-[14px] font-bold">See your reports</span>
                  <span className="block text-[12px] text-gray-500">Income, expenses & profit</span>
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </div>
      <AddFab />
    </div>
  );
}
