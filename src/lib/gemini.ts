import { GoogleGenerativeAI } from "@google/generative-ai";

function candidates(): string[] {
  const list = [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
  return [...new Set(list.filter((m): m is string => Boolean(m)))];
}

/**
 * Generate content with automatic model fallback.
 * Google retires model names regularly (404s), so we try candidates in order
 * instead of hard-coding a single model that can break the feature.
 */
export async function generateWithFallback(
  parts: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0]
): Promise<{ text: string; model: string }> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  let lastErr: unknown = null;
  for (const name of candidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: name });
      const result = await model.generateContent(parts);
      const text = result.response.text();
      if (text) return { text, model: name };
    } catch (e) {
      lastErr = e;
      console.warn(`Gemini model ${name} failed, trying next:`, e instanceof Error ? e.message : e);
    }
  }
  throw lastErr ?? new Error("All Gemini models failed");
}
