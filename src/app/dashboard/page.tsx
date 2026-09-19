"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LuArrowUpRight, LuBell, LuCalendarDays, LuCheck, LuChevronRight, LuCircleDollarSign, LuMenu, LuMessageCircle, LuShieldCheck, LuUserPlus, LuPlus, LuTrendingDown, LuTrendingUp, LuScanLine, LuSparkles, LuWallet, LuReceipt, LuNotebookTabs, LuLightbulb, LuPartyPopper, LuHandCoins, LuChartLine, LuUpload } from "react-icons/lu";
import { useStore } from "@/lib/store";
import { EmptyState, Skeleton, Card } from "@/components/ui";
import { AddFab } from "@/components/AddFab";
import { getCustomers, getPeopleStats, followUpLabel, initials, type CustomerSummary } from "@/lib/customers";
import { useSidebar } from "@/components/Nav";
import { filterByPreset, summarize, dailySeries } from "@/lib/finance";
import { formatDate, formatNaira, greetingForHour } from "@/lib/utils";
import { brokenPromises, buildDebtReport, longDate } from "@/lib/collections";

function PageHeader({ name, businessName, action }: { name: string; businessName?: string; action?: React.ReactNode }) {
  const { open, setOpen } = useSidebar();
  const initial = (name || "B").charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="hidden rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:text-ink md:block"
        >
          <LuMenu size={20} />
        </button>
      )}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-lg font-extrabold text-primary">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-extrabold leading-tight text-[#272047] md:text-[28px]">
          {greetingForHour()}, {name}.
        </h1>
        {businessName && (
          <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-mint-light px-2.5 py-0.5 text-[12px] font-bold text-ink">
            {businessName}
          </span>
        )}
      </div>
      <Link
        href="/transactions/new?type=income"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-primary-dark"
      >
        <LuPlus size={17} /> <span className="hidden sm:inline">Add</span>
      </Link>
    </div>
  );
}

const QUICK_ACTIONS = [
  { href: "/transactions/new?type=income", icon: <LuCircleDollarSign size={22} />, label: "Record sale", sub: "Money in", bg: "bg-mint" },
  { href: "/transactions/new?type=expense", icon: <LuReceipt size={22} />, label: "Add expense", sub: "Money out", bg: "bg-red-50" },
  { href: "/scan", icon: <LuScanLine size={22} />, label: "Scan record", sub: "Digitize paper", bg: "bg-amber-50" },
  { href: "/ask", icon: <LuSparkles size={22} />, label: "Ask AI", sub: "Insights", bg: "bg-violet-50" },
];

