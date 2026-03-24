import { useState } from "react";
import {
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { ProjectMessage } from "@workspace/api-client-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

const OUTPUT_FENCE_LANGS = ["html", "jsx", "tsx", "js", "ts", "css", "svelte", "vue", "py", "python"] as const;

function stripPatchMarkers(text: string): string {
  return text
    .replace(/<<<REPLACE>>>/g, "")
    .replace(/<<<END>>>/g, "")
    .replace(/<<<FILE:[^>]*>>>/g, "")
    .replace(/\[PATCH_APPLIED\]/g, "")
    .trim();
}

export function extractCodeAndText(content: string): {
  text: string;
  code: string | null;
  lang: string | null;
} {
  if (content.includes("[PATCH_APPLIED]")) {
    return {
      text: stripPatchMarkers(content.replace("[PATCH_APPLIED]", "")).trim(),
      code: "patch-applied",
      lang: null,
    };
  }

  if (content.includes("<<<REPLACE>>>") || content.includes("<<<FILE:")) {
    return {
      text: stripPatchMarkers(content),
      code: "patch-applied",
      lang: null,
    };
  }

  for (const lang of OUTPUT_FENCE_LANGS) {
    const tag = `\`\`\`${lang}`;
    const fenceStart = content.indexOf(tag);
    if (fenceStart !== -1) {
      const afterTag = fenceStart + tag.length;
      const closingMatch = content.slice(afterTag).search(/\n```\s*(\n|$)/);
      if (closingMatch !== -1) {
        const code = content.slice(afterTag, afterTag + closingMatch).trim();
        const closingEnd = afterTag + closingMatch + content.slice(afterTag + closingMatch).indexOf("\n```") + 4;
        const text = (content.slice(0, fenceStart) + content.slice(closingEnd)).trim();
        return { text: stripPatchMarkers(text), code, lang };
      } else {
        const code = content.slice(afterTag).trim();
        const text = content.slice(0, fenceStart).trim();
        return { text: stripPatchMarkers(text), code, lang };
      }
    }
  }

  const genericFence = content.indexOf("```\n");
  if (genericFence !== -1) {
    const afterFence = genericFence + 4;
    const closingFence = content.indexOf("\n```", afterFence);
    if (closingFence !== -1) {
      const code = content.slice(afterFence, closingFence).trim();
      const text = (content.slice(0, genericFence) + content.slice(closingFence + 4)).trim();
      return { text: stripPatchMarkers(text), code, lang: null };
    }
  }

  const htmlStart = content.search(/<!DOCTYPE html>|<html/i);
  if (htmlStart !== -1) {
    const code = content.slice(htmlStart).trim();
    const text = content.slice(0, htmlStart).trim();
    return { text: stripPatchMarkers(text), code, lang: "html" };
  }

  return { text: stripPatchMarkers(content), code: null, lang: null };
}

interface ProductSpec {
  productName?: string;
  tagline?: string;
  targetAudience?: string;
  businessGoal?: string;
  coreFeatures?: string[];
  pages?: string[];
  userRoles?: string[];
  designStyle?: string;
  primaryColor?: string;
  techStack?: string;
  monetization?: string;
  integrations?: string[];
  contentLanguage?: string;
  priority?: string;
}

function parseProductSpec(content: string): ProductSpec | null {
  const match = content.match(/\[PRODUCT_SPEC\]([\s\S]*?)\[\/PRODUCT_SPEC\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim()) as ProductSpec;
  } catch {
    return null;
  }
}

function stripSpecBlock(content: string): string {
  return content
    .replace(/\[PRODUCT_SPEC\][\s\S]*?\[\/PRODUCT_SPEC\]\n*/g, "")
    .trim();
}

function SpecBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-2.5" style={{ fontFamily: HE }}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{icon} {label}</p>
      <p className="text-[12px] text-foreground/90 font-medium leading-snug">{value}</p>
    </div>
  );
}

