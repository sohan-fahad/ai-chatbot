export type ChunkingOptions = {
  targetTokens?: number;
  maxTokens?: number;
  overlapTokens?: number;
};

export type TextChunk = {
  index: number;
  content: string;
  tokenCount: number;
};

function estimateTokenCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.3));
}

export function chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
  const targetTokens = options.targetTokens ?? 500;
  const maxTokens = options.maxTokens ?? 800;
  const overlapTokens = options.overlapTokens ?? 50;

  if (targetTokens <= overlapTokens) {
    throw new Error("targetTokens must be greater than overlapTokens");
  }

  const words = text.replace(/\r\n/g, "\n").split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const stepTokens = targetTokens - overlapTokens;
  const approxWordsPerToken = 1 / 1.3;
  const chunkWordSize = Math.max(1, Math.floor(maxTokens * approxWordsPerToken));
  const stepWordSize = Math.max(1, Math.floor(stepTokens * approxWordsPerToken));

  const chunks: TextChunk[] = [];
  for (let start = 0, index = 0; start < words.length; start += stepWordSize, index += 1) {
    const end = Math.min(words.length, start + chunkWordSize);
    const content = words.slice(start, end).join(" ").trim();
    if (!content) {
      continue;
    }

    chunks.push({
      index,
      content,
      tokenCount: estimateTokenCount(content),
    });

    if (end >= words.length) {
      break;
    }
  }

  return chunks;
}
