import type { Transaction } from "./constants";
import { getDateRange } from "./utils";

export interface FinanceSummary {
  moneyIn: number;
  moneyOut: number;
  profit: number;
  owedToYou: number; // pending/credit income
  youOwe?: number;
  countIn: number;
  countOut: number;
}

export function summarize(transactions: Transaction[]): FinanceSummary {
  let moneyIn = 0;
  let moneyOut = 0;
  let owedToYou = 0;
  let countIn = 0;
  let countOut = 0;
  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === "income") {
      countIn += 1;
      if (t.payment_status === "paid") moneyIn += amt;
      else owedToYou += amt;
      // For dashboard simplicity: Money In includes only paid? Spec shows total. We'll include paid only for profit, but show totals.
      // Actually include all income in moneyIn for friendliness, track owed separately.
    } else {
      countOut += 1;
      moneyOut += amt;
    }
  }
  // Money In for display = paid income (clear) — but keep backwards compat with reports that want all.
  // We'll return paid-only as moneyIn.
  return {
    moneyIn,
    moneyOut,
    profit: moneyIn - moneyOut,
    owedToYou,
    countIn,
    countOut,
  };
}

export function summarizeWithAll(transactions: Transaction[]) {
  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    if (t.type === "income") totalIn += Number(t.amount) || 0;
    else totalOut += Number(t.amount) || 0;
  }
  return { totalIn, totalOut, profit: totalIn - totalOut };
}

export function filterByPreset<T extends { transaction_date: string }>(
  items: T[],
  preset: "week" | "month" | "year" | "all"
): T[] {
  if (preset === "all") return items;
  const { start, end } = getDateRange(preset);
  return items.filter((i) => {
    const d = new Date(i.transaction_date);
    return d >= start && d <= end;
  });
}

export function groupByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    map.set(t.category, (map.get(t.category) || 0) + Number(t.amount));
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function dailySeries(transactions: Transaction[], days = 7) {
  const out: { label: string; income: number; expense: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toDateString();
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (new Date(t.transaction_date).toDateString() === key) {
        if (t.type === "income") income += Number(t.amount);
        else expense += Number(t.amount);
      }
    }
    out.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      income,
      expense,
    });
  }
  return out;
}
