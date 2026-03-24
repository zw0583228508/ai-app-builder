import { useState, useEffect, useRef } from "react";
import { Rocket, Loader2, CheckCircle2, Sparkles, Users, CreditCard, BarChart3, Lock, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaasGeneratorPanelProps {
  projectId: number;
  onCodeGenerated?: () => void;
}

const SAAS_FEATURES = [
  { icon: <Lock className="w-3.5 h-3.5" />, label: "Auth מלא", color: "text-blue-400" },
  { icon: <Users className="w-3.5 h-3.5" />, label: "Dashboard", color: "text-purple-400" },
  { icon: <Shield className="w-3.5 h-3.5" />, label: "Admin Panel", color: "text-orange-400" },
  { icon: <CreditCard className="w-3.5 h-3.5" />, label: "Stripe Billing", color: "text-green-400" },
  { icon: <BarChart3 className="w-3.5 h-3.5" />, label: "Analytics", color: "text-cyan-400" },
  { icon: <Settings className="w-3.5 h-3.5" />, label: "Settings", color: "text-white/60" },
];

export function SaasGeneratorPanel({ projectId, onCodeGenerated }: SaasGeneratorPanelProps) {
  const [appName, setAppName] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [codeChars, setCodeChars] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!appName.trim() || generating) return;
    setGenerating(true);
    setDone(false);
    setProgress([]);
    setCodeChars(0);

    try {
      const res = await fetch(`/api/projects/${projectId}/saas-generator`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, description }),
        credentials: "include",
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6)) as { type?: string; content?: string; error?: string };
            if (data.error) throw new Error(data.error);
            if (data.type === "text" && data.content) {
              setProgress(prev => {
                const last = prev[prev.length - 1];
                if (last && !last.endsWith("...")) return [...prev.slice(0, -1), last + data.content];
                return [...prev, data.content ?? ""];
              });
            }
            if (data.type === "code" && data.content) {
              setCodeChars(prev => prev + (data.content?.length ?? 0));
            }
            if (data.type === "done") {
              setDone(true);
              onCodeGenerated?.();
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      setProgress(prev => [...prev, `❌ שגיאה: ${e instanceof Error ? e.message : "נסה שנית"}`]);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (progressRef.current) progressRef.current.scrollTop = progressRef.current.scrollHeight;
  }, [progress]);

  return (
    <div className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[hsl(191,90%,42%)]/15 via-purple-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-[hsl(191,90%,42%)]" />
          <h2 className="text-sm font-semibold text-white">One-Click SaaS Generator</h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">מייצר אפליקציית SaaS מלאה בלחיצה אחת</p>
      </div>

      {/* Feature Pills */}
      <div className="px-4 py-2.5 border-b border-white/10 flex flex-wrap gap-1.5">
        {SAAS_FEATURES.map((f, i) => (
          <div key={i} className={cn("flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium", f.color)}>
            {f.icon}{f.label}
          </div>
        ))}
      </div>

      {/* Form */}
      {!generating && !done && (
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">שם האפליקציה</label>
            <input
              value={appName}
              onChange={e => setAppName(e.target.value)}
              placeholder="לדוגמה: TeamFlow, Invoici, QuickHire..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[hsl(191,90%,42%)]/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">תיאור קצר (אופציונלי)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="פלטפורמת ניהול צוות עם billing, analytics ו-CRM..."
              className="w-full h-16 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[hsl(191,90%,42%)]/50"
            />
          </div>
          <button
            onClick={generate}
            disabled={!appName.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold bg-gradient-to-r from-[hsl(191,90%,42%)] to-purple-600 hover:from-[hsl(191,90%,38%)] hover:to-purple-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[hsl(191,90%,42%)]/20"
          >
            <Rocket className="w-4 h-4" />
            צור SaaS App עכשיו
          </button>

          {/* Info Box */}
          <div className="bg-white/3 border border-white/10 rounded-lg p-3">
            <div className="text-xs text-white/40 leading-relaxed">
              ✨ מייצר קוד מלא עם: דשבורד, Auth, Admin, Billing עם 3 תוכניות מחיר, Analytics, ו-Settings מלא.
              הקוד ייכתב ישירות לפרויקט ויהיה מוכן לשימוש.
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      {generating && (
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(191,90%,42%)] flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">יוצר "{appName}"...</div>
              {codeChars > 0 && <div className="text-xs text-white/40">{codeChars.toLocaleString()} תווי קוד נוצרו</div>}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[hsl(191,90%,42%)] to-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>

          <div ref={progressRef} className="flex-1 overflow-y-auto bg-black/20 rounded-lg p-3 text-xs text-white/70 font-mono leading-relaxed">
            {progress.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      )}

      {/* Done */}
      {done && !generating && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <CheckCircle2 className="w-12 h-12 text-green-400" />
          <div className="text-center">
            <div className="text-base font-bold text-white mb-1">"{appName}" נוצר בהצלחה! 🎉</div>
            <div className="text-xs text-white/50 mb-4">
              האפליקציה מוכנה עם כל הפיצ'רים: Auth, Dashboard, Admin, Billing, Analytics
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {SAAS_FEATURES.map((f, i) => (
              <div key={i} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium", f.color)}>
                <CheckCircle2 className="w-3 h-3 text-green-400" />{f.label}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setDone(false); setAppName(""); setDescription(""); setProgress([]); }}
            className="mt-2 px-4 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-colors"
          >
            צור SaaS חדש
          </button>
        </div>
      )}
    </div>
  );
}
