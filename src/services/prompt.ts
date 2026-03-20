import type { RetrievedChunk } from "../types/rag";

export function buildGroundedPrompt(query: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map(
      (chunk, idx) =>
        `[${idx + 1}] ${chunk.title} (${chunk.source})\n${chunk.content}`,
    )
    .join("\n\n---\n\n");

  return [
    "You are a company knowledge assistant.",
    "Use ONLY the provided context. If the answer is not in context, say you do not know.",
    "Cite supporting chunk numbers like [1], [2] in your answer.",
    "",
    "Context:",
    context || "[No context found]",
    "",
    `Question: ${query}`,
  ].join("\n");
}
