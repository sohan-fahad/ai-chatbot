export type Env = {
  DB: D1Database;
  DOCS_BUCKET: R2Bucket;
  VECTOR_INDEX: VectorizeIndex;
  OPENAI_API_KEY: string;
  AI_GATEWAY_BASE_URL: string;
  EMBEDDING_MODEL?: string;
  CHAT_MODEL?: string;
  EMBEDDING_DIMENSIONS?: string;
  MAX_CHUNKS_PER_QUERY?: string;
  JWT_SECRET?: string;
};

export type AppBindings = {
  Bindings: Env;
  Variables: {
    requestId: string;
    workspaceId?: string;
  };
};
