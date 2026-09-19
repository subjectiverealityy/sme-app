"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CircleDollarSign, Menu, MessageCircle, ShieldCheck, UserPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { EmptyState, Skeleton } from "@/components/ui";
import { getCustomers, getPeopleStats, followUpLabel, initials, type CustomerSummary } from "@/lib/customers";
import { useSidebar } from "@/components/Nav";
import { formatNaira, greetingForHour } from "@/lib/utils";

function PageHeader({ name, businessName, action }: { name: string; businessName?: string; action?: React.ReactNode }) {
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#70D7C0] text-[15px] font-extrabold text-[#272047]">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-extrabold leading-tight text-[#272047] md:text-[28px]">
          {greetingForHour()}, {name}.
        </h1>
        <p className="mt-1 text-[12px] text-[#756f84]">A clear little list of who needs a nudge, without the awkwardness.</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 text-[12px] text-[#756f84]"><span className="hidden sm:block">{businessName} <span className="text-[#d4cfd5]">/</span> Today</span>{action}</div>
    </div>
  );
}

function BalanceRow({ customer }: { customer: CustomerSummary }) {
  return <Link href={`/people/${encodeURIComponent(customer.name)}`} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[#faf7f2]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#70D7C0] text-[10px] font-extrabold text-[#272047]">{initials(customer.name)}</span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-bold text-[#272047]">{customer.name}</span><span className="block text-[10px] text-[#8e8994]">{followUpLabel(customer)}</span></span><span className="text-right"><span className="block text-[12px] font-extrabold text-[#272047]">{formatNaira(customer.outstanding)}</span><ArrowUpRight size={12} className="ml-auto text-[#f28e68] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span></Link>;
}

export default function DashboardPage() {
  const { user, business, transactions, loading } = useStore();
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
          <EmptyState title="Set up your business" body="Create your business profile to start." action={<Link href="/onboarding" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] font-semibold text-white">Set up business</Link>} />
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-4 animate-fade-up">
        <PageHeader name={firstName} businessName={business.name} action={<Link href="/transactions/new" className="hidden items-center gap-2 rounded-2xl bg-[#29224e] px-4 py-3 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#3b3267] sm:inline-flex"><UserPlus size={17} /> Add debtor</Link>} />
        <EmptyDebtorState />
      </div>
    );
  }

  return (
    <div className="relative py-4 text-[#272047] animate-fade-up">
      <PageHeader name={firstName} businessName={business.name} action={<Link href="/transactions/new" className="flex items-center gap-2 rounded-2xl bg-[#29224e] px-4 py-3 text-[14px] font-extrabold text-white shadow-sm transition hover:bg-[#3b3267]"><UserPlus size={17} /> <span className="hidden sm:inline">Add debtor</span></Link>} />
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3"><MetricCard label="Money owed" value={formatNaira(peopleStats.totalOutstanding)} detail={`${peopleStats.owingCount} people with open balances`} tone="navy" icon={<CircleDollarSign size={16} />} /><MetricCard label="Follow-ups due" value={String(peopleStats.followUpsDue)} detail="Promises that need your attention" tone="mint" icon={<CalendarDays size={16} />} /><MetricCard label="Reminders" value="0" detail="Always reviewed by you" tone="coral" icon={<Bell size={16} />} /></div>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.25fr_0.95fr]"><section className="rounded-2xl border border-[#e9e3da] bg-white p-4 shadow-[0_1px_5px_rgba(39,32,71,0.04)]"><SectionHeading icon={<Bell size={15} />} title="Follow up today" subtitle="Promises that need your attention." href="/people" /><div className="mt-3 rounded-xl border border-[#eee9e3] p-3">{followUps.length > 0 ? followUps.map((customer) => <BalanceRow key={customer.key} customer={customer} />) : <CaughtUp />}</div></section><section className="rounded-2xl border border-[#e9e3da] bg-white p-4 shadow-[0_1px_5px_rgba(39,32,71,0.04)]"><SectionHeading icon={<ArrowUpRight size={15} />} title="Largest balances" subtitle="A quick place to start." href="/people" /><div className="mt-3 space-y-1">{largestBalances.length > 0 ? largestBalances.map((customer) => <BalanceRow key={customer.key} customer={customer} />) : <p className="px-2 py-4 text-[12px] text-[#8e8994]">No open balances yet.</p>}</div></section></div>
      <Link href="/people" className="mt-4 flex items-center gap-3 rounded-2xl border border-[#e9e3da] bg-white px-4 py-4 shadow-[0_1px_5px_rgba(39,32,71,0.04)] transition hover:border-[#70d7c0]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fce0d3] text-[#d96e4d]"><MessageCircle size={17} /></span><span className="min-w-0 flex-1"><b className="block text-[13px]">A calmer way to collect</b><span className="block text-[11px] text-[#8e8994]">See the full picture, choose a kind next step, and keep promises visible.</span></span><ChevronRight size={17} className="text-[#8e8994]" /></Link>
    </div>
  );
}

function MetricCard({ label, value, detail, tone, icon }: { label: string; value: string; detail: string; tone: "navy" | "mint" | "coral"; icon: React.ReactNode }) { const styles = { navy: "bg-[#29224e] text-white", mint: "bg-[#70d7c0] text-[#272047]", coral: "bg-[#f69a72] text-[#272047]" }; return <div className={`rounded-2xl p-4 ${styles[tone]}`}><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] opacity-75"><span>{label}</span>{icon}</div><p className="mt-3 text-[22px] font-extrabold tracking-tight">{value}</p><p className="mt-1 text-[10px] opacity-70">{detail}</p></div>; }
function SectionHeading({ icon, title, subtitle, href }: { icon: React.ReactNode; title: string; subtitle: string; href: string }) { return <div className="flex items-start justify-between"><div><h2 className="flex items-center gap-2 text-[14px] font-extrabold">{title}<span className="text-[#8e8994]">{icon}</span></h2><p className="mt-1 text-[11px] text-[#8e8994]">{subtitle}</p></div><Link href={href} aria-label={`View ${title}`} className="text-[#8e8994] transition hover:text-[#272047]"><ChevronRight size={16} /></Link></div>; }
function CaughtUp() { return <div className="flex min-h-[142px] flex-col items-center justify-center text-center"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#70d7c0] text-[#272047]"><Check size={17} /></span><p className="mt-3 text-[12px] font-extrabold">You are all caught up</p><p className="mt-1 max-w-[220px] text-[11px] leading-5 text-[#8e8994]">New promises will appear here on the day they are due.</p></div>; }
function EmptyDebtorState() { return <div className="mt-6 rounded-2xl border border-[#e9e3da] bg-white p-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#70d7c0] text-[#272047]"><ShieldCheck size={23} /></div><h2 className="mt-3 text-[18px] font-extrabold text-[#272047]">Your debtor list starts here.</h2><p className="mx-auto mt-1 max-w-[300px] text-[12px] leading-5 text-[#8e8994]">Add a debtor to keep every balance, status, and promise visible.</p><Link href="/transactions/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#29224e] px-5 py-3 text-[13px] font-bold text-white transition hover:bg-[#3b3267]">Add your first debtor <ChevronRight size={15} /></Link></div>; }
