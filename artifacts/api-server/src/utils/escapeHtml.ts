/**
 * HTML Escaping Utilities
 *
 * Use these everywhere user-supplied or AI-generated content is injected
 * into HTML strings to prevent XSS.
 *
 * NOTE: For React/JSX rendering, React already escapes by default.
 * These utilities are for raw HTML string construction only (e.g., preview
 * injection, email templates, og-image generation).
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;",
};

const ESCAPE_REGEX = /[&<>"'`]/g;

/**
 * Escape a string for safe injection into HTML content or attributes.
 *
 * @example
 * const safe = escapeHtml(userInput);
 * const html = `<p>${safe}</p>`;
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str.replace(ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

/**
 * Escape a string for use inside a JSON string that is embedded in HTML.
 * Prevents </script> injection in inline JSON blocks.
 */
export function escapeHtmlJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/'/g, "\\u0027");
}

/**
 * Strip all HTML tags from a string, leaving only text content.
 * Useful for creating plaintext previews of HTML content.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
}

/**
 * Sanitize a filename — remove path traversal and dangerous characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, "")
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/^\./, "_")
    .slice(0, 255);
}
