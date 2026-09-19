import type { Transaction, DebtPayment, DebtReminder, DebtReply } from "./constants";

/*
 * Pure collections engine for "Who Owes Me".
 * No I/O, no React, no framework imports — everything here is deterministic
 * and unit-tested so money figures can never be produced or altered by a model.
 */

// ---------------------------------------------------------------------------
// Naira formatting (kept local so this module stays dependency-free)
// ---------------------------------------------------------------------------

export function naira(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}\u20a6${Math.abs(n).toLocaleString("en-NG")}`;
}

// ---------------------------------------------------------------------------
// Nigerian phone number → E.164 ("2348012345678")
// ---------------------------------------------------------------------------

export type PhoneResult =
  | { ok: true; e164: string; national: string }
  | { ok: false; reason: string; fix: string };

export function normalizeNigerianPhone(input: string): PhoneResult {
  const clean = String(input ?? "").replace(/\D/g, "");
  if (!clean) {
    return { ok: false, reason: "No number yet.", fix: "Add their phone number so you can send a WhatsApp reminder." };
  }

  let digits = clean;
  if (digits.startsWith("234") && digits.length === 13) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
    if (digits.length === 10) digits = "234" + digits;
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    digits = "234" + digits;
  }

  if (digits.length !== 13 || !digits.startsWith("234")) {
    return {
      ok: false,
      reason: `"${input}" doesn't look like a Nigerian number.`,
      fix: "Use an 11-digit number starting with 0 like 0801 234 5678, or +234 801 234 5678.",
    };
  }

  const national = digits.slice(3);
  if (!/^[789]/.test(national)) {
    return {
      ok: false,
      reason: `"${input}" doesn't look like a Nigerian mobile number.`,
      fix: "Nigerian mobile numbers start with 080, 081, 090, 091, 070 or 071.",
    };
  }

  return {
    ok: true,
    e164: digits,
    national: `0${national}`.replace(/^(.{4})(.{3})(.{4})$/, "$1 $2 $3"),
  };
}

