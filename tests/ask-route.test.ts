import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";

vi.mock("../src/services/embeddings", () => ({
  createEmbeddings: vi.fn(async () => [[0.1, 0.2, 0.3]]),
}));

vi.mock("../src/services/vectorize", () => ({
  searchVectors: vi.fn(async () => [{ id: "vec_1", score: 0.91, chunkId: "chunk_1" }]),
}));

vi.mock("../src/repositories/ragRepository", () => ({
  getChunksByIds: vi.fn(async () => [
    {
      id: "chunk_1",
      documentId: "doc_1",
      title: "Policies",
      source: "upload",
      content: "The office is closed on public holidays.",
      score: 0.91,
    },
  ]),
}));

vi.mock("../src/services/llm", () => ({
  generateAnswer: vi.fn(async () => "The office is closed on public holidays. [1]"),
  streamAnswer: vi.fn(),
}));

function createMockEnv() {
  return {
    DB: {} as D1Database,
    DOCS_BUCKET: {} as R2Bucket,
    VECTOR_INDEX: {} as VectorizeIndex,
    RATE_LIMIT_KV: {
      get: vi.fn(async () => null),
      put: vi.fn(async () => undefined),
    } as unknown as KVNamespace,
    OPENAI_API_KEY: "test-key",
    AI_GATEWAY_BASE_URL: "https://gateway.ai.cloudflare.com/fake/account/gateway/openai",
    EMBEDDING_MODEL: "text-embedding-3-small",
    CHAT_MODEL: "gpt-4o-mini",
    MAX_CHUNKS_PER_QUERY: "5",
  };
}

describe("POST /ask", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns grounded response with citations", async () => {
    const response = await app.request(
      "http://localhost/ask",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: "ws_1",
          query: "When is the office closed?",
        }),
      },
      createMockEnv(),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { answer: string; citations: unknown[] };
    expect(body.answer).toContain("public holidays");
    expect(body.citations.length).toBe(1);
  });
});
