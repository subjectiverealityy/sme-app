import { NextRequest, NextResponse } from "next/server";

interface Txn {
  type: "income" | "expense";
  description: string;
  amount: number;
  transaction_date: string;
  payment_status: string;
  customer_or_vendor?: string;
  due_date?: string | null;
}

interface RecordDraft {
  type: "income";
  description: string;
  amount: number;
  category: "Sales";
  payment_status: "paid" | "credit" | "interested";
  customer_or_vendor?: string;
}

function normalizeStatus(status: string) {
  return status === "pending" ? "credit" : status;
}

function debtorRecords(txns: Txn[]) {
  return txns.filter((t) => t.type === "income" && t.customer_or_vendor?.trim());
}

function localAnswer(question: string, txns: Txn[]): string {
  const q = question.toLowerCase();
  const records = debtorRecords(txns);
  if (records.length === 0) return "I don't have enough debtor records to answer that yet. Add a person and their status first.";
  const credit = records.filter((t) => normalizeStatus(t.payment_status) === "credit");
  const interested = records.filter((t) => normalizeStatus(t.payment_status) === "interested");
  const paid = records.filter((t) => normalizeStatus(t.payment_status) === "paid");
  const fmt = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
  const owed = credit.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const people = (items: Txn[]) => [...new Set(items.map((t) => t.customer_or_vendor).filter(Boolean))].join(", ");

  if (q.includes("owe") || q.includes("credit") || q.includes("debtor")) {
    return credit.length === 0 ? "Good news — nobody is currently on credit." : `You are owed ${fmt(owed)} across ${credit.length} credit record(s): ${people(credit)}.`;
  }
  if (q.includes("interest") || q.includes("interested") || q.includes("lead") || q.includes("potential")) {
    return interested.length === 0 ? "You have no interested contacts recorded yet." : `${interested.length} interested contact(s) need a thoughtful follow-up: ${people(interested)}.`;
  }
  if (q.includes("paid") || q.includes("convert") || q.includes("customer")) {
    return paid.length === 0 ? "No paid customers are recorded yet." : `${paid.length} contact(s) have converted to paid customers: ${people(paid)}.`;
  }
  if (q.includes("follow") || q.includes("remind") || q.includes("due")) {
    const due = credit.filter((t) => t.due_date && new Date(t.due_date) <= new Date());
    return due.length === 0 ? "There are no credit follow-ups due today." : `${due.length} credit follow-up(s) are due: ${people(due)}.`;
  }
  return `You have ${new Set(records.map((t) => t.customer_or_vendor)).size} people recorded: ${credit.length} on credit, ${interested.length} interested, and ${paid.length} paid.`;
}

function parseRecordIntent(question: string): RecordDraft | null {
  const q = question.trim();
  if (!/\b(record|add|log|save)\b/i.test(q) || /\b(how much|how many|what|where|when|which|who|show|list|total)\b/i.test(q)) return null;
  const amountMatch = q.match(/₦\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?naira/i);
  const amount = amountMatch ? Number((amountMatch[1] ?? amountMatch[2]).replace(/,/g, "")) : 0;
  if (!amountMatch || !amount || amount <= 0) return null;
  const status: RecordDraft["payment_status"] = /\b(interested|considering|enquir|potential|maybe)\b/i.test(q)
    ? "interested"
    : /\b(credit|owe|owes|owed|unpaid|promise|later|will pay)\b/i.test(q)
      ? "credit"
      : "paid";
  const personMatch = q.match(/\b(?:from|to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,2})/);
  const recordPersonMatch = q.match(/\b(?:record|add)\s+([A-Za-z][a-z]+(?:\s+[A-Za-z][a-z.]+){0,2})\s+(?=as\b|is\b|for\b)/i);
  const customerCandidate = recordPersonMatch?.[1] ?? personMatch?.[1];
  const customer = customerCandidate && !/^(today|yesterday|this|last|the|my|a|an)\b/i.test(customerCandidate)
    ? customerCandidate.trim()
    : undefined;
  let description = q.replace(amountMatch[0], "").replace(/\b(record|add|log|save|interested|considering|potential|credit|owe|owes|owed|unpaid|paid|promise|will pay)\b/gi, "");
  if (personMatch) description = description.replace(personMatch[0], "");
  if (recordPersonMatch) description = description.replace(recordPersonMatch[0], "");
  description = description.replace(/\s+/g, " ").trim().slice(0, 80) || "Product or service";
  return { type: "income", description, amount: Math.round(amount), category: "Sales", payment_status: status, customer_or_vendor: customer };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body.question ?? "";
    const transactions: Txn[] = body.transactions ?? [];
    if (!question.trim()) return NextResponse.json({ answer: "Please ask a question." }, { status: 400 });

    const draft = parseRecordIntent(question);
    const recordAction = draft ? { kind: "record-debtor", draft } : undefined;
    const localDraftAnswer = draft
      ? `Got it — ${draft.customer_or_vendor ? `${draft.customer_or_vendor} is ` : "This person is "}${draft.payment_status}. Check the debtor details below and save when ready.`
      : localAnswer(question, transactions);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ answer: localDraftAnswer, provider: "local", action: recordAction });

    const records = debtorRecords(transactions);
    const credit = records.filter((t) => normalizeStatus(t.payment_status) === "credit");
    const interested = records.filter((t) => normalizeStatus(t.payment_status) === "interested");
    const paid = records.filter((t) => normalizeStatus(t.payment_status) === "paid");
    const owed = credit.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const context = `You are Credyt, a friendly debtor follow-up assistant for Nigerian small businesses. Only discuss debtors, people on credit, interested people, follow-ups, and people converted to paid customers. Never discuss income, expenses, spending, profit, sales totals, or accounting.
Verified figures:
- Total debtor records: ${records.length}
- People on credit: ${credit.length}, total owed: ${owed}
- Interested people: ${interested.length}
- Converted paid customers: ${paid.length}
- Debtor records: ${JSON.stringify(records)}
${draft ? `The user wants to record a debtor. Draft: ${JSON.stringify(draft)}. Confirm the person and status in one short sentence. Do not claim it is saved; they still need to tap Save.` : ""}
If the requested debtor information is missing, say so plainly. Question: ${question}`;

    const { generateWithFallback } = await import("@/lib/gemini");
    try {
      const { text } = await generateWithFallback(context);
      return NextResponse.json({ answer: text || localDraftAnswer, provider: "gemini", action: recordAction });
    } catch (e) {
      console.error("Gemini failed, using local answer:", e);
      return NextResponse.json({ answer: localDraftAnswer, provider: "local-fallback", action: recordAction });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ answer: "Credyt is unavailable right now. Try again shortly." }, { status: 500 });
  }
}
