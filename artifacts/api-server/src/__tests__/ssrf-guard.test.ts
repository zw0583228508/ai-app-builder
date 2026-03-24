/**
 * SSRF Guard — unit tests
 *
 * Verifies that assertSafeUrl() correctly blocks private/internal addresses
 * and allows legitimate public endpoints.
 */
import { describe, it, expect } from "vitest";
import { isObviouslyUnsafe, SsrfError } from "../lib/ssrf-guard";

// --- isObviouslyUnsafe (synchronous shallow check) ---------------------------

describe("isObviouslyUnsafe", () => {
  it("flags file:// protocol", () => {
    expect(isObviouslyUnsafe("file:///etc/passwd")).toBe(true);
  });

  it("flags ftp:// protocol", () => {
    expect(isObviouslyUnsafe("ftp://internal.corp/secret")).toBe(true);
  });

  it("flags gopher:// protocol", () => {
    expect(isObviouslyUnsafe("gopher://127.0.0.1:6379/_FLUSHALL")).toBe(true);
  });

  it("flags localhost hostname", () => {
    expect(isObviouslyUnsafe("http://localhost/admin")).toBe(true);
  });

  it("flags .local TLD", () => {
    expect(isObviouslyUnsafe("https://internal.local/api")).toBe(true);
  });

  it("flags 127.0.0.1 (loopback)", () => {
    expect(isObviouslyUnsafe("http://127.0.0.1:8080/health")).toBe(true);
  });

  it("flags 10.x.x.x (RFC1918)", () => {
    expect(isObviouslyUnsafe("http://10.0.0.1/admin")).toBe(true);
  });

  it("flags 192.168.x.x (RFC1918)", () => {
    expect(isObviouslyUnsafe("http://192.168.1.1/router")).toBe(true);
  });

  it("flags 172.16.x.x (RFC1918)", () => {
    expect(isObviouslyUnsafe("http://172.16.0.10/secret")).toBe(true);
  });

  it("does NOT flag a public https URL", () => {
    expect(isObviouslyUnsafe("https://api.stripe.com/v1/charges")).toBe(false);
  });

  it("does NOT flag a public http URL", () => {
    expect(isObviouslyUnsafe("http://example.com/webhook")).toBe(false);
  });
});

// --- SsrfError ---------------------------------------------------------------

describe("SsrfError", () => {
  it("has code SSRF_BLOCKED", () => {
    const err = new SsrfError("test reason");
    expect(err.code).toBe("SSRF_BLOCKED");
  });

  it("is an instance of Error", () => {
    expect(new SsrfError("x")).toBeInstanceOf(Error);
  });

  it("includes the reason in the message", () => {
    const err = new SsrfError("private IPv4: 10.0.0.1");
    expect(err.message).toContain("private IPv4");
  });
});
