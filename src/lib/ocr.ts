import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type PaymentStatus,
  type TransactionType,
} from "./constants.ts";

/*
 * Pure OCR output normalizer for the Scan/OCR flow.
 * No I/O, no React — everything here is deterministic and unit-tested so a
 * vision model can never hand the app malformed or out-of-schema field values.
 * The model proposes, this module disposes.
 */

export interface OcrExtraction {
  type: TransactionType;
  description: string;
  amount: number | null; // integer Naira
  date: string | null; // YYYY-MM-DD
  category: string | null; // constrained to the app's category lists
  payment_status: PaymentStatus;
  payment_method: string | null;
}

export type OcrFieldKey = keyof OcrExtraction;
export type OcrConfidence = Record<OcrFieldKey, number>;

export interface NormalizedExtraction {
  extracted: OcrExtraction;
  confidence: OcrConfidence;
  /** Core fields that could not be read and must be reviewed by the user. */
  missing: OcrFieldKey[];
}

/** Local YYYY-MM-DD (avoids the UTC rollover that toISOString() introduces). */
export function localDateISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Amount
// ---------------------------------------------------------------------------

/**
 * Parses a Naira amount out of anything the model or scanner produces:
 * "25,000", "₦25,000.00", "N25,000", "NGN 25000", "25k", "2.5k", 25000.
 * Returns an integer number of Naira, or null when nothing reliable exists.
 */
export function parseAmountToNaira(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  }
  const s = String(value).trim();
  if (!s) return null;

  let multiplier = 1;
  let target = s;
  const kMatch = s.match(/(\d+(?:\.\d+)?)\s*[kK](?![a-z])/);
  if (kMatch) {
    multiplier = 1000;
    target = kMatch[1];
  }

  const cleaned = target
    .replace(/[₦#]/g, " ")
    .replace(/NGN|Naira|naira/g, " ")
    .replace(/\bN(?=\s*\d)/g, " ")
    .replace(/,/g, "")
    .replace(/(?<=\d)\s+(?=\d)/g, "");

  const m = cleaned.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]) * multiplier;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

