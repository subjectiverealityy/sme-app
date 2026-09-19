import { NextRequest, NextResponse } from "next/server";

interface Txn {
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  payment_status: string;
}

function localAnswer(question: string, txns: Txn[]): string {
  const q = question.toLowerCase();
  if (txns.length === 0) return "I don't have enough recorded transactions to answer that yet. Record some sales or expenses first.";
  const now = new Date();
  const monthTx = txns.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const sum = (arr: Txn[], type?: string) =>
    arr.filter((t) => !type || t.type === type).reduce((s, t) => s + Number(t.amount || 0), 0);
  const fmt = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

  if (q.includes("how much") && q.includes("owe")) {
    const owed = txns.filter((t) => t.type === "income" && t.payment_status !== "paid").reduce((s, t) => s + Number(t.amount), 0);
    return owed === 0 ? "Good news — nobody owes you right now. All recorded income is marked paid." : `You are owed ${fmt(owed)} from ${txns.filter((t) => t.type === "income" && t.payment_status !== "paid").length} unpaid sale(s).`;
  }
  if (q.includes("make") || q.includes("income") || q.includes("profit") || q.includes("earn")) {
    if (q.includes("last month")) {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lm = txns.filter((t) => {
        const d = new Date(t.transaction_date);
        return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
      });
      const cur = sum(monthTx, "income");
      const prev = sum(lm, "income");
      const diff = cur - prev;
      return `This month you made ${fmt(cur)} and last month ${fmt(prev)}. That's ${diff >= 0 ? "up" : "down"} by ${fmt(Math.abs(diff))}.`;
    }
    const mIn = sum(monthTx, "income");
    return `This month you've made ${fmt(mIn)} from ${monthTx.filter((t) => t.type === "income").length} sale(s).`;
  }
  if (q.includes("spend") || q.includes("expense") || q.includes("biggest")) {
    const byCat = new Map<string, number>();
    for (const t of monthTx.filter((t) => t.type === "expense")) {
      byCat.set(t.category, (byCat.get(t.category) || 0) + Number(t.amount));
    }
    if (byCat.size === 0) return "No expenses recorded this month yet.";
    const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
    const [topCat, topAmt] = sorted[0];
    const breakdown = sorted.slice(0, 3).map(([c, v]) => `${c}: ${fmt(v)}`).join(", ");
    return `You spent the most on ${topCat.toLowerCase()}, with ${fmt(topAmt)} spent this month. Breakdown — ${breakdown}.`;
  }
  if (q.includes("sell") || q.includes("most")) {
    const byDesc = new Map<string, number>();
    for (const t of monthTx.filter((t) => t.type === "income")) {
      byDesc.set(t.description, (byDesc.get(t.description) || 0) + Number(t.amount));
    }
    if (byDesc.size === 0) return "No sales recorded this month yet.";
    const [top, amt] = [...byDesc.entries()].sort((a, b) => b[1] - a[1])[0];
    return `Your top sale this month is "${top}" with ${fmt(amt)}.`;
  }
  const totalIn = sum(txns, "income");
  const totalOut = sum(txns, "expense");
  return `Here's a quick summary: total money in ${fmt(totalIn)}, money out ${fmt(totalOut)}, profit ${fmt(totalIn - totalOut)} across ${txns.length} records. Ask me "Where did I spend the most money?" for more detail.`;
}

interface RecordDraft {
  type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  payment_status: "paid" | "pending" | "credit";
  customer_or_vendor?: string;
}

const EXPENSE_HINTS: [RegExp, string][] = [
  [/transport|fuel|uber|bike|danfo|delivery/i, "Transportation"],
  [/stock|inventory|goods|bag of|rice|restock|suppl/i, "Inventory / Stock"],
  [/salar|staff|wage|worker/i, "Salaries"],
  [/rent|shop rent|store rent/i, "Rent"],
  [/nepa|light|water|utilit|waste/i, "Utilities"],
  [/market|advert|promo|flyer|ads/i, "Marketing"],
  [/machine|equipment|generator|freezer|sewing/i, "Equipment"],
  [/food|lunch|meal|eat/i, "Food"],
  [/packag|nylon|bag\b|box/i, "Packaging"],
  [/data|internet|mtn|airtime|glo|etisalat/i, "Internet / Data"],
  [/tax|levy|dues/i, "Taxes"],
];

const INCOME_HINTS: [RegExp, string][] = [
  [/cater|wedding|event|food tray/i, "Catering Order"],
  [/service|repair|hair|nail|lesson|consult/i, "Services"],
  [/freelance|gig|contract|design|writing/i, "Freelance"],
];

/**
 * Detect "record a transaction" intent, e.g. "record 25000 Ankara sales",
 * "add expense 15000 transport", "log that Chidi still owes 25000".
 * Returns a draft for the user to confirm — never auto-saves.
 */
