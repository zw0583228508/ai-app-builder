export interface ExtractedFile {
  path: string;
  content: string;
  language: string;
  isEntrypoint: boolean;
}

function classifyLang(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "txt";
  return ext === "tsx" || ext === "ts"
    ? "typescript"
    : ext === "jsx" || ext === "js"
      ? "javascript"
      : ext === "css"
        ? "css"
        : ext === "json"
          ? "json"
          : "text";
}

export function applyHtmlPatches(
  response: string,
  baseHtml: string,
): string | null {
  const patchRegex = /<<<REPLACE>>>([\s\S]*?)<<<WITH>>>([\s\S]*?)<<<END>>>/g;
  let match: RegExpExecArray | null;
  const patches: Array<{ from: string; to: string }> = [];
  while ((match = patchRegex.exec(response)) !== null) {
    patches.push({ from: match[1].trim(), to: match[2].trim() });
  }
  if (patches.length === 0) return null;
  let result = baseHtml;
  let anyApplied = false;

  for (const { from, to } of patches) {
    // Strategy 1: exact match
    if (result.includes(from)) {
      result = result.replace(from, to);
      anyApplied = true;
      continue;
    }

    // Strategy 2: normalize horizontal whitespace only (tabs/spaces → single space)
    const normFrom2 = from.replace(/[ \t]+/g, " ").trim();
    const normResult2 = result.replace(/[ \t]+/g, " ");
    if (normResult2.includes(normFrom2)) {
      result = result.replace(
        new RegExp(normFrom2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        to,
      );
      anyApplied = true;
      continue;
    }

    // Strategy 3: normalize ALL whitespace (handles \r\n vs \n, indentation diffs)
    // Only try if the "from" block is not too large to avoid regex catastrophe
    if (from.length < 800) {
      try {
        const escapedTokens = from
          .split(/\s+/)
          .filter((t) => t.length > 0)
          .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        if (escapedTokens.length > 1) {
          const flexRegex = new RegExp(escapedTokens.join("\\s+"));
          if (flexRegex.test(result)) {
            result = result.replace(flexRegex, to);
            anyApplied = true;
            continue;
          }
        }
      } catch {
        // regex compilation failed — fall through
      }
    }
  }

  return anyApplied ? result : null;
}

export function extractHtml(
  fullResponse: string,
  opts: {
    isReactStack: boolean;
    previewHtml?: string | null;
    intent: string;
  },
): string | null {
  if (opts.isReactStack) return null;

  const existingBase = opts.previewHtml ?? "";
  const isPatchIntent =
    opts.intent === "fix" ||
    opts.intent === "edit" ||
    opts.intent === "add_feature";
  if (existingBase && isPatchIntent) {
    const patched = applyHtmlPatches(fullResponse, existingBase);
    if (patched) return patched;
  }

  const extractFenced = (text: string): string | null => {
    const regex = /```html\r?\n([\s\S]*?)\n```/gi;
    let best: string | null = null;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const candidate = m[1].trim();
      if (candidate.length > (best?.length ?? 0)) best = candidate;
    }
    return best;
  };

  const m = extractFenced(fullResponse);
  if (m) return m;

  const m2 = fullResponse.match(
    /```[^\n]*\r?\n((?:<!DOCTYPE|<html)[\s\S]*?)\n```/i,
  );
  if (m2?.[1]?.trim()) return m2[1].trim();

  const m3 = fullResponse.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
  if (m3?.[1]?.trim()) return m3[1].trim();

  const m4 = fullResponse.match(/(<html[\s\S]*?<\/html>)/i);
  if (m4?.[1]?.trim()) return m4[1].trim();

  const truncated = fullResponse.match(
    /```(?:html)?\r?\n((?:<!DOCTYPE|<html)[\s\S]+)$/i,
  );
  if (truncated?.[1]?.trim()) {
    let partial = truncated[1].trim();
    if (!/<\/html>/i.test(partial)) {
      if (!/<\/body>/i.test(partial)) partial += "\n</body>";
      partial += "\n</html>";
    }
    return partial;
  }

  return null;
}

export function extractReactFiles(fullResponse: string): ExtractedFile[] {
  const files: ExtractedFile[] = [];
  const VALID_EXTENSIONS =
    /\.(tsx?|jsx?|css|html|json|md|env|gitignore|svg|mjs|cjs)$/;
  const seenPaths = new Set<string>();

  const addFile = (rawPath: string, content: string) => {
    const filePath = rawPath.trim();
    if (seenPaths.has(filePath)) return;
    if (!VALID_EXTENSIONS.test(filePath)) return;
    seenPaths.add(filePath);
    files.push({
      path: filePath,
      content: content.replace(/\r\n/g, "\n"),
      language: classifyLang(filePath),
      isEntrypoint:
        filePath === "src/main.tsx" ||
        filePath === "src/index.tsx" ||
        filePath === "main.tsx",
    });
  };

  const primaryRegex = /FILE:\s*([^\n]+)\n```[a-z]*\n([\s\S]*?)\n```/g;
  const fallback1Regex =
    /###\s+([\w./\-]+\.[a-z]+)\n```[a-z]*\n([\s\S]*?)\n```/g;
  const fallback2Regex =
    /(?:\*\*|`)([a-z][\w./\-]+\.[a-z]+)(?:\*\*|`)\s*\n```[a-z]*\n([\s\S]*?)\n```/g;

  let match;
  while ((match = primaryRegex.exec(fullResponse)) !== null)
    addFile(match[1], match[2]);
  if (files.length === 0) {
    while ((match = fallback1Regex.exec(fullResponse)) !== null)
      addFile(match[1], match[2]);
  }
  if (files.length === 0) {
    while ((match = fallback2Regex.exec(fullResponse)) !== null)
      addFile(match[1], match[2]);
  }

  return files;
}