export function waLink(e164: string, message: string): string {
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Reply links — a short public URL the debtor can tap to answer a reminder
// without the merchant having to type/paste anything back.
// ---------------------------------------------------------------------------

export interface ReplyLinkContext {
  business?: string;
  amount?: number;
  debtor?: string;
}

/** Shareable `/r/<code>?…` link. The code is the reminder id. */
export function replyLink(base: string, code: string, ctx: ReplyLinkContext = {}): string {
  const p = new URLSearchParams();
  if (ctx.business?.trim()) p.set("name", ctx.business.trim());
  if (ctx.debtor?.trim()) p.set("debtor", ctx.debtor.trim());
  if (typeof ctx.amount === "number" && Number.isFinite(ctx.amount) && ctx.amount > 0) {
    p.set("amount", String(Math.round(ctx.amount)));
  }
  const q = p.toString();
  return `${String(base).replace(/\/$/, "")}/r/${encodeURIComponent(String(code))}${q ? `?${q}` : ""}`;
}

/** Appends a reply-link line to a reminder message (kept separate so the
 *  unit-tested templates never change shape). */
export function appendReplyLink(message: string, link: string): string {
  const L = String(link ?? "").trim();
  const M = String(message ?? "").trimEnd();
  if (!L || !M) return M || "";
  return `${M}\n\nAnswer here and keep your balance updated: ${L}`;
}

// ---------------------------------------------------------------------------
// Promise follow-ups — re-remind when a confirmed promise date has passed
// ---------------------------------------------------------------------------

export interface PromiseFollowUp {
  due: boolean;
  promisedDate: string | null;
  daysLate: number;
}

/** Latest confirmed promise for a debt, flagged when its date has passed. */
export function promiseFollowUp(
  transactionId: string,
  replies: DebtReply[],
  reference: Date = new Date()
): PromiseFollowUp {
  const relevant = replies.filter(
    (r) =>
      r.transaction_id === transactionId &&
      r.status === "confirmed" &&
      r.intent === "promise_to_pay" &&
      !!r.promised_date
  );
  const sorted = [...relevant].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  const latest = sorted[0] ?? null;
  if (!latest?.promised_date) return { due: false, promisedDate: null, daysLate: 0 };
  const promised = startOfDay(new Date(latest.promised_date));
  const ref = startOfDay(reference);
  const daysLate = Math.max(0, Math.floor((ref.getTime() - promised.getTime()) / 86_400_000));
  return { due: ref.getTime() >= promised.getTime(), promisedDate: latest.promised_date, daysLate };
}

export interface BrokenPromise {
  debtorName: string;
  transactionId: string;
  promisedDate: string;
  daysLate: number;
  balance: number;
  canSend: boolean;
}

/** The most-late debt on a row that has a confirmed promise already passed
 *  and a remaining balance. Null when the row keeps every promise. */
export function rowBrokenPromise(
  row: Pick<DebtorRow, "debts">,
  reference: Date = new Date()
): { debt: DebtItem; fu: PromiseFollowUp } | null {
  const due = row.debts
    .filter((d) => d.balance > 0 && promiseFollowUp(d.transaction.id, d.conversation, reference).due)
    .sort((a, b) => {
      const fa = promiseFollowUp(a.transaction.id, a.conversation, reference);
      const fb = promiseFollowUp(b.transaction.id, b.conversation, reference);
      return fb.daysLate - fa.daysLate || b.balance - a.balance;
    });
  const debt = due[0];
  if (!debt) return null;
  return { debt, fu: promiseFollowUp(debt.transaction.id, debt.conversation, reference) };
}

/** Every row with a broken promise, most-late first — drives auto re-reminders. */
export function brokenPromises(
  rows: Pick<DebtorRow, "name" | "debts">[],
  reference: Date = new Date()
): BrokenPromise[] {
  const out: BrokenPromise[] = [];
  for (const row of rows) {
    const hit = rowBrokenPromise(row, reference);
    if (hit) {
      out.push({
        debtorName: row.name,
        transactionId: hit.debt.transaction.id,
        promisedDate: hit.fu.promisedDate ?? "",
        daysLate: hit.fu.daysLate,
        balance: hit.debt.balance,
        canSend: hit.debt.reminders.canSend,
      });
    }
  }
  return out.sort((a, b) => b.daysLate - a.daysLate || b.balance - a.balance);
}

// ---------------------------------------------------------------------------
// Date / age helpers
// ---------------------------------------------------------------------------

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Local YYYY-MM-DD (avoids timezone shifts that toISOString introduces). */
function fmtLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Full days between a transaction date and the reference date (>= 0). */
export function debtAgeDays(transactionDate: string, reference: Date = new Date()): number {
  const txn = startOfDay(new Date(transactionDate));
  const ref = startOfDay(reference);
  const ms = ref.getTime() - txn.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** "45 days" / "Today" / "Yesterday" style label for a debt age. */
export function ageLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days`;
}

export function longDate(isoOrUndefined: string | null | undefined): string {
  if (!isoOrUndefined) return "";
  const d = new Date(isoOrUndefined);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Reminder governance
// ---------------------------------------------------------------------------

/** Debts under this age are not chased automatically. */
export const OVERDUE_AFTER_DAYS = 3;
/** Maximum reminders logged for one debt in any 14-day window. */
export const MAX_REMINDERS_PER_14_DAYS = 3;

export interface DebtReminderStats {
  recent14: number;
  total: number;
  lastSentAt: string | null;
  nextStage: number;
  canSend: boolean;
}

function isWithinDays(dateStr: string, days: number, reference: Date): boolean {
  const then = startOfDay(new Date(dateStr));
  const now = startOfDay(reference);
  const diff = now.getTime() - then.getTime();
  return diff >= 0 && diff <= days * 86_400_000;
}

/** Reminder stage by reminder count + days overdue: 1 friendly, 2 firm, 3 final. */
export function reminderStage(reminderCount: number, daysOverdue: number): number {
  if (reminderCount >= 2 || daysOverdue >= 30) return 3;
  if (reminderCount >= 1 || daysOverdue >= 14) return 2;
  return 1;
}

export function reminderStats(
  reminders: DebtReminder[],
  transactionId: string,
  reference: Date = new Date()
): DebtReminderStats {
  const mine = reminders.filter((r) => r.transaction_id === transactionId && r.status === "sent");
  const recent14 = mine.filter((r) => isWithinDays(r.sent_at, 14, reference)).length;
  const sorted = [...mine].sort((a, b) => +new Date(b.sent_at) - +new Date(a.sent_at));
  const last = sorted[0] ?? null;
  return {
    recent14,
    total: mine.length,
    lastSentAt: last ? last.sent_at : null,
    nextStage: reminderStage(recent14, 0),
    canSend: recent14 < MAX_REMINDERS_PER_14_DAYS,
  };
}

// ---------------------------------------------------------------------------
// Reminder message templates — English + Pidgin. Business name, customer name,
// amount, date and payment details are substituted from verified inputs only.
// ---------------------------------------------------------------------------

export type ReminderLanguage = "english" | "pidgin";

export interface MessageInputs {
  businessName: string;
  customerName: string;
  amount: number;
  dateLabel: string;
  stage: number;
  language: ReminderLanguage;
  paymentDetails?: string;
  daysOverdue: number;
}

const ENGLISH: Record<number, string> = {
  1: "Hello {customer}! 👋 This is {business}. A friendly reminder that your balance of {amount} from {date} is still open. Please settle it when you can — thank you!",
  2: "Hello {customer}, this is {business} again. Your balance of {amount} from {date} is {days} old and we would really appreciate payment. Kindly confirm when you can pay. Thank you.",
  3: "Hello {customer}, this is {business}. This is our last reminder about the {amount} outstanding since {date}. Please make payment as soon as possible so we can close this up. Thank you.",
};

const PIDGIN: Record<number, string> = {
  1: "Hello {customer}! 👋 Na {business} dey talk to you. We still dey wait for our {amount} from {date}. Abeg make you pay am when e convenient. God bless!",
  2: "Hello {customer}, na {business} again. The {amount} from {date} don begin old pass. Abeg make we settle am — when you go fit pay, make you talk am. Thank you.",
  3: "Hello {customer}, na {business} be this. This one na the last reminder for the {amount} wey you carry since {date}. Abeg make you pay am soon, make we close this mata no wahala. Thank you.",
};

export function clampStage(stage: number): number {
  if (stage >= 3) return 3;
  if (stage >= 2) return 2;
  return 1;
}

export function buildReminderMessage(inputs: MessageInputs): string {
  const template = (inputs.language === "pidgin" ? PIDGIN : ENGLISH)[clampStage(inputs.stage)];
  const payment = inputs.paymentDetails?.trim();
  let msg = template
    .replaceAll("{customer}", (inputs.customerName || "Customer").trim())
    .replaceAll("{business}", (inputs.businessName || "our business").trim())
    .replaceAll("{amount}", naira(inputs.amount))
    .replaceAll("{date}", inputs.dateLabel || "last month")
    .replaceAll("{days}", `${Math.max(0, inputs.daysOverdue)} days`);
  if (payment) {
    msg += `\n\nYou can pay into: ${payment}`;
  }
  return msg;
}

/** Follow-up message for a broken promise — names the exact missed date and
 *  asks for payment or a new date. Use with inputs.stage already ≥ 2. */
export function buildPromiseFollowUpMessage(
  inputs: MessageInputs & { promisedDate: string; daysLate: number }
): string {
  const base = buildReminderMessage(inputs);
  const when = longDate(inputs.promisedDate);
  const line =
    inputs.language === "pidgin"
      ? `You tell us say you go pay on ${when}. If you don't pay already, abeg settle am today or tell us new date. If you don pay, ignore this message.`
      : `You said you would pay on ${when}. If you have paid, please ignore this. Otherwise, please complete it today or let us know a new date.`;
  return `${base}\n\n${line}`;
}

/**
 * Safety gate for AI rephrasing: the rephrased text must still contain the exact
 * verified amount and the customer's name, otherwise callers MUST fall back to
 * the static template (never use the AI output).
 */
export function validatePhrasedMessage(inputs: MessageInputs, candidate: string): boolean {
  const text = String(candidate ?? "");
  const needAmount = naira(inputs.amount);
  const needName = (inputs.customerName || "Customer").trim().toLowerCase();
  return (
    text.includes(needAmount) &&
    needName.length > 0 &&
    text.toLowerCase().includes(needName)
  );
}

// ---------------------------------------------------------------------------
// Reply parsing (local heuristic fallback when Gemini is unavailable)
// ---------------------------------------------------------------------------

export interface ParsedReply {
  intent: "promise_to_pay" | "dispute" | "part_payment" | "paid_claim" | "none";
  promised_date: string | null;
  amount_mentioned: number | null;
  confidence: number;
  quote: string;
}

export function extractNairaAmount(text: string): number | null {
  const t = String(text ?? "");
  const buried = t
    .replace(/\u20a6|NGN|naira|#/gi, " ")
    .replace(/(\d),(\d{3})\b/g, "$1$2") // strip thousands separators
    .replace(/\s+/g, " ");
  const matches = buried.match(/\b\d[\d ]*\b/g) ?? [];
  for (const m of [...matches].reverse()) {
    const n = Number(m.replace(/\s/g, ""));
    if (Number.isFinite(n) && n >= 100) return n;
  }
  return null;
}

const NEXT_DAYS: Array<[string, number]> = [
  ["monday", 1], ["tuesday", 2], ["wednesday", 3], ["thursday", 4], ["friday", 5],
  ["saturday", 6], ["sunday", 0],
];

/** Map a reply's day/month hints to the next ISO date that matches. */
export function promisedDateFromText(text: string, reference: Date = new Date()): string | null {
  const t = String(text ?? "").toLowerCase();
  const ref = startOfDay(reference);

  if (/\btoday\b/.test(t)) return fmtLocal(ref);
  if (/\btomorrow\b|\bcome tomorrow\b|\bby tomorrow\b/.test(t)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    return fmtLocal(d);
  }
  if (/\bnext week\b|\band next week\b/.test(t)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 7);
    return fmtLocal(d);
  }
  if (/\b(end of (the )?month|month end|by 31|by end)\b/.test(t)) {
    return fmtLocal(new Date(ref.getFullYear(), ref.getMonth() + 1, 0));
  }
  if (/\bin two weeks\b|\b2 weeks\b/.test(t)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 14);
    return fmtLocal(d);
  }
  for (const [day, offset] of NEXT_DAYS) {
    if (new RegExp(`\\b(?:this )?${day}\\b`).test(t)) {
      let add = (offset - ref.getDay() + 7) % 7;
      if (add === 0) add = 7;
      const d = new Date(ref);
      d.setDate(d.getDate() + add);
      return fmtLocal(d);
    }
  }
  return null;
}

