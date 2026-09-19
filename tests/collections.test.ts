import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  Transaction,
  DebtPayment,
  DebtReminder,
  DebtReply,
} from "../src/lib/constants";
import {
  normalizeNigerianPhone,
  naira,
  debtAgeDays,
  buildReminderMessage,
  validatePhrasedMessage,
  reminderStage,
  reminderStats,
  buildDebtReport,
  totalOwedAll,
  parseReplyLocal,
  promisedDateFromText,
  extractNairaAmount,
  replyLink,
  appendReplyLink,
  promiseFollowUp,
} from "../src/lib/collections.ts";

const txn = (over: Partial<Transaction> = {}): Transaction => ({
  id: "txn_1",
  business_id: "biz_demo",
  type: "income",
  description: "Ankara sales",
  amount: 25000,
  category: "Sales",
  transaction_date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
  payment_status: "pending",
  payment_method: "Cash",
  customer_or_vendor: "Mrs. Okafor",
  customer_phone: "08012345678",
  source: "manual",
  created_at: new Date().toISOString(),
  ...over,
});

// --- Phone normalization ---------------------------------------------------

test("normalizeNigerianPhone accepts all common formats", () => {
  for (const input of ["08012345678", "8012345678", "+234 801 234 5678", "2348012345678", "0801 234 5678"]) {
    const r = normalizeNigerianPhone(input);
    assert.equal(r.ok, true, `should accept ${input}`);
    if (r.ok) assert.equal(r.e164, "2348012345678", `e164 for ${input}`);
  }
});

test("normalizeNigerianPhone rejects invalid numbers with a fix hint", () => {
  const r = normalizeNigerianPhone("12345");
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.fix, /080/);
  const empty = normalizeNigerianPhone("");
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.fix, /phone number/);
});

// --- Money ---------------------------------------------------------------

test("naira formats with symbol and thousand separators", () => {
  assert.equal(naira(25000), "\u20a625,000");
  assert.equal(naira(1234567), "\u20a61,234,567");
});

// --- Ages ----------------------------------------------------------------

test("debtAgeDays counts full days", () => {
  const ref = new Date("2026-09-19T12:00:00Z");
  assert.equal(debtAgeDays("2026-09-19", ref), 0);
  assert.equal(debtAgeDays("2026-09-05", ref), 14);
  assert.equal(debtAgeDays("2027-01-01", ref), 0);
});

// --- Messages ------------------------------------------------------------

const msgInputs = {
  businessName: "Ada's Fashion Hub",
  customerName: "Mrs. Okafor",
  amount: 25000,
  dateLabel: "5 Sep",
  daysOverdue: 5,
};

test("buildReminderMessage fills business, customer, amount and date", () => {
  const msg = buildReminderMessage({ ...msgInputs, stage: 1, language: "english" });
  assert.ok(msg.includes("Ada's Fashion Hub"));
  assert.ok(msg.includes("Mrs. Okafor"));
  assert.ok(msg.includes("\u20a625,000"));
  assert.ok(msg.includes("5 Sep"));
});

test("buildReminderMessage appends payment details when set", () => {
  const msg = buildReminderMessage({
    ...msgInputs,
    stage: 1,
    language: "english",
    paymentDetails: "GTB 0123456789",
  });
  assert.ok(msg.includes("GTB 0123456789"));
});

test("pidgin template is different from english", () => {
  const es = buildReminderMessage({ ...msgInputs, stage: 1, language: "english" });
  const pidg = buildReminderMessage({ ...msgInputs, stage: 1, language: "pidgin" });
  assert.notEqual(es, pidg);
  assert.match(pidg, /abeg/i);
});

test("validatePhrasedMessage only accepts output that keeps amount + name", () => {
  assert.equal(
    validatePhrasedMessage(
      { ...msgInputs, stage: 1, language: "english" },
      "Hello Mrs. Okafor, your \u20a625,000 is due. Thanks!"
    ),
    true
  );
  assert.equal(
    validatePhrasedMessage({ ...msgInputs, stage: 1, language: "english" }, "Hello, please pay soon"),
    false
  );
});

// --- Stages & caps --------------------------------------------------------

test("reminderStage escalates by count and overdue days", () => {
  assert.equal(reminderStage(0, 1), 1);
  assert.equal(reminderStage(0, 14), 2);
  assert.equal(reminderStage(1, 1), 2);
  assert.equal(reminderStage(1, 30), 3);
  assert.equal(reminderStage(2, 0), 3);
});

