const ACCEPTED_EXTENSIONS = new Set(["txt", "md"]);

export function getFileExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) ?? "" : "";
}

export function isAcceptedExtension(filename: string): boolean {
  return ACCEPTED_EXTENSIONS.has(getFileExtension(filename));
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractReadableRuns(bytes: Uint8Array): string {
  const decoded = new TextDecoder("latin1").decode(bytes);
  const runs = decoded.match(/[A-Za-z0-9][\x20-\x7E]{2,}/g) ?? [];
  return runs.join("\n");
}

function decodePdfEscaped(input: string): string {
  return input
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const lines: string[] = [];

  const singleMatches = raw.matchAll(/\((.*?)\)\s*Tj/gms);
  for (const match of singleMatches) {
    if (match[1]) {
      lines.push(decodePdfEscaped(match[1]));
    }
  }

  const arrayMatches = raw.matchAll(/\[(.*?)\]\s*TJ/gms);
  for (const match of arrayMatches) {
    const segment = match[1] ?? "";
    const textBits = segment.match(/\((.*?)\)/gms) ?? [];
    for (const bit of textBits) {
      lines.push(decodePdfEscaped(bit.slice(1, -1)));
    }
  }

  if (lines.length === 0) {
    // Best-effort fallback for image-like or compressed PDFs.
    lines.push(extractReadableRuns(bytes));
  }

  return lines.join("\n");
}

async function inflateRawDeflate(data: Uint8Array): Promise<string> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });

  const decompressed = stream.pipeThrough(
    new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>,
  );
  const response = new Response(decompressed);
  const buffer = await response.arrayBuffer();
  return new TextDecoder().decode(buffer);
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function xmlToText(xml: string): string {
  return xml
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

async function extractTextFromDocxBytes(bytes: Uint8Array): Promise<string> {
  // Minimal ZIP local-file reader; enough for standard DOCX files.
  const files: Array<{ name: string; method: number; data: Uint8Array }> = [];
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const signature = readUint32LE(bytes, offset);
    if (signature !== 0x04034b50) {
      break;
    }

    const method = readUint16LE(bytes, offset + 8);
    const compressedSize = readUint32LE(bytes, offset + 18);
    const fileNameLength = readUint16LE(bytes, offset + 26);
    const extraLength = readUint16LE(bytes, offset + 28);

    const fileNameStart = offset + 30;
    const fileNameEnd = fileNameStart + fileNameLength;
    const fileDataStart = fileNameEnd + extraLength;
    const fileDataEnd = fileDataStart + compressedSize;

    if (fileDataEnd > bytes.length) {
      break;
    }

    const name = new TextDecoder().decode(bytes.slice(fileNameStart, fileNameEnd));
    const data = bytes.slice(fileDataStart, fileDataEnd);
    files.push({ name, method, data });
    offset = fileDataEnd;
  }

  const interesting = files.filter((file) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/.test(file.name),
  );

  const extracted: string[] = [];
  for (const file of interesting) {
    try {
      let xml = "";
      if (file.method === 0) {
        xml = new TextDecoder().decode(file.data);
      } else if (file.method === 8) {
        xml = await inflateRawDeflate(file.data);
      } else {
        continue;
      }
      extracted.push(xmlToText(xml));
    } catch {
      // Continue on per-file extraction failures.
    }
  }

  return extracted.join("\n");
}

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = getFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(ext)) {
    throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }

  let text = "";
  if (ext === "txt" || ext === "md") {
    text = await file.text();
  } else {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (ext === "pdf") {
      text = extractTextFromPdfBytes(bytes);
    } else if (ext === "docx") {
      text = await extractTextFromDocxBytes(bytes);
      if (!text.trim()) {
        text = extractReadableRuns(bytes);
      }
    } else if (ext === "doc") {
      text = extractReadableRuns(bytes);
    }
  }

  const normalized = normalizeExtractedText(text);
  if (!normalized) {
    throw new Error("Document is empty after text extraction");
  }

  return normalized;
}
