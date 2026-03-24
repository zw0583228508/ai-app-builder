import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Plus, Trash2, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface Secret {
  id: number;
  key: string;
  environment: string;
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

interface SecretsPanelProps {
  projectId: number;
}

export function SecretsPanel({ projectId }: SecretsPanelProps) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["project-secrets", projectId],
    queryFn: () => apiFetch<{ secrets: Secret[] }>(`/api/projects/${projectId}/secrets`).then(r => r.secrets),
  });
  const secrets = data ?? [];

  const [env, setEnv] = useState<"dev" | "prod">("dev");
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showValue, setShowValue] = useState(false);

  const createMutation = useMutation({
    mutationFn: (vars: { key: string; value: string; environment: string }) =>
      apiFetch(`/api/projects/${projectId}/secrets`, { method: "POST", body: JSON.stringify(vars) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-secrets", projectId] });
      setNewKey("");
      setNewValue("");
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/projects/${projectId}/secrets/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-secrets", projectId] }),
  });

  const filtered = secrets.filter(s => s.environment === env);

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">סודות מוצפנים</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-3 h-3" /> הוסף סוד
        </button>
      </div>

      {/* Environment tabs */}
      <div className="flex border-b border-border/40" dir="ltr">
        {(["dev", "prod"] as const).map((e) => (
          <button
            key={e}
            onClick={() => setEnv(e)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              env === e ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {e === "dev" ? "פיתוח" : "ייצור"}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="mx-4 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/90 leading-relaxed">
          הסודות מוצפנים עם AES-256-GCM. רק המפתח שלך נגיש ל-AI — לא הערכים.
        </p>
      </div>

      {/* Add secret form */}
      {showForm && (
        <div className="mx-4 mt-3 p-3 bg-card border border-border/60 rounded-xl flex flex-col gap-2">
          <input
            autoFocus
            placeholder="שם הסוד (לדוגמה: OPENAI_API_KEY)"
            value={newKey}
            onChange={e => setNewKey(e.target.value.toUpperCase().replace(/\s/g, "_"))}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary font-mono"
            dir="ltr"
          />
          <div className="relative">
            <input
              type={showValue ? "text" : "password"}
              placeholder="ערך הסוד"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary pr-9 font-mono"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowValue(!showValue)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate({ key: newKey, value: newValue, environment: env })}
              disabled={!newKey.trim() || !newValue.trim() || createMutation.isPending}
              className="flex-1 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? "שומר..." : "שמור"}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewKey(""); setNewValue(""); }}
              className="flex-1 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg hover:opacity-80"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Secrets list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="text-xs text-muted-foreground text-center py-8">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">אין סודות עדיין</p>
            <p className="text-xs text-muted-foreground/60 mt-1">הוסף מפתח API, חיבור DB ועוד</p>
          </div>
        ) : (
          filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-2 p-3 bg-card border border-border/40 rounded-xl group">
              <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs font-mono text-foreground flex-1 truncate" dir="ltr">{s.key}</span>
              <span className="text-xs text-muted-foreground font-mono tracking-widest">••••••••</span>
              <button
                onClick={() => deleteMutation.mutate(s.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all text-muted-foreground"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* AI context note */}
      <div className="px-4 pb-4">
        <div className="p-3 bg-muted/30 border border-border/30 rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">הסודות זמינים ל-AI: </span>
            {filtered.length === 0 ? "אין סודות מוגדרים" : filtered.map(s => s.key).join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
