import { NextRequest, NextResponse } from "next/server";
import { groq, hasGroqKey, imageUrlPart, GROQ_MODELS } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const DEMO_EXTRACT = {
    type: "expense",
    description: "Stock purchase",
    amount: 25000,
    date: new Date().toISOString().slice(0, 10),
    category: "Inventory / Stock",
    payment_status: "paid",
    payment_method: "Cash",
  };

    if (!hasGroqKey()) {
      return NextResponse.json({ extracted: DEMO_EXTRACT, provider: "local-demo" });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const prompt = `Read this receipt or handwritten business record photo. Extract ONE transaction as JSON with keys: type ("income"|"expense"), description, amount (number, Naira, no commas), date (YYYY-MM-DD), category (one of: Inventory / Stock, Transportation, Salaries, Rent, Utilities, Marketing, Equipment, Food, Packaging, Internet / Data, Taxes, Sales, Services, Other), payment_status ("paid"|"pending"|"credit"), payment_method ("Cash"|"Bank Transfer"|"POS"|"Card"|"Other"). If unsure, leave empty string and let user fill. Return ONLY JSON.`;
    let text: string;
    try {
      text = await groq(
        [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              imageUrlPart(file.type || "image/jpeg", base64),
            ],
          },
        ],
        { model: GROQ_MODELS.vision, json: true, temperature: 0, maxTokens: 800 }
      );
    } catch (e) {
      // Vision model not available on this Groq account → degrade to a
      // reviewable stub so the scan flow still works end-to-end.
      console.error("ocr vision unavailable:", e);
      return NextResponse.json({ extracted: DEMO_EXTRACT, provider: "local-demo", vision: false });
    }
    text = text.trim().replace(/```json|```/g, "");
    let extracted;
    try {
      extracted = JSON.parse(text);
    } catch {
      extracted = { description: text.slice(0, 120), amount: "", date: new Date().toISOString().slice(0, 10), type: "expense", category: "Other", payment_status: "paid" };
    }
    return NextResponse.json({ extracted, provider: "groq-vision" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
