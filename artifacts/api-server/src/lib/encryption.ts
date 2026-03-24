import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(secret: string, salt: Buffer): Buffer {
  return scryptSync(secret, salt, KEY_LENGTH);
}

function getMasterSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[Security] ENCRYPTION_KEY is required in production. " +
          "Generate one with: openssl rand -hex 32",
      );
    }
    console.warn(
      "[Security] ENCRYPTION_KEY not set — using dev-only insecure key. " +
        "This must never run in production.",
    );
    return "dev-only-insecure-key-never-use-in-prod";
  }
  if (secret.length < 32) {
    throw new Error(
      "[Security] ENCRYPTION_KEY must be at least 32 characters. " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return secret;
}

export function encrypt(plaintext: string): string {
  const secret = getMasterSecret();
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Format: salt(32) + iv(16) + tag(16) + ciphertext
  return Buffer.concat([salt, iv, tag, encrypted]).toString("base64url");
}

export function decrypt(ciphertext: string): string {
  const secret = getMasterSecret();
  const buf = Buffer.from(ciphertext, "base64url");
  const salt = buf.subarray(0, SALT_LENGTH);
  const iv = buf.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buf.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
  );
  const encrypted = buf.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(secret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}
