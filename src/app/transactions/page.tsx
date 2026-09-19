"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { EmptyState, Input, Select, Skeleton } from "@/components/ui";
import { TxnTable } from "@/components/TxnTable";
import { AddFab } from "@/components/AddFab";

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
        <div className="mt-3">
          <p className="mb-2 text-[13px] text-gray-500">
            Showing <b>{filtered.length}</b> of <b>{transactions.length}</b> records
          </p>
          <TxnTable transactions={filtered} />
        </div>
      )}
      <AddFab />
    </div>
  );
}