export function parseReplyLocal(text: string): ParsedReply {
  const t = String(text ?? "").toLowerCase();
  const quote = String(text ?? "").trim().slice(0, 400);
  const amount_mentioned = extractNairaAmount(text);

  const paid =
    /\b(don? (already )?pay|have paid|i paid|paid (am|it)|settled|settle am|money don enter|don send money|made payment|payment done|paid already)\b/.test(
      t
    );
  const dispute =
    /\b(i no owe|(no|not) owe|i dont owe|i don'?t owe|no be me|not mine|wrong amount|mistake|i never (buy|get)|i didn'?t (buy|get|order)|why i owe|error)\b/.test(
      t
    );
  const part =
    /\b(part|half|instal+ment|installment|small small|piece|weekly|balance (soon|dey come)|pay am small)\b/.test(t);
  const promise =
    /\b(promise|i go pay|i will pay|i go settle|will pay|won pay|dey pay|next week|tomorrow|end of month|friday|monday|tuesday|wednesday|thursday|saturday|sunday|by (the )?end)\b/.test(
      t
    );

  if (paid) {
    return { intent: "paid_claim", promised_date: null, amount_mentioned, confidence: 0.9, quote };
  }
  if (dispute) {
    return { intent: "dispute", promised_date: null, amount_mentioned, confidence: 0.8, quote };
  }
  if (part) {
    const promised_date = promisedDateFromText(text);
    return { intent: "part_payment", promised_date, amount_mentioned, confidence: 0.7, quote };
  }
  if (promise) {
    const promised_date = promisedDateFromText(text);
    return { intent: "promise_to_pay", promised_date, amount_mentioned, confidence: 0.8, quote };
  }
  return { intent: "none", promised_date: null, amount_mentioned, confidence: 0.4, quote };
}