test("reminderStats caps at 3 per 14 days", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const r = (daysAgo: number): DebtReminder => ({
    id: "r",
    business_id: "biz_demo",
    transaction_id: "txn_1",
    debtor_name: "X",
    debtor_phone: "",
    stage: 1,
    language: "english",
    message: "hi",
    status: "sent",
    sent_at: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
    created_at: "",
  });
  const stats = reminderStats([r(1), r(2), r(3), r(4)], "txn_1", now);
  assert.equal(stats.recent14, 4);
  assert.equal(stats.canSend, false);
  const ok = reminderStats([r(1), r(2)], "txn_1", now);
  assert.equal(ok.canSend, true);
});

// --- Debt report ----------------------------------------------------------

test("buildDebtReport groups by person and oldest-first", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const rows = buildDebtReport(
    [
      txn({ id: "t1", amount: 10000, transaction_date: "2026-09-10", customer_or_vendor: "Ada" }),
      txn({ id: "t2", amount: 5000, transaction_date: "2026-09-01", customer_or_vendor: "Ada" }),
      txn({ id: "t3", amount: 7000, transaction_date: "2026-09-15", customer_or_vendor: "Bob", customer_phone: "08123456789" }),
      txn({ id: "t4", payment_status: "paid" }),
    ],
    [],
    [],
    [],
    now
  );
  assert.equal(rows.length, 2);
  const ada = rows.find((x) => x.name === "Ada")!;
  assert.equal(ada.totalOwed, 15000);
  assert.equal(ada.debts[0].transaction.id, "t2");
  assert.equal(ada.oldestDays, 18);
  const bob = rows.find((x) => x.name === "Bob")!;
  if (bob.phone.ok) assert.equal(bob.phone.e164, "2348123456789");
});

test("part payments reduce balance without deleting the transaction", () => {
  const a = txn({ id: "t1", amount: 10000 });
  const payment: DebtPayment = { id: "p1", business_id: "biz_demo", transaction_id: "t1", amount: 4000, paid_at: new Date().toISOString(), created_at: new Date().toISOString() };
  const rows = buildDebtReport([a], [payment], [], []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].totalOwed, 6000);
  assert.equal(rows[0].debts[0].balance, 6000);
});

test("fully-paid debts disappear from the report", () => {
  const a = txn({ id: "t1", amount: 5000 });
  const payment: DebtPayment = { id: "p1", business_id: "biz_demo", transaction_id: "t1", amount: 5000, paid_at: new Date().toISOString(), created_at: new Date().toISOString() };
  const rows = buildDebtReport([a], [payment], [], []);
  assert.equal(totalOwedAll(rows), 0);
});

test("status chips: none → reminded → promised → broken", () => {
  const now = new Date("2026-09-19T12:00:00Z");
  const base = txn({ id: "t1", amount: 5000, transaction_date: "2026-09-10" });
  const reminder: DebtReminder = {
    id: "r1",
    business_id: "biz_demo",
    transaction_id: "t1",
    debtor_name: "Mrs. Okafor",
    debtor_phone: "2348012345678",
    stage: 1,
    language: "english",
    message: "hi",
    status: "sent",
    sent_at: new Date(now.getTime() - 86400000).toISOString(),
    created_at: "",
  };
  const reply = (intent: DebtReply["intent"], promised_date: string | null = null): DebtReply => ({
    id: "rp",
    business_id: "biz_demo",
    transaction_id: "t1",
    raw_text: "ok",
    intent,
    promised_date,
    amount_mentioned: null,
    confidence: 0.9,
    quote: "",
    status: "confirmed",
    created_at: new Date(now.getTime() - 86400000).toISOString(),
  });

  assert.equal(buildDebtReport([base], [], [], [], now)[0].chip.key, "none");
  assert.equal(buildDebtReport([base], [], [reminder], [], now)[0].chip.key, "reminded");
  const promised = buildDebtReport([base], [], [], [reply("promise_to_pay", "2026-09-25")], now)[0].chip;
  assert.equal(promised.key, "promised:2026-09-25");
  const broken = buildDebtReport([base], [], [], [reply("promise_to_pay", "2026-09-10")], now)[0].chip;
  assert.equal(broken.key, "broken");
});

// --- Reply parsing --------------------------------------------------------

