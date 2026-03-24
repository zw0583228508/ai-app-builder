export interface ChangeSummary {
  generationType: "first" | "full" | "patch";
  linesAdded: number;
  linesRemoved: number;
  changePercent: number;
  sectionsChanged: string[];
  filesChanged?: string[];
}

const SECTION_PATTERNS: [string, RegExp][] = [
  ["header/nav", /<(?:header|nav)\b/i],
  ["hero section", /class="[^"]*(?:hero|banner|jumbotron)[^"]*"/i],
  ["about", /(?:id|class)="[^"]*about[^"]*"/i],
  ["features", /(?:id|class)="[^"]*feature[^"]*"/i],
  ["contact form", /<form\b/i],
  ["table", /<table\b/i],
  ["gallery/images", /<img\b/i],
  ["footer", /<footer\b/i],
  ["modal/dialog", /class="[^"]*(?:modal|dialog)[^"]*"/i],
  ["chart/graph", /(?:chart|recharts|apex)\b/i],
  ["styles (CSS)", /<style\b/i],
  ["scripts (JS)", /<script\b(?![^>]*src)/i],
];

function detectSections(html: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [name, re] of SECTION_PATTERNS) {
    const m = html.match(re);
    if (m) found.set(name, m[0]);
  }
  return found;
}

export function computeChangeSummary(
  oldHtml: string | null | undefined,
  newHtml: string,
  isPatch: boolean,
  reactFiles?: string[],
): ChangeSummary {
  if (!oldHtml) {
    return {
      generationType: "first",
      linesAdded: newHtml.split("\n").length,
      linesRemoved: 0,
      changePercent: 100,
      sectionsChanged: [],
      filesChanged: reactFiles,
    };
  }

  const oldLines = new Set(
    oldHtml
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  const newLines = new Set(
    newHtml
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );

  let added = 0;
  let removed = 0;
  for (const line of newLines) if (!oldLines.has(line)) added++;
  for (const line of oldLines) if (!newLines.has(line)) removed++;

  const total = Math.max(oldLines.size, newLines.size);
  const changePercent =
    total > 0 ? Math.round(((added + removed) / total) * 100) : 0;

  const oldSections = detectSections(oldHtml);
  const newSections = detectSections(newHtml);
  const sectionsChanged: string[] = [];

  for (const [name, snippet] of newSections) {
    if (!oldSections.has(name)) {
      sectionsChanged.push(`+ ${name}`);
    } else if (oldSections.get(name) !== snippet) {
      sectionsChanged.push(name);
    }
  }
  for (const name of oldSections.keys()) {
    if (!newSections.has(name)) sectionsChanged.push(`- ${name}`);
  }

  return {
    generationType: isPatch ? "patch" : "full",
    linesAdded: added,
    linesRemoved: removed,
    changePercent,
    sectionsChanged: sectionsChanged.slice(0, 6),
    filesChanged: reactFiles,
  };
}
