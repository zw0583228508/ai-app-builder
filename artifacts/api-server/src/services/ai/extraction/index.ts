/**
 * AI Response Extraction Layer
 *
 * All extraction logic lives here.
 * Route handlers should import from this module — not from preview.ts directly.
 */

export { autoCdnInject, VISUAL_EDITOR_SCRIPT } from "../preview";

/**
 * Extract raw HTML from an AI response that may contain markdown code blocks.
 */
export function extractHtmlFromResponse(response: string): string {
  // Try to extract from ```html ... ``` block
  const htmlBlockMatch = response.match(/```html\n?([\s\S]*?)\n?```/);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();

  // Try to extract from ``` ... ``` block (any language)
  const codeBlockMatch = response.match(/```(?:\w+)?\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // If no code block, return the full response trimmed
  return response.trim();
}

/**
 * Extract all FILE: blocks from a multi-file React response.
 *
 * Example input:
 * ```
 * // FILE: src/App.tsx
 * export default function App() { ... }
 *
 * // FILE: src/components/Header.tsx
 * export function Header() { ... }
 * ```
 */
export function extractFileBlocks(
  response: string,
): Array<{ path: string; content: string }> {
  const blocks: Array<{ path: string; content: string }> = [];
  const filePattern = /\/\/ FILE: ([^\n]+)\n([\s\S]*?)(?=\/\/ FILE: |$)/g;
  let match: RegExpExecArray | null;

  while ((match = filePattern.exec(response)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();
    if (path && content) {
      blocks.push({ path, content });
    }
  }

  return blocks;
}

/**
 * Extract JSON from an AI response that may contain markdown code blocks.
 * Returns null if no valid JSON is found.
 */
export function extractJson<T = unknown>(response: string): T | null {
  const jsonMatch = response.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

/**
 * Strip markdown fences from an AI response.
 */
export function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```[\w]*\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
}
