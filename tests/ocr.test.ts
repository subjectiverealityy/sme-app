import { test } from "node:test";
import assert from "node:assert/strict";
import {
  localDateISO,
  parseAmountToNaira,
  normalizeDateString,
  matchCategoryToAllowed,
  normalizeExtraction,
  parseModelJSON,
} from "../src/lib/ocr.ts";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../src/lib/constants.ts";

const ref2026 = new Date("2026-09-19T12:00:00Z");

// --- Amounts ----------------------------------------------------------------

test("parseAmountToNaira handles numbers, symbols, separators and k shorthand", () => {
  assert.equal(parseAmountToNaira(25000), 25000);
  assert.equal(parseAmountToNaira("25,000"), 25000);
  assert.equal(parseAmountToNaira("\u20a625,000.00"), 25000);
  assert.equal(parseAmountToNaira("N25,000"), 25000);
  assert.equal(parseAmountToNaira("NGN 25,000"), 25000);
  assert.equal(parseAmountToNaira("25k"), 25000);
  assert.equal(parseAmountToNaira("2.5k"), 2500);
  assert.equal(parseAmountToNaira(" 120000 "), 120000);
  assert.equal(parseAmountToNaira(25000.6), 25001);
});

test("parseAmountToNaira returns null for empty, zero or unreadable values", () => {
  assert.equal(parseAmountToNaira(""), null);
  assert.equal(parseAmountToNaira("0"), null);
  assert.equal(parseAmountToNaira(0), null);
  assert.equal(parseAmountToNaira("Free"), null);
  assert.equal(parseAmountToNaira(null), null);
  assert.equal(parseAmountToNaira(undefined), null);
});

// --- Dates ------------------------------------------------------------------

test("normalizeDateString accepts ISO and common numeric formats", () => {
  assert.equal(normalizeDateString("2026-09-05", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("2026-09-05T12:45:00.000Z", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("05/09/2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("05-09-2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("09/25/2026", ref2026), "2026-09-25");
  assert.equal(normalizeDateString("5.9.2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("2026/09/05", ref2026), "2026-09-05");
});

test("normalizeDateString accepts month-word formats", () => {
  assert.equal(normalizeDateString("5 Sep 2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("5th of September 2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("September 5, 2026", ref2026), "2026-09-05");
  assert.equal(normalizeDateString("March 5", ref2026), "2026-03-05");
  assert.equal(normalizeDateString("25 Dec", ref2026), "2025-12-25");
  assert.equal(normalizeDateString("12:45 25/03/2026", ref2026), "2026-03-25");
});

test("normalizeDateString resolves today/yesterday and rejects impossibles", () => {
  assert.equal(normalizeDateString("today", ref2026), "2026-09-19");
  assert.equal(normalizeDateString("31/02/2026", ref2026), null);
  assert.equal(normalizeDateString("13/32/2026", ref2026), null);
  assert.equal(normalizeDateString("who knows", ref2026), null);
  assert.equal(normalizeDateString("", ref2026), null);
  assert.equal(normalizeDateString(null, ref2026), null);
});

// --- Categories -------------------------------------------------------------

test("matchCategoryToAllowed maps OCR phrasing onto the expense list", () => {
  assert.equal(matchCategoryToAllowed("Transport", EXPENSE_CATEGORIES), "Transportation");
  assert.equal(matchCategoryToAllowed("Petrol and fuel", EXPENSE_CATEGORIES), "Transportation");
  assert.equal(matchCategoryToAllowed("Salary", EXPENSE_CATEGORIES), "Salaries");
  assert.equal(matchCategoryToAllowed("Inventory", EXPENSE_CATEGORIES), "Inventory / Stock");
  assert.equal(matchCategoryToAllowed("Electricity bill", EXPENSE_CATEGORIES), "Utilities");
  assert.equal(matchCategoryToAllowed("MTN data", EXPENSE_CATEGORIES), "Internet / Data");
});

test("matchCategoryToAllowed maps OCR phrasing onto the income list", () => {
  assert.equal(matchCategoryToAllowed("Sales", INCOME_CATEGORIES), "Sales");
  assert.equal(matchCategoryToAllowed("Catering order", INCOME_CATEGORIES), "Catering Order");
  assert.equal(matchCategoryToAllowed("Alteration", INCOME_CATEGORIES), "Services");
});

test("matchCategoryToAllowed returns null when nothing matches", () => {
  assert.equal(matchCategoryToAllowed("zzz unknown", EXPENSE_CATEGORIES), null);
  assert.equal(matchCategoryToAllowed("", EXPENSE_CATEGORIES), null);
  assert.equal(matchCategoryToAllowed(null, EXPENSE_CATEGORIES), null);
});

// --- Full normalization -----------------------------------------------------

test("normalizeExtraction constrains a model payload onto the schema", () => {
  const n = normalizeExtraction(
    {
      type: "expense",
      description: "  20 bags of rice  ",
      amount: "\u20a680,000",
      date: "03/02/2026",
      category: "stock",
      payment_status: "paid",
      payment_method: "transfer",
    },
    ref2026
  );
  assert.deepEqual(n.extracted, {
    type: "expense",
    description: "20 bags of rice",
    amount: 80000,
    date: "2026-02-03",
    category: "Inventory / Stock",
    payment_status: "paid",
    payment_method: "Bank Transfer",
  });
  assert.equal(n.confidence.amount, 1);
  assert.equal(n.missing.length, 0);
});

test("normalizeExtraction handles income + sticks to the income category list", () => {
  const n = normalizeExtraction(
    { type: "income", description: "Ankara sales", amount: "45k", date: "today", category: "Sales", payment_status: "credit", payment_method: "POS" },
    ref2026
  );
  assert.equal(n.extracted.type, "income");
  assert.equal(n.extracted.amount, 45000);
  assert.equal(n.extracted.category, "Sales");
  assert.equal(n.extracted.payment_status, "credit");
  assert.equal(n.extracted.payment_method, "POS");
  assert.equal(n.extracted.date, "2026-09-19");
});

test("normalizeExtraction never throws and flags unreadable fields", () => {
  const n = normalizeExtraction({ description: 12345 }, ref2026);
  assert.equal(n.extracted.type, "expense");
  assert.equal(n.extracted.description, "12345");
  assert.equal(n.extracted.amount, null);
  assert.equal(n.extracted.category, null);
  assert.ok(n.missing.includes("amount"));
  assert.ok(n.missing.includes("category"));
  assert.ok(n.missing.includes("date"));
});

test("normalizeExtraction takes the first item when handed an array", () => {
  const n = normalizeExtraction(
    [{ type: "expense", description: "First", amount: 1000, date: "2026-09-01", category: "Food" }],
    ref2026
  );
  assert.equal(n.extracted.description, "First");
});

// --- Model JSON -------------------------------------------------------------

test("parseModelJSON strips markdown fences and prose", () => {
  const obj = parseModelJSON('here is the output ```json\n{"a":1}\n``` done');
  assert.deepEqual(obj, { a: 1 });
  assert.deepEqual(parseModelJSON('words {"b":2} tail'), { b: 2 });
  assert.equal(parseModelJSON("not json at all"), null);
});

// --- localDateISO -----------------------------------------------------------

test("localDateISO formats without UTC rollover", () => {
  assert.equal(localDateISO(new Date(2026, 0, 1)), "2026-01-01");
});