function parseRecordIntent(question: string): RecordDraft | null {
  const q = question.trim();
  if (!/\b(record|add|log|save)\b/i.test(q)) return null;
  // avoid hijacking questions about existing records
  if (/\b(how much|how many|what|where|when|which|who|compare|show|list|total)\b/i.test(q)) return null;

  // Amount: prefer ₦-marked or "naira" numbers, else the largest plausible number.
  // The exact matched token is removed from the description later.
  let amount = 0;
  let amountToken = "";
  const marked = q.match(/₦\s?([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s?naira/i);
  if (marked) {
    amountToken = marked[0];
    amount = Number((marked[1] ?? marked[2]).replace(/,/g, ""));
  } else {
    const tokens = [...q.matchAll(/([\d,]+(?:\.\d+)?)/g)].map((m) => m[1]);
    const nums = tokens.map((t) => Number(t.replace(/,/g, ""))).filter((n) => n > 0);
    if (nums.length === 0) return null;
    amount = Math.max(...nums);
    amountToken = tokens.find((t) => Number(t.replace(/,/g, "")) === amount) ?? "";
  }
  if (!amount || amount <= 0 || amount > 1000000000) return null;

  const lower = q.toLowerCase();
  const isExpense = /\b(spent|spend|expense|bought|buy|cost|paid for|transport|salary|salaries|rent|stock)\b/i.test(q);
  const type: "income" | "expense" = isExpense ? "expense" : "income";

  let payment_status: RecordDraft["payment_status"] = "paid";
  if (/\b(credit|owe|owes|owed|unpaid|on credit|promise)\b/i.test(q)) payment_status = "credit";
  else if (/\b(pending|awaiting|not yet|later|will pay)\b/i.test(q)) payment_status = "pending";

  const hints = type === "expense" ? EXPENSE_HINTS : INCOME_HINTS;
  let category = type === "income" ? "Sales" : "Other";
  for (const [re, cat] of hints) {
    if (re.test(q)) {
      category = cat;
      break;
    }
  }

  // Customer: "from Chidi", "to Mrs Okafor", "for Chidi"
  let customer: string | undefined;
  const m = q.match(/\b(?:from|to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,2})/);
  if (m && !/^(today|yesterday|this|last|the|my|a|an)\b/i.test(m[1])) customer = m[1].trim();

  // Description: strip verbs, the amount token, status words, customer clause
  let desc = q;
  if (amountToken) {
    const i = desc.indexOf(amountToken);
    if (i >= 0) desc = desc.slice(0, i) + " " + desc.slice(i + amountToken.length);
  }
  desc = desc
    .replace(/\b(record|add|log|save)\b\.?/gi, "")
    .replace(/\b(income|expense|sale|sales|sold|spent|on credit|credit|pending|paid|cash|transfer)\b/gi, "")
    .replace(/\b(?:from|to|for)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,2}/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (desc.length < 2) desc = type === "income" ? "Sale" : "Expense";
  if (desc.length > 80) desc = desc.slice(0, 80);
  void lower;

  return { type, description: desc, amount: Math.round(amount), category, payment_status, customer_or_vendor: customer };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body.question ?? "";
    const transactions: Txn[] = body.transactions ?? [];
    if (!question.trim()) return NextResponse.json({ answer: "Please ask a question." }, { status: 400 });

    // Recording intent is parsed deterministically (never hallucinated amounts)
    const draft = parseRecordIntent(question);
    const recordAction = draft ? { kind: "record-transaction", draft } : undefined;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const answer = draft
        ? `Got it — ${draft.type === "income" ? "money in" : "money out"} of ₦${draft.amount.toLocaleString("en-NG")} (${draft.description}). Check the details below and save 👇`
        : localAnswer(question, transactions);
      return NextResponse.json({ answer, provider: "local", action: recordAction });
    }

    // Compute structured aggregates server-side (never let model hallucinate numbers)
    const now = new Date();
    const inMonth = (d: string) => {
      const x = new Date(d);
      return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear();
    };
    const monthTx = transactions.filter((t) => inMonth(t.transaction_date));
    const totalIn = transactions.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalOut = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthIn = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthOut = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    const owed = transactions.filter((t) => t.type === "income" && t.payment_status !== "paid").reduce((s, t) => s + Number(t.amount || 0), 0);
    const byCat: Record<string, number> = {};
    for (const t of monthTx.filter((t) => t.type === "expense")) {
      byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount);
    }

    const context = `You are Ledgerly, a friendly assistant for Nigerian small businesses. Use plain language, Naira (₦), no accounting jargon.
Verified figures (do NOT invent numbers, use these):
- Total money in: ${totalIn}, total money out: ${totalOut}, profit: ${totalIn - totalOut}
- This month in: ${monthIn}, out: ${monthOut}
- Owed to user: ${owed}
- Expense by category this month: ${JSON.stringify(byCat)}
- Record count: ${transactions.length}
- Record count: ${transactions.length}${draft ? `\nThe user wants to RECORD a transaction. Draft: ${JSON.stringify(draft)}. Reply in one short friendly sentence confirming what you understood (e.g. "Got it — ₦25,000 Ankara sales as paid income, ready to save below."). Do NOT invent different numbers. Do NOT claim it is already saved — the user still taps Save.` : ""}
If data is missing say you don't have enough records. Question: ${question}`;

    const { generateWithFallback } = await import("@/lib/gemini");
    try {
      const { text } = await generateWithFallback(context);
      return NextResponse.json({ answer: text || localAnswer(question, transactions), provider: "gemini", action: recordAction });
    } catch (e) {
      // Gemini call failed (bad model, quota, network) — fall back to computed answer
      console.error("Gemini failed, using local answer:", e);
      const fallback = draft
        ? `Got it — ${draft.type === "income" ? "money in" : "money out"} of ₦${draft.amount.toLocaleString("en-NG")} (${draft.description}). Check the details below and save 👇`
        : localAnswer(question, transactions);
      return NextResponse.json({ answer: fallback, provider: "local-fallback", action: recordAction });
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ answer: "AI is unavailable right now. Try again shortly." }, { status: 500 });
  }
}
