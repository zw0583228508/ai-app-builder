import { useState } from "react";
import { Bug, Loader2, CheckCircle2, XCircle, AlertTriangle, Shield, SkipForward, Wrench, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface QaPanelProps { projectId: number; }

interface QaTest {
  id: string;
  name: string;
  type: "unit" | "integration" | "ui" | "e2e" | "accessibility";
  description: string;
  code: string;
  expected_result: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "generated" | "pass" | "fail" | "skip";
}

interface Fix {
  issue: string;
  severity: "critical" | "high" | "medium" | "low";
  fix: string;
  code_change: string;
}

interface QaSummary {
  total_tests: number;
  critical_tests: number;
  estimated_pass_rate: number;
  quality_score: number;
  recommendations: string[];
}

interface QaResult {
  id?: number;
  test_suite: QaTest[];
  coverage_analysis: { estimated_coverage_percent: number; covered_paths: string[]; uncovered_paths: string[]; risk_areas: string[] };
  auto_fix_suggestions: Fix[];
  qa_summary: QaSummary;
}

const TYPE_COLORS: Record<string, string> = {
  unit: "bg-blue-500/20 text-blue-400",
  integration: "bg-purple-500/20 text-purple-400",
  ui: "bg-green-500/20 text-green-400",
  e2e: "bg-yellow-500/20 text-yellow-400",
  accessibility: "bg-orange-500/20 text-orange-400",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-gray-500",
};

const SEV_COLORS: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  low: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

export function QaPanel({ projectId }: QaPanelProps) {
  const [result, setResult] = useState<QaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tests" | "fixes" | "coverage">("tests");

  const runQa = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/qa`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json() as { qa: QaResult };
      if (data.qa) setResult(data.qa);
    } finally { setLoading(false); }
  };

  const qualityColor = (score: number) => score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  const qualityLabel = (score: number) => score >= 80 ? "איכות גבוהה" : score >= 60 ? "בינוני" : "דרוש שיפור";

  return (
    <div className="h-full flex flex-col bg-[hsl(220,16%,6%)] overflow-hidden" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-transparent">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-green-400" />
          <h2 className="text-sm font-semibold text-white">AI QA System — בדיקות אוטומטיות</h2>
        </div>
        <p className="text-xs text-white/40 mt-0.5">מייצר tests אוטומטיים ומזהה בעיות בקוד</p>
      </div>

      {/* Run Button */}
      <div className="p-4 border-b border-white/10">
        <button onClick={runQa} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 transition-colors">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />מריץ QA...</> : <><Shield className="w-4 h-4" />הרץ AI QA</>}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!result && !loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Bug className="w-8 h-8 text-white/20" />
            <p className="text-white/30 text-sm text-center">לחץ "הרץ AI QA" לקבלת<br/>tests אוטומטיים והצעות שיפור</p>
          </div>
        )}
        {loading && (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
            <p className="text-white/50 text-sm">מנתח קוד ומייצר tests...</p>
          </div>
        )}
        {result && (
          <div className="p-4 space-y-4">
            {/* Score Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 text-center">
                <div className={cn("text-2xl font-bold", qualityColor(result.qa_summary?.quality_score ?? 0))}>
                  {Math.round(result.qa_summary?.quality_score ?? 0)}
                </div>
                <div className="text-[10px] text-white/40">ציון איכות</div>
                <div className={cn("text-[10px] font-medium mt-0.5", qualityColor(result.qa_summary?.quality_score ?? 0))}>
                  {qualityLabel(result.qa_summary?.quality_score ?? 0)}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.round(result.coverage_analysis?.estimated_coverage_percent ?? 0)}%
                </div>
                <div className="text-[10px] text-white/40">Code Coverage</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2.5 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">{result.test_suite?.length ?? 0}</div>
                <div className="text-[10px] text-white/40">Tests</div>
                <div className="text-[10px] text-red-400">{result.qa_summary?.critical_tests ?? 0} critical</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {(["tests", "fixes", "coverage"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={cn("flex-1 py-1.5 text-xs font-medium transition-colors", activeTab === tab ? "text-white border-b-2 border-green-400" : "text-white/40 hover:text-white/70")}>
                  {tab === "tests" ? `Tests (${result.test_suite?.length ?? 0})` : tab === "fixes" ? `Fixes (${result.auto_fix_suggestions?.length ?? 0})` : "Coverage"}
                </button>
              ))}
            </div>

            {/* Tests Tab */}
            {activeTab === "tests" && (
              <div className="space-y-2">
                {result.test_suite?.map((test, i) => (
                  <div key={test.id ?? i} className="border border-white/10 rounded-lg overflow-hidden">
                    <button onClick={() => setOpenTest(openTest === test.id ? null : test.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/8 transition-colors text-right">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[test.priority] ?? "bg-gray-500")} />
                      <span className="text-xs font-medium text-white flex-1">{test.name}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded", TYPE_COLORS[test.type] ?? "")}>{test.type}</span>
                      {openTest === test.id ? <ChevronDown className="w-3 h-3 text-white/40" /> : <ChevronRight className="w-3 h-3 text-white/40" />}
                    </button>
                    {openTest === test.id && (
                      <div className="px-3 pb-3 pt-2 space-y-2">
                        <p className="text-xs text-white/60">{test.description}</p>
                        <div className="bg-black/30 rounded p-2 overflow-x-auto">
                          <pre className="text-[10px] text-green-300 whitespace-pre-wrap">{test.code}</pre>
                        </div>
                        <div className="text-[10px] text-white/40">ציפייה: {test.expected_result}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Fixes Tab */}
            {activeTab === "fixes" && (
              <div className="space-y-3">
                {result.auto_fix_suggestions?.length === 0 && (
                  <div className="text-center text-white/30 text-sm py-8">אין בעיות שנמצאו 🎉</div>
                )}
                {result.auto_fix_suggestions?.map((fix, i) => (
                  <div key={i} className={cn("border rounded-lg p-3", SEV_COLORS[fix.severity] ?? "border-white/10 bg-white/5")}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{fix.issue}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded border mr-auto">{fix.severity}</span>
                    </div>
                    <p className="text-xs mb-2 opacity-80">{fix.fix}</p>
                    {fix.code_change && (
                      <div className="bg-black/30 rounded p-2">
                        <pre className="text-[10px] text-green-300 whitespace-pre-wrap">{fix.code_change}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Coverage Tab */}
            {activeTab === "coverage" && (
              <div className="space-y-3">
                {/* Coverage Bar */}
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">Coverage</span>
                    <span className="text-white font-semibold">{Math.round(result.coverage_analysis?.estimated_coverage_percent ?? 0)}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${result.coverage_analysis?.estimated_coverage_percent ?? 0}%` }} />
                  </div>
                </div>
                {result.coverage_analysis?.risk_areas?.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />אזורי סיכון</div>
                    {result.coverage_analysis.risk_areas.map((area, i) => <p key={i} className="text-xs text-red-300/70 mb-1">• {area}</p>)}
                  </div>
                )}
                {result.qa_summary?.recommendations?.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1"><Wrench className="w-3 h-3" />המלצות</div>
                    {result.qa_summary.recommendations.map((r, i) => <p key={i} className="text-xs text-white/50 mb-1">• {r}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
