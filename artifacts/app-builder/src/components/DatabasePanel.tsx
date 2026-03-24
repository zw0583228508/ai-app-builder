import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Play, Plus, Table2, ChevronRight, ChevronDown, Loader2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface DBTable { name: string; columns: { name: string; type: string; nullable: boolean }[] }
interface DBStatus { exists: boolean; schemaName?: string; status?: string }

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface DatabasePanelProps {
  projectId: number;
}

export function DatabasePanel({ projectId }: DatabasePanelProps) {
  const qc = useQueryClient();

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["project-db-status", projectId],
    queryFn: () => apiFetch<DBStatus>(`/api/projects/${projectId}/db/status`),
  });

  const { data: tablesData, isLoading: tablesLoading } = useQuery({
    queryKey: ["project-db-tables", projectId],
    queryFn: () => apiFetch<{ tables: DBTable[] }>(`/api/projects/${projectId}/db/tables`),
    enabled: !!statusData?.exists,
  });
  const tables = tablesData?.tables ?? [];

  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [sql, setSql] = useState("SELECT * FROM ");
  const [queryResult, setQueryResult] = useState<{ rows: Record<string, unknown>[]; duration: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const provisionMutation = useMutation({
    mutationFn: () => apiFetch<{ schemaName: string }>(`/api/projects/${projectId}/db/provision`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-db-status", projectId] });
      qc.invalidateQueries({ queryKey: ["project-db-tables", projectId] });
    },
  });

  const runQuery = async () => {
    setQueryError(null);
    setQueryResult(null);
    try {
      const t0 = Date.now();
      const res = await apiFetch<{ rows: Record<string, unknown>[] }>(`/api/projects/${projectId}/db/query`, {
        method: "POST",
        body: JSON.stringify({ sql }),
      });
      setQueryResult({ rows: res.rows, duration: Date.now() - t0 });
      qc.invalidateQueries({ queryKey: ["project-db-tables", projectId] });
    } catch (e) {
      setQueryError(String(e));
    }
  };

  if (statusLoading) {
    return (
      <div className="h-full flex items-center justify-center" dir="rtl" style={{ fontFamily: HE }}>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!statusData?.exists) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6" dir="rtl" style={{ fontFamily: HE }}>
        <Database className="w-12 h-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground mb-1">אין מסד נתונים</p>
          <p className="text-xs text-muted-foreground">הוסף מסד נתונים PostgreSQL לפרויקט זה</p>
        </div>
        <button
          onClick={() => provisionMutation.mutate()}
          disabled={provisionMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-all disabled:opacity-50"
        >
          {provisionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          הוסף מסד נתונים
        </button>
        {provisionMutation.isError && (
          <p className="text-xs text-destructive">{String(provisionMutation.error)}</p>
        )}
      </div>
    );
  }

  const cols = queryResult?.rows.length ? Object.keys(queryResult.rows[0]) : [];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden" dir="rtl" style={{ fontFamily: HE }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 shrink-0">
        <Database className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">מסד נתונים</span>
        <span className="text-xs text-muted-foreground font-mono" dir="ltr">{statusData.schemaName}</span>
        <div className="flex items-center gap-1 mr-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          <span className="text-xs text-green-400">מחובר</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Table Browser */}
        <div className="w-44 shrink-0 border-l border-border/40 flex flex-col overflow-hidden bg-muted/20">
          <div className="px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border/30">
            טבלאות {tablesLoading && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {tables.length === 0 && !tablesLoading && (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">אין טבלאות עדיין</p>
            )}
            {tables.map((t) => (
              <div key={t.name}>
                <button
                  className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-foreground hover:bg-white/5 transition-colors text-right"
                  onClick={() => setExpandedTable(expandedTable === t.name ? null : t.name)}
                  dir="ltr"
                >
                  {expandedTable === t.name ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
                  <Table2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{t.name}</span>
                </button>
                {expandedTable === t.name && (
                  <div className="py-1 border-t border-border/20" dir="ltr">
                    {t.columns.map((c) => (
                      <div key={c.name} className="flex items-center gap-1.5 px-5 py-0.5">
                        <span className="w-2 h-2 rounded-sm bg-cyan-500/30 border border-cyan-500/50 shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground/50 ml-auto">{c.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Query Console */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* SQL Editor */}
          <div className="p-3 border-b border-border/40 shrink-0">
            <div className="flex items-start gap-2">
              <textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runQuery(); } }}
                className="flex-1 text-xs font-mono bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary resize-none h-20"
                dir="ltr"
                spellCheck={false}
                placeholder="SELECT * FROM my_table WHERE id = 1"
              />
              <button
                onClick={runQuery}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-90 transition-all shrink-0"
                title="Ctrl+Enter"
              >
                <Play className="w-3 h-3" /> הרץ
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-left" dir="ltr">Ctrl+Enter to run</p>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto">
            {queryError && (
              <div className="flex items-start gap-2 m-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-mono" dir="ltr">{queryError}</p>
              </div>
            )}
            {queryResult && (
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400">{queryResult.rows.length} שורות</span>
                  <span className="text-xs text-muted-foreground">({queryResult.duration}ms)</span>
                </div>
                {cols.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse" dir="ltr">
                      <thead>
                        <tr className="bg-muted/40">
                          {cols.map(c => (
                            <th key={c} className="px-3 py-1.5 text-left text-muted-foreground font-medium border border-border/30 whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5">
                            {cols.map(c => (
                              <td key={c} className="px-3 py-1 border border-border/20 font-mono text-foreground whitespace-nowrap max-w-xs truncate">
                                {row[c] === null ? <span className="text-muted-foreground italic">null</span> : String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {queryResult.rows.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">הפקודה הצליחה, אין שורות בתוצאה</p>
                )}
              </div>
            )}
            {!queryResult && !queryError && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Database className="w-8 h-8 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">הרץ שאילתה לראות תוצאות</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
