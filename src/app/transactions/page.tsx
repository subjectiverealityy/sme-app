"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Badge, Card, EmptyState, Input, Select, Skeleton } from "@/components/ui";
import { AddFab } from "@/components/AddFab";
import { formatDate, formatNaira } from "@/lib/utils";

export default function TransactionsPage() {
  const { transactions, loading } = useStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "income" | "expense">("all");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");

  const cats = useMemo(() => ["all", ...Array.from(new Set(transactions.map((t) => t.category)))], [transactions]);

  const filtered = transactions.filter((t) => {
    if (type !== "all" && t.type !== type) return false;
    if (status !== "all" && t.payment_status !== status) return false;
    if (cat !== "all" && t.category !== cat) return false;
    if (q && !`${t.description} ${t.customer_or_vendor ?? ""} ${t.amount}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-[#0F5132]">Records</h1>
        <Link href="/export" className="text-[14px] font-bold text-[#167C5A]">Export →</Link>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Input placeholder="Search sales, expenses…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="all">All</option>
            <option value="income">Money in</option>
            <option value="expense">Money out</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Any status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="credit">Credit</option>
          </Select>
          <Select value={cat} onChange={(e) => setCat(e.target.value)}>
            {cats.map((c) => (
              <option key={c} value={c}>{c === "all" ? "Category" : c}</option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No transactions yet."
            body="Record your first sale or expense to see it here."
            action={
              <Link href="/transactions/new?type=income" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] px-5 font-semibold text-white">
                Record transaction
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {filtered.map((t) => (
            <Link key={t.id} href={`/transactions/${t.id}`}>
              <Card className="flex items-center gap-3 !p-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${t.type === "income" ? "bg-[#DDF5EA]" : "bg-red-50"}`}>
                  {t.type === "income" ? "💰" : "🧾"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{t.description}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-500">
                    {formatDate(t.transaction_date)} · {t.category}
                    <Badge tone={t.payment_status === "paid" ? "green" : t.payment_status === "pending" ? "amber" : "red"}>
                      {t.payment_status}
                    </Badge>
                  </span>
                </span>
                <span className={`text-[15px] font-extrabold ${t.type === "income" ? "text-[#167C5A]" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : "−"}{formatNaira(t.amount)}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <AddFab />
    </div>
  );
}
