import { Hono } from "hono";
import type { AppBindings } from "../types/env";
import { badRequest, internalError } from "../utils/http";
import { createEmbeddings } from "../services/embeddings";
import { searchVectors } from "../services/vectorize";
import { getChunksByIds } from "../repositories/ragRepository";
import { buildGroundedPrompt } from "../services/prompt";
import { generateAnswer, streamAnswer } from "../services/llm";
import { withRetry } from "../utils/retry";

type AskBody = {
  query?: string;
  workspace_id?: string;
  top_k?: number;
  stream?: boolean;
};

const MAX_QUERY_CHARS = 2000;

function parseTopK(input: number | undefined, maxChunks: number): number {
  const raw = Number.isFinite(input) ? Math.floor(input as number) : 5;
  return Math.max(1, Math.min(raw, maxChunks));
}

export const askRoute = new Hono<AppBindings>();

askRoute.post("/", async (c) => {
  const requestId = c.get("requestId");
  try {
    const body = (await c.req.json()) as AskBody;
    const query = body.query?.trim() ?? "";
    const workspaceId = c.get("workspaceId") ?? body.workspace_id ?? "";
    const maxChunksPerQuery = Number(c.env.MAX_CHUNKS_PER_QUERY ?? "5");
    const topK = parseTopK(body.top_k, Number.isNaN(maxChunksPerQuery) ? 5 : maxChunksPerQuery);

    if (!workspaceId) {
      return badRequest(c, "workspace_id is required");
    }
    if (!query) {
      return badRequest(c, "query is required");
    }
    if (query.length > MAX_QUERY_CHARS) {
      return badRequest(c, `query exceeds ${MAX_QUERY_CHARS} characters`);
    }

    const [queryEmbedding] = await withRetry(() => createEmbeddings(c.env, query));
    const matches = await searchVectors(c.env, queryEmbedding, workspaceId, topK);
    const chunkIds = matches.map((match) => match.chunkId).filter((id): id is string => Boolean(id));
    const retrieved = await getChunksByIds(c.env.DB, workspaceId, chunkIds);

    const scoreByChunkId = new Map(matches.map((match) => [match.chunkId, match.score]));
    const chunks = retrieved.map((chunk) => ({
      ...chunk,
      score: scoreByChunkId.get(chunk.id) ?? 0,
    }));

    if (chunks.length === 0) {
      return c.json({
        requestId,
        answer: "I do not know based on the available context.",
        citations: [],
        retrieval: {
          topK,
          matches: [],
        },
      });
    }

    const prompt = buildGroundedPrompt(query, chunks);

    if (body.stream === true) {
      const stream = await withRetry(() => streamAnswer(c.env, prompt));
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-request-id": requestId,
        },
      });
    }

    const answer = await withRetry(() => generateAnswer(c.env, prompt));
    return c.json({
      requestId,
      answer: answer || "I do not know based on the available context.",
      citations: chunks.map((chunk, idx) => ({
        index: idx + 1,
        chunk_id: chunk.id,
        title: chunk.title,
        source: chunk.source,
        score: chunk.score,
      })),
      retrieval: {
        topK,
        matches: matches.map((match) => ({
          id: match.id,
          chunk_id: match.chunkId ?? null,
          score: match.score,
        })),
      },
    });
  } catch (error) {
    console.error("ask_error", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return internalError(c, "Failed to answer query");
  }
});
