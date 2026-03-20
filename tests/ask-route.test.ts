import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";

function createMockDb(): D1Database {
  return {
    prepare: () =>
      ({
        bind: () => ({
          all: async () => ({
            results: [
              {
                id: "chunk_1",
                document_id: "doc_1",
                title: "Policies",
                source: "upload",
                content: "The office is closed on public holidays.",
              },
            ],
          }),
        }),
      }) as D1PreparedStatement,
  } as unknown as D1Database;
}

function createMockEnv() {
  return {
    DB: createMockDb(),
    DOCS_BUCKET: {} as R2Bucket,
    VECTOR_INDEX: {
      query: vi.fn(async () => ({
        matches: [
          {
            id: "ws_1:doc_1:0",
            score: 0.91,
            metadata: {
              chunk_id: "chunk_1",
            },
          },
        ],
      })),
      upsert: vi.fn(async () => undefined),
    } as unknown as VectorizeIndex,
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
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "The office is closed on public holidays. [1]" } }],
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

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
