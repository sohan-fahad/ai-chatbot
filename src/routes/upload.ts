import { Hono } from "hono";
import type { AppBindings } from "../types/env";
import { badRequest, internalError, tooManyRequests } from "../utils/http";
import { createId } from "../utils/ids";
import { chunkText } from "../services/chunking";
import { createEmbeddings } from "../services/embeddings";
import { extractTextFromFile, isAcceptedExtension } from "../services/parsing";
import { insertChunks, insertDocument } from "../repositories/ragRepository";
import { upsertVectors } from "../services/vectorize";
import { withRetry } from "../utils/retry";
import { consumeDailyLimit } from "../utils/rateLimit";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const EMBEDDING_BATCH_SIZE = 100;
const DAILY_UPLOAD_LIMIT = 3;

async function embedInBatches(
  env: AppBindings["Bindings"],
  inputs: string[],
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < inputs.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = inputs.slice(i, i + EMBEDDING_BATCH_SIZE);
    const embeddings = await withRetry(() => createEmbeddings(env, batch));
    allEmbeddings.push(...embeddings);
  }
  return allEmbeddings;
}

export const uploadRoute = new Hono<AppBindings>();

uploadRoute.post("/", async (c) => {
  const requestId = c.get("requestId");
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");
    const inputWorkspace = formData.get("workspace_id");
    const workspaceId = c.get("workspaceId") ?? (typeof inputWorkspace === "string" ? inputWorkspace : "");

    if (!(file instanceof File)) {
      return badRequest(c, "Expected a file in form field `file`");
    }
    if (!workspaceId) {
      return badRequest(c, "workspace_id is required");
    }

    const rateLimit = await consumeDailyLimit(
      c.env.RATE_LIMIT_KV,
      "upload",
      workspaceId,
      DAILY_UPLOAD_LIMIT,
    );
    if (!rateLimit.allowed) {
      return tooManyRequests(
        c,
        `Daily upload limit reached (${DAILY_UPLOAD_LIMIT}/day) for this workspace`,
        rateLimit.retryAfterSeconds,
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return badRequest(c, `File exceeds ${MAX_UPLOAD_BYTES} bytes limit`);
    }
    if (!isAcceptedExtension(file.name)) {
      return badRequest(c, "Supported file types: .txt, .md, .pdf, .doc, .docx");
    }

    const documentId = createId("doc");
    const r2Key = `${workspaceId}/${documentId}/${file.name}`;
    const title = file.name;

    await c.env.DOCS_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type || "text/plain",
      },
      customMetadata: {
        workspace_id: workspaceId,
        document_id: documentId,
      },
    });

    const text = await extractTextFromFile(file);
    const chunks = chunkText(text, {
      targetTokens: 500,
      maxTokens: 800,
      overlapTokens: 50,
    });

    if (chunks.length === 0) {
      return badRequest(c, "No chunks were generated from the file");
    }

    const embeddings = await embedInBatches(
      c.env,
      chunks.map((chunk) => chunk.content),
    );

    const vectorRows = chunks.map((chunk) => {
      const chunkId = createId("chunk");
      return {
        chunk,
        chunkId,
        vectorId: `${workspaceId}:${documentId}:${chunk.index}`,
      };
    });

    await withRetry(() =>
      upsertVectors(
        c.env,
        vectorRows.map((row, idx) => ({
          id: row.vectorId,
          values: embeddings[idx],
          metadata: {
            workspace_id: workspaceId,
            document_id: documentId,
            chunk_id: row.chunkId,
          },
        })),
      ),
    );

    await insertDocument(c.env.DB, {
      id: documentId,
      workspaceId,
      source: "upload",
      title,
      r2Key,
    });

    await insertChunks(
      c.env.DB,
      vectorRows.map((row) => ({
        id: row.chunkId,
        documentId,
        workspaceId,
        chunkIndex: row.chunk.index,
        content: row.chunk.content,
        tokenCount: row.chunk.tokenCount,
        vectorId: row.vectorId,
      })),
    );

    return c.json({
      requestId,
      document_id: documentId,
      workspace_id: workspaceId,
      chunk_count: chunks.length,
      accepted_types: ["txt", "md", "pdf", "doc", "docx"],
      errors: [],
      rate_limit: {
        daily_limit: DAILY_UPLOAD_LIMIT,
        remaining_today: rateLimit.remaining,
      },
    });
  } catch (error) {
    console.error("upload_error", {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return internalError(c, "Failed to ingest document");
  }
});
