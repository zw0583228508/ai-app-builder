import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Rocket,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Globe,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Globe2,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { readCapabilities } from "@/hooks/use-integrations";

const HE = "'Rubik', sans-serif";

interface Deployment {
  id: number;
  projectId: number;
  status: "pending" | "building" | "live" | "failed";
  provider: string;
  url: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Record<string, string>;
    throw new Error(err["error"] || `${res.status}`);
  }
  return res.json() as Promise<T>;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "הרגע";
  if (mins < 60) return `לפני ${mins} דק'`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `לפני ${hrs} שע'`;
  const days = Math.floor(hrs / 24);
  return `לפני ${days} ימים`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live")
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium border border-emerald-500/25">
        <CheckCircle2 className="w-3 h-3" />
        חי
      </span>
    );
  if (status === "building" || status === "pending")
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium border border-amber-500/25">
        <Loader2 className="w-3 h-3 animate-spin" />
        בנייה...
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium border border-red-500/25">
        <XCircle className="w-3 h-3" />
        נכשל
      </span>
    );
  return null;
}

type Provider = "netlify" | "vercel";

const PROVIDERS: {
  id: Provider;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
  bg: string;
  badge: string;
}[] = [
  {
    id: "netlify",
    label: "Netlify",
    color: "#00ad9f",
    textColor: "text-[#00ad9f]",
    borderColor: "border-[#00ad9f]/30",
    bg: "bg-[#00ad9f]/10",
    badge: "N",
  },
  {
    id: "vercel",
    label: "Vercel",
    color: "#fff",
    textColor: "text-white",
    borderColor: "border-white/20",
    bg: "bg-white/10",
    badge: "▲",
  },
];

interface DeployPanelProps {
  projectId: number;
}

