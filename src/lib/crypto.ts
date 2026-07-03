import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * AES-256-GCM for secrets at rest (Etsy OAuth tokens).
 * Ported from TagSmith's security.py. Key comes from ENCRYPTION_KEY (any
 * string ≥16 chars; it's SHA-256-derived to exactly 32 bytes).
 * Falls back to BETTER_AUTH_SECRET so dev works with zero extra config —
 * set a dedicated ENCRYPTION_KEY in production.
 */
function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me";
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plaintext: string): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, tag, enc]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const data = Buffer.from(encoded, "base64");
  const nonce = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const enc = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

export function sha256hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
