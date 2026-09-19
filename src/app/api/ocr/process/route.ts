import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("image") as File | null;
    if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        extracted: {
          type: "expense",
          description: "Stock purchase",
          amount: 25000,
          date: new Date().toISOString().slice(0, 10),
          category: "Inventory / Stock",
          payment_status: "paid",
          payment_method: "Cash",
        },
        provider: "local-demo",
      });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Read this receipt or handwritten business record photo. Extract ONE transaction as JSON with keys: type ("income"|"expense"), description, amount (number, Naira, no commas), date (YYYY-MM-DD), category (one of: Inventory / Stock, Transportation, Salaries, Rent, Utilities, Marketing, Equipment, Food, Packaging, Internet / Data, Taxes, Sales, Services, Other), payment_status ("paid"|"pending"|"credit"), payment_method ("Cash"|"Bank Transfer"|"POS"|"Card"|"Other"). If unsure, leave empty string and let user fill. Return ONLY JSON.`;
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: base64, mimeType: file.type || "image/jpeg" } },
    ]);
    let text = result.response.text().trim().replace(/```json|```/g, "");
    let extracted;
    try {
      extracted = JSON.parse(text);
    } catch {
      extracted = { description: text.slice(0, 120), amount: "", date: new Date().toISOString().slice(0, 10), type: "expense", category: "Other", payment_status: "paid" };
    }
    return NextResponse.json({ extracted, provider: "gemini-vision" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
