const BASE = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = {
  smart: "openai/gpt-oss-120b",
  fast: "openai/gpt-oss-20b",
  vision: "openai/gpt-oss-120b",
} as const;

type GroqPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string | GroqPart[];
};

export interface GroqOptions {
  model?: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Thin OpenAI-compatible wrapper around Groq's chat completions endpoint.
 * Server-side only (routes in src/app/api/**). Falls back nowhere — callers
 * decide what to do when this throws or key is missing.
 */
export async function groq(
  messages: GroqMessage[],
  opts: GroqOptions = {}
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? GROQ_MODELS.smart,
      messages,
      temperature: opts.temperature ?? 0,
      max_tokens: opts.maxTokens ?? 1200,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Builds an { image_url } part for Groq's vision-capable models. */
export function imageUrlPart(mimeType: string, base64: string): GroqPart {
  return { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } };
}