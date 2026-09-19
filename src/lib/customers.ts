import type { Transaction } from "./constants";

export type FollowUpState = "overdue" | "due-today" | "upcoming" | "none";

export interface CustomerSummary {
  key: string;
  name: string;
  phone?: string;
  totalBought: number;
  totalPaid: number;
  outstanding: number;
  interestedAmount: number;
  txnCount: number;
  unpaidCount: number;
  pendingCount: number;
  creditCount: number;
  lastDate: string;
  oldestDue: string | null;
  followUp: FollowUpState;
  daysOverdue: number;
  txns: Transaction[];
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0].slice(0, 2) || "?").toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDay(d: string): string {
  return d.slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const ms = new Date(toDay(a)).getTime() - new Date(toDay(b)).getTime();
  return Math.round(ms / 86400000);
}

/** Group income transactions by customer into per-person summaries. */
export function getCustomers(transactions: Transaction[]): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  const today = todayStr();

  for (const t of transactions) {
    if (t.type !== "income") continue;
    const raw = (t.customer_or_vendor || "").trim();
    if (!raw) continue;
    const key = normalizeName(raw);
    let c = map.get(key);
    if (!c) {
      c = {
        key,
        name: raw,
        totalBought: 0,
        totalPaid: 0,
        outstanding: 0,
        interestedAmount: 0,
        txnCount: 0,
        unpaidCount: 0,
        pendingCount: 0,
        creditCount: 0,
        lastDate: t.transaction_date,
        oldestDue: null,
        followUp: "none",
        daysOverdue: 0,
        txns: [],
      };
      map.set(key, c);
    }
    const amt = Number(t.amount) || 0;
    c.totalBought += amt;
    c.txnCount += 1;
    c.txns.push(t);
    const status = t.payment_status === "pending" ? "credit" : t.payment_status;
    if (status === "paid") {
      c.totalPaid += amt;
    } else if (status === "credit") {
      c.outstanding += amt;
      c.unpaidCount += 1;
      c.creditCount += 1;
      if (t.due_date) {
        const d = toDay(t.due_date);
        if (!c.oldestDue || d < c.oldestDue) c.oldestDue = d;
      }
    } else if (status === "interested") {
      c.interestedAmount += amt;
      c.pendingCount += 1;
    }
    if (t.customer_phone && t.customer_phone.trim()) c.phone = t.customer_phone.trim();
    if (new Date(t.transaction_date) > new Date(c.lastDate)) c.lastDate = t.transaction_date;
  }

  for (const c of map.values()) {
    c.txns.sort((a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date));
    if (c.outstanding > 0 && c.oldestDue) {
      const d = diffDays(today, c.oldestDue);
      if (d > 0) {
        c.followUp = "overdue";
        c.daysOverdue = d;
      } else if (d === 0) {
        c.followUp = "due-today";
      } else {
        c.followUp = "upcoming";
      }
    } else if (c.outstanding > 0) {
      c.followUp = "none";
    }
  }

  return [...map.values()].sort((a, b) => b.outstanding - a.outstanding);
}

export interface PeopleStats {
  totalOutstanding: number;
  owingCount: number;
  paidCount: number;
  creditCount: number;
  followUpsDue: number; // overdue + due today
  interestedCount: number; // people with pending (not-yet-closed) deals
  peopleCount: number;
}

export function getPeopleStats(customers: CustomerSummary[]): PeopleStats {
  let totalOutstanding = 0;
  let owingCount = 0;
  let paidCount = 0;
  let creditCount = 0;
  let followUpsDue = 0;
  let interestedCount = 0;
  for (const c of customers) {
    if (c.outstanding > 0) {
      owingCount += 1;
      totalOutstanding += c.outstanding;
      creditCount += 1;
      if (c.followUp === "overdue" || c.followUp === "due-today") followUpsDue += 1;
    }
    if (c.outstanding <= 0 && c.interestedAmount <= 0 && c.totalPaid > 0) paidCount += 1;
    if (c.pendingCount > 0) interestedCount += 1;
  }
  return { totalOutstanding, owingCount, paidCount, creditCount, followUpsDue, interestedCount, peopleCount: customers.length };
}

/** Normalize an NG phone number to wa.me international format (234...). Returns null if unusable. */
export function toWaNumber(phone: string): string | null {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00234")) d = d.slice(2);
  if (d.startsWith("234")) {
    // already international
  } else if (d.startsWith("0") && d.length >= 10) {
    d = "234" + d.slice(1);
  } else if (d.length === 10) {
    d = "234" + d;
  } else {
    return null;
  }
  if (!/^234\d{10}$/.test(d)) return null;
  return d;
}

/** Build an https://wa.me link with pre-filled text. No automation — just opens chat. */
export function waLink(phone: string, text: string): string | null {
  const num = toWaNumber(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export function formatNairaShort(n: number): string {
  if (n >= 1000000) return `₦${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}m`;
  if (n >= 1000) return `₦${Math.round(n / 1000)}k`;
  return `₦${Math.round(n)}`;
}

/** Friendly, non-awkward reminder text for WhatsApp. */
export function nudgeText(customerName: string, amount: number, businessName: string): string {
  const first = customerName.trim().split(/\s+/)[0];
  const amt = `₦${Math.round(amount).toLocaleString("en-NG")}`;
  return `Hello ${first} 👋, this is ${businessName}. Hope you're well! Just a friendly reminder about your balance of ${amt}. Let me know when it's convenient to sort it out. Thank you! 🙏`;
}

export function followUpLabel(c: CustomerSummary): string {
  if (c.outstanding <= 0) return "Cleared ✓";
  if (c.followUp === "overdue") return `${c.daysOverdue} day${c.daysOverdue === 1 ? "" : "s"} overdue`;
  if (c.followUp === "due-today") return "Due today";
  if (c.followUp === "upcoming" && c.oldestDue) {
    const d = diffDays(c.oldestDue, todayStr());
    return `Due in ${d} day${d === 1 ? "" : "s"}`;
  }
  return "No promise date yet";
}