export default function DashboardPage() {
  const { user, business, transactions, debtPayments, debtReminders, debtReplies, loading } = useStore();
  const [range, setRange] = useState<"week" | "month" | "year">("month");

  const filtered = useMemo(() => filterByPreset(transactions, range), [transactions, range]);
  const summary = useMemo(() => summarize(filtered), [filtered]);
  const series = useMemo(() => dailySeries(filtered, range === "week" ? 7 : range === "month" ? 14 : 12), [filtered, range]);
  const recent = useMemo(() => [...transactions].sort((a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date)).slice(0, 5), [transactions]);
  const owedReport = useMemo(
    () => buildDebtReport(transactions, debtPayments, debtReminders, debtReplies),
    [transactions, debtPayments, debtReminders, debtReplies]
  );
  const broken = useMemo(() => brokenPromises(owedReport), [owedReport]);

  const maxVal = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const firstName = (user?.name || "there").split(" ")[0];
  const customers = useMemo(() => getCustomers(transactions), [transactions]);
  const peopleStats = useMemo(() => getPeopleStats(customers), [customers]);
  const followUps = useMemo(() => customers.filter((c) => c.followUp === "overdue" || c.followUp === "due-today").slice(0, 3), [customers]);
  const largestBalances = useMemo(() => customers.filter((c) => c.outstanding > 0).slice(0, 3), [customers]);

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
          <EmptyState title="Set up your business" body="Create your business profile to start." action={<Link href="/onboarding" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary font-semibold text-white">Set up business</Link>} />
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-4 animate-fade-up">
        <PageHeader name={firstName} businessName={business.name} />
        {/* Hero empty state */}
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D2445] to-[#443A5C] p-6 text-center text-white md:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15"><LuNotebookTabs size={28} /></div>
          <h2 className="mt-3 text-[20px] font-extrabold md:text-[24px]">Your business story starts here.</h2>
          <p className="mx-auto mt-1 max-w-[300px] text-[14px] text-white/80">
            Record your first sale or expense and watch your profit appear.
          </p>
          <Link
            href="/first-transaction"
            className="mx-auto mt-4 block w-full max-w-[300px] rounded-2xl bg-white py-3.5 font-extrabold text-ink transition hover:scale-[1.02]"
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

        <div className="mt-3 rounded-2xl bg-mint-light px-4 py-3 text-[13px] text-ink">
          <LuLightbulb className="inline" size={15} /> <b>Tip:</b> most owners start by recording today&apos;s sales — it takes about 30 seconds.
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-up">
      <PageHeader name={firstName} businessName={business.name} />

      {/* Summary cards */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="border border-primary/10 bg-mint !p-3 md:!p-4">
          <p className="flex items-center gap-1 text-[12px] font-bold text-ink"><LuTrendingUp size={13} /> Money In</p>
          <p className="mt-1 text-[17px] font-extrabold text-ink md:text-[22px]">{formatNaira(summary.moneyIn)}</p>
          <p className="text-[11px] text-ink/60">{summary.countIn} sale{summary.countIn === 1 ? "" : "s"}</p>
        </Card>
        <Card className="!p-3 md:!p-4">
          <p className="flex items-center gap-1 text-[12px] font-bold text-gray-500"><LuTrendingDown size={13} /> Money Out</p>
          <p className="mt-1 text-[17px] font-extrabold md:text-[22px]">{formatNaira(summary.moneyOut)}</p>
          <p className="text-[11px] text-gray-400">{summary.countOut} expense{summary.countOut === 1 ? "" : "s"}</p>
        </Card>
        <Card className={`!p-3 md:!p-4 ${summary.profit >= 0 ? "bg-primary text-white" : "bg-red-600 text-white"}`}>
          <p className="flex items-center gap-1 text-[12px] font-bold opacity-80"><LuWallet size={13} /> Profit</p>
          <p className="mt-1 text-[17px] font-extrabold md:text-[22px]">{formatNaira(summary.profit)}</p>
          <p className="text-[11px] opacity-70">{summary.profit >= 0 ? (<><LuPartyPopper className="inline" size={13} /> you're growing</>) : "watch spending"}</p>
        </Card>
      </div>

      {broken.length > 0 && (
        <Link href="/owed/queue">
          <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] transition hover:shadow-sm">
            <p className="font-bold text-[#B91C1C]">
              <LuBell className="inline" size={14} /> {broken.length === 1 ? "1 promise broke" : `${broken.length} promises broke`}
            </p>
            <p className="mt-0.5 text-[13px] text-gray-700">
              {broken.slice(0, 2).map((b) => `${b.debtorName} (${formatNaira(b.balance)}, said ${longDate(b.promisedDate)})`).join(" · ")}
              {broken.length > 2 ? ` · +${broken.length - 2} more` : ""}
            </p>
            <p className="mt-1 font-bold text-ink">
              → Send auto follow-ups
              {broken.some((b) => !b.canSend) ? " (some cooling off)" : ""}
            </p>
          </div>
        </Link>
      )}

      {summary.owedToYou > 0 && (
        <Link href="/owed">
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] transition hover:shadow-sm">
            <LuHandCoins className="inline" size={16} /> <b>Money you&apos;re owed:</b> {formatNaira(summary.owedToYou)} <span className="font-bold text-ink">→ send reminders</span>
          </div>
        </Link>
      )}

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[
          { href: "/transactions/new?type=income", icon: <LuPlus size={18} />, label: "Income" },
          { href: "/transactions/new?type=expense", icon: <LuTrendingDown size={18} />, label: "Expense" },
          { href: "/scan", icon: <LuScanLine size={18} />, label: "Scan" },
          { href: "/ask", icon: <LuSparkles size={18} />, label: "Ask AI" },
        ].map((a) => (
          <Link key={a.label} href={a.href} className="flex flex-col items-center gap-1 rounded-2xl bg-white py-3 text-ink shadow-sm transition hover:bg-mint-light">
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
                    <div className="w-2.5 rounded-t bg-primary md:w-3.5" style={{ height: `${Math.max(3, (s.income / maxVal) * 140)}px` }} title={`In ${s.income}`} />
                    <div className="w-2.5 rounded-t bg-red-300 md:w-3.5" style={{ height: `${Math.max(3, (s.expense / maxVal) * 140)}px` }} title={`Out ${s.expense}`} />
                  </div>
                  {(series.length <= 8 || i % 2 === 0) && <span className="text-[9px] text-gray-400 md:text-[11px]">{s.label.slice(0, 3)}</span>}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-4 text-[12px] text-gray-500">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />Money in</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-red-300" />Money out</span>
            </div>
          </div>
          {/* Side rail — fills wide screens */}
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
            <div className="rounded-2xl bg-background p-3.5">
              <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400">This {range}</p>
              <p className="mt-1 text-[14px]">Money in <b className="text-ink">{formatNaira(summary.moneyIn)}</b></p>
              <p className="text-[14px]">Money out <b>{formatNaira(summary.moneyOut)}</b></p>
              <p className="text-[14px]">Owed to you <b className="text-amber-600">{formatNaira(summary.owedToYou)}</b></p>
            </div>
            <Link href="/reports" className="rounded-2xl bg-mint-light p-3.5 text-[14px] font-bold text-ink transition hover:shadow-sm">
              <LuChartLine className="inline" size={16} /> View full reports →
            </Link>
            <Link href="/export" className="rounded-2xl border border-gray-200 p-3.5 text-[14px] font-bold transition hover:shadow-sm">
              <LuUpload className="inline" size={16} /> Export CSV / PDF →
            </Link>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">Recent transactions</h2>
            <Link href="/transactions" className="text-[13px] font-bold text-ink">View all →</Link>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {recent.map((t) => (
              <Link key={t.id} href={`/transactions/${t.id}`}>
                <Card className="flex items-center gap-3 !p-3 transition hover:shadow-md">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${t.type === "income" ? "bg-mint-light" : "bg-red-50"}`}>
                    {t.type === "income" ? <LuCircleDollarSign size={20} /> : <LuReceipt size={20} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold">{t.description}</span>
                    <span className="text-[12px] text-gray-500">{formatDate(t.transaction_date)}</span>
                  </span>
                  <span className={`font-extrabold ${t.type === "income" ? "text-ink" : ""}`}>
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
            <Link href="/owed">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-[#b6533a]"><LuHandCoins size={22} /></span>
                <span>
                  <span className="block text-[14px] font-bold">Who owes me</span>
                  <span className="block text-[12px] text-gray-500">Send WhatsApp reminders</span>
                </span>
              </Card>
            </Link>
            <Link href="/scan">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50"><LuScanLine size={22} /></span>
                <span>
                  <span className="block text-[14px] font-bold">Digitize paper records</span>
                  <span className="block text-[12px] text-gray-500">Snap a receipt, Credyt reads it</span>
                </span>
              </Card>
            </Link>
            <Link href="/ask">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50"><LuSparkles size={22} /></span>
                <span>
                  <span className="block text-[14px] font-bold">Ask about your business</span>
                  <span className="block text-[12px] text-gray-500">“Where did I spend most?”</span>
                </span>
              </Card>
            </Link>
            <Link href="/reports">
              <Card className="flex items-center gap-3 !p-3.5 transition hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mint-light text-[#0F5132]"><LuChartLine size={22} /></span>
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

function MetricCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "navy" | "mint" | "coral"; icon: React.ReactNode }) { const styles = { navy: "bg-[#29224e] text-white", mint: "bg-[#70d7c0] text-[#272047]", coral: "bg-[#f69a72] text-[#272047]" }; return <div className={`rounded-2xl p-4 ${styles[tone]}`}><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] opacity-75"><span>{label}</span>{icon}</div><p className="mt-3 text-[22px] font-extrabold tracking-tight">{value}</p><p className="mt-1 text-[10px] opacity-70">{detail}</p></div>; }
function SectionHeading({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href: string }) { return <div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-[14px] font-extrabold">{title}<span className="text-[#8e8994]">{icon}</span></h2><p className="mt-1 text-[11px] text-[#8e8994]">{subtitle}</p></div><Link href={href} aria-label={`View ${title}`} className="text-[#8e8994] transition hover:text-[#272047]"><LuChevronRight size={16} /></Link></div>; }
function CaughtUp() { return <div className="flex min-h-[142px] flex-col items-center justify-center text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#70d7c0] text-[#272047]"><LuCheck size={17} /></span><p className="mt-3 text-[12px] font-extrabold">You are all caught up</p><p className="mt-1 max-w-[220px] text-[11px] leading-5 text-[#8e8994]">New promises will appear here on the day they are due.</p></div>; }
function EmptyDebtorState() { return <div className="mt-6 rounded-2xl border border-[#e9e3da] bg-white p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#70d7c0] text-[#272047]"><LuShieldCheck size={23} /></div><h2 className="mt-3 text-[18px] font-extrabold text-[#272047]">Your debtor list starts here.</h2><p className="mx-auto mt-1 max-w-[300px] text-[12px] leading-5 text-[#8e8994]">Add a debtor to keep every balance, status, and promise visible.</p><Link href="/transactions/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#29224e] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#3b3267]">Add your first debtor <LuChevronRight size={15} /></Link></div>; }