test("parseReplyLocal detects intents in English and Pidgin", () => {
  assert.equal(parseReplyLocal("I go pay you on Friday").intent, "promise_to_pay");
  assert.equal(parseReplyLocal("I don pay am already").intent, "paid_claim");
  assert.equal(parseReplyLocal("I no owe you anything").intent, "dispute");
  assert.equal(parseReplyLocal("I fit pay half now and the rest later").intent, "part_payment");
  assert.equal(parseReplyLocal("Chai, food don cost well").intent, "none");
});

test("promisedDateFromText maps weekday hints forward", () => {
  const ref = new Date("2026-09-19T12:00:00Z"); // Saturday
  assert.equal(promisedDateFromText("on Friday", ref), "2026-09-25");
  assert.equal(promisedDateFromText("next week", ref), "2026-09-26");
  assert.equal(promisedDateFromText("tomorrow", ref), "2026-09-20");
  assert.equal(promisedDateFromText("end of month", ref), "2026-09-30");
});

test("extractNairaAmount reads money out of chat text", () => {
  assert.equal(extractNairaAmount("I fit pay 5000 now"), 5000);
  assert.equal(extractNairaAmount("balance na \u20a620,000"), 20000);
  assert.equal(extractNairaAmount("no money"), null);
});
test("replyLink builds a short shareable link with context", () => {
  const link = replyLink("https://app.ledgerly.ng/", "txn_1", {
    business: "Ada's Fashion",
    debtor: "Chidi",
    amount: 20000,
  });
  assert.equal(
    link,
    "https://app.ledgerly.ng/r/txn_1?name=Ada%27s+Fashion&debtor=Chidi&amount=20000"
  );
});

test("replyLink omits empty context and encodes special chars", () => {
  const link = replyLink("https://x.com", "txn 9", { amount: 5000 });
  assert.equal(link, "https://x.com/r/txn%209?amount=5000");
});

test("appendReplyLink shows the link on a fresh line", () => {
  const out = appendReplyLink("Hello, please pay.", "https://x.com/r/txn_1");
  assert.ok(out.startsWith("Hello, please pay."));
  assert.ok(out.includes("\n\nAnswer here and keep your balance updated: https://x.com/r/txn_1"));
});

test("appendReplyLink with missing link returns the message unchanged", () => {
  assert.equal(appendReplyLink("Hello.", ""), "Hello.");
  assert.equal(appendReplyLink("Hello.", " "), "Hello.");
});

// --- Promise follow-ups ----------------------------------------------------

const reply = (
  intent: DebtReply["intent"],
  promised_date: string | null,
  status: DebtReply["status"] = "confirmed",
  created_at = "2026-09-18T12:00:00Z"
): DebtReply => ({
  id: `rep_${Math.random().toString(36).slice(2, 8)}`,
  business_id: "biz_demo",
  transaction_id: "txn_1",
  raw_text: "test",
  intent,
  promised_date,
  amount_mentioned: null,
  confidence: 0.9,
  quote: "test",
  status,
  created_at,
});

test("promiseFollowUp flags a past confirmed promise as due", () => {
  const now = new Date("2026-09-19"); // Saturday
  // The 09-10 promise is the most recent one (created later) and has passed.
  const fu = promiseFollowUp("txn_1", [
    reply("promise_to_pay", "2026-09-25", "confirmed", "2026-09-15T10:00:00Z"),
    reply("promise_to_pay", "2026-09-10", "confirmed", "2026-09-18T10:00:00Z"),
  ], now);
  assert.equal(fu.due, true);
  assert.equal(fu.promisedDate, "2026-09-10");
  assert.equal(fu.daysLate, 9);
});

test("promiseFollowUp uses only the latest confirmed promise", () => {
  const now = new Date("2026-09-19");
  // Latest (newest created_at) promise is in the future → not due
  const fu = promiseFollowUp("txn_1", [
    reply("promise_to_pay", "2026-09-25"), // confirmed
  ], now);
  assert.equal(fu.due, false);
  assert.equal(fu.daysLate, 0);
});

test("promiseFollowUp ignores dismissed/draft replies and other intents", () => {
  const now = new Date("2026-09-19");
  const replies = [
    reply("promise_to_pay", "2026-09-10", "draft"),
    reply("dispute", "2026-09-10"),
  ];
  const fu = promiseFollowUp("txn_1", replies, now);
  assert.equal(fu.due, false);
  assert.equal(fu.promisedDate, null);
});
