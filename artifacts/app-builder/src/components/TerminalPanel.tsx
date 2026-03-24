import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import {
  Loader2,
  Wifi,
  WifiOff,
  RotateCcw,
  Maximize2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@xterm/xterm/css/xterm.css";

const HE = "'Rubik', sans-serif";

function getWsUrl(): string {
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${loc.host}/api/terminal`;
}

type ConnState = "connecting" | "connected" | "disconnected" | "error";

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [connState, setConnState] = useState<ConnState>("connecting");
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const connect = useCallback(() => {
    setConnState("connecting");

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingRef.current) clearInterval(pingRef.current);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnState("connected");
      pingRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as {
          type: string;
          data?: string;
        };
        if (msg.type === "output" && msg.data && termRef.current) {
          termRef.current.write(msg.data);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnState("disconnected");
      if (pingRef.current) clearInterval(pingRef.current);
      termRef.current?.write(
        "\r\n\x1b[33m[Connection closed — לחץ על ↺ להתחברות מחדש]\x1b[0m\r\n",
      );
    };

    ws.onerror = () => {
      setConnState("error");
      termRef.current?.write("\r\n\x1b[31m[Connection error]\x1b[0m\r\n");
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#0a0a0c",
        foreground: "#e2e8f0",
        cursor: "#22d3ee",
        cursorAccent: "#0a0a0c",
        selectionBackground: "#22d3ee33",
        black: "#1e293b",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#facc15",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e2e8f0",
        brightBlack: "#475569",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fde68a",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f8fafc",
      },
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: "bar",
      scrollback: 5000,
      convertEol: false,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;

    term.onKey(({ key }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "input", data: key }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: "resize",
              cols: term.cols,
              rows: term.rows,
            }),
          );
        }
      } catch {
        // ignore
      }
    });

    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }

    connect();

    return () => {
      resizeObserver.disconnect();
      if (pingRef.current) clearInterval(pingRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [connect]);

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchTerm(val);
    if (searchRef.current) {
      if (val)
        searchRef.current.findNext(val, { caseSensitive: false, regex: false });
    }
  }

  function handleClear() {
    termRef.current?.clear();
    termRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-[#0d0d10] shrink-0">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              connState === "connected"
                ? "bg-green-400 shadow-sm shadow-green-400/50"
                : connState === "connecting"
                  ? "bg-yellow-400 animate-pulse"
                  : "bg-red-400",
            )}
          />
          <span
            className="text-xs text-muted-foreground"
            style={{ fontFamily: HE }}
          >
            {connState === "connected"
              ? "מחובר"
              : connState === "connecting"
                ? "מתחבר..."
                : connState === "error"
                  ? "שגיאת חיבור"
                  : "מנותק"}
          </span>
          {connState === "connecting" && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {showSearch && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 mr-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="חיפוש..."
                className="bg-transparent text-xs text-foreground outline-none w-28 placeholder:text-muted-foreground/50"
                style={{ fontFamily: HE, direction: "rtl" }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowSearch(false);
                    setSearchTerm("");
                  }
                  if (e.key === "Enter")
                    searchRef.current?.findNext(searchTerm);
                }}
              />
              <Search className="w-3 h-3 text-muted-foreground/50" />
            </div>
          )}

          <button
            onClick={() => {
              setShowSearch((v) => !v);
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }}
            className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="חיפוש"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleClear}
            className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="נקה מסך"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={connect}
            className={cn(
              "p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors",
              connState === "connecting" && "opacity-50 cursor-not-allowed",
            )}
            title="התחבר מחדש"
            disabled={connState === "connecting"}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          <div className="flex items-center gap-1">
            {connState === "connected" ? (
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Terminal container */}
      <div
        className="flex-1 overflow-hidden p-1"
        onClick={() => termRef.current?.focus()}
      >
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
