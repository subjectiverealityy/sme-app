import { NextRequest, NextResponse } from "next/server";
import { groq, hasGroqKey, imageUrlPart, GROQ_MODELS } from "@/lib/groq";
import { normalizeExtraction, parseModelJSON, localDateISO } from "@/lib/ocr";
import type { GroqOptions } from "@/lib/groq";

interface OcrRawResponse {
  type?: string;
  description?: string;
  amount?: number;
  date?: string;
  category?: string;
  payment_status?: string;
  payment_method?: string;
  unreadable?: boolean;
}

const SYSTEM = `You are the OCR engine for Credyt, a Nigerian business bookkeeping app. You read a photo of a paper receipt or handwritten ledger and extract ONE transaction into structured JSON for saving. Today is ${localDateISO()}. You respond ONLY with valid JSON — no prose, no markdown fences, no explanations.

Output schema:
{
  "type": "income" | "expense",
  "description": "string (max 120 chars, what was bought/sold)",
  "amount": number, // integer Naira, e.g. 25000
  "date": "YYYY-MM-DD",
  "category": "string", // MUST be one of the allowed categories below
  "payment_status": "paid" | "pending" | "credit",
  "payment_method": "Cash" | "Bank Transfer" | "POS" | "Mobile Money"
}

Allowed categories (type-aware):
INCOME: Sales, Services, Interest, Other Income
EXPENSE: Inventory / Stock, Transport, Feeding, Utilities, Rent, Salaries, Marketing, Maintenance, Other Expense

Rules:
- If type is "income", category MUST be from INCOME list; if "expense", from EXPENSE list.
- Amount in Naira (integer). Never invent figures — if unreadable, omit the field.
- Date: YYYY-MM-DD. If only day/month, assume current year; if that date is in the future, use previous year.
- If the image is unreadable or not a receipt/ledger, return { "unreadable": true }.
`;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    if (!hasGroqKey()) {
      // Local demo fallback — returns a realistic sample so the flow works offline
      const demo = normalizeExtraction(undefined);
      return NextResponse.json({ extracted: demo.extracted, confidence: demo.confidence, missing: demo.missing, provider: "local-demo" });
    }

    const base64 = await file.arrayBuffer().then((buf) => Buffer.from(buf).toString("base64"));
    const mime = file.type || "image/jpeg";

    const raw = await groq(
      [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the transaction from this receipt/ledger photo." },
            imageUrlPart(mime, base64),
          ],
        },
      ],
      { model: GROQ_MODELS.vision, json: true, temperature: 0, maxTokens: 700 } as GroqOptions
    );

    let parsed = parseModelJSON<OcrRawResponse>(raw);

    if (!parsed) {
      // Try direct JSON parse as fallback
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }

    if (parsed?.unreadable) {
      // Model explicitly says unreadable — return low-confidence empty extraction
      return NextResponse.json({
        ...normalizeExtraction(undefined),
        provider: "groq",
        low_confidence: true,
      });
    }

    return NextResponse.json({
      ...normalizeExtraction(parsed),
      provider: "groq",
    });
  } catch (e) {
    console.error("[ocr/process]", e);
    // Graceful fallback so the UI never hard-fails
    return NextResponse.json({
      ...normalizeExtraction(undefined),
      provider: "error-fallback",
      low_confidence: true,
    });
  }
}