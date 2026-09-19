import { NextRequest, NextResponse } from "next/server";
import type { ParsedReply } from "@/lib/collections";
import { extractNairaAmount, parseReplyLocal, promisedDateFromText } from "@/lib/collections";
import { groq, hasGroqKey } from "@/lib/groq";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Deterministic finalization — money/dates ALWAYS come from the text, never
 *  the model. The model may only pin the intent (and a validated future date
 *  when the text has no explicit hint), while confidence drops when the model
 *  disagrees with the local parser. */
function finalizeReply(text: string, model?: Partial<ParsedReply>): ParsedReply {
  const local = parseReplyLocal(text);
  const money = extractNairaAmount(text);
  const modelIntent = model?.intent ? model.intent : null;
  const intent = modelIntent ?? local.intent;
  const agrees = !modelIntent || modelIntent === local.intent;

  let promised_date: string | null = null;
  if (intent === "promise_to_pay" || intent === "part_payment") {
    const hint = promisedDateFromText(text);
    const modelDate =
      typeof model?.promised_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(model.promised_date)
        ? model.promised_date
        : null;
    promised_date = hint ?? modelDate ?? null;
  }

  const confidence =
    typeof model?.confidence === "number" && Number.isFinite(model.confidence)
      ? Math.min(model.confidence, agrees ? 1 : 0.7)
      : agrees
        ? 0.85
        : 0.5;

  return {
    intent,
    promised_date,
    amount_mentioned: money ?? (typeof model?.amount_mentioned === "number" ? model.amount_mentioned : null),
    confidence,
    quote: typeof model?.quote === "string" ? model.quote.slice(0, 60) : "",
  };
}

const SYSTEM = `You are a debt-collection assistant for a small Nigerian business. A customer answered a reminder through a reply link. Return ONLY a JSON object:
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

// BSL-2: reply links are rate-capped at the edge guard in this handler.
export async function POST(req: NextRequest) {
  let body: { code?: string; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const code = String(body?.code ?? "").trim();
  const text = String(body?.text ?? "").trim();
  if (!code || !text) {
    return NextResponse.json({ error: "Missing 'code' or 'text'." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return NextResponse.json({ error: "Invalid reply code." }, { status: 400 });
  }

  const parsed = finalizeReply(text);
  if (hasGroqKey()) {
    try {
      const raw = await groq(
        [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Today's date: ${new Date().toISOString().slice(0, 10)}\nCustomer reply: "${text}"` },
        ],
        { json: true, temperature: 0, maxTokens: 400 }
      );
      const modelGuess = safeParse(raw);
      if (modelGuess) Object.assign(parsed, finalizeReply(text, modelGuess));
    } catch (e) {
      console.error("owed-reply groq failed:", e);
    }
  }

  // Live mode: persist a DRAFT reply via the security-definer RPC so an unauthenticated
  // debtor can append to the correct business without reaching any other data.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await getSupabaseServer();
      if (supabase) {
        const { data, error } = await supabase.rpc("record_debt_reply", {
          txn_id: code,
          raw_text: text,
          intent: parsed.intent,
          promised_date: parsed.promised_date,
          amount_mentioned: parsed.amount_mentioned,
          confidence: parsed.confidence,
          quote: parsed.quote,
        });
        if (error) {
          console.error("owed-reply rpc failed:", error.message);
        } else if (data) {
          return NextResponse.json({ ok: true, parsed, reply: data });
        }
      }
    } catch (e) {
      console.error("owed-reply supabase failed:", e);
    }
    return NextResponse.json({ ok: true, parsed, persisted: false }, { status: 503 });
  }

  // Demo mode: nothing server-side to write to — the /r page mirrors the reply
  // into localStorage when it's running in the merchant's own browser.
  return NextResponse.json({ ok: true, parsed, persisted: false, demo: true });
}