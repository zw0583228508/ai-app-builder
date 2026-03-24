import { useMemo, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Hash,
  FileText,
  Search,
  ShieldCheck,
  AlertCircle,
  Gauge,
  BarChart3,
  Eye,
  Link2,
  Layers,
  Code2,
  Smartphone,
  Bot,
  RefreshCw,
  Star,
  Shield,
  Sparkles,
  Send,
  Plus,
  Trash2,
  Play,
  Wifi,
  Clock,
  Database,
  CheckCircle2,
  Package,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HE,
  VirtualFile,
  Dependency,
  ArchTab,
  ReviewIssue,
  AIReview,
  parseHtml,
  analyzeSeo,
  analyzePerf,
  analyzeA11y,
  formatSize,
  ScoreRing,
  StatusIcon,
  TechBadge,
  DepRow,
  CodeWithLines,
} from "./ProjectFilesPanelHelpers";

interface Props {
  html: string;
  projectId?: number;
}

export function ProjectFilesPanel({ html, projectId }: Props) {
  const [archTab, setArchTab] = useState<ArchTab>("files");
  const [selectedFile, setSelectedFile] = useState("html");
  const [copied, setCopied] = useState(false);
  const [expandedDeps, setExpandedDeps] = useState(true);
  // AI Code Review state
  const [review, setReview] = useState<AIReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // API Tester state
  const [apiMethod, setApiMethod] = useState<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  >("GET");
  const [apiUrl, setApiUrl] = useState(
    "https://jsonplaceholder.typicode.com/posts/1",
  );
  const [apiHeaders, setApiHeaders] = useState<{ key: string; val: string }[]>([
    { key: "Content-Type", val: "application/json" },
  ]);
  const [apiBody, setApiBody] = useState(
    '{\n  "title": "Hello",\n  "body": "World"\n}',
  );
  const [apiResponse, setApiResponse] = useState<{
    status: number;
    time: number;
    size: number;
    data: string;
    headers: Record<string, string>;
  } | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResTab, setApiResTab] = useState<"body" | "headers">("body");
  const [apiHistory, setApiHistory] = useState<
    { method: string; url: string; status: number; time: number }[]
  >([]);

  async function sendApiRequest() {
    if (!apiUrl.trim()) return;
    setApiLoading(true);
    setApiError(null);
    setApiResponse(null);
    const t0 = Date.now();
    try {
      const headers: Record<string, string> = {};
      apiHeaders
        .filter((h) => h.key.trim())
        .forEach((h) => {
          headers[h.key] = h.val;
        });
      const opts: RequestInit = { method: apiMethod, headers };
      if (apiMethod !== "GET" && apiMethod !== "DELETE" && apiBody.trim())
        opts.body = apiBody;
      const res = await fetch(
        `/api/proxy?url=${encodeURIComponent(apiUrl.trim())}`,
        opts,
      );
      const elapsed = Date.now() - t0;
      const text = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setApiResponse({
        status: res.status,
        time: elapsed,
        size: new Blob([text]).size,
        data: pretty,
        headers: resHeaders,
      });
      setApiHistory((h) =>
        [
          { method: apiMethod, url: apiUrl, status: res.status, time: elapsed },
          ...h,
        ].slice(0, 10),
      );
    } catch (e) {
      setApiError(String(e));
    } finally {
      setApiLoading(false);
    }
  }

  async function runReview() {
    if (!projectId || !html) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/ai-review`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReview(data);
    } catch (e) {
      setReviewError(String(e));
    } finally {
      setReviewLoading(false);
    }
  }

  const parsed = useMemo(() => parseHtml(html), [html]);
  const seo = useMemo(() => (html ? analyzeSeo(html) : null), [html]);
  const perf = useMemo(() => (html ? analyzePerf(html) : null), [html]);
  const a11y = useMemo(() => (html ? analyzeA11y(html) : null), [html]);
  const activeFile =
    parsed.files.find((f) => f.id === selectedFile) ?? parsed.files[0];

  function copyCode() {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tabDefs: {
    id: ArchTab;
    label: string;
    icon: React.ReactNode;
    score?: number | null;
  }[] = [
    { id: "files", label: "קבצים", icon: <Code2 className="w-3.5 h-3.5" /> },
    {
      id: "seo",
      label: "SEO",
      icon: <Search className="w-3.5 h-3.5" />,
      score: seo?.score,
    },
    {
      id: "perf",
      label: "ביצועים",
      icon: <Gauge className="w-3.5 h-3.5" />,
      score: perf?.score,
    },
    {
      id: "a11y",
      label: "נגישות",
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      score: a11y?.score,
    },
    { id: "libs", label: "ספריות", icon: <Package className="w-3.5 h-3.5" /> },
    { id: "api", label: "API", icon: <Wifi className="w-3.5 h-3.5" /> },
    { id: "db", label: "נתונים", icon: <Database className="w-3.5 h-3.5" /> },
    {
      id: "review",
      label: "AI Review",
      icon: <Bot className="w-3.5 h-3.5" />,
      score: review?.overall?.score,
    },
  ];

  const emptyState = (
    <div
      className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"
      style={{ fontFamily: HE }}
    >
      <Layers className="w-12 h-12 opacity-20" />
      <div className="text-center">
        <p className="text-sm font-medium">אין פרויקט עדיין</p>
        <p className="text-xs opacity-60 mt-1">
          לאחר שתיצור אפליקציה עם ה-AI
          <br />
          הארכיטקטורה תופיע כאן
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c]" dir="rtl">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 pt-2 pb-0 border-b border-border/30 bg-[#0d0d10] shrink-0 overflow-x-auto">
        {tabDefs.map((t) => (
          <button
            key={t.id}
            onClick={() => setArchTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs font-medium transition-all whitespace-nowrap border-b-2",
              archTab === t.id
                ? "bg-white/8 text-foreground border-primary"
                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-white/5",
            )}
            style={{ fontFamily: HE }}
          >
            {t.icon}
            {t.label}
            {t.score !== undefined && t.score !== null && html && (
              <span
                className={cn(
                  "text-[9px] px-1 py-0.5 rounded-full font-bold",
                  t.score >= 80
                    ? "bg-green-500/20 text-green-400"
                    : t.score >= 60
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400",
                )}
              >
                {t.score}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* FILES TAB */}
        {archTab === "files" &&
          (!html ? (
            emptyState
          ) : (
            <div className="flex h-full overflow-hidden">
              {/* Sidebar */}
              <div className="w-52 shrink-0 flex flex-col border-l border-border/30 bg-[#0d0d10] overflow-y-auto">
                <div className="p-3 border-b border-border/30">
                  <p
                    className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2"
                    style={{ fontFamily: HE }}
                  >
                    קבצים
                  </p>
                  {parsed.files.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFile(f.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all text-right mb-0.5",
                        selectedFile === f.id
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                      )}
                      style={{ fontFamily: HE }}
                    >
                      <span style={{ color: f.color }}>{f.icon}</span>
                      <span className="flex-1 truncate font-mono text-[11px]">
                        {f.name}
                      </span>
                      <span className="text-[9px] opacity-40">
                        {formatSize(f.size)}
                      </span>
                    </button>
                  ))}
                </div>
                {parsed.deps.length > 0 && (
                  <div className="p-2">
                    <button
                      onClick={() => setExpandedDeps((v) => !v)}
                      className="w-full flex items-center gap-1 px-1 mb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider hover:text-muted-foreground"
                      style={{ fontFamily: HE }}
                    >
                      {expandedDeps ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      CDN ({parsed.deps.length})
                    </button>
                    {expandedDeps &&
                      parsed.deps.slice(0, 12).map((d, i) => (
                        <a
                          key={i}
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-primary truncate group"
                          style={{ fontFamily: HE }}
                        >
                          <Package className="w-2.5 h-2.5 opacity-50 shrink-0" />
                          <span className="truncate flex-1">{d.name}</span>
                          <ExternalLink className="w-2 h-2 opacity-0 group-hover:opacity-50" />
                        </a>
                      ))}
                  </div>
                )}
              </div>
              {/* Code viewer */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeFile && (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-[#0d0d10] shrink-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span style={{ color: activeFile.color }}>
                          {activeFile.icon}
                        </span>
                        <span className="font-mono text-foreground">
                          {activeFile.name}
                        </span>
                        <span>·</span>
                        <span>{activeFile.lines.toLocaleString()} שורות</span>
                        <span>·</span>
                        <span>{formatSize(activeFile.size)}</span>
                      </div>
                      <button
                        onClick={copyCode}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
                        style={{ fontFamily: HE }}
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copied ? "הועתק!" : "העתק"}
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                      <pre
                        className="p-4 text-xs font-mono text-foreground/80 leading-relaxed whitespace-pre-wrap break-words"
                        style={{ direction: "ltr", textAlign: "left" }}
                      >
                        <CodeWithLines
                          code={activeFile.content}
                          lang={activeFile.language}
                        />
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

        {/* SEO TAB */}
        {archTab === "seo" &&
          (!html || !seo ? (
            emptyState
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <ScoreRing score={seo.score} />
                <div style={{ fontFamily: HE }}>
                  <p className="font-bold text-foreground text-lg">
                    ציון SEO: {seo.score}/100
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {seo.score >= 80
                      ? "מצוין — האתר מותאם היטב לחיפוש"
                      : seo.score >= 60
                        ? "בסדר — יש מקום לשיפור"
                        : "נחוץ שיפור — בעיות קריטיות קיימות"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {seo.results.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-start gap-3 p-3 bg-white/3 rounded-lg border border-white/8"
                  >
                    <StatusIcon status={r.status} />
                    <div className="flex-1 min-w-0" style={{ fontFamily: HE }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {r.label}
                        </span>
                        {r.value && (
                          <span
                            className="text-[10px] text-muted-foreground truncate max-w-[200px]"
                            dir="ltr"
                          >
                            {r.value}
                          </span>
                        )}
                      </div>
                      {r.suggestion && (
                        <p className="text-[11px] text-yellow-400/80 mt-0.5">
                          {r.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {/* PERFORMANCE TAB */}
        {archTab === "perf" &&
          (!html || !perf ? (
            emptyState
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <ScoreRing score={perf.score} />
                <div style={{ fontFamily: HE }}>
                  <p className="font-bold text-foreground text-lg">
                    ביצועים: {perf.score}/100
                  </p>
                  <p className="text-sm text-muted-foreground">
                    גודל כולל: {formatSize(perf.size)} · {perf.extJs} JS ·{" "}
                    {perf.extCss} CSS
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {perf.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 bg-white/3 rounded-lg border border-white/8"
                  >
                    <StatusIcon status={item.status} />
                    <div className="flex-1 min-w-0" style={{ fontFamily: HE }}>
                      <p className="text-[11px] font-semibold text-foreground">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {item.value} {item.detail && `— ${item.detail}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                style={{ fontFamily: HE }}
              >
                <p className="text-xs font-semibold text-blue-300 mb-1">
                  💡 טיפים לביצועים מהירים:
                </p>
                <ul className="text-[11px] text-blue-300/70 space-y-0.5 list-disc list-inside">
                  <li>הוסף loading="lazy" לתמונות</li>
                  <li>הוסף defer/async לסקריפטים</li>
                  <li>השתמש בפורמטים WebP לתמונות</li>
                  <li>מזעור CSS/JS מוטמע</li>
                </ul>
              </div>
            </div>
          ))}

        {/* ACCESSIBILITY TAB */}
        {archTab === "a11y" &&
          (!html || !a11y ? (
            emptyState
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <ScoreRing score={a11y.score} />
                <div style={{ fontFamily: HE }}>
                  <p className="font-bold text-foreground text-lg">
                    נגישות WCAG: {a11y.score}/100
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a11y.issues.filter((i) => i.severity === "error").length}{" "}
                    שגיאות ·{" "}
                    {a11y.issues.filter((i) => i.severity === "warn").length}{" "}
                    אזהרות
                  </p>
                </div>
              </div>
              {a11y.issues.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-8 gap-2 text-green-400"
                  style={{ fontFamily: HE }}
                >
                  <CheckCircle2 className="w-10 h-10" />
                  <p className="font-semibold">מצוין! לא נמצאו בעיות נגישות</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {a11y.issues.map((issue, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        issue.severity === "error"
                          ? "bg-red-500/10 border-red-500/20"
                          : issue.severity === "warn"
                            ? "bg-yellow-500/10 border-yellow-500/20"
                            : "bg-blue-500/10 border-blue-500/20",
                      )}
                    >
                      <StatusIcon status={issue.severity} />
                      <div style={{ fontFamily: HE }}>
                        <p className="text-xs text-foreground">
                          {issue.message}
                        </p>
                        <p className="text-[10px] mt-0.5 text-muted-foreground">
                          {issue.severity === "error"
                            ? "נדרש תיקון (WCAG Level A)"
                            : issue.severity === "warn"
                              ? "מומלץ לתקן (WCAG Level AA)"
                              : "שיפור מומלץ"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div
                className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl"
                style={{ fontFamily: HE }}
              >
                <p className="text-xs font-semibold text-purple-300 mb-1">
                  ♿ WCAG 2.1 Guidelines:
                </p>
                <ul className="text-[11px] text-purple-300/70 space-y-0.5 list-disc list-inside">
                  <li>כל תמונה צריכה alt text</li>
                  <li>ניגודיות צבעים מינ׳ 4.5:1</li>
                  <li>כל האלמנטים ניתנים לניווט במקלדת</li>
                  <li>שדות טופס עם label מתאים</li>
                </ul>
              </div>
            </div>
          ))}

        {/* LIBRARIES TAB */}
        {archTab === "libs" &&
          (!html ? (
            emptyState
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              {/* Tech badges */}
              <div className="flex flex-wrap gap-2">
                {parsed.meta.hasReact && (
                  <TechBadge name="React" color="blue" desc="UI Framework" />
                )}
                {parsed.meta.hasVue && (
                  <TechBadge name="Vue.js" color="green" desc="UI Framework" />
                )}
                {parsed.meta.hasAlpine && (
                  <TechBadge
                    name="Alpine.js"
                    color="teal"
                    desc="Lightweight JS"
                  />
                )}
                {parsed.meta.hasTailwind && (
                  <TechBadge
                    name="Tailwind CSS"
                    color="cyan"
                    desc="CSS Framework"
                  />
                )}
                {parsed.meta.hasBootstrap && (
                  <TechBadge
                    name="Bootstrap"
                    color="purple"
                    desc="CSS Framework"
                  />
                )}
                {parsed.meta.hasCharts && (
                  <TechBadge
                    name="Charts"
                    color="orange"
                    desc="Data Visualization"
                  />
                )}
                {parsed.meta.hasAnimations && (
                  <TechBadge
                    name="Animations"
                    color="pink"
                    desc="Animation Library"
                  />
                )}
              </div>

              {parsed.deps.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground text-sm"
                  style={{ fontFamily: HE }}
                >
                  לא נמצאו ספריות CDN חיצוניות
                </div>
              ) : (
                <>
                  <div>
                    <p
                      className="text-xs text-muted-foreground mb-2 font-semibold"
                      style={{ fontFamily: HE }}
                    >
                      JavaScript (
                      {parsed.deps.filter((d) => d.type === "js").length})
                    </p>
                    <div className="space-y-1">
                      {parsed.deps
                        .filter((d) => d.type === "js")
                        .map((dep, i) => (
                          <DepRow key={i} dep={dep} />
                        ))}
                    </div>
                  </div>
                  {parsed.deps.filter((d) => d.type === "css").length > 0 && (
                    <div>
                      <p
                        className="text-xs text-muted-foreground mb-2 font-semibold"
                        style={{ fontFamily: HE }}
                      >
                        CSS (
                        {parsed.deps.filter((d) => d.type === "css").length})
                      </p>
                      <div className="space-y-1">
                        {parsed.deps
                          .filter((d) => d.type === "css")
                          .map((dep, i) => (
                            <DepRow key={i} dep={dep} />
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Suggest popular libraries */}
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <p
                  className="text-xs font-semibold text-foreground mb-2"
                  style={{ fontFamily: HE }}
                >
                  📦 ספריות פופולריות — ביקש מה-AI לכלול:
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { name: "Chart.js", desc: "גרפים ודיאגרמות" },
                    { name: "Three.js", desc: "3D גרפיקה" },
                    { name: "GSAP", desc: "אנימציות מתקדמות" },
                    { name: "Leaflet", desc: "מפות אינטראקטיביות" },
                    { name: "Swiper", desc: "קרוסלות" },
                    { name: "AOS", desc: "אנימציות scroll" },
                  ].map((lib) => (
                    <div
                      key={lib.name}
                      className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-lg"
                      style={{ fontFamily: HE }}
                    >
                      <Package className="w-3 h-3 text-muted-foreground/50" />
                      <div>
                        <p className="text-[11px] font-semibold text-foreground">
                          {lib.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {lib.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

        {/* API TESTER TAB */}
        {archTab === "api" && (
          <div className="flex flex-col h-full overflow-hidden" dir="rtl">
            {/* Request builder */}
            <div className="p-3 border-b border-border/30 space-y-2 shrink-0">
              <div className="flex gap-2 items-center">
                <select
                  value={apiMethod}
                  onChange={(e) =>
                    setApiMethod(e.target.value as typeof apiMethod)
                  }
                  className={cn(
                    "text-xs font-bold px-2 py-1.5 rounded-lg border-0 outline-none cursor-pointer",
                    apiMethod === "GET"
                      ? "bg-green-500/20 text-green-400"
                      : apiMethod === "POST"
                        ? "bg-blue-500/20 text-blue-400"
                        : apiMethod === "PUT"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : apiMethod === "PATCH"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-red-500/20 text-red-400",
                  )}
                  style={{ fontFamily: HE }}
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendApiRequest()}
                  placeholder="https://api.example.com/endpoint"
                  className="flex-1 text-xs bg-white/5 border border-border/40 rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                  dir="ltr"
                />
                <button
                  onClick={sendApiRequest}
                  disabled={apiLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {apiLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  שלח
                </button>
              </div>

              {/* Headers */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
                    style={{ fontFamily: HE }}
                  >
                    Headers
                  </span>
                  <button
                    onClick={() =>
                      setApiHeaders((h) => [...h, { key: "", val: "" }])
                    }
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> הוסף
                  </button>
                </div>
                {apiHeaders.map((h, i) => (
                  <div key={i} className="flex gap-1.5 items-center">
                    <input
                      value={h.key}
                      onChange={(e) =>
                        setApiHeaders((hs) =>
                          hs.map((x, j) =>
                            j === i ? { ...x, key: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Key"
                      className="w-32 text-[11px] bg-white/5 border border-border/30 rounded px-2 py-1 text-foreground outline-none focus:border-primary/50"
                      dir="ltr"
                    />
                    <span className="text-muted-foreground text-xs">:</span>
                    <input
                      value={h.val}
                      onChange={(e) =>
                        setApiHeaders((hs) =>
                          hs.map((x, j) =>
                            j === i ? { ...x, val: e.target.value } : x,
                          ),
                        )
                      }
                      placeholder="Value"
                      className="flex-1 text-[11px] bg-white/5 border border-border/30 rounded px-2 py-1 text-foreground outline-none focus:border-primary/50"
                      dir="ltr"
                    />
                    <button
                      onClick={() =>
                        setApiHeaders((hs) => hs.filter((_, j) => j !== i))
                      }
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Body */}
              {(apiMethod === "POST" ||
                apiMethod === "PUT" ||
                apiMethod === "PATCH") && (
                <div>
                  <span
                    className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide"
                    style={{ fontFamily: HE }}
                  >
                    Body (JSON)
                  </span>
                  <textarea
                    value={apiBody}
                    onChange={(e) => setApiBody(e.target.value)}
                    rows={3}
                    className="w-full mt-1 text-[11px] bg-white/5 border border-border/30 rounded-lg px-2 py-1.5 text-foreground outline-none focus:border-primary/50 font-mono resize-none"
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            {/* Response */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {apiError && (
                <div
                  className="m-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400"
                  dir="ltr"
                >
                  {apiError}
                </div>
              )}
              {apiLoading && (
                <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm" style={{ fontFamily: HE }}>
                    שולח בקשה...
                  </span>
                </div>
              )}
              {apiResponse && !apiLoading && (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center gap-3 px-3 py-2 border-b border-border/20 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        apiResponse.status < 300
                          ? "bg-green-500/20 text-green-400"
                          : apiResponse.status < 400
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400",
                      )}
                    >
                      {apiResponse.status}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {apiResponse.time}ms
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {apiResponse.size < 1024
                        ? `${apiResponse.size}B`
                        : `${(apiResponse.size / 1024).toFixed(1)}KB`}
                    </span>
                    <div className="flex gap-1 ml-auto">
                      {(["body", "headers"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setApiResTab(t)}
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded",
                            apiResTab === t
                              ? "bg-white/10 text-foreground"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                          style={{ fontFamily: HE }}
                        >
                          {t === "body" ? "גוף" : "כותרות"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Body / Headers */}
                  <div className="flex-1 overflow-auto p-3">
                    {apiResTab === "body" ? (
                      <pre
                        className="text-[11px] text-green-300 font-mono whitespace-pre-wrap break-all leading-relaxed"
                        dir="ltr"
                      >
                        {apiResponse.data}
                      </pre>
                    ) : (
                      <div className="space-y-1">
                        {Object.entries(apiResponse.headers).map(([k, v]) => (
                          <div
                            key={k}
                            className="flex gap-2 text-[11px]"
                            dir="ltr"
                          >
                            <span className="text-cyan-400 font-medium min-w-0 shrink-0">
                              {k}:
                            </span>
                            <span className="text-muted-foreground break-all">
                              {v}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!apiResponse && !apiLoading && !apiError && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <Send className="w-10 h-10 opacity-15" />
                  <div className="text-center" style={{ fontFamily: HE }}>
                    <p className="text-sm font-medium">בדוק כל API</p>
                    <p className="text-xs opacity-60 mt-1">הכנס URL ולחץ שלח</p>
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            {apiHistory.length > 0 && (
              <div className="border-t border-border/20 p-2 shrink-0 max-h-28 overflow-y-auto">
                <p
                  className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5"
                  style={{ fontFamily: HE }}
                >
                  היסטוריה
                </p>
                {apiHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setApiMethod(h.method as typeof apiMethod);
                      setApiUrl(h.url);
                    }}
                    className="w-full flex items-center gap-2 text-[10px] hover:bg-white/5 rounded px-1 py-0.5 group text-right"
                  >
                    <span
                      className={cn(
                        "font-bold",
                        h.status < 300
                          ? "text-green-400"
                          : h.status < 400
                            ? "text-yellow-400"
                            : "text-red-400",
                      )}
                    >
                      {h.method}
                    </span>
                    <span
                      className="text-muted-foreground truncate flex-1"
                      dir="ltr"
                    >
                      {h.url}
                    </span>
                    <span
                      className={cn(
                        "ml-auto font-medium",
                        h.status < 300 ? "text-green-400" : "text-red-400",
                      )}
                    >
                      {h.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DATABASE PANEL TAB */}
        {archTab === "db" &&
          (() => {
            if (!html) return emptyState;

            // Parse localStorage usage from HTML
            const lsSetMatches = [
              ...html.matchAll(
                /localStorage\.setItem\s*\(\s*['"`]([^'"`]+)['"`]/g,
              ),
            ];
            const lsGetMatches = [
              ...html.matchAll(
                /localStorage\.getItem\s*\(\s*['"`]([^'"`]+)['"`]/g,
              ),
            ];
            const lsRemoveMatches = [
              ...html.matchAll(
                /localStorage\.removeItem\s*\(\s*['"`]([^'"`]+)['"`]/g,
              ),
            ];
            const dbPushMatches = [
              ...html.matchAll(/db\.push\s*\(\s*['"`]([^'"`]+)['"`]/g),
            ];
            const dbGetMatches = [
              ...html.matchAll(/db\.get\s*\(\s*['"`]([^'"`]+)['"`]/g),
            ];

            const allKeys = new Set<string>();
            lsSetMatches.forEach((m) => allKeys.add(m[1]));
            lsGetMatches.forEach((m) => allKeys.add(m[1]));
            lsRemoveMatches.forEach((m) => allKeys.add(m[1]));
            dbPushMatches.forEach((m) => allKeys.add(m[1]));
            dbGetMatches.forEach((m) => allKeys.add(m[1]));

            // Identify array-type keys (used with db.push/db.get)
            const arrayKeys = new Set<string>();
            dbPushMatches.forEach((m) => arrayKeys.add(m[1]));
            dbGetMatches.forEach((m) => arrayKeys.add(m[1]));

            // Try to find JSON structure hints
            const jsonPatterns = new Map<string, string[]>();
            for (const key of allKeys) {
              const fieldMatches = [
                ...html.matchAll(
                  new RegExp(
                    `(?:db\\.push\\(['"\`]${key}['"\`],\\s*\\{|setItem\\(['"\`]${key}['"\`])[^}]*?([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*:`,
                    "g",
                  ),
                ),
              ];
              if (fieldMatches.length > 0) {
                jsonPatterns.set(
                  key,
                  fieldMatches
                    .slice(0, 6)
                    .map((m) => m[1])
                    .filter(Boolean),
                );
              }
            }

            const usesDbHelper =
              html.includes("db.push") ||
              html.includes("db.get") ||
              html.includes("db.set");
            const hasIndexedDB = html.includes("indexedDB");
            const hasCookies = html.includes("document.cookie");

            const keyCount = allKeys.size;

            return (
              <div
                className="overflow-y-auto h-full p-4 space-y-4"
                style={{ fontFamily: HE }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 rounded-xl border border-cyan-500/20">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Database className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">
                      ניתוח שכבת הנתונים
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {keyCount > 0
                        ? `זוהו ${keyCount} מאגרי נתונים · `
                        : "לא זוהו מאגרי נתונים · "}
                      {usesDbHelper ? "עם db helper" : "localStorage גולמי"}
                      {hasIndexedDB ? " · IndexedDB" : ""}
                      {hasCookies ? " · Cookies" : ""}
                    </p>
                  </div>
                </div>

                {keyCount === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                    <Database className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-sm font-medium text-muted-foreground">
                      האפליקציה אינה שומרת נתונים מקומית
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      רוצה להוסיף שמירת נתונים לאפליקציה?
                    </p>
                    <button
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("builder-prefill-message", {
                            detail:
                              "הוסף שמירת נתונים מקומית לאפליקציה עם localStorage כדי שהנתונים יישמרו גם לאחר רענון הדף",
                          }),
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      הוסף שמירת נתונים
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Storage type badges */}
                    <div className="flex flex-wrap gap-2">
                      {usesDbHelper && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/15 border border-green-500/25 rounded-lg text-xs font-medium text-green-400">
                          <CheckCircle2 className="w-3 h-3" /> db helper
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/15 border border-blue-500/25 rounded-lg text-xs font-medium text-blue-400">
                        <Database className="w-3 h-3" /> localStorage
                      </span>
                      {hasIndexedDB && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/15 border border-violet-500/25 rounded-lg text-xs font-medium text-violet-400">
                          <Database className="w-3 h-3" /> IndexedDB
                        </span>
                      )}
                    </div>

                    {/* Schema table */}
                    <div>
                      <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-2">
                        <Hash className="w-3.5 h-3.5 text-cyan-400" />
                        סכמת נתונים
                      </p>
                      <div className="space-y-2">
                        {[...allKeys].map((key) => {
                          const isArray = arrayKeys.has(key);
                          const isBool =
                            /premium|isPrem|logged|auth|enabled|dark|theme|modal/i.test(
                              key,
                            );
                          const isDate = /date|time|at$/i.test(key);
                          const fields = jsonPatterns.get(key) || [];
                          const inferredType = isArray
                            ? "Array<Object>"
                            : isBool
                              ? "boolean"
                              : isDate
                                ? "string (date)"
                                : "string | Object";

                          return (
                            <div
                              key={key}
                              className="p-3 bg-white/3 rounded-xl border border-border/30 hover:border-border/60 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full shrink-0 mt-0.5",
                                      isArray
                                        ? "bg-cyan-400"
                                        : isBool
                                          ? "bg-green-400"
                                          : "bg-yellow-400",
                                    )}
                                  />
                                  <code className="text-xs font-mono text-foreground/90 break-all">
                                    {key}
                                  </code>
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">
                                  {inferredType}
                                </span>
                              </div>

                              {fields.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-1">
                                  {fields.map((f) => (
                                    <span
                                      key={f}
                                      className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-mono text-muted-foreground/70"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground/50">
                                {lsSetMatches.some((m) => m[1] === key) && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-green-400">W</span>{" "}
                                    write
                                  </span>
                                )}
                                {lsGetMatches.some((m) => m[1] === key) && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-blue-400">R</span>{" "}
                                    read
                                  </span>
                                )}
                                {lsRemoveMatches.some((m) => m[1] === key) && (
                                  <span className="flex items-center gap-1">
                                    <span className="text-red-400">D</span>{" "}
                                    delete
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        פעולות מהירות
                      </p>
                      {[
                        {
                          label: "הוסף ייצוא נתונים ל-CSV",
                          msg: "הוסף כפתור שמאפשר לייצא את כל הנתונים השמורים לקובץ CSV",
                        },
                        {
                          label: "הוסף גיבוי ושחזור נתונים",
                          msg: "הוסף אפשרות לגיבוי כל הנתונים כ-JSON ושחזור מקובץ",
                        },
                        {
                          label: "הוסף אתחול נתוני דוגמה",
                          msg: "הוסף נתוני דוגמה ריאליים לאפליקציה בלחיצה אחת",
                        },
                        {
                          label: "הגדר גבולות נפח אחסון",
                          msg: "הוסף בדיקת נפח localStorage ואזהרה כשמתקרבים לגבול (5MB)",
                        },
                      ].map((action) => (
                        <button
                          key={action.label}
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent("builder-prefill-message", {
                                detail: action.msg,
                              }),
                            )
                          }
                          className="w-full text-right flex items-center gap-2 px-3 py-2 bg-white/3 hover:bg-white/6 border border-border/30 hover:border-border/60 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-all"
                        >
                          <ChevronRight className="w-3 h-3 shrink-0 rtl:rotate-180" />
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* Storage info */}
                    <div className="p-3 bg-yellow-500/8 border border-yellow-500/20 rounded-xl">
                      <p className="text-xs font-bold text-yellow-400 mb-1">
                        📦 על localStorage
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        נתונים נשמרים בדפדפן המשתמש · מקסימום ~5MB · נשמרים בין
                        רענונים · לא משותפים בין מכשירים · לדאטאבייס אמיתי נדרש
                        backend
                      </p>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

        {/* AI REVIEW TAB */}
        {archTab === "review" &&
          (!html ? (
            emptyState
          ) : (
            <div className="overflow-y-auto h-full p-4 space-y-4">
              {!review && !reviewLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
                    <Bot className="w-10 h-10 text-violet-400" />
                  </div>
                  <div className="text-center" style={{ fontFamily: HE }}>
                    <p className="font-bold text-foreground text-base">
                      ביקורת קוד מבוססת AI
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Claude יבדוק את הקוד שלך ויזהה בעיות
                      <br />
                      ביצועים, אבטחה, נגישות ואיכות קוד
                    </p>
                  </div>
                  <button
                    onClick={runReview}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-violet-500/20"
                    style={{ fontFamily: HE }}
                  >
                    <Sparkles className="w-4 h-4" />
                    הפעל ביקורת AI
                  </button>
                  {reviewError && (
                    <p
                      className="text-xs text-red-400 mt-2"
                      style={{ fontFamily: HE }}
                    >
                      {reviewError}
                    </p>
                  )}
                </div>
              )}

              {reviewLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center animate-pulse">
                    <Bot className="w-8 h-8 text-violet-400" />
                  </div>
                  <div className="text-center" style={{ fontFamily: HE }}>
                    <p className="font-bold text-foreground">
                      Claude בודק את הקוד...
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      זה עשוי לקחת כ-10 שניות
                    </p>
                  </div>
                </div>
              )}

              {review && !reviewLoading && (
                <>
                  {/* Overall score */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 rounded-xl border border-violet-500/20">
                    <ScoreRing score={review.overall.score} />
                    <div className="flex-1" style={{ fontFamily: HE }}>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground text-lg">
                          ציון: {review.overall.score}/100
                        </p>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-sm font-bold",
                            review.overall.grade === "A"
                              ? "bg-green-500/20 text-green-400"
                              : review.overall.grade === "B"
                                ? "bg-blue-500/20 text-blue-400"
                                : review.overall.grade === "C"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400",
                          )}
                        >
                          {review.overall.grade}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {review.overall.summary}
                      </p>
                    </div>
                    <button
                      onClick={runReview}
                      className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="הרץ מחדש"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Issue sections */}
                  {[
                    {
                      key: "performance" as const,
                      label: "⚡ ביצועים",
                      data: review.performance,
                      color: "orange",
                    },
                    {
                      key: "security" as const,
                      label: "🔒 אבטחה",
                      data: review.security,
                      color: "red",
                    },
                    {
                      key: "accessibility" as const,
                      label: "♿ נגישות",
                      data: review.accessibility,
                      color: "purple",
                    },
                    {
                      key: "codeQuality" as const,
                      label: "🧹 איכות קוד",
                      data: review.codeQuality,
                      color: "blue",
                    },
                    {
                      key: "bestPractices" as const,
                      label: "✨ Best Practices",
                      data: review.bestPractices,
                      color: "cyan",
                    },
                  ].map(
                    (section) =>
                      section.data?.length > 0 && (
                        <div key={section.key}>
                          <p
                            className="text-xs font-bold text-foreground mb-2"
                            style={{ fontFamily: HE }}
                          >
                            {section.label}
                          </p>
                          <div className="space-y-2">
                            {section.data.map((item, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  item.severity === "error"
                                    ? "bg-red-500/10 border-red-500/20"
                                    : item.severity === "warn"
                                      ? "bg-yellow-500/10 border-yellow-500/20"
                                      : "bg-blue-500/10 border-blue-500/20",
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  <StatusIcon status={item.severity} />
                                  <div
                                    className="flex-1"
                                    style={{ fontFamily: HE }}
                                  >
                                    <p className="text-xs text-foreground">
                                      {item.issue}
                                    </p>
                                    {item.fix && (
                                      <p className="text-[11px] text-muted-foreground mt-1">
                                        💡 {item.fix}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ),
                  )}

                  {/* Fix all with AI */}
                  <button
                    onClick={() => {
                      const issues = [
                        ...(review.performance || []),
                        ...(review.security || []),
                        ...(review.codeQuality || []),
                      ]
                        .filter(
                          (i) =>
                            i.severity === "error" || i.severity === "warn",
                        )
                        .map((i) => `- ${i.issue}: ${i.fix}`)
                        .join("\n");
                      window.dispatchEvent(
                        new CustomEvent("builder-prefill-message", {
                          detail: `תקן את הבעיות הבאות בקוד:\n${issues}`,
                        }),
                      );
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600/30 to-cyan-600/30 hover:from-violet-600/50 hover:to-cyan-600/50 border border-violet-500/30 rounded-xl text-sm font-semibold text-violet-300 hover:text-white transition-all"
                    style={{ fontFamily: HE }}
                  >
                    <Sparkles className="w-4 h-4" />
                    תקן את כל הבעיות עם AI
                  </button>
                </>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
