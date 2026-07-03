/**
 * Swappable LLM wrapper. Server-side only.
 *
 * Provider selection (env):
 *   LLM_PROVIDER=anthropic | openai   (optional — auto-detected from keys)
 *   ANTHROPIC_API_KEY=...             LLM_MODEL=claude-sonnet-4-5 (default)
 *   OPENAI_API_KEY=...                LLM_MODEL=gpt-4o-mini (default)
 *
 * When no key is configured, `llmAvailable()` is false and every AI feature
 * falls back to its deterministic rule-based generator, so the whole app
 * still works offline. Add a key → the same routes switch to the real model.
 */

export type LlmRole = "user" | "assistant";
export interface LlmMessage {
  role: LlmRole;
  content: string;
}

type Provider = "anthropic" | "openai" | null;

function resolveProvider(): Provider {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function llmAvailable(): boolean {
  return resolveProvider() !== null;
}

export function llmProviderName(): string {
  return resolveProvider() ?? "rule-based (no API key set)";
}

export async function llm(opts: {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const provider = resolveProvider();
  if (!provider) {
    throw new Error("No LLM provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
  }
  const maxTokens = opts.maxTokens ?? 1200;
  const temperature = opts.temperature ?? 0.7;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "claude-sonnet-4-5",
        max_tokens: maxTokens,
        temperature,
        system: opts.system,
        messages: opts.messages
      })
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n").trim();
  }

  // openai
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      max_tokens: maxTokens,
      temperature,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        ...opts.messages
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return (data.choices[0]?.message?.content ?? "").trim();
}

/** Ask for strict JSON and parse defensively (strips code fences). */
export async function llmJson<T>(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const text = await llm({
    system: `${opts.system ?? ""}\nRespond with VALID JSON ONLY. No prose, no markdown fences.`.trim(),
    messages: [{ role: "user", content: opts.prompt }],
    maxTokens: opts.maxTokens,
    temperature: 0.4
  });
  const clean = text.replace(/```(?:json)?/g, "").trim();
  const start = clean.indexOf("{");
  const startArr = clean.indexOf("[");
  const s = startArr !== -1 && (start === -1 || startArr < start) ? startArr : start;
  return JSON.parse(s > 0 ? clean.slice(s) : clean) as T;
}

/**
 * Vision call — image + prompt, works with both providers (Claude and
 * gpt-4o are both multimodal). The image arrives as base64 + media type;
 * fetch/encode it server-side before calling.
 */
export async function llmVision(opts: {
  system?: string;
  prompt: string;
  imageBase64: string;
  mediaType: string; // image/jpeg | image/png | image/webp | image/gif
  maxTokens?: number;
}): Promise<string> {
  const provider = resolveProvider();
  if (!provider) throw new Error("No LLM provider configured.");
  const maxTokens = opts.maxTokens ?? 800;

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL ?? "claude-sonnet-4-5",
        max_tokens: maxTokens,
        system: opts.system,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: opts.mediaType, data: opts.imageBase64 } },
            { type: "text", text: opts.prompt }
          ]
        }]
      })
    });
    if (!res.ok) throw new Error(`Anthropic vision ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { content: { type: string; text?: string }[] };
    return data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${opts.mediaType};base64,${opts.imageBase64}` } },
            { type: "text", text: opts.prompt }
          ]
        }
      ]
    })
  });
  if (!res.ok) throw new Error(`OpenAI vision ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

/** Fetch a remote image and prep it for llmVision. Size-capped at 5 MB. */
export async function fetchImageForVision(url: string): Promise<{ imageBase64: string; mediaType: string }> {
  const res = await fetch(url, { headers: { "user-agent": "RankForge/2.3 photo-audit" } });
  if (!res.ok) throw new Error(`Image fetch failed (${res.status}).`);
  const type = res.headers.get("content-type")?.split(";")[0] ?? "";
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) throw new Error(`Unsupported image type: ${type || "unknown"}.`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error("Image over 5 MB — use a smaller rendition.");
  return { imageBase64: buf.toString("base64"), mediaType: type };
}