function ProductSpecCard({ spec }: { spec: ProductSpec }) {
  const color = spec.primaryColor ?? "#06b6d4";
  return (
    <div
      className="rounded-2xl border border-border/60 overflow-hidden bg-card/60 backdrop-blur-sm shadow-xl w-full"
      style={{ fontFamily: HE }}
    >
      <div
        className="px-5 pt-5 pb-4 border-b border-border/40"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 border"
            style={{ background: `${color}20`, borderColor: `${color}40` }}
          >
            📋
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-foreground leading-tight">{spec.productName ?? "מפרט המוצר"}</h3>
            {spec.tagline && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{spec.tagline}</p>}
          </div>
          {spec.primaryColor && (
            <div
              className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0 mt-0.5"
              style={{ background: spec.primaryColor }}
              title={spec.primaryColor}
            />
          )}
        </div>
      </div>
      <div className="p-4 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          {spec.targetAudience && <SpecBlock icon="👥" label="קהל יעד" value={spec.targetAudience} />}
          {spec.businessGoal && <SpecBlock icon="🎯" label="מטרה עסקית" value={spec.businessGoal} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {spec.designStyle && <SpecBlock icon="🎨" label="סגנון עיצוב" value={spec.designStyle} />}
          {spec.techStack && <SpecBlock icon="⚙️" label="טכנולוגיה" value={spec.techStack} />}
        </div>
        {(spec.monetization || spec.contentLanguage) && (
          <div className="grid grid-cols-2 gap-3">
            {spec.monetization && <SpecBlock icon="💳" label="מודל הכנסות" value={spec.monetization} />}
            {spec.contentLanguage && <SpecBlock icon="🌐" label="שפת תוכן" value={spec.contentLanguage} />}
          </div>
        )}
        {spec.coreFeatures && spec.coreFeatures.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">✨ פיצ'רים מרכזיים</p>
            <div className="flex flex-wrap gap-1.5">
              {spec.coreFeatures.map((f, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary/90">{f}</span>
              ))}
            </div>
          </div>
        )}
        {spec.pages && spec.pages.length > 0 && (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">📄 דפים / מסכים</p>
            <div className="flex flex-wrap gap-1.5">
              {spec.pages.map((p, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 border border-border/50 text-foreground/80">{p}</span>
              ))}
            </div>
          </div>
        )}
        {spec.integrations && spec.integrations.length > 0 && spec.integrations[0] !== "None" && spec.integrations[0] !== "אין" && (
          <div className="rounded-xl border border-border/40 bg-background/40 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">🔌 אינטגרציות</p>
            <div className="flex flex-wrap gap-1.5">
              {spec.integrations.map((ig, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/90">{ig}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message }: { message: ProjectMessage }) {
  const isUser = message.role === "user";
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasSpec = !isUser && message.content.includes("[PRODUCT_SPEC]");
  const parsedSpec = hasSpec ? parseProductSpec(message.content) : null;
  const rawContent = hasSpec ? stripSpecBlock(message.content) : message.content;
  const { text: displayContent, code: extractedCode, lang: codeLang } = isUser
    ? { text: message.content, code: null, lang: null }
    : extractCodeAndText(rawContent);

  const isPatch = extractedCode === "patch-applied";
  const hasCode = !!extractedCode;
  const hasViewableCode = hasCode && !isPatch;

  const handleCopy = () => {
    if (extractedCode && !isPatch) {
      navigator.clipboard.writeText(extractedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
        dir="rtl"
      >
        <div
          className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1e1e2e] border border-white/[0.06] text-sm text-slate-200 leading-relaxed text-right shadow-sm"
          style={{ fontFamily: HE }}
        >
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 max-w-[90%]"
      dir="rtl"
    >
      {/* Avatar — subtle indigo dot */}
      <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {parsedSpec && <ProductSpecCard spec={parsedSpec} />}

        {displayContent && (
          <div
            className="prose prose-invert max-w-none text-sm leading-[1.75] text-slate-300 overflow-hidden
              prose-p:my-1.5 prose-p:text-slate-300
              prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mb-2 prose-headings:mt-4
              prose-strong:text-slate-100 prose-strong:font-semibold
              prose-li:text-slate-300 prose-li:my-0.5
              prose-ul:my-2 prose-ol:my-2
              prose-code:text-indigo-300 prose-code:bg-indigo-500/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.8em] prose-code:font-mono prose-code:border-none
              prose-pre:bg-[#111118] prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl
              prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-2 prose-blockquote:border-indigo-500/40 prose-blockquote:text-slate-400 prose-blockquote:pl-3
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            dir="auto"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayContent}
            </ReactMarkdown>
          </div>
        )}

        {hasCode && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs flex-1",
                  isPatch
                    ? "bg-emerald-500/8 border border-emerald-500/20 text-emerald-400"
                    : "bg-indigo-500/8 border border-indigo-500/20 text-indigo-400",
                )}
              >
                <span className="text-sm">{isPatch ? "✏️" : "✅"}</span>
                <span style={{ fontFamily: HE }}>
                  {isPatch ? "הקוד עודכן בהצלחה" : "תצוגה מקדימה מוכנה"}
                </span>
                <span className="text-slate-600 mr-auto text-[10px]" style={{ fontFamily: HE }}>
                  מוצג בצד ימין
                </span>
              </div>
              {hasViewableCode && (
                <button
                  onClick={() => setShowCode((v) => !v)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#16161f] border border-white/[0.06] text-[11px] text-slate-500 hover:text-slate-200 hover:border-white/[0.12] transition-all shrink-0"
                  style={{ fontFamily: HE }}
                >
                  <Code2 className="w-3 h-3" />
                  {showCode ? "הסתר" : "קוד"}
                  {showCode ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                </button>
              )}
            </div>

            <AnimatePresence>
              {showCode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="relative rounded-xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-[#0d0d15]">
                      <span className="text-[11px] text-slate-600 font-mono">
                        {codeLang === "html" || codeLang === null ? "index.html"
                          : codeLang === "jsx" || codeLang === "tsx" ? `App.${codeLang}`
                          : codeLang === "css" ? "style.css"
                          : codeLang === "js" || codeLang === "ts" ? `index.${codeLang}`
                          : `output.${codeLang}`}
                      </span>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-200 transition-colors"
                        style={{ fontFamily: HE }}
                      >
                        {copied ? (
                          <><Check className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">הועתק</span></>
                        ) : (
                          <><Copy className="w-3 h-3" />העתק</>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] text-slate-400 font-mono leading-relaxed overflow-x-auto max-h-80 overflow-y-auto" dir="ltr">
                      <code>{extractedCode}</code>
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
