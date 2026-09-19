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
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");

  const cats = useMemo(() => ["all", ...Array.from(new Set(transactions.map((t) => t.category)))], [transactions]);

  const filtered = transactions.filter((t) => {
    const normalizedStatus = t.payment_status === "pending" ? "credit" : t.payment_status;
    if (status !== "all" && normalizedStatus !== status) return false;
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
        <h1 className="text-[22px] font-extrabold text-[#272047]">Records</h1>
        <Link href="/export" className="text-[14px] font-bold text-[#0b938e]">Export →</Link>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Input placeholder="Search debtors and records…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Any status</option>
            <option value="paid">Paid</option>
            <option value="credit">Credit</option>
            <option value="interested">Interested</option>
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
            title="No debtor records yet."
            body="Add a debtor to see their details here."
            action={
              <Link href="/transactions/new" className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#29224e] px-5 font-semibold text-white">
                Add debtor
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
