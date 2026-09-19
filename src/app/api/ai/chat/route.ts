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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question: string = body.question ?? "";
    const transactions: Txn[] = body.transactions ?? [];
    if (!question.trim()) return NextResponse.json({ answer: "Please ask a question." }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ answer: localAnswer(question, transactions), provider: "local" });
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
If data is missing say you don't have enough records. Question: ${question}`;

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(context);
    const text = result.response.text() || localAnswer(question, transactions);
    return NextResponse.json({ answer: text, provider: "gemini" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ answer: "AI is unavailable right now. Try again shortly." }, { status: 500 });
  }
}