// ---------------------------------------------------------------------------
// Debt grouping — the "Who Owes Me" model
// ---------------------------------------------------------------------------

export interface DebtItem {
  transaction: Transaction;
  balance: number;
  daysOld: number;
  overdue: boolean;
  reminders: DebtReminderStats;
  conversation: DebtReply[];
}

export interface DebtorRow {
  key: string;
  name: string;
  phoneInput?: string;
  phone: PhoneResult;
  totalOwed: number;
  debts: DebtItem[];
  oldestDays: number;
  overdueCount: number;
  chip: { label: string; tone: "neutral" | "green" | "amber" | "red"; key: string };
}

export function personKey(name: string | null | undefined, phoneInput: string | null | undefined): string {
  const phone = normalizeNigerianPhone(phoneInput ?? "");
  if (phone.ok) return `p:${phone.e164}`;
  const n = (name ?? "").trim().toLowerCase();
  return n ? `n:${n}` : "n:unknown";
}

export function personName(name: string | null | undefined, phoneResult?: PhoneResult): string {
  const n = (name ?? "").trim();
  if (n) return n;
  if (phoneResult?.ok) return phoneResult.national;
  return "Unknown customer";
}

export function outstandingDebts(transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (t) => t.type === "income" && (t.payment_status === "pending" || t.payment_status === "credit")
  );
}

