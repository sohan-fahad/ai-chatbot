type JwtPayload = {
  sub?: string;
  workspace_id?: string;
  exp?: number;
};

function base64UrlToUint8Array(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const normalized = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function parsePayload(payloadPart: string): JwtPayload {
  const decoded = new TextDecoder().decode(base64UrlToUint8Array(payloadPart));
  return JSON.parse(decoded) as JwtPayload;
}

async function verifyHmacSha256(data: string, signatureB64Url: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const signatureBytes = base64UrlToUint8Array(signatureB64Url);
  const signature = new Uint8Array(signatureBytes.byteLength);
  signature.set(signatureBytes);

  return crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(data),
  );
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const payload = parsePayload(payloadPart);

  const isValid = await verifyHmacSha256(`${headerPart}.${payloadPart}`, signaturePart, secret);
  if (!isValid) {
    return null;
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
    return null;
  }

  return payload;
}
