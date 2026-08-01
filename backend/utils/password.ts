import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

/**
 * Hash a plaintext password using scrypt.
 * Format: scrypt$<saltHex>$<hashHex>
 */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEYLEN).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

/** Verify a plaintext password against a stored scrypt hash. */
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex as string, "hex");
    const actual = scryptSync(plain, salt as string, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export const SUPER_ADMIN_EMAIL = "sohel@momentum.com";
export const SUPER_ADMIN_DEFAULT_PASSWORD = "Sohel@34892";

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}