export function balanceOf(transaction: Transaction, payments: DebtPayment[]): number {
  const paid = payments
    .filter((p) => p.transaction_id === transaction.id)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  return Math.max(0, Math.round((Number(transaction.amount) || 0) - paid));
}

/** Builds the "Who Owes Me" report: one row per person, oldest debt first. */
export function buildDebtReport(
  transactions: Transaction[],
  payments: DebtPayment[],
  reminders: DebtReminder[],
  replies: DebtReply[],
  reference: Date = new Date()
): DebtorRow[] {
  const debts = outstandingDebts(transactions);
  const groups = new Map<string, DebtorRow>();

  for (const t of debts) {
    const phoneResult = normalizeNigerianPhone(t.customer_phone ?? "");
    const key = personKey(t.customer_or_vendor, t.customer_phone);
    let row = groups.get(key);
    if (!row) {
      row = {
        key,
        name: personName(t.customer_or_vendor, phoneResult.ok ? phoneResult : undefined),
        phoneInput: t.customer_phone ?? "",
        phone: phoneResult,
        totalOwed: 0,
        debts: [],
        oldestDays: 0,
        overdueCount: 0,
        chip: { label: "No reminder yet", tone: "neutral", key: "none" },
      };
      groups.set(key, row);
    }
    const balance = balanceOf(t, payments);
    if (balance <= 0) continue; // fully paid off by part payments
    const daysOld = debtAgeDays(t.transaction_date, reference);
    const item: DebtItem = {
      transaction: t,
      balance,
      daysOld,
      overdue: daysOld > OVERDUE_AFTER_DAYS,
      reminders: reminderStats(reminders, t.id, reference),
      conversation: replies
        .filter((r) => r.transaction_id === t.id && r.status !== "dismissed")
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    };
    row.debts.push(item);
    row.totalOwed += balance;
    row.oldestDays = Math.max(row.oldestDays, daysOld);
    if (item.overdue) row.overdueCount += 1;
  }

  const rows = [...groups.values()];
  for (const row of rows) {
    row.debts.sort((a, b) => a.transaction.transaction_date.localeCompare(b.transaction.transaction_date));
    row.chip = debtStatusChip(row);
  }

  return rows.sort((a, b) => b.totalOwed - a.totalOwed || a.oldestDays - b.oldestDays);
}

/**
 * Status chip for a person row:
 * No reminder yet → Reminded → Promised <day> → Broken promise.
 * Purely derived from confirmed replies + reminders. Deterministic.
 */
export function debtStatusChip(row: { debts: DebtItem[] }): DebtorRow["chip"] {
  const allReplies = row.debts.flatMap((d) =>
    d.conversation.filter((r) => r.status === "confirmed")
  );
  const promises = allReplies
    .filter((r) => r.intent === "promise_to_pay" && r.promised_date)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const future = promises.find((p) => +new Date(p.promised_date!) >= +new Date());
  if (future) {
    return { label: `Promised ${longDate(future.promised_date)}`, tone: "green", key: `promised:${future.promised_date}` };
  }
  if (promises.length > 0) {
    return { label: "Broken promise", tone: "red", key: "broken" };
  }
  const reminded = row.debts.some((d) => d.reminders.total > 0);
  if (reminded) return { label: "Reminded", tone: "amber", key: "reminded" };
  return { label: "No reminder yet", tone: "neutral", key: "none" };
}

export function totalOwedAll(rows: DebtorRow[]): number {
  return rows.reduce((s, r) => s + r.totalOwed, 0);
}