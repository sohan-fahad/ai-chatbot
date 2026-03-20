export type SourceType = "upload";

export type DocumentRecord = {
  id: string;
  workspaceId: string;
  source: SourceType;
  title: string;
  r2Key: string;
  createdAt: string;
};

export type ChunkRecord = {
  id: string;
  documentId: string;
  workspaceId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  vectorId: string;
  createdAt: string;
};

export type ChunkInput = Omit<ChunkRecord, "createdAt">;

export type RetrievedChunk = {
  id: string;
  documentId: string;
  title: string;
  content: string;
  source: string;
  score: number;
};