function validYMD(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== m || dt.getUTCDate() !== d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m)}-${p(d)}`;
}

function resolveDualDate(a: number, b: number, c: number): string | null {
  // Format a/b/c. DD/MM interpretation: a is the day, b the month.
  // MM/DD interpretation: a is the month, b the day.
  const dayFirst = validYMD(c, b, a); // DD/MM
  const monthFirst = validYMD(c, a, b); // MM/DD
  if (a > 12) return dayFirst; // a can't be a month → a is the day
  if (b > 12) return monthFirst; // b can't be a month → b is the day
  return dayFirst ?? monthFirst; // ambiguous → DD/MM first (Nigerian)
}

/**
 * Turns any common date spelling into YYYY-MM-DD. Handles ISO dates,
 * DD/MM/YYYY and MM/DD/YYYY numeric forms, "5th of September 2026",
 * "Sep 5, 2026", "today"/"yesterday", and yearless dates relative to today.
 */
export function normalizeDateString(value: unknown, reference: Date = new Date()): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localDateISO(value);
  if (typeof value !== "string") return null;
  const s = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/T\d{2}:\d{2}(?::\d{2})?(?:\.?\d*)?(?:Z|[+-]\d{2}:?\d{2})?$/i, "") // ISO timestamps first
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\b/gi, " ") // then drop mixed-in times
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;]+$/, "");
  if (!s) return null;

  const low = s.toLowerCase();
  if (low === "today") return localDateISO(reference);
  if (low === "yesterday") {
    const d = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - 1);
    return localDateISO(d);
  }

  // Strict ISO: 2026-09-05
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const v = validYMD(+iso[1], +iso[2], +iso[3]);
    if (v) return v;
  }

  // "25 Mar 2025" / "5th of September 2026" / "5 September"
  const dm = s.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)[,.\-\s]*(?:(\d{4}))?\s*$/);
  if (dm && MONTHS[dm[2].toLowerCase()]) {
    return buildFromTokens(+dm[1], MONTHS[dm[2].toLowerCase()], dm[3] ? +dm[3] : null, reference);
  }

  // "March 5, 2026" / "Sep 25"
  const md = s.match(/^([A-Za-z]+)[,.\-\s]+(\d{1,2})(?:st|nd|rd|th)?[,.\-\s]*(?:(\d{4}))?\s*$/);
  if (md && MONTHS[md[1].toLowerCase()]) {
    return buildFromTokens(+md[2], MONTHS[md[1].toLowerCase()], md[3] ? +md[3] : null, reference);
  }

  // Numeric forms: 05/09/2026, 09-25-2026, 25.09.26, 2026/09/05
  const num = s.match(/^(\d{1,4})[\/\-.](\d{1,2})[\/\-.](\d{1,4})$/);
  if (num) {
    const a = +num[1];
    const b = +num[2];
    const c = +num[3];
    if (a >= 1900 && a <= 2100) {
      // Year-first form: 2026/09/05
      return validYMD(a, b, c) ?? validYMD(a, c, b);
    }
    let year = c;
    if (year < 100) year += 2000; // 2-digit year → 2000s (receipts are recent)
    if (year >= 1900 && year <= 2100) return resolveDualDate(a, b, year);
    return null;
  }

  return null;
}

// Shares "use today's year unless that lands in the future" logic for yearless dates.
function buildFromTokens(day: number, month: number, year: number | null, reference: Date): string | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  if (year != null) return validYMD(year, month, day);
  const withThisYear = validYMD(reference.getFullYear(), month, day);
  if (!withThisYear) return null;
  return withThisYear > localDateISO(reference)
    ? validYMD(reference.getFullYear() - 1, month, day)
    : withThisYear;
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (v: string) => norm(v).split(" ").filter(Boolean);

/** Synonyms scored by token coverage; category list order breaks ties. */
const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "Inventory / Stock": ["stock", "inventory", "goods", "supplies", "raw material", "purchase", "provision"],
  Transportation: ["transport", "transportation", "fuel", "uber", "bolt", "fare", "logistics", "delivery", "shipping", "petrol"],
  Salaries: ["salary", "salaries", "wages", "staff", "employee", "payroll"],
  Rent: ["rent", "shop"],
  Utilities: ["utility", "utility bill", "utilities", "electricity", "electric", "water", "light", "generator", "power", "phcn"],
  Marketing: ["marketing", "advert", "advertising", "ads", "promo", "promotion", "social media", "flyer"],
  Equipment: ["equipment", "machine", "machinery", "tool", "tools", "refrigerator", "fan"],
  Food: ["food", "lunch", "snack", "drink", "ingredient", "ingredients", "meal", "bread", "provision"],
  Packaging: ["packaging", "bag", "bottle", "nylon", "container", "box"],
  "Internet / Data": ["internet", "data", "airtime", "wifi", "subscription", "recharge", "mtn", "glo", "airtel"],
  Taxes: ["tax", "taxes", "levy", "vat", "his", "custom"],
  Other: ["other", "miscellaneous", "misc", "general"],
  Sales: ["sale", "sales", "goods", "merchandise", "product", "products"],
  Services: ["service", "services", "repair", "alteration", "consult", "consulting", "beauty", "salon"],
  "Catering Order": ["catering", "order", "event", "wedding", "party"],
  Freelance: ["freelance", "gig", "contract", "commission"],
};

function phraseScore(textTokens: string[], phrase: string): number {
  const parts = phrase.toLowerCase().split(" ").filter(Boolean);
  if (parts.length === 0) return 0;
  const covered = parts.filter((p) => textTokens.includes(p)).length;
  if (covered === 0) return 0;
  return covered / parts.length + (parts.length === 1 ? 0.5 : 0);
}

/**
 * Maps free-text OCR categories onto the app's constrained lists.
 * Returns null when there is no confident match (the user should pick).
 */
export function matchCategoryToAllowed(raw: unknown, allowed: readonly string[]): string | null {
  const text = norm(typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "");
  if (!text) return null;
  const nameTokens = tokens(text);

  for (const cat of allowed) {
    if (norm(cat) === text) return cat;
  }

  let bestScore = 0;
  let best: string | null = null;
  for (let idx = 0; idx < allowed.length; idx++) {
    const cat = allowed[idx];
    const phrases = [cat, ...(CATEGORY_SYNONYMS[cat] ?? [])];
    let score = 0;
    for (const phrase of phrases) score = Math.max(score, phraseScore(nameTokens, phrase));
    if (score >= 1 && score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

function parseType(value: unknown): TransactionType | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (/expense|spent|money out|^out$|paid (?:for|out)|cost|purchase/.test(s)) return "expense";
  if (/income|sale|money in|^in$|earned|received|payment received/.test(s)) return "income";
  return null;
}

function parsePaymentStatus(value: unknown): PaymentStatus | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (/credit|owed|not paid|unpaid|debt/.test(s)) return "credit";
  if (/pending|await|will pay|debit|yet/.test(s)) return "pending";
  if (/paid|complete|done|settled|cash|transfer|pos|card/.test(s)) return "paid";
  return null;
}

function parsePaymentMethod(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim().toLowerCase();
  if (/cash/.test(s)) return "Cash";
  if (/point of sale|^pos$|\bpos\b/.test(s)) return "POS";
  if (/bank|transfer|nuban|gtb|first bank|zenith|access/.test(s)) return "Bank Transfer";
  if (/card|visa|mastercard/.test(s)) return "Card";
  if (/other/.test(s)) return "Other";
  return null;
}

function cleanDescription(value: unknown): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > 120 ? `${s.slice(0, 117).trimEnd()}…` : s;
}

// ---------------------------------------------------------------------------
// Full normalization
// ---------------------------------------------------------------------------

/**
 * Constraints a raw model/vision payload onto the app's transaction schema.
 * Works on the first meaningful object when handed an array, and never throws:
 * unreadable fields come back as null/empty with low confidence.
 */
export function normalizeExtraction(raw: unknown, reference: Date = new Date()): NormalizedExtraction {
  const first = Array.isArray(raw) ? raw[0] : raw;
  const obj =
    first && typeof first === "object" && !Array.isArray(first)
      ? (first as Record<string, unknown>)
      : {};

  const detectedType = parseType(obj.type);
  const type: TransactionType = detectedType ?? "expense";

  const description = cleanDescription(obj.description);
  const amount = parseAmountToNaira(obj.amount);
  const date = normalizeDateString(obj.date, reference);
  const category = matchCategoryToAllowed(obj.category, type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
  const statusDetected = parsePaymentStatus(obj.payment_status);
  const payment_status: PaymentStatus = statusDetected ?? "paid";
  const payment_method = parsePaymentMethod(obj.payment_method);

  const confidence: OcrConfidence = {
    type: detectedType ? 1 : 0.4,
    description: description ? 1 : 0,
    amount: amount != null ? 1 : 0,
    date: date != null ? 1 : 0,
    category: category ? (norm(String(obj.category)).length ? 0.9 : 1) : 0,
    payment_status: statusDetected ? 1 : 0.3,
    payment_method: payment_method ? 1 : 0,
  };

  const extracted: OcrExtraction = { type, description, amount, date, category, payment_status, payment_method };
  const missing: OcrFieldKey[] = (
    ["type", "description", "amount", "date", "category", "payment_status"] as OcrFieldKey[]
  ).filter((k) => confidence[k] === 0);

  return { extracted, confidence, missing };
}

/** Recovers a JSON object from model output that may be wrapped in prose/markdown. */
export function parseModelJSON<T = unknown>(text: string): T | null {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const cleaned = t
    .replace(/```(?:json)?/gi, "")
    .replace(/^[^[{]*/, "")
    .replace(/[^}\]]*$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return (parsed ?? null) as T | null;
  } catch {
    /* fall through to brace extraction */
  }
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as T;
  } catch {
    return null;
  }
}