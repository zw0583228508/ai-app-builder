import { useState, useEffect, useRef } from "react";
import { MessageCircle, QrCode, Wifi, WifiOff, RefreshCw, LogOut, Loader2, CheckCircle } from "lucide-react";

interface WhatsAppPanelProps {
  projectId: number;
}

type ConnectionStatus = "disconnected" | "connecting" | "qr" | "connected";

const statusConfig: Record<ConnectionStatus, { label: string; color: string; icon: typeof Wifi }> = {
  disconnected: { label: "מנותק", color: "text-slate-400", icon: WifiOff },
  connecting: { label: "מתחבר...", color: "text-yellow-400", icon: Loader2 },
  qr: { label: "ממתין לסריקה", color: "text-amber-400", icon: QrCode },
  connected: { label: "מחובר", color: "text-green-400", icon: CheckCircle },
};

const FEATURES = [
  { cmd: "כמה ביקורים", desc: "קבל סטטיסטיקות של האתר" },
  { cmd: "פרסם", desc: "עשה deploy לאתר" },
  { cmd: "שנה צבע ל[צבע]", desc: "עדכן CSS צבע ראשי" },
  { cmd: "כל שאלה", desc: "שאל AI על הפרויקט" },
];

export function WhatsAppPanel({ projectId }: WhatsAppPanelProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [qr, setQr] = useState<string | null>(null);
  const [jid, setJid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const pollStatus = async () => {
    try {
      const r = await fetch(`/api/whatsapp/${projectId}/status`);
      const data = await r.json() as { status: ConnectionStatus; qr: string | null; jid: string | null };
      setStatus(data.status);
      setQr(data.qr);
      setJid(data.jid);
      if (data.status === "connected") stopPoll();
    } catch { /* silent */ }
  };

  useEffect(() => {
    pollStatus();
    return stopPoll;
  }, [projectId]);

  const handleConnect = async () => {
    setLoading(true);
    setStatus("connecting");
    try {
      const r = await fetch(`/api/whatsapp/${projectId}/connect`, { method: "POST" });
      const data = await r.json() as { status: ConnectionStatus; qr: string | null; jid: string | null };
      setStatus(data.status);
      setQr(data.qr);
      setJid(data.jid);

      if (data.status !== "connected") {
        pollRef.current = setInterval(pollStatus, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    stopPoll();
    await fetch(`/api/whatsapp/${projectId}/disconnect`, { method: "POST" });
    setStatus("disconnected");
    setQr(null);
    setJid(null);
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div dir="rtl" className="h-full overflow-y-auto p-4 space-y-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} className="text-green-400" />
          <h3 className="text-sm font-semibold text-slate-200">WhatsApp Builder</h3>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${statusConfig[status].color}`}>
          <StatusIcon size={13} className={status === "connecting" ? "animate-spin" : ""} />
          {statusConfig[status].label}
        </div>
      </div>

      {/* Connection card */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-3">
        {status === "disconnected" && (
          <>
            <p className="text-xs text-slate-400 leading-relaxed">
              חבר את ה-WhatsApp שלך ושלוט על הפרויקט ישירות מהסמארטפון — שאל שאלות, קבל סטטיסטיקות, ואפילו פרסם.
            </p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/25 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
              חבר WhatsApp
            </button>
          </>
        )}

        {(status === "qr" || status === "connecting") && (
          <div className="space-y-3">
            <p className="text-xs text-amber-300">
              {status === "qr" ? "סרוק את ה-QR code עם WhatsApp שלך" : "מחכה לייצור QR code..."}
            </p>
            {qr ? (
              <div className="flex justify-center p-4 bg-white rounded-xl">
                {/* Render QR as text matrix (simple) */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`}
                  alt="WhatsApp QR Code"
                  className="w-[200px] h-[200px] rounded-lg"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] rounded-xl bg-slate-900/50 border border-slate-700">
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-xs">מייצר QR code...</span>
                </div>
              </div>
            )}
            <button
              onClick={() => { stopPoll(); setStatus("disconnected"); setQr(null); }}
              className="w-full py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:text-slate-300 transition-colors"
            >
              ביטול
            </button>
          </div>
        )}

        {status === "connected" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle size={16} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-300">WhatsApp מחובר!</p>
                {jid && <p className="text-[11px] text-green-400/70 mt-0.5 truncate" dir="ltr">{jid.split(":")[0]}</p>}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="w-full py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut size={12} />
              נתק
            </button>
          </div>
        )}
      </div>

      {/* Commands reference */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-slate-400">פקודות זמינות</h4>
        <div className="space-y-1.5">
          {FEATURES.map(({ cmd, desc }) => (
            <div key={cmd} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-700/40">
              <code className="text-[11px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono shrink-0">
                {cmd}
              </code>
              <span className="text-[11px] text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <p className="text-[10px] text-slate-600 leading-relaxed">
        כל ההודעות מטופלות בעברית. ה-AI עונה על שאלות על הפרויקט ומפעיל פעולות בהתאם לפקודות.
      </p>
    </div>
  );
}
