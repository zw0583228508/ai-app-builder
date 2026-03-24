import { useEffect, useRef, useState, useCallback } from "react";

interface RemoteCursor {
  clientId: string;
  color: string;
  name: string;
  line: number;
  col: number;
  file: string;
}

interface CollabState {
  viewerCount: number;
  connected: boolean;
  cursors: RemoteCursor[];
  myClientId: string | null;
  myColor: string | null;
}

export function useCollabPresence(projectId: number | string, userName?: string) {
  const [state, setState] = useState<CollabState>({ viewerCount: 0, connected: false, cursors: [], myClientId: null, myColor: null });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const nameParam = userName ? `&name=${encodeURIComponent(userName)}` : "";
      const wsUrl = `${proto}//${window.location.host}/api/collab?projectId=${projectId}${nameParam}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setState(s => ({ ...s, connected: true }));
        const hb = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 25000);
        ws.addEventListener("close", () => clearInterval(hb));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as {
            type: string; viewerCount?: number; cursors?: RemoteCursor[];
            yourClientId?: string; yourColor?: string;
            clientId?: string; color?: string; name?: string; line?: number; col?: number; file?: string;
            projectId?: string;
          };
          if (msg.type === "presence") {
            setState(s => ({
              ...s,
              viewerCount: msg.viewerCount ?? s.viewerCount,
              cursors: msg.cursors ?? s.cursors,
              myClientId: msg.yourClientId ?? s.myClientId,
              myColor: msg.yourColor ?? s.myColor,
            }));
          } else if (msg.type === "cursor") {
            const cursor: RemoteCursor = { clientId: msg.clientId!, color: msg.color!, name: msg.name!, line: msg.line!, col: msg.col!, file: msg.file! };
            setState(s => ({
              ...s,
              cursors: [...s.cursors.filter(c => c.clientId !== cursor.clientId), cursor],
            }));
          } else if (msg.type === "cursor-leave") {
            setState(s => ({ ...s, cursors: s.cursors.filter(c => c.clientId !== msg.clientId) }));
          } else if (msg.type === "project-updated") {
            window.dispatchEvent(new CustomEvent("collab-project-updated", { detail: { projectId: msg.projectId } }));
          } else if (msg.type === "project-event") {
            window.dispatchEvent(new CustomEvent("collab-project-event", { detail: msg }));
          }
        } catch { /* ignore */ }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setState(s => ({ ...s, connected: false }));
        reconnectTimer.current = setTimeout(connect, 4000);
      };

      ws.onerror = () => { ws.close(); };
    } catch { /* ignore on SSR */ }
  }, [projectId, userName]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendCursor = useCallback((line: number, col: number, file: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "cursor", line, col, file }));
    }
  }, []);

  return { ...state, sendCursor };
}
