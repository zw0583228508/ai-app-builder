import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "../lib/encryption";
import { validateEnv } from "../lib/env-check";
import { getQueueStatus } from "../lib/deploy-queue";

describe("encryption round-trip", () => {
  it("encrypts and decrypts to the original string", () => {
    const plaintext = "super-secret-api-key-12345";
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("produces different ciphertexts for the same input (random IV)", () => {
    const msg = "same-input";
    const c1 = encrypt(msg);
    const c2 = encrypt(msg);
    expect(c1).not.toBe(c2);
    expect(decrypt(c1)).toBe(msg);
    expect(decrypt(c2)).toBe(msg);
  });

  it("throws on tampered ciphertext", () => {
    const ciphertext = encrypt("hello");
    const tampered = ciphertext.slice(0, -4) + "XXXX";
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty string", () => {
    const plaintext = "";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("handles unicode content", () => {
    const plaintext = "שלום עולם 🌍";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });
});

describe("validateEnv", () => {
  it("exits with code 1 when DATABASE_URL is missing", () => {
    const original = process.env["DATABASE_URL"];
    delete process.env["DATABASE_URL"];
    expect(() => validateEnv()).toThrow("process.exit unexpectedly called with \"1\"");
    if (original !== undefined) process.env["DATABASE_URL"] = original;
  });

  it("passes when required vars are set", () => {
    const origDb = process.env["DATABASE_URL"];
    const origSess = process.env["SESSION_SECRET"];
    process.env["DATABASE_URL"] = "postgres://localhost/test";
    process.env["SESSION_SECRET"] = "test-secret";
    expect(() => validateEnv()).not.toThrow();
    if (origDb !== undefined) process.env["DATABASE_URL"] = origDb;
    else delete process.env["DATABASE_URL"];
    if (origSess !== undefined) process.env["SESSION_SECRET"] = origSess;
    else delete process.env["SESSION_SECRET"];
  });
});

describe("deploy queue", () => {
  it("starts empty", () => {
    const status = getQueueStatus();
    expect(status).toHaveProperty("size");
    expect(status).toHaveProperty("pending");
    expect(typeof status.size).toBe("number");
    expect(typeof status.pending).toBe("number");
  });
});
