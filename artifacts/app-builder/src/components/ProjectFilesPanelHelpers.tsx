import { useState, type ReactNode } from "react";
import {
  Palette, Zap, Globe,
  CheckCircle2, AlertTriangle, XCircle, Info,
  Package, Copy, Check, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const HE = "'Rubik', sans-serif";


export interface VirtualFile { id: string; name: string; language: string; icon: ReactNode; content: string; size: number; lines: number; color: string; }
export interface Dependency { name: string; url: string; type: "js" | "css"; version?: string; }

export type ArchTab = "files" | "seo" | "perf" | "a11y" | "libs" | "review" | "api" | "db";

export interface ReviewIssue { issue: string; severity: "error" | "warn" | "info"; fix: string; }
export interface AIReview {
  overall: { score: number; grade: string; summary: string };
  performance: ReviewIssue[];
  security: ReviewIssue[];
  accessibility: ReviewIssue[];
  codeQuality: ReviewIssue[];
  bestPractices: ReviewIssue[];
}

export function parseHtml(html: string) {
  const files: VirtualFile[] = [];
  const deps: Dependency[] = [];

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : "";

  const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const cssContent = styleMatches.map(m => m[1]).join("\n\n").trim();
  if (cssContent) files.push({ id: "css", name: "styles.css", language: "css", icon: <Palette className="w-3.5 h-3.5" />, content: cssContent, size: cssContent.length, lines: cssContent.split("\n").length, color: "#60a5fa" });

  const scriptMatches = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
  const jsContent = scriptMatches.map(m => m[1]).join("\n\n").trim();
  if (jsContent) files.push({ id: "js", name: "script.js", language: "javascript", icon: <Zap className="w-3.5 h-3.5" />, content: jsContent, size: jsContent.length, lines: jsContent.split("\n").length, color: "#fbbf24" });

  files.unshift({ id: "html", name: "index.html", language: "html", icon: <Globe className="w-3.5 h-3.5" />, content: html, size: html.length, lines: html.split("\n").length, color: "#f97316" });

  const extJs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)];
  for (const m of extJs) {
    const url = m[1]; const name = url.split("/").pop()?.split("?")[0] || url;
    deps.push({ name, url, type: "js" });
  }
  const extCss = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)];
  for (const m of extCss) {
    const url = m[1]; const name = url.split("/").pop()?.split("?")[0] || url;
    deps.push({ name, url, type: "css" });
  }

  const hasTailwind = html.includes("tailwind");
  const hasReact = html.includes("react");
  const hasBootstrap = html.includes("bootstrap");
  const hasCharts = html.includes("chart") || html.includes("recharts") || html.includes("apex");
  const hasAnimations = html.includes("framer") || html.includes("gsap") || html.includes("anime");
  const hasVue = html.includes("vue.js") || html.includes("vue@");
  const hasAlpine = html.includes("alpinejs") || html.includes("alpine.js");

  return { files, deps, title, html, meta: { hasTailwind, hasReact, hasBootstrap, hasCharts, hasAnimations, hasVue, hasAlpine, totalLines: html.split("\n").length, totalSize: html.length } };
}

