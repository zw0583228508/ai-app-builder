/**
 * Secret rotation script — re-encrypts all stored tokens with a new key.
 *
 * Usage:
 *   OLD_KEY=<hex32> NEW_KEY=<hex32> pnpm --filter @workspace/scripts run rotate-encryption-key
 *
 * The script is idempotent — safe to re-run if interrupted.
 * Run BEFORE updating ENCRYPTION_KEY in the environment.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const OLD_KEY = process.env["OLD_KEY"];
const NEW_KEY = process.env["NEW_KEY"];

if (!OLD_KEY || !NEW_KEY) {
  console.error(
    "❌  Usage: OLD_KEY=<hex32> NEW_KEY=<hex32> pnpm run rotate-encryption-key",
  );
  process.exit(1);
}
if (
  Buffer.from(OLD_KEY, "hex").length !== 32 ||
  Buffer.from(NEW_KEY, "hex").length !== 32
) {
  console.error(
    "❌  Both OLD_KEY and NEW_KEY must be 32-byte hex strings (64 hex chars).",
  );
  process.exit(1);
}
if (OLD_KEY === NEW_KEY) {
  console.error("❌  OLD_KEY and NEW_KEY must be different.");
  process.exit(1);
}

function decrypt(encryptedHex: string, keyHex: string): string {
  const buf = Buffer.from(encryptedHex, "hex");
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const ciphertext = buf.subarray(32);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(keyHex, "hex"),
    iv,
  );
  decipher.setAuthTag(tag);
  return (
    decipher.update(ciphertext, undefined, "utf8") + decipher.final("utf8")
  );
}

function encrypt(plaintext: string, keyHex: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

async function main() {
  const { db } = await import("@workspace/db");
  const { projectSecretsTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const allSecrets = await db.select().from(projectSecretsTable);
  console.log(`🔑  Found ${allSecrets.length} encrypted secrets to rotate.`);

  let success = 0;
  let failed = 0;
  const failedIds: number[] = [];

  for (const secret of allSecrets) {
    try {
      const plaintext = decrypt(secret.encryptedValue, OLD_KEY!);
      const newEncrypted = encrypt(plaintext, NEW_KEY!);
      await db
        .update(projectSecretsTable)
        .set({ encryptedValue: newEncrypted })
        .where(eq(projectSecretsTable.id, secret.id));
      success++;
    } catch (err) {
      console.error(
        `  ⚠️  Failed to rotate secret id=${secret.id}:`,
        (err as Error).message,
      );
      failedIds.push(secret.id);
      failed++;
    }
  }

  console.log(`\n✅  Rotated: ${success}`);
  if (failed > 0) {
    console.error(`❌  Failed:  ${failed} (IDs: ${failedIds.join(", ")})`);
    console.error("   These secrets could not be decrypted with OLD_KEY.");
    console.error(
      "   They may already be encrypted with the new key (re-run is safe).",
    );
    process.exit(1);
  } else {
    console.log(
      "✅  All secrets rotated successfully. You may now update ENCRYPTION_KEY.",
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
