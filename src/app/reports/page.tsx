"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui";
import { getDateRange, formatNaira } from "@/lib/utils";
import { groupByCategory } from "@/lib/finance";

type Preset = "week" | "month" | "last-month" | "year";

export default function ReportsPage() {
  const { transactions } = useStore();
  const [preset, setPreset] = useState<Preset>("month");

  const filtered = useMemo(() => {
    const { start, end } = getDateRange(preset);
    return transactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d >= start && d <= end;
    });
  }, [transactions, preset]);

  const income = filtered.filter((t) => t.type === "income");
  const expense = filtered.filter((t) => t.type === "expense");
  const totalIn = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = expense.reduce((s, t) => s + Number(t.amount), 0);
  const byCatOut = groupByCategory(expense);
  const byCatIn = groupByCategory(income);
  const maxOut = Math.max(1, ...byCatOut.map(([, v]) => v));

  return (
    <div className="py-4 animate-fade-up">
      <h1 className="text-[22px] font-extrabold text-[#0F5132]">Reports 📊</h1>
      <p className="text-[13px] text-gray-500">Simple summaries — no accounting jargon.</p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-[13px] font-bold">
        {(["week", "month", "last-month", "year"] as Preset[]).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`whitespace-nowrap rounded-full px-4 py-2 ${preset === p ? "bg-[#167C5A] text-white" : "bg-white"}`}
          >
            {p === "week" ? "This week" : p === "month" ? "This month" : p === "last-month" ? "Last month" : "This year"}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Card className="bg-[#DDF5EA] !p-3">
          <p className="text-[12px] font-bold text-[#0F5132]">Money in</p>
          <p className="font-extrabold">{formatNaira(totalIn)}</p>
          <p className="text-[11px] text-[#0F5132]/70">{income.length} records</p>
        </Card>
        <Card className="!p-3">
          <p className="text-[12px] font-bold text-gray-500">Money out</p>
          <p className="font-extrabold">{formatNaira(totalOut)}</p>
          <p className="text-[11px] text-gray-500">{expense.length} records</p>
        </Card>
        <Card className="bg-[#0F5132] !p-3 text-white">
          <p className="text-[12px] font-bold opacity-80">Profit</p>
          <p className="font-extrabold">{formatNaira(totalIn - totalOut)}</p>
        </Card>
      </div>

      <Card className="mt-3">
        <h2 className="font-extrabold">Where did money go?</h2>
        {byCatOut.length === 0 && <p className="mt-2 text-[14px] text-gray-500">No expenses in this period.</p>}
        <div className="mt-3 flex flex-col gap-2">
          {byCatOut.slice(0, 6).map(([cat, val]) => (
            <div key={cat}>
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold">{cat}</span>
                <span className="font-bold">{formatNaira(val)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-[#167C5A]" style={{ width: `${(val / maxOut) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-3">
        <h2 className="font-extrabold">Money in by category</h2>
        {byCatIn.length === 0 && <p className="mt-2 text-[14px] text-gray-500">No income in this period.</p>}
        {byCatIn.map(([cat, val]) => (
          <div key={cat} className="flex justify-between border-b border-gray-50 py-2 text-[14px] last:border-0">
            <span>{cat}</span>
            <span className="font-bold text-[#167C5A]">{formatNaira(val)}</span>
          </div>
        ))}
      </Card>

      <Link href={`/export?preset=${preset}`} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-[#167C5A] font-bold text-white">
        Export this report →
      </Link>
    </div>
  );
}