export function analyzeSeo(html: string) {
  const results: { key: string; label: string; value: string | null; status: "ok" | "warn" | "error"; suggestion?: string }[] = [];

  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, "").trim() || null;
  const titleLen = title?.length || 0;
  results.push({ key: "title", label: "תג title", value: title, status: titleLen >= 30 && titleLen <= 65 ? "ok" : titleLen === 0 ? "error" : "warn", suggestion: titleLen === 0 ? "חסר תג title" : titleLen < 30 ? "קצר מדי (מינ׳ 30 תווים)" : titleLen > 65 ? "ארוך מדי (מקס׳ 65 תווים)" : undefined });

  const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || null;
  const descLen = desc?.length || 0;
  results.push({ key: "desc", label: "Meta description", value: desc, status: descLen >= 120 && descLen <= 160 ? "ok" : descLen === 0 ? "error" : "warn", suggestion: descLen === 0 ? "חסר meta description" : descLen < 120 ? "קצר מדי (מינ׳ 120 תווים)" : descLen > 160 ? "ארוך מדי (מקס׳ 160 תווים)" : undefined });

  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]*>/g, "").trim());
  results.push({ key: "h1", label: "תג H1", value: h1s[0] || null, status: h1s.length === 1 ? "ok" : h1s.length === 0 ? "error" : "warn", suggestion: h1s.length === 0 ? "חסר H1" : h1s.length > 1 ? `יש ${h1s.length} H1 — צריך רק אחד` : undefined });

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] || null;
  results.push({ key: "og", label: "Open Graph", value: ogTitle, status: ogTitle ? "ok" : "warn", suggestion: !ogTitle ? "חסרים תגי og:title, og:description, og:image" : undefined });

  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  results.push({ key: "canonical", label: "Canonical URL", value: canonicalMatch?.[1] || null, status: canonicalMatch ? "ok" : "warn", suggestion: !canonicalMatch ? "מומלץ להוסיף תג canonical" : undefined });

  const viewportMatch = html.match(/<meta[^>]+name=["']viewport["']/i);
  results.push({ key: "viewport", label: "Viewport meta", value: viewportMatch ? "קיים" : null, status: viewportMatch ? "ok" : "error", suggestion: !viewportMatch ? "חסר viewport meta — האתר לא ידידותי למובייל" : undefined });

  const images = [...html.matchAll(/<img[^>]*>/gi)];
  const imagesWithoutAlt = images.filter(m => !m[0].includes("alt=") || m[0].match(/alt=["']\s*["']/));
  results.push({ key: "imgalt", label: `Alt לתמונות (${images.length})`, value: imagesWithoutAlt.length === 0 ? "✓ כל התמונות" : `${imagesWithoutAlt.length} חסרות`, status: imagesWithoutAlt.length === 0 ? "ok" : imagesWithoutAlt.length > 3 ? "error" : "warn", suggestion: imagesWithoutAlt.length > 0 ? `${imagesWithoutAlt.length} תמונות ללא alt text` : undefined });

  const structuredData = html.includes('"@context"') && html.includes('"@type"');
  results.push({ key: "schema", label: "Structured Data", value: structuredData ? "JSON-LD נמצא" : null, status: structuredData ? "ok" : "warn", suggestion: !structuredData ? "מומלץ להוסיף JSON-LD Schema" : undefined });

  const score = Math.round((results.filter(r => r.status === "ok").length / results.length) * 100);
  return { results, score };
}

export function analyzePerf(html: string) {
  const size = new Blob([html]).size;
  const extJs = [...html.matchAll(/<script[^>]+src/gi)].length;
  const extCss = [...html.matchAll(/<link[^>]+stylesheet/gi)].length;
  const inlineJs = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].reduce((s, m) => s + m[1].length, 0);
  const inlineCss = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].reduce((s, m) => s + m[1].length, 0);
  const imgs = [...html.matchAll(/<img[^>]*>/gi)].length;
  const lazyImgs = [...html.matchAll(/loading=["']lazy["']/gi)].length;
  const hasMinify = !html.includes("\n\n\n");
  const hasPreload = html.includes("rel=\"preload\"");
  const hasFontDisplay = html.includes("font-display");
  const hasAsync = html.includes("async") || html.includes("defer");
  const iframes = [...html.matchAll(/<iframe/gi)].length;

  const items = [
    { label: "גודל HTML", value: formatSize(size), status: size < 50000 ? "ok" : size < 150000 ? "warn" : "error" as any, detail: size < 50000 ? "מצוין" : size < 150000 ? "בסדר" : "גדול מדי" },
    { label: "סקריפטים חיצוניים", value: `${extJs}`, status: extJs <= 3 ? "ok" : extJs <= 6 ? "warn" : "error" as any, detail: extJs <= 3 ? "מצוין" : "שקול לאחד" },
    { label: "CSS חיצוני", value: `${extCss}`, status: extCss <= 2 ? "ok" : "warn" as any, detail: extCss <= 2 ? "בסדר" : "שקול לאחד" },
    { label: "JS מוטמע", value: formatSize(inlineJs), status: inlineJs < 30000 ? "ok" : inlineJs < 80000 ? "warn" : "error" as any, detail: "" },
    { label: "CSS מוטמע", value: formatSize(inlineCss), status: inlineCss < 20000 ? "ok" : "warn" as any, detail: "" },
    { label: "תמונות", value: `${imgs} (${lazyImgs} lazy)`, status: imgs === 0 || lazyImgs === imgs ? "ok" : lazyImgs > 0 ? "warn" : "error" as any, detail: imgs > 0 && lazyImgs === 0 ? "הוסף loading='lazy'" : "" },
    { label: "async/defer לסקריפטים", value: hasAsync ? "✓ יש" : "✗ חסר", status: hasAsync ? "ok" : "warn" as any, detail: !hasAsync ? "הוסף async/defer" : "" },
    { label: "Preload hints", value: hasPreload ? "✓ יש" : "לא נמצא", status: hasPreload ? "ok" : "warn" as any, detail: "" },
    { label: "iframe", value: `${iframes}`, status: iframes === 0 ? "ok" : "warn" as any, detail: iframes > 0 ? "iframes מאטים טעינה" : "" },
  ];

  const score = Math.round((items.filter(i => i.status === "ok").length / items.length) * 100);
  return { items, score, size, extJs, extCss, inlineJs, inlineCss };
}

export function analyzeA11y(html: string) {
  const issues: { severity: "error" | "warn" | "info"; message: string; count?: number }[] = [];

  const imgs = [...html.matchAll(/<img[^>]*>/gi)];
  const noAlt = imgs.filter(m => !m[0].includes("alt=") || /alt=["']\s*["']/.test(m[0]));
  if (noAlt.length > 0) issues.push({ severity: "error", message: `${noAlt.length} תמונות ללא alt text`, count: noAlt.length });

  const inputs = [...html.matchAll(/<input[^>]*>/gi)];
  const noLabel = inputs.filter(m => {
    const id = m[0].match(/id=["']([^"']+)/)?.[1];
    if (!id) return !m[0].includes("aria-label") && !m[0].includes("placeholder");
    return !html.includes(`for="${id}"`) && !html.includes(`for='${id}'`);
  });
  if (noLabel.length > 0) issues.push({ severity: "error", message: `${noLabel.length} שדות קלט ללא label`, count: noLabel.length });

  const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)];
  const emptyBtns = buttons.filter(m => !m[1].replace(/<[^>]*>/g, "").trim() && !m[0].includes("aria-label"));
  if (emptyBtns.length > 0) issues.push({ severity: "error", message: `${emptyBtns.length} כפתורים ללא טקסט/aria-label`, count: emptyBtns.length });

  const links = [...html.matchAll(/<a[^>]*href[^>]*>([\s\S]*?)<\/a>/gi)];
  const emptyLinks = links.filter(m => !m[1].replace(/<[^>]*>/g, "").trim() && !m[0].includes("aria-label"));
  if (emptyLinks.length > 0) issues.push({ severity: "warn", message: `${emptyLinks.length} קישורים ריקים`, count: emptyLinks.length });

  const hasLang = /<html[^>]+lang=["']/i.test(html);
  if (!hasLang) issues.push({ severity: "error", message: 'חסר lang attribute בתג <html>' });

  const hasSkipLink = html.includes("#main") || html.includes("#content") || html.includes("skip");
  if (!hasSkipLink) issues.push({ severity: "info", message: "מומלץ להוסיף skip navigation link" });

  const hasAriaLandmarks = html.includes('role="main"') || html.includes("<main") || html.includes("<nav") || html.includes("<header");
  if (!hasAriaLandmarks) issues.push({ severity: "warn", message: "חסרים ARIA landmarks (main, nav, header)" });

  const hasTabIndex = html.includes("tabindex=");
  const hasHighTabIndex = html.match(/tabindex=["']([2-9]|\d{2,})["']/);
  if (hasHighTabIndex) issues.push({ severity: "warn", message: "tabindex גבוה מ-1 פוגע בסדר הניווט" });

  const hasContrast = html.includes("color:") || html.includes("color:");
  if (!hasContrast) issues.push({ severity: "info", message: "בדוק ניגודיות צבעים (WCAG 2.1 AA)" });

  const score = Math.max(0, 100 - issues.filter(i => i.severity === "error").length * 20 - issues.filter(i => i.severity === "warn").length * 8);
  return { issues, score };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  const r = 24; const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

export function StatusIcon({ status }: { status: "ok" | "warn" | "error" | "info" }) {
  if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
  if (status === "warn") return <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-red-400 shrink-0" />;
  return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
}


export function TechBadge({ name, color, desc }: { name: string; color: string; desc: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    teal: "bg-teal-500/20 text-teal-300 border-teal-500/30",
    cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  };
  return (
    <div className={cn("flex flex-col px-3 py-2 rounded-lg border", colorMap[color] || "")} style={{ fontFamily: HE }}>
      <span className="text-xs font-bold">{name}</span>
      <span className="text-[10px] opacity-70">{desc}</span>
    </div>
  );
}

export function DepRow({ dep }: { dep: Dependency }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const tag = dep.type === "js"
      ? `<script src="${dep.url}"></script>`
      : `<link rel="stylesheet" href="${dep.url}">`;
    navigator.clipboard.writeText(tag).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/3 rounded-lg border border-white/8 group hover:bg-white/6 transition-colors">
      <Package className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate" style={{ fontFamily: HE }}>{dep.name}</p>
        <p className="text-[10px] text-muted-foreground/60 truncate font-mono" dir="ltr">{dep.url.slice(0, 60)}{dep.url.length > 60 ? "…" : ""}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={copy} className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all" title="העתק תג">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
        <a href={dep.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted-foreground hover:text-primary transition-all">
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function CodeWithLines({ code, lang }: { code: string; lang: string }) {
  const lines = code.split("\n");
  return (
    <code>
      {lines.map((line, i) => (
        <span key={i} className="flex">
          <span className="w-10 shrink-0 text-muted-foreground/30 select-none text-right pr-4">{i + 1}</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: highlightLine(line, lang) }} />
          {"\n"}
        </span>
      ))}
    </code>
  );
}

export function highlightLine(line: string, lang: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (lang === "css") {
    return esc(line)
      .replace(/(\/\*.*?\*\/)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
      .replace(/([\w-]+)\s*:/g, '<span style="color:#60a5fa">$1</span>:')
      .replace(/([.#:[\]~>+,][\w-]+)/g, '<span style="color:#c4b5fd">$1</span>');
  }
  if (lang === "javascript") {
    const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|default|async|await|new|this|typeof|null|undefined|true|false|of|in|from)\b/g;
    return esc(line)
      .replace(/(\/\/.*)/g, '<span style="color:#6b7280;font-style:italic">$1</span>')
      .replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, '<span style="color:#86efac">$1</span>')
      .replace(keywords, '<span style="color:#c084fc">$1</span>')
      .replace(/\b(\d+)\b/g, '<span style="color:#f97316">$1</span>');
  }
  if (lang === "html") {
    return esc(line)
      .replace(/(&lt;\/?)([\w-]+)/g, '<span style="color:#f97316">$1$2</span>')
      .replace(/([\w-]+=)(&quot;|")?([^&"<>]*)/g, '<span style="color:#60a5fa">$1</span><span style="color:#86efac">"$3"</span>')
      .replace(/((&lt;!--[\s\S]*?--&gt;))/g, '<span style="color:#6b7280;font-style:italic">$1</span>');
  }
  return esc(line);
}
