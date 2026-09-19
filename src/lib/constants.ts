export const BRAND = {
  primary: "#167C5A",
  dark: "#0F5132",
  mint: "#DDF5EA",
  bg: "#F8FAF9",
  ink: "#17221D",
} as const;

export const BUSINESS_CATEGORIES = [
  "Retail",
  "Food & Catering",
  "Fashion",
  "Transportation",
  "Professional Services",
  "Beauty & Personal Care",
  "Agriculture",
  "Manufacturing",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Inventory / Stock",
  "Transportation",
  "Salaries",
  "Rent",
  "Utilities",
  "Marketing",
  "Equipment",
  "Food",
  "Packaging",
  "Internet / Data",
  "Taxes",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Sales",
  "Services",
  "Catering Order",
  "Freelance",
  "Other",
] as const;

export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "credit", label: "Credit" },
  { value: "interested", label: "Interested" },
] as const;

export const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "POS",
  "Card",
  "Other",
] as const;

export type TransactionType = "income" | "expense";
export type PaymentStatus = "paid" | "credit" | "interested" | "pending";
export type TransactionSource = "manual" | "ocr";
export type ScanStatus = "processing" | "completed" | "needs_review" | "failed";

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  phone: string;
  location: string;
  description?: string;
  payment_details?: string;
  created_at: string;
}

export type ReminderLanguage = "english" | "pidgin";
export type ReminderStatus = "sent" | "skipped";
export type ReplyIntent = "promise_to_pay" | "dispute" | "part_payment" | "paid_claim" | "none";

export interface DebtPayment {
  id: string;
  business_id: string;
  transaction_id: string;
  amount: number;
  method?: string;
  notes?: string;
  paid_at: string;
  created_at: string;
}

export interface DebtReminder {
  id: string;
  business_id: string;
  transaction_id: string;
  debtor_name: string;
  debtor_phone: string;
  stage: number;
  language: ReminderLanguage;
  message: string;
  status: ReminderStatus;
  sent_at: string;
  created_at: string;
}

export interface DebtReply {
  id: string;
  business_id: string;
  transaction_id: string;
  raw_text: string;
  raw_file_type?: string;
  intent: ReplyIntent;
  promised_date: string | null;
  amount_mentioned: number | null;
  confidence: number;
  quote: string;
  status: "draft" | "confirmed" | "dismissed";
  created_at: string;
}

export interface Transaction {
  id: string;
  business_id: string;
  type: TransactionType;
  description: string;
  amount: number; // Naira, stored as integer kobo? For MVP store Naira number
  category: string;
  transaction_date: string; // ISO date
  payment_status: PaymentStatus;
  payment_method?: string;
  customer_or_vendor?: string;
  customer_phone?: string;
  reminder_language?: ReminderLanguage;
  notes?: string;
  source: TransactionSource;
  created_at: string;
}

export interface ScannedRecord {
  id: string;
  business_id: string;
  image_url?: string;
  status: ScanStatus;
  extracted_data: Partial<Transaction> | Partial<Transaction>[] | Record<string, unknown> | null;
  created_at: string;
}

export const SUGGESTED_QUESTIONS = [
  "How much am I owed?",
  "Who is on credit?",
  "Who is interested but has not paid?",
  "Who converted to a paid customer?",
  "Who needs a follow-up?",
  "Record Chidi as interested in Ankara for ₦25,000",
];
