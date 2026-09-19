import { NextRequest, NextResponse } from "next/server";
import type { ParsedReply } from "@/lib/collections";
import { extractNairaAmount, parseReplyLocal, promisedDateFromText } from "@/lib/collections";

const SYSTEM = `You are a debt-collection assistant for a small Nigerian business. The user forwards a WhatsApp reply from a customer who owes money. Return ONLY a JSON object:
{ "intent": "promise_to_pay" | "part_payment" | "paid_claim" | "dispute" | "none", "promised_date": "YYYY-MM-DD or null", "amount_mentioned": integer or null, "quote": "short exact quote from the text" }
Rules: intent paid_claim when they claim they have paid; dispute when they deny the debt; part_payment when they offer to pay a part/installments; promise_to_pay when they name a day or say "I will pay"; otherwise none. For promised_date, resolve hints like "on Friday", "tomorrow", "end of month" to a concrete near-future date. amount_mentioned: any naira amount they mention (no symbol). Keep quote under 60 chars. Never invent facts.`;

function safeParse(raw: string): Partial<ParsedReply> | null {
  try {
    const cleaned = raw
      .replace(/```(?:json)?/gi, "")
      .replace(/^[^[{]*/, "")
      .replace(/[^}\]]*$/, "")
      .trim();
    const obj = JSON.parse(cleaned);
    if (obj && typeof obj === "object") return obj as Partial<ParsedReply>;
  } catch {
    return null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: { text?: string; business_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const text = String(body?.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Missing 'text'." }, { status: 400 });

  let parsed: ParsedReply | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0 },
      });
      const result = await model.generateContent(
        `${SYSTEM}\n\nBusiness: ${body?.business_name ?? "unknown"}\nCustomer reply: "${text}"`
      );
      const obj = safeParse(result.response.text());
      if (obj && typeof obj.intent === "string") {
        const localAmount = extractNairaAmount(text);
        parsed = {
          // The amount ALWAYS comes from the exact text match, never from the model.
          amount_mentioned: localAmount,
          promised_date:
            obj.promised_date && /^\d{4}-\d{2}-\d{2}$/.test(String(obj.promised_date))
              ? String(obj.promised_date)
              : promisedDateFromText(text),
          intent: (["promise_to_pay", "part_payment", "paid_claim", "dispute", "none"] as const).includes(
            obj.intent as ParsedReply["intent"]
          )
            ? (obj.intent as ParsedReply["intent"])
            : "none",
          quote: String(obj.quote || text).slice(0, 400),
          confidence: 0.95,
        };
      }
    } catch (e) {
      console.error("parse-reply gemini failed:", e);
      parsed = null;
    }
  }

  if (!parsed) parsed = parseReplyLocal(text);
  return NextResponse.json({ parsed });
}