export function DeployPanel({ projectId }: DeployPanelProps) {
  const qc = useQueryClient();
  const [deployError, setDeployError] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>("netlify");
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainMsg, setDomainMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["deployments", projectId],
    queryFn: () =>
      apiFetch<{ deployments: Deployment[] }>(
        `/api/projects/${projectId}/deployments`,
      ).then((r) => r.deployments),
    refetchInterval: pollingId ? 3000 : false,
  });
  const deployments = data ?? [];

  const activeDeployment = deployments.find((d) => d.id === pollingId);
  if (
    activeDeployment &&
    (activeDeployment.status === "live" || activeDeployment.status === "failed")
  ) {
    setPollingId(null);
  }

  const caps = readCapabilities();
  const hasToken =
    selectedProvider === "netlify" ? !!caps.netlify : !!caps.vercel;

  const deployMutation = useMutation({
    mutationFn: async () => {
      setDeployError(null);
      if (!hasToken)
        throw new Error(
          `חסר ${selectedProvider === "netlify" ? "Netlify" : "Vercel"} Token — הוסף בהגדרות אינטגרציות`,
        );
      const result = await apiFetch<{ deployment: Deployment }>(
        `/api/projects/${projectId}/deployments`,
        {
          method: "POST",
          body: JSON.stringify({ provider: selectedProvider }),
        },
      );
      return result.deployment;
    },
    onSuccess: (deployment) => {
      qc.invalidateQueries({ queryKey: ["deployments", projectId] });
      setPollingId(deployment.id);
    },
    onError: (err: Error) => setDeployError(err.message),
  });

  const isDeploying =
    deployMutation.isPending ||
    (pollingId !== null &&
      activeDeployment?.status !== "live" &&
      activeDeployment?.status !== "failed");
  const latestLive = deployments.find((d) => d.status === "live");

  const handleAddDomain = async () => {
    if (!customDomain.trim()) return;
    setAddingDomain(true);
    setDomainMsg(null);
    try {
      const liveDeployment = deployments.find((d) => d.status === "live");
      if (!liveDeployment) {
        setDomainMsg("אין פרסום חי — פרסם קודם");
        return;
      }
      await apiFetch(
        `/api/projects/${projectId}/deployments/${liveDeployment.id}/domain`,
        {
          method: "POST",
          body: JSON.stringify({
            domain: customDomain.trim(),
            provider: liveDeployment.provider,
          }),
        },
      );
      setDomainMsg("✓ הדומיין נוסף בהצלחה!");
      setCustomDomain("");
    } catch (e: unknown) {
      setDomainMsg(`שגיאה: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setAddingDomain(false);
      setTimeout(() => setDomainMsg(null), 4000);
    }
  };

  const prov = PROVIDERS.find((p) => p.id === selectedProvider)!;

  return (
    <div
      className="h-full flex flex-col bg-background"
      dir="rtl"
      style={{ fontFamily: HE }}
    >
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">פרסום ופריסה</span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          title="רענן"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {latestLive?.url && (
          <a
            href={latestLive.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/40 transition-all group"
          >
            <Globe className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-300 font-medium mb-0.5">
                אתר חי
              </p>
              <p className="text-sm text-emerald-100 truncate">
                {latestLive.url}
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </a>
        )}

        {/* Provider selector */}
        <div className="rounded-xl bg-slate-800/60 border border-white/8 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            ספק פרסום
          </p>
          <div className="relative">
            <button
              onClick={() => setShowProviderMenu((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all",
                prov.borderColor,
                prov.bg,
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center text-xs font-bold border",
                    prov.bg,
                    prov.borderColor,
                    prov.textColor,
                  )}
                >
                  {prov.badge}
                </span>
                <span className="text-white font-medium">{prov.label}</span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-slate-400 transition-transform",
                  showProviderMenu && "rotate-180",
                )}
              />
            </button>
            {showProviderMenu && (
              <div className="absolute top-full mt-1 right-0 left-0 z-30 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setShowProviderMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 transition-colors",
                      p.id === selectedProvider && "bg-white/5",
                    )}
                  >
                    <span
                      className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-xs font-bold border",
                        p.bg,
                        p.borderColor,
                        p.textColor,
                      )}
                    >
                      {p.badge}
                    </span>
                    <span className="text-white">{p.label}</span>
                    {p.id === selectedProvider && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 mr-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!hasToken && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>הוסף {prov.label} Token בדף האינטגרציות</span>
            </div>
          )}

          {deployError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{deployError}</span>
            </div>
          )}

          <button
            onClick={() => deployMutation.mutate()}
            disabled={isDeploying}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all",
              isDeploying
                ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                : hasToken
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-slate-700/50 text-slate-400 cursor-not-allowed",
            )}
          >
            {isDeploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                בונה ומפרסם...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                פרסם ל-{prov.label}
              </>
            )}
          </button>
        </div>

        {/* Custom domain */}
        <div className="rounded-xl bg-slate-800/60 border border-white/8 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <p className="text-sm font-semibold text-white">
              דומיין מותאם אישית
            </p>
          </div>
          <p className="text-xs text-slate-400">
            הוסף דומיין שלך לפרסום החי (דורש DNS מוגדר)
          </p>
          <div className="flex items-center gap-2">
            <input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="myapp.com"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
            />
            <button
              onClick={handleAddDomain}
              disabled={addingDomain || !customDomain.trim()}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all disabled:opacity-50"
            >
              {addingDomain ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
          {domainMsg && (
            <p
              className={cn(
                "text-xs",
                domainMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400",
              )}
            >
              {domainMsg}
            </p>
          )}
        </div>

        {/* Deployment history */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            היסטוריית פריסות
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center h-16 text-slate-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              טוען...
            </div>
          ) : deployments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500">
              <Rocket className="w-8 h-8 opacity-25" />
              <p className="text-sm">עדיין לא פורסם</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deployments.map((deploy) => (
                <div
                  key={deploy.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5"
                >
                  <div className="mt-0.5 shrink-0">
                    {deploy.status === "live" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {(deploy.status === "building" ||
                      deploy.status === "pending") && (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    )}
                    {deploy.status === "failed" && (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={deploy.status} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 font-mono">
                        {deploy.provider}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {relativeTime(deploy.createdAt)}
                      </span>
                    </div>
                    {deploy.url && (
                      <a
                        href={deploy.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 truncate block transition-colors"
                      >
                        {deploy.url}
                      </a>
                    )}
                    {deploy.error && (
                      <p className="text-xs text-red-400 mt-1 line-clamp-2">
                        {deploy.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
