import type { Env } from "../types/env";
import openai from "openai";

function getApiKey(env: Env): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }
  return env.OPENAI_API_KEY;
}

function normalizeBaseUrlForSdk(raw?: string): string | undefined {
  const base = raw?.replace(/\/$/, "");
  if (!base) {
    return undefined;
  }

  // Accept endpoint-form URLs pasted from dashboard snippets.
  if (base.endsWith("/chat/completions")) {
    return base.replace(/\/chat\/completions$/, "");
  }

  return base;
}

function getClient(env: Env) {
  return new openai({
    apiKey: getApiKey(env),
    baseURL: normalizeBaseUrlForSdk(env.AI_GATEWAY_BASE_URL),
  });
}

function getDirectClient(env: Env) {
  return new openai({
    apiKey: getApiKey(env),
  });
}

function modelCandidates(model: string): string[] {
  if (model.includes("/")) {
    return [model];
  }
  return [model, `openai/${model}`];
}

function parseStringContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "object" && part !== null && "text" in part) {
          return typeof (part as { text?: unknown }).text === "string"
            ? (part as { text: string }).text
            : "";
        }
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function toSsePayload(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function toDoneSsePayload(): Uint8Array {
  return new TextEncoder().encode("data: [DONE]\n\n");
}

function streamToReadable(
  stream: AsyncIterable<openai.Chat.Completions.ChatCompletionChunk>,
): ReadableStream<Uint8Array> {
  const iterator = stream[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.enqueue(toDoneSsePayload());
        controller.close();
        return;
      }
      controller.enqueue(toSsePayload(value));
    },
    async cancel() {
      if (typeof iterator.return === "function") {
        await iterator.return();
      }
    },
  });
}

export async function generateAnswer(env: Env, prompt: string): Promise<string> {
  const model = env.CHAT_MODEL ?? "gpt-4o-mini";
  const gatewayClient = getClient(env);

  for (const candidate of modelCandidates(model)) {
    try {
      const response = await gatewayClient.chat.completions.create({
        model: candidate,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      return parseStringContent(response.choices?.[0]?.message?.content);
    } catch {
      // Try next candidate/fallback.
    }
  }

  const directClient = getDirectClient(env);
  for (const candidate of modelCandidates(model)) {
    try {
      const response = await directClient.chat.completions.create({
        model: candidate,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });
      return parseStringContent(response.choices?.[0]?.message?.content);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("Unable to generate answer with gateway or direct OpenAI fallback");
}

export async function streamAnswer(env: Env, prompt: string): Promise<ReadableStream<Uint8Array>> {
  const model = env.CHAT_MODEL ?? "gpt-4o-mini";
  const gatewayClient = getClient(env);

  for (const candidate of modelCandidates(model)) {
    try {
      const stream = await gatewayClient.chat.completions.create({
        model: candidate,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        stream: true,
      });
      return streamToReadable(stream);
    } catch {
      // Try next candidate/fallback.
    }
  }

  const directClient = getDirectClient(env);
  for (const candidate of modelCandidates(model)) {
    try {
      const stream = await directClient.chat.completions.create({
        model: candidate,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        stream: true,
      });
      return streamToReadable(stream);
    } catch {
      // Try next candidate.
    }
  }

  throw new Error("Unable to stream answer with gateway or direct OpenAI fallback");
}
