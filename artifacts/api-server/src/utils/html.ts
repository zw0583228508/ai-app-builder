/**
 * HTML quality validation utilities
 * Shared between agent-run route and tests.
 */

/**
 * Returns true if the HTML string is considered usable for preview/snapshot.
 * Rejects empty, too-short, structurally broken, or truncated HTML.
 */
export function isHtmlUsable(h: string): boolean {
  if (!h || h.length < 200) return false;
  const lower = h.toLowerCase();
  if (!lower.includes("<body") && !lower.includes("<html")) return false;
  const closeIdx = lower.lastIndexOf("</html>");
  if (closeIdx < 0) return false;
  // The closing </html> must appear in the final 60% of the string
  // (guards against truncated output where </html> appears mid-doc)
  if (closeIdx < h.length * 0.4) return false;
  return true;
}
