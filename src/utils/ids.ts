const encoder = new TextEncoder();

export function createId(prefix: string): string {
  const rand = crypto.getRandomValues(new Uint8Array(8));
  const hash = Array.from(rand, (n) => n.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hash}`;
}

export function hashString(input: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", encoder.encode(input)).then((buffer) => {
    return Array.from(new Uint8Array(buffer))
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  });
}
