const ACCEPTED_EXTENSIONS = new Set(["txt", "md"]);

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export function isAcceptedExtension(filename: string): boolean {
  return ACCEPTED_EXTENSIONS.has(getFileExtension(filename));
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }

  const text = await file.text();
  const normalized = text.replace(/\u0000/g, "").trim();
  if (!normalized) {
    throw new Error("Document is empty after text extraction");
  }

  return normalized;
}
