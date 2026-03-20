import type { Env } from "../types/env";
import openai from "openai";

type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
};

export async function createEmbeddings(
  env: Env,
  input: string | string[],
): Promise<number[][]> {
  const client = new openai({
    apiKey: env.OPENAI_API_KEY,
  });

  const response = await client.embeddings.create({
    model: env.EMBEDDING_MODEL ?? "text-embedding-3-small",
    input,
  });

  return response.data.map((item) => item.embedding);

}
