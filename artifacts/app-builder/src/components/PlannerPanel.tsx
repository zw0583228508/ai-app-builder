import { useState } from "react";
import { Sparkles, CheckCircle2, Clock, Code2, Layout, Database, Zap, Server, ChevronDown, ChevronRight, Loader2, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlannerPanelProps { projectId: number; }

interface Feature { id: string; name: string; description: string; priority: "high" | "medium" | "low"; complexity: "simple" | "medium" | "complex"; }
interface Screen { name: string; route: string; description: string; components: string[]; }
interface ApiEndpoint { method: string; endpoint: string; description: string; auth: boolean; }
interface DbTable { table: string; columns: { name: string; type: string }[]; }

interface Plan {
  id?: number;
  features: Feature[];
  screens: Screen[];
  apis: ApiEndpoint[];
  db_schema: DbTable[];
  integrations: { name: string; purpose: string; required: boolean }[];
  deployment_strategy: string;
  estimated_complexity: string;
  estimated_hours: number;
  tech_stack: { frontend: string; backend: string; database: string; hosting: string };
  cost_estimate_monthly_usd: number;
  agent_assignments: Record<string, string>;
  security_considerations: string[];
  performance_notes: string[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const COMPLEXITY_COLORS: Record<string, string> = {
  simple: "text-green-400",
  medium: "text-yellow-400",
  complex: "text-orange-400",
  enterprise: "text-red-400",
};

export function PlannerPanel({ projectId }: PlannerPanelProps) {
  const [idea, setIdea] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);
  const [openSection, setOpenSection] = useState<string>("features");

  const generatePlan = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setPlan(null);
    setApproved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
        credentials: "include",
      });
      const data = await res.json() as { plan: Plan };
      if (data.plan) setPlan(data.plan);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const approvePlan = async () => {
    if (!plan?.id || approving) return;
    setApproving(true);
    try {
      await fetch(`/api/projects/${projectId}/plan/${plan.id}/approve`, {
        method: "POST", credentials: "include",
      });
      setApproved(true);
    } finally { setApproving(false); }
  };

  const toggle = (s: string) => setOpenSection(prev => prev === s ? "" : s);

  return (
    <div className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[hsl(191,90%,42%)]/10 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[hsl(191,90%,42%)]" />
          <h2 className="text-sm font-semibold text-white">Planner Agent — מתכנן AI</h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">הזן רעיון ו-AI ייצר תכנית מקיפה: features, screens, APIs, DB</p>
      </div>

      {/* Idea Input */}
      <div className="p-4 border-b border-white/10">
        <textarea
          value={idea}
          onChange={e => setIdea(e.target.value)}
          placeholder="תאר את הרעיון שלך... לדוגמה: 'אפליקציית SaaS לניהול צוות עם billing, analytics, ו-CRM'"
          className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none focus:outline-none focus:border-[hsl(191,90%,42%)]/50 leading-relaxed"
        />
        <button
          onClick={generatePlan}
          disabled={!idea.trim() || loading}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-[hsl(191,90%,42%)] hover:bg-[hsl(191,90%,38%)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />מייצר תכנית...</> : <><Sparkles className="w-4 h-4" />צור תכנית</> }
        </button>
      </div>

      {/* Plan Output */}
      <div className="flex-1 overflow-y-auto">
        {!plan && !loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Sparkles className="w-8 h-8 text-white/20" />
            <p className="text-white/30 text-sm text-center">הזן רעיון ולחץ "צור תכנית" לקבלת<br/>תכנית מקצועית מלאה</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[hsl(191,90%,42%)]" />
            <p className="text-white/50 text-sm">מנתח את הרעיון ומתכנן...</p>
          </div>
        )}

        {plan && (
          <div className="p-4 space-y-3">
            {/* Summary Bar */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Features", val: plan.features?.length ?? 0, icon: <Zap className="w-3 h-3" />, color: "text-cyan-400" },
                { label: "Screens", val: plan.screens?.length ?? 0, icon: <Layout className="w-3 h-3" />, color: "text-purple-400" },
                { label: "APIs", val: plan.apis?.length ?? 0, icon: <Server className="w-3 h-3" />, color: "text-yellow-400" },
                { label: "שעות", val: Math.round(plan.estimated_hours ?? 0), icon: <Clock className="w-3 h-3" />, color: "text-green-400" },
              ].map(item => (
                <div key={item.label} className="bg-white/5 rounded-lg p-2 text-center border border-white/10">
                  <div className={cn("flex items-center justify-center gap-1 mb-1", item.color)}>{item.icon}<span className="text-[10px] font-medium">{item.label}</span></div>
                  <div className="text-lg font-bold text-white">{item.val}</div>
                </div>
              ))}
            </div>

            {/* Tech Stack */}
            {plan.tech_stack && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="text-xs font-semibold text-white/60 mb-2">Stack טכנולוגי</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(plan.tech_stack).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 w-14">{k}:</span>
                      <span className="text-xs text-white/80 font-medium">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collapsible Sections */}
            {[
              {
                key: "features", label: "Features", icon: <Zap className="w-3.5 h-3.5 text-cyan-400" />, count: plan.features?.length,
                content: (
                  <div className="space-y-2 pt-2">
                    {plan.features?.map((f, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{f.name}</span>
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", PRIORITY_COLORS[f.priority] ?? "")}>{f.priority}</span>
                        </div>
                        <p className="text-[11px] text-white/50">{f.description}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "screens", label: "Screens", icon: <Layout className="w-3.5 h-3.5 text-purple-400" />, count: plan.screens?.length,
                content: (
                  <div className="space-y-2 pt-2">
                    {plan.screens?.map((s, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-white">{s.name}</span>
                          <code className="text-[9px] text-purple-300 bg-purple-500/10 px-1 rounded">{s.route}</code>
                        </div>
                        <p className="text-[11px] text-white/50 mb-1">{s.description}</p>
                        <div className="flex flex-wrap gap-1">{s.components?.map((c, j) => <span key={j} className="text-[9px] bg-white/5 text-white/50 px-1.5 py-0.5 rounded border border-white/10">{c}</span>)}</div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "apis", label: "API Endpoints", icon: <Server className="w-3.5 h-3.5 text-yellow-400" />, count: plan.apis?.length,
                content: (
                  <div className="space-y-1.5 pt-2">
                    {plan.apis?.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/5 rounded p-2 border border-white/10">
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", a.method === "GET" ? "bg-green-500/20 text-green-400" : a.method === "POST" ? "bg-blue-500/20 text-blue-400" : a.method === "PUT" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400")}>{a.method}</span>
                        <code className="text-[11px] text-white/70 flex-1">{a.endpoint}</code>
                        {a.auth && <span className="text-[9px] text-orange-400">🔒</span>}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "db", label: "Database Schema", icon: <Database className="w-3.5 h-3.5 text-blue-400" />, count: plan.db_schema?.length,
                content: (
                  <div className="space-y-2 pt-2">
                    {plan.db_schema?.map((t, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2.5 border border-white/10">
                        <div className="text-xs font-semibold text-blue-300 mb-1.5">📊 {t.table}</div>
                        <div className="space-y-0.5">
                          {t.columns?.map((c, j) => (
                            <div key={j} className="flex items-center gap-2">
                              <span className="text-[10px] text-white/70 w-28">{c.name}</span>
                              <code className="text-[9px] text-blue-300/70">{c.type}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
            ].map(section => (
              <div key={section.key} className="border border-white/10 rounded-lg overflow-hidden">
                <button onClick={() => toggle(section.key)} className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <span className="text-xs font-semibold text-white">{section.label}</span>
                    <span className="text-[10px] bg-white/10 text-white/50 px-1.5 rounded">{section.count}</span>
                  </div>
                  {openSection === section.key ? <ChevronDown className="w-3.5 h-3.5 text-white/40" /> : <ChevronRight className="w-3.5 h-3.5 text-white/40" />}
                </button>
                {openSection === section.key && <div className="px-3 pb-3">{section.content}</div>}
              </div>
            ))}

            {/* Approve Button */}
            {!approved ? (
              <button onClick={approvePlan} disabled={approving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors">
                {approving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                {approving ? "מאשר..." : "אשר תכנית "}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" /> התכנית אושרה!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
