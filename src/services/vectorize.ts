import type { Env } from "../types/env";

type VectorMetadata = {
  workspace_id: string;
  document_id: string;
  chunk_id: string;
};

export type VectorMatch = {
  id: string;
  score: number;
  chunkId?: string;
};

export async function upsertVectors(
  env: Env,
  vectors: Array<{
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }>,
) {
  if (vectors.length === 0) {
    return;
  }
  await env.VECTOR_INDEX.upsert(vectors);
}

export async function searchVectors(
  env: Env,
  queryVector: number[],
  workspaceId: string,
  topK: number,
): Promise<VectorMatch[]> {
  const filtered = await env.VECTOR_INDEX.query(queryVector, {
    topK,
    returnValues: false,
    returnMetadata: "all",
    filter: {
      workspace_id: {
        $eq: workspaceId,
      },
    },
  });

  const filteredMatches = filtered.matches ?? [];
  if (filteredMatches.length > 0) {
    return filteredMatches.map((match) => ({
      id: String(match.id),
      score: Number(match.score ?? 0),
      chunkId: typeof match.metadata?.chunk_id === "string" ? match.metadata.chunk_id : undefined,
    }));
  }


  const unfiltered = await env.VECTOR_INDEX.query(queryVector, {
    topK: Math.max(topK * 4, 20),
    returnValues: false,
    returnMetadata: "all",
  });

  const scoped = (unfiltered.matches ?? [])
    .filter((match) => String(match.id).startsWith(`${workspaceId}:`))
    .slice(0, topK);

  return scoped.map((match) => ({
    id: String(match.id),
    score: Number(match.score ?? 0),
    chunkId: typeof match.metadata?.chunk_id === "string" ? match.metadata.chunk_id : undefined,
  }));
}
