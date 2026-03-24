/**
 * SSRF Prevention Guard
 *
 * Validates URLs before the server makes outbound HTTP requests based on
 * user-controlled input. Blocks:
 *   - Private IPv4/IPv6 ranges (10.x, 172.16-31.x, 192.168.x, 127.x, ::1, …)
 *   - AWS EC2 Instance Metadata Service (169.254.169.254)
 *   - Non-HTTP(S) protocols (file://, ftp://, gopher://, etc.)
 *   - Redirect-based bypasses (enforced by caller not following redirects)
 *
 * Usage:
 *   const safe = await assertSafeUrl(userProvidedUrl);  // throws SsrfError if unsafe
 *   const response = await fetch(safe, { redirect: "error" });
 */

import dns from "node:dns/promises";

export class SsrfError extends Error {
  readonly code = "SSRF_BLOCKED";
  constructor(reason: string) {
    super(`SSRF blocked: ${reason}`);
    this.name = "SsrfError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["https:", "http:"]);

const PRIVATE_IPV4_RANGES: [number, number, number][] = [
  // loopback
  [0x7f000000, 0xff000000, 8],
  // RFC1918 — 10.0.0.0/8
  [0x0a000000, 0xff000000, 8],
  // RFC1918 — 172.16.0.0/12
  [0xac100000, 0xfff00000, 12],
  // RFC1918 — 192.168.0.0/16
  [0xc0a80000, 0xffff0000, 16],
  // Link-local / APIPA — 169.254.0.0/16 (AWS metadata at .254.169.254)
  [0xa9fe0000, 0xffff0000, 16],
  // 0.0.0.0/8 — "this" network
  [0x00000000, 0xff000000, 8],
  // Broadcast
  [0xffffffff, 0xffffffff, 32],
];

function ipv4ToInt(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0
  );
}

function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  // Use `>>> 0` to convert the signed bitwise-AND result to unsigned uint32
  // before comparison — JS bitwise ops return signed int32, while the base
  // values (e.g. 0xC0A80000) are stored as positive JS numbers.
  return PRIVATE_IPV4_RANGES.some(([base, mask]) => (n & mask) >>> 0 === base);
}

const PRIVATE_IPV6_PREFIXES = [
  "::1",
  "fc",
  "fd",
  "fe80",
  "::",
  "0:0:0:0:0:0:0:1",
  "0:0:0:0:0:0:0:0",
];

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::1" || lower === "::") return true;
  return PRIVATE_IPV6_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Parses and validates a URL, then resolves its hostname to verify it does not
 * point at internal/private infrastructure.
 *
 * @throws {SsrfError} if the URL is unsafe
 * @returns The validated URL string (unchanged from input)
 */
export async function assertSafeUrl(raw: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SsrfError(`invalid URL: ${raw}`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new SsrfError(`protocol '${parsed.protocol}' not allowed`);
  }

  const hostname = parsed.hostname;

  // Block numeric IPv4 addresses directly (no DNS required)
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) {
      throw new SsrfError(`private IPv4 address: ${hostname}`);
    }
    return raw;
  }

  // Block IPv6 literals directly
  if (hostname.startsWith("[") || hostname.includes(":")) {
    if (isPrivateIpv6(hostname)) {
      throw new SsrfError(`private IPv6 address: ${hostname}`);
    }
    return raw;
  }

  // Block "localhost" and similar names without DNS
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    lower === "localdomain" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    throw new SsrfError(`blocked hostname: ${hostname}`);
  }

  // DNS resolution check — resolve and verify each returned address
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new SsrfError(`DNS resolution failed for: ${hostname}`);
  }

  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateIpv4(address)) {
      throw new SsrfError(
        `hostname ${hostname} resolves to private IPv4: ${address}`,
      );
    }
    if (family === 6 && isPrivateIpv6(address)) {
      throw new SsrfError(
        `hostname ${hostname} resolves to private IPv6: ${address}`,
      );
    }
  }

  return raw;
}

/**
 * Synchronous shallow check — protocol and hostname heuristics only.
 * Use for quick rejection before async DNS lookup in hot paths.
 */
export function isObviouslyUnsafe(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return true;
    const h = parsed.hostname.toLowerCase();
    if (
      h === "localhost" ||
      h.endsWith(".local") ||
      h.endsWith(".internal") ||
      (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) && isPrivateIpv4(h))
    )
      return true;
  } catch {
    return true;
  }
  return false;
}
