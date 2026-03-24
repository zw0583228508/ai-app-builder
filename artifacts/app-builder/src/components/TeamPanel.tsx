import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Copy, Check, UserPlus, Trash2, Crown, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface TeamMember {
  id: number;
  userId: string;
  role: string;
  joinedAt: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

interface Team {
  id: number;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err["error"] || `${res.status}`);
  }
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export function TeamPanel() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: teamsData, isLoading, isError } = useQuery({
    queryKey: ["teams"],
    queryFn: () => apiFetch<{ owned: Team[]; member: Array<{ team: Team; role: string }> }>("/api/teams"),
    retry: false,
    throwOnError: false,
  });

  const { data: teamDetail } = useQuery({
    queryKey: ["team-detail", selectedTeamId],
    queryFn: () => apiFetch<{ team: Team; members: TeamMember[] }>(`/api/teams/${selectedTeamId}`),
    enabled: !!selectedTeamId,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => apiFetch<{ team: Team }>("/api/teams", { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setShowCreate(false);
      setNewTeamName("");
      setSelectedTeamId(data.team.id);
    },
    onError: (err: Error) => setError(err.message),
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => apiFetch<{ team: Team }>("/api/teams/join", { method: "POST", body: JSON.stringify({ inviteCode: code }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      setShowJoin(false);
      setInviteCode("");
      setSelectedTeamId(data.team.id);
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: string }) =>
      apiFetch(`/api/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-detail", selectedTeamId] }),
  });

  const allTeams: Team[] = [
    ...(teamsData?.owned ?? []),
    ...(teamsData?.member?.map(m => m.team) ?? []),
  ];
  const uniqueTeams = Array.from(new Map(allTeams.map(t => [t.id, t])).values());

  async function copyInviteCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function roleLabel(role: string) {
    if (role === "owner") return "בעלים";
    if (role === "editor") return "עורך";
    return "צופה";
  }

  function roleColor(role: string) {
    if (role === "owner") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (role === "editor") return "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";
    return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  }

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl" style={{ fontFamily: HE }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white">צוותים</span>
          {uniqueTeams.length > 0 && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{uniqueTeams.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowJoin(true); setShowCreate(false); setError(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all border border-white/5"
          >
            <UserPlus className="w-3.5 h-3.5" />הצטרף
          </button>
          <button
            onClick={() => { setShowCreate(true); setShowJoin(false); setError(null); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />צוות חדש
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Create team form */}
        {showCreate && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-white/8 space-y-2">
            <p className="text-xs font-semibold text-white">יצירת צוות חדש</p>
            <input
              type="text"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="שם הצוות..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              onKeyDown={e => e.key === "Enter" && newTeamName.trim() && createMutation.mutate(newTeamName.trim())}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMutation.mutate(newTeamName.trim())}
                disabled={!newTeamName.trim() || createMutation.isPending}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "צור צוות"}
              </button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Join team form */}
        {showJoin && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-white/8 space-y-2">
            <p className="text-xs font-semibold text-white">הצטרפות לצוות</p>
            <input
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="קוד הזמנה..."
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => joinMutation.mutate(inviteCode.trim())}
                disabled={!inviteCode.trim() || joinMutation.isPending}
                className="flex-1 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {joinMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "הצטרף"}
              </button>
              <button onClick={() => setShowJoin(false)} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300">{error}</div>
        )}

        {/* Teams list */}
        {isError ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <Shield className="w-10 h-10 opacity-25" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">נדרשת כניסה לחשבון</p>
              <p className="text-xs mt-1">יש להתחבר כדי לנהל צוותים</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-20 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin ml-2" />טוען...
          </div>
        ) : uniqueTeams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <Users className="w-10 h-10 opacity-25" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">אין צוותים עדיין</p>
              <p className="text-xs mt-1">צור צוות חדש או הצטרף לצוות קיים</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {uniqueTeams.map(team => (
              <div key={team.id}>
                <button
                  onClick={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right",
                    selectedTeamId === team.id
                      ? "bg-cyan-500/10 border-cyan-500/25"
                      : "bg-slate-800/50 border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {team.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-sm font-semibold text-white truncate">{team.name}</p>
                    <p className="text-xs text-slate-400">
                      {teamsData?.owned.some(t => t.id === team.id) ? "בעלים" : "חבר"}
                    </p>
                  </div>
                </button>

                {/* Team detail */}
                {selectedTeamId === team.id && teamDetail && (
                  <div className="mt-2 mr-4 p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
                    {/* Invite code */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">קוד הזמנה</p>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-white/8">
                        <code className="text-xs text-cyan-300 font-mono flex-1 tracking-widest">{teamDetail.team.inviteCode}</code>
                        <button onClick={() => copyInviteCode(teamDetail.team.inviteCode)} className="text-slate-400 hover:text-white transition-colors">
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Members */}
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">חברים ({teamDetail.members.length})</p>
                      <div className="space-y-1.5">
                        {teamDetail.members.map(member => (
                          <div key={member.id} className="flex items-center gap-2 group">
                            {member.profileImageUrl ? (
                              <img src={member.profileImageUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-300 shrink-0">
                                {(member.firstName || member.email || "?")[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white truncate">
                                {member.firstName ? `${member.firstName} ${member.lastName ?? ""}`.trim() : member.email || member.userId}
                              </p>
                            </div>
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", roleColor(member.role))}>
                              {member.role === "owner" && <Crown className="w-2.5 h-2.5 inline ml-0.5" />}
                              {roleLabel(member.role)}
                            </span>
                            {member.role !== "owner" && teamDetail.team.ownerId && (
                              <button
                                onClick={() => removeMutation.mutate({ teamId: team.id, userId: member.userId })}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
