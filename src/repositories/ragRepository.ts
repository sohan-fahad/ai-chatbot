import type { ChunkInput, RetrievedChunk, SourceType } from "../types/rag";

type DocumentInsert = {
  id: string;
  workspaceId: string;
  source: SourceType;
  title: string;
  r2Key: string;
};

export async function insertDocument(db: D1Database, doc: DocumentInsert) {
  await db
    .prepare(
      `INSERT INTO documents (id, workspace_id, source, title, r2_key)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    )
    .bind(doc.id, doc.workspaceId, doc.source, doc.title, doc.r2Key)
    .run();
}

export async function insertChunks(db: D1Database, chunks: ChunkInput[]) {
  const statements = chunks.map((chunk) =>
    db
      .prepare(
        `INSERT INTO chunks (
          id, document_id, workspace_id, chunk_index, content, token_count, vector_id
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      )
      .bind(
        chunk.id,
        chunk.documentId,
        chunk.workspaceId,
        chunk.chunkIndex,
        chunk.content,
        chunk.tokenCount,
        chunk.vectorId,
      ),
  );

  if (statements.length > 0) {
    await db.batch(statements);
  }
}

type ChunkRow = {
  id: string;
  document_id: string;
  title: string;
  source: string;
  content: string;
};

export async function getChunksByIds(
  db: D1Database,
  workspaceId: string,
  chunkIds: string[],
): Promise<RetrievedChunk[]> {
  if (chunkIds.length === 0) {
    return [];
  }

  const placeholders = chunkIds.map((_, idx) => `?${idx + 2}`).join(", ");
  const query = `SELECT c.id, c.document_id, d.title, d.source, c.content
                 FROM chunks c
                 JOIN documents d ON c.document_id = d.id
                 WHERE c.workspace_id = ?1 AND c.id IN (${placeholders})`;

  const result = await db
    .prepare(query)
    .bind(workspaceId, ...chunkIds)
    .all<ChunkRow>();

  const rows = result.results ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));

  return chunkIds
    .map((chunkId) => byId.get(chunkId))
    .filter((row): row is ChunkRow => Boolean(row))
    .map((row) => ({
      id: row.id,
      documentId: row.document_id,
      title: row.title,
      source: row.source,
      content: row.content,
      score: 0,
    }));
